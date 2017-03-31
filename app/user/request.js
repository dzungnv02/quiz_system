const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const async = common.modules.async;
const errors = common.errors;

const user_activity = require('./activity.js');
const exam_online = require('../exam/online.js');

var db;
var _collection = function(name) {
  if(!db) db = mongo.get_db()
  return db.collection(name)
}

var objectId = function(id) {
  return mongo.get_object_id(id);
};

var user_exam_histories = function(exam, user, callback) {
	_collection('exam_online').findOne({_id: exam}, function(err, exam) {
		if (err) return callback(err);
		let data = {
			try_number: 0,
			avg_score: 0,
			avg_time_finish: 0,
			scores: [],
			last_try: 0,
		};
		if(exam) {
			for (let i = 0; i < exam.users.length; i++) 
				if(user._id == exam.users[i].user) {
					let logs = exam.users[i].logs;
					let logs_len = logs.length, finished = 0 ;
					for (let i = 0; i < logs_len; i++) {
						if (logs[i].done) {
							data.avg_score += Number(logs[i].score);
							data.avg_time_finish += logs[i].finish_time - logs[i].date;
							if(data.scores.length <= 10) data.scores.push(logs[i].score);
							finished++
						}
					}
					data.scores.reverse();
					data.try_number = logs_len;
					data.last_try = logs[logs_len - 1].date;
					data.avg_time_finish = data.avg_time_finish / finished;
					data.avg_score = (data.avg_score / finished).toFixed(2);
				}
		}
		callback(data)
	})
};

var get_questions_in_exam = function(exam, user, users, callback) {
	exam_online.get_questions(exam, function(err, data) {
		user_activity.update_exam(user._id, exam._id.toString());
		exam_online.update_user(exam.link, {
			user: user._id,
			users: users,
			questions: data.questions,
			answers: data.answers
		})
		callback(data.questions)
	})
}
var render_test = function(exam, res) {
	res.render('layout', {
		page: 'people/test',
		title: exam.name,
		body_class: '',
		id: exam.link,
		exam: {
			info: exam.info,
			time: exam.time,
			score: exam.show_score,
			hint: exam.show_hint,
			repeat: exam.do_again,
		},
		questions: exam.questions,
	})
}
module.exports = {
	route: function(app, auth) {
		app.post('/load-more', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let user = req.user;
			if(data.type && data.step) {
				if (data.type == 'question') {
					_collection('question').find({creator: objectId(user._id)}).limit(Number(data.step)+5).toArray(function(err, questions){
						res.send(func.return_data_with_info(questions, ['_id','question']))
					})
				}
				if (data.type == 'exam') {
					_collection('exam').find({creator: objectId(user._id)}).limit(Number(data.step)+5).toArray(function(err, exams){
						res.send(func.return_data_with_info(exams, ['_id','name','done']))
					})
				}
			} else res.send({ok: false, error: errors.not_enough_info})
		});

		app.post('/group-search', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let user = req.user;
			if(data.string != undefined) {
				if (data.string != '' && data.step) {
					_collection('user_group').find({
						name: {$regex: data.string, $options: 'i'},
						users: objectId(user._id)
					}).limit(Number(data.step)+5).toArray(function(err, groups) {
						res.send(func.return_data_with_info(groups, ['_id','name','exams']))
					})
				} else {
					_collection('user_group').find({users: objectId(user._id)}).limit(5).toArray(function(err, groups) {
						if(err) return res.send({ok: false, error: err});
						res.send(func.return_data_with_info(groups, ['_id','name','exams']))
					})
				}
			} else res.send({ok: false, error: errors.not_enough_info})
		});

		app.post('/exam-recent-activity', auth.is_authenticated, function (req, res) {
			let user = req.user;
			func.find_by_id(db.collection('user_activity'), user._id, function(err, doc) {
				if (err) return res.send({ok:false, err: err});
				if (doc) {
					let tmp = doc.exam;
					let arr = tmp.filter(function(elem, pos,arr) {
				    return arr.indexOf(elem) == pos
				  }).reverse();
					let exams = [];
					async.eachSeries(arr, function(elem, next) {
						func.find_by_id(db.collection('exam'), elem, function(err, exam) {
							exams.push(exam);
							next()
						})
					}, function(err) {
					  res.send({ ok:true, data: func.return_data_with_info(exams,['name','time','questions','link'])})
					})
				} else res.send({ ok:false, err: errors.not_found})
			})
		});

		app.post('/group-view-exam', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let user = req.user;
			if(data.exams && data.group) {
				user_activity.update_group(user._id, data.group);
				for (var i = 0; i < data.exams.length; i++) data.exams[i] = objectId(data.exams[i]);
				_collection('exam').find({_id: {$in: data.exams}}).toArray(function(err, exams) {
					res.send(func.return_data_with_info(exams, ['_id','name','link','questions','time']))
				})
			} else res.send({ok: false, error: errors.not_enough_info})
		});

		app.post('/get-score/', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let user = req.user;
			if(data.id && data.answers) {
				let user_anwsers = data.answers;
				_collection('exam_online').findOne({_id: data.id}, function(err, doc) {
					if (err) return res.send({ok:false, err: err});
					if(doc) {
						for (let i = 0; i < doc.users.length; i++) {
							let u = doc.users[i];
							if (user._id == u.user) {
								let user_log = u.logs.length - 1;
								let cheatsheet = u.logs[user_log].cheatsheet;
								let result = func.calculate_test_result(user_anwsers, cheatsheet);
								exam_online.update_user_logs(data.id, {
									user: i,
									log: user_log,
									logs: {
										cheatsheet: cheatsheet,
										answers: user_anwsers,
										date: u.logs[user_log].date,
										score: result.score,
										done: true,
										finish_time: Date.now()
									}
								}, function(err, obj) {
									if (err) return res.send({ok:false, error: err});
									res.send({
										ok:true,
										score: result.score,
										pass: result.pass,
										cheatsheet: cheatsheet,
									})
								})
							}
						}
					} else res.send({ ok:false, err: errors.not_found})
				})
			} else res.send({ ok:false, err: errors.not_enough_info})
		});
		
		app.get('/test/:link', auth.is_authenticated, function(req, res) {
			let link = req.params.link;
			let user = req.user;
			if (link) {
				exam_online.get_exam_and_users(link, function(err, data) {
					let exam = data.exam, users = data.users;
					if(exam.do_again) {
						get_questions_in_exam(exam, user, users, function(questions) {
							exam.questions = questions;
							render_test(exam, res)
						})
					} else {
						user_activity.did_a_exam(user._id, exam._id.toString(), function(err, data) {
							if(!data) {
								get_questions_in_exam(exam, user, users, function(questions) {
									exam.questions = questions;
									render_test(exam, res)
								})
							} else res.send({ok:false, error: errors.permission_denied})
						})
					}
				})
			} else res.send({ok:false, error: errors.not_enough_info})
		});

		app.post('/get-histories', auth.is_authenticated, function(req, res) {
			let data = req.body;
			let user = req.user;
			if(data.id) {
				user_exam_histories(data.id, user, function(result) {
					res.send({ok: true, data: result})
				})
			}
		});


		// CREATOR REQUESTS

		app.post('/exam-list', auth.is_authenticated, function (req, res) {
			let user = req.user;
			async.parallel([
				function(callback) {
					func.find_by_creator(_collection('term'), user._id, callback)
				},
				function(callback) {
					func.find_by_creator(_collection('exam'), user._id, function(err, exams) {
						if (exams.length > 0) {
							async.eachSeries(exams, function(exam, next) {
								func.find_by_id(_collection('user_group'), exam.groups, function(err, groups) {
									exam.groups = func.return_data_with_info(groups, ['_id','name']);
									next()
								})
							}, function(err) {
							  callback(err, exams)
							})
						} else res.send({ ok:false, err: errors.not_found})
					})
				}
			], function(err, data){
				res.send({ ok:true, data: func.return_data_with_info(data[1], ['_id','name','link','questions','groups'])})
			})
		});
	}
}