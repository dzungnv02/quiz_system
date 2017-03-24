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
							data.scores.push(logs[i].score);
							finished++
						}
					}
					data.try_number = logs_len;
					data.last_try = logs[logs_len - 1].date;
					data.avg_time_finish = data.avg_time_finish / finished;
					data.avg_score = (data.avg_score / finished).toFixed(2);
				}
		}
		callback(data)
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
			if (link) {
				let user = req.user;
				if(user) exam_online.get_questions(link, function(data) {
					user_activity.update_exam(user._id, data.exam._id);
					exam_online.update_user(link, {
						user: user._id,
						users: data.users,
						questions: data.qa.questions,
						answers: data.qa.answers
					}, function(err, obj) {
						if (err) return res.send({ok:false, error: err});
						let exam = {
							info: data.exam.info,
							time: data.exam.time,
							score: data.exam.show_score,
							hint: data.exam.show_hint,
							repeat: data.exam.do_again,
						}
						res.render('layout', {
							page: 'people/test',
							title: data.exam.name,
							body_class: '',
							id: data.exam.link,
							exam: exam,
							questions: data.qa.questions,
						})
					})
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
		})
	}
}