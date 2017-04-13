const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const async = common.modules.async;
const errors = common.errors;
const xml2js = common.modules.xml2js
const http = common.modules.http;

const user_activity = require('./activity.js');
const exam_online = require('../exam/online.js');
const _exam = require('../exam/exam.js');

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
					//data.scores.reverse();
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
};

var tags_init_from_api = function(tree) {
	let arr = [], tmp = [];
	for (var i = 0; i < tree.length; i++) {
		arr.push(tree[i].$);
		if(tree[i].node) arr = arr.concat(tags_init_from_api(tree[i].node));
	}
	return arr
};

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
						res.send({ok:true, data:func.return_data_with_info(groups, ['_id','name','exams'])})
					})
				} else {
					_collection('user_activity').findOne({_id: objectId(user._id)}, function(err, doc) {
						if(err) return res.send({ok: false, error: err});
						if (doc) {
							let arr = doc.group.reverse().filter(function(elem, pos, arr) {
						    return arr.indexOf(elem) == pos
						  }).slice(0,5);
						  for (let i = 0; i < arr.length; i++) arr[i] = objectId(arr[i]);
							_collection('user_group').find({_id: {$in: arr}}).toArray(function(err, groups) {
								if(err) return res.send({ok: false, error: err});
								res.send({
									ok: true,
									data: func.return_data_with_info(groups, ['_id','name','exams']),
									last: arr[0],
									exams_viewed: doc.exam.filter(function(elem, pos, arr) {
								    return arr.indexOf(elem) == pos
								  })
								})
							})
						} else res.send({ok: false, error: errors.not_found})
					})
				}
			} else res.send({ok: false, error: errors.not_enough_info})
		});

		app.post('/group-view-exam', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let user = req.user;
			if(data.group) {
				user_activity.update_group(user._id, data.group);
				if (data.exams) {
					for (let i = 0; i < data.exams.length; i++) data.exams[i] = objectId(data.exams[i]);
					_collection('exam').find({_id: {$in: data.exams}}).toArray(function(err, exams) {
						res.send(func.return_data_with_info(exams, ['_id','name','link','questions','time']))
					})
				} else res.send({ ok:false, err: errors.not_found})
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

		app.get('/assignment/:path', auth.is_authenticated, function(req, res) {
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

		app.get('/test', function(req, res) {
      let info = {
				url: 'http://api.violet.vn/test/generate/blog/14',
				category: '8275668',
				level: '0',
				type: 'choice',
				quantity: '10'
			}
      let api_url = info.url+'/cat_id/'+info.category+'/type/'+info.type+'/level/'+info.level+'/count/'+info.quantity;
      http.get(api_url, function(response) {
	      if (response.statusCode >= 200 && response.statusCode < 400) {
	      	let data = '';
	      	response.on('data', function(data_) { data += data_.toString(); });
	      	response.on('end', function() {
	      		let xml_parser = new xml2js.Parser();
		        xml_parser.parseString(data.toString(), function (err, questions) {
		        	if (questions) {
		        		let form = func.api_get_question_reformat(questions);
		        		res.render('layout', {
			     				page: 'people/test',
									title: 'exam',
									body_class: '',
									id: 'aaaa',
									exam: {
										info: questions.QUESTION_INFO.$['choice-title-1'],
										time: 3600,
										score: true,
										hint: true,
										repeat: false,
									},
									questions: form.questions,
								})
		        	} else res.send({ok:false, error: errors.not_found})
		        })
	       	})
	     	}
	    })
    });

		app.get('/path', function(req, res) {
			let api_url = 'http://api.violet.vn/resource/listcat/bl_name/tracnghiem/type/3';
			
			http.get(api_url, function(response) {
	      if (response.statusCode >= 200 && response.statusCode < 400) {
	      	let data = '';
	      	response.on('data', function(data_) { data += data_.toString(); });
	      	response.on('end', function() {
	      		let xml_parser = new xml2js.Parser();
		        xml_parser.parseString(data.toString(), function (err, data) {
		        	let arr = tags_init_from_api(data.LIBRARY.node);
		        	// _collection('subject_tag').remove({});
		        	// for (var i = 0; i < arr.length; i++) {
		        	// 	_collection('subject_tag').insert({name:arr[i].label, cat:arr[i].cat_id});
		        	// }
		          res.send(typeof data)
		        })
	       	})
	     	}
	    })
		})
		// CREATOR REQUESTS

		app.post('/abc-xyz', auth.is_authenticated, function (req, res) {
			let info = {
				url: 'http://api.violet.vn/test/generate/blog/14',
				category: req.body.qsubject,
				level: '0',
				type: 'choice',
				quantity: req.body.qnumber
			}
      let api_url = info.url+'/cat_id/'+info.category+'/type/'+info.type+'/level/'+info.level+'/count/'+info.quantity;
      http.get(api_url, function(response) {
	      if (response.statusCode >= 200 && response.statusCode < 400) {
	      	let data = '';
	      	response.on('data', function(data_) { data += data_.toString(); });
	      	response.on('end', function() {
	      		let xml_parser = new xml2js.Parser();
		        xml_parser.parseString(data.toString(), function (err, questions) {
		        	if (questions.QUESTION_INFO.item) {
		        		questions.tags = info.category;
		        		//res.send(func.api_get_question(questions, info.type))
		        		_exam.create_from_api({
				        	questions: func.api_get_question(questions, info.type),
				        	tags: info.category,
				        	info: questions.QUESTION_INFO.$['choice-title-1']
				        }, req.user, function(err, exam){
				        	res.send({ok:true, exam: exam.insertedId})
				        })
		        	} else res.send({ok:false, error: errors.not_found})
		        })

	       	})
	     	}
	    })
			
		});


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

		app.post('/term-list', auth.is_authenticated, function (req, res) {
			let user = req.user;
			func.find_by_creator(_collection('term'), user._id, function(err, terms) {
				res.send({ ok:true, terms: terms})
			})
		});

		app.post('/group-list', auth.is_authenticated, function (req, res) {
			let user = req.user;
			func.find_by_creator(_collection('user_group'), user._id, function(err, groups) {
				res.send({ ok:true, groups: groups})
			})
		});
	}
}