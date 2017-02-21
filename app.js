const mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var ObjectID = mongo.ObjectID;

var assert = require('assert');
var http = require('http');
var express = require('express');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var fs = require('fs');
var crypto = require('crypto');
var base64url = require('base64url');

var app = express();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bodyParser = require('body-parser');

var xml2js = require('xml2js');
var xml_parser = new xml2js.Parser();

var multer = require('multer');
var upload = multer({ dest: '/uploads/'});

var async = require('async');
var ejs = require('ejs');

var database_server = 'mongodb://127.0.0.1:27017/exam_system';

app.set('view engine', 'ejs');
app.set('view cache', false);
app.set('trust proxy', 1);
app.set('json spaces', 2);

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'keyboard cat',
    name: 'APPID',
    proxy: true,
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
      url: database_server,
    })
}));
app.use(passport.initialize());
app.use(passport.session());

var dir = {
	templates: '/views/templates/'
}

var errors = {
	not_found: 'Không tìm thấy',
	system_failed: 'Hệ thống đang gặp sự cố',
	not_enough_info: 'Thông tin nhập vào không đầy đủ',
	already_in_group: 'Bạn đã ở trong nhóm',
}

MongoClient.connect(database_server, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");

  var User = db.collection('user'),
			Group = db.collection('group_user'),
			Term = db.collection('term'),
			Exam = db.collection('exam'),
			Question = db.collection('question'),
			Online = db.collection('exam_online'),
			Tag = db.collection('tag_subject'),
			Library = db.collection('library'),
			Bank = db.collection('question_bank');

// LOGIN
	passport.serializeUser(function(user, done) {
		done(null, user);
	});
	passport.deserializeUser(function(user, done) {
		done(null, user);
	});
	passport.use(new LocalStrategy(function(username, password, done) {
	  User.findOne({username: username}, function(err, user) {
			if (err) { return done(err); }
			if (!user) { return done(null, false);}
			if (user.password != password) { return done(null, false); }
			return done(null, user);
	  });
	}));

	var isAuthenticated = function (req, res, next) {
  	if (req.isAuthenticated()) return next()
  	else res.redirect('/login');
	}

	var isAdmin = function (req, res, next) {
		if (req.isAuthenticated() && req.user.is_admin === true) return next()
	  else res.redirect('/login');
	}

	var isCreator = function (req, res, next) {
		if (req.isAuthenticated() && (req.user.is_creator === true || req.user.is_admin === true )) return next()
	  else res.redirect('/login');
	}

	app.post('/login',
		passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' })
	);

	app.get('/login', function (req, res) {
		if (!req.user) {
			res.render('layout', {
				page: 'login',
				body_class: 'full-width page-condensed',
				title: 'Đăng nhập'
			});
		} else {
			res.status(404).body('Not found');
		}
	});
	app.get('/logout', function(req, res) {
		req.session.destroy();
		req.logout();
		res.redirect('/login');
	});
// END LOGIN

// MICS
	app.get('/', isAuthenticated, function (req, res) {
		let user = get_user_in_session(req);
		if (user.is_admin) res.redirect('/manager');
		else {
			Group.find({users: objectId(user._id)}).toArray(function(err, groups) {
				if(err) res.send({ok: false, error: err})
				else {
					res.render('layout', {
						page: 'frontend/main',
						body_class: 'full-width',
						content: 'home',
						title: 'Quản lý',
						groups: groups,
						username: req.user.username
					})
				}
			})
		}
	});

	app.get('/manager', isAdmin, function (req, res) {
		async.parallel([
			function(callback) {
				Term.find().toArray(function(err, terms) {
					callback(err, terms)
				})
			},
			function(callback) {
				Exam.find().toArray(function(err, exams) {
					callback(err, exams)
				})
			}
		],
		function(err, data){
		  res.render('layout', {
				page: 'main',
				body_class: '',
				content: 'home',
				title: 'Quản lý',
				terms: data[0],
				exams: data[1],
				username: req.user.username
			})
		})
	});
	
	app.get('/raw/:db', isAdmin, function (req, res) {
		let request = req.params.db;
		let respone;
		if (request == 'questions') Question.find().toArray(function(err, questions) {
			res.send(questions);
		});
		if (request == 'exams') Exam.find().toArray(function(err, exams) {
			res.send(exams);
		});
		if (request == 'users') User.find().toArray(function(err, users) {
			res.send(users);
		});
		if (request == 'groups') Group.find().toArray(function(err, groups) {
			res.send(groups);
		});
		if (request == 'exol') Online.find().toArray(function(err, exams) {
			res.send(exams);
		});
	});
// END MICS

// GROUP
	app.get('/manager/group', isCreator, function (req, res) {
		Group.find({creator: req.user.username}).toArray(function(err, groups) {
			if(err) res.send({ok: false, error: err})
			else {
				res.render('layout', {
					page: 'main',
					body_class: '',
					content: 'group',
					title: 'Nhóm',
					groups: groups,
					username: req.user.username
				})
			}
		})
	});
	app.post('/manager/group-create', isCreator, function (req, res) {
		let data = req.body;
		if (data.title) {
			let insert = {
				name: req.body.title,
				users: [],
				exams: [],
				join_requests: [],
				creator: req.user.username,
			};
			Group.insertOne(insert, function(err, obj){
				res.send({ ok:true})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
			
	});
	app.post('/manager/group-delete', isCreator, function (req, res) {
		console.log(req.body)
		if (req.body.id) {
			Group.remove({_id: objectId(req.body.id)}, function(err, obj) {
				res.send({ok: true})
			})
		}
	});
	app.post('/manager/group-join', isAuthenticated, function (req, res) {
		let data = req.body;
		let user = get_user_in_session(req);
		if (data.name) {
			let target = {name: data.name};
			Group.findOne(target, function(err, group){
				if(err) res.send({ok: false, error: err});
				if(group) {
					let checker = true;
					for (let i = 0; i < group.users.length; i++) {
						if(group.users[i] === user._id) {
							checker = false;
							res.send({ ok:false, error: errors.already_in_group})
						}
					}
					if(checker) {
						Group.update(target, {$push: {join_requests: objectId(user._id)}}, function(err) {
							res.send({ ok: true})
						})
					}
				} else res.send({ ok: false, error: errors.not_found})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/group-requests', isCreator, function (req, res) {
		let data = req.body;
		if (data.id) {
			Group.findOne({_id: objectId(data.id)}, function(err, group){
				if (group) {
					find_user_by_id(group.join_requests, function(err, users) {
						if(err) res.send({ok: false, error: err});
						if (users) res.send({ ok:true, users: users})
					})
				} else res.send({ ok: false, error: errors.not_found})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/group-users', isCreator, function (req, res) {
		let data = req.body;
		if (data.id) {
			Group.findOne({_id: data.id}, function(err, group){
				res.send({ ok:true, users: group.users})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
	});
// END GROUP

// TERM
	app.get('/manager/term', isAdmin, function (req, res) {
		res.render('layout', {
			page: 'main',
			body_class: '',
			content: 'create/term',
			title: 'Tạo cuộc thi',
			username: req.user.username
		});
	});
	app.post('/manager/term-create/', isAdmin, function (req, res) {
		var data = {
			name: req.body.termName,
			organization: req.body.termOrg,
			email: req.body.termEmail,
			address: req.body.termAddress,
			timeStart: req.body.timeStart,
			timeEnd: req.body.timeEnd,
			dateStart: req.body.dateStart,
			dateEnd: req.body.dateEnd,
			creator: req.user.username,
		};
		Term.insert(data, function(err, obj){
			res.send({ ok:true})
		});
	});
	app.post('/manager/term-start/', isAdmin, function (req, res) {

	});
	app.post('/manager/term-stop/', isAdmin, function (req, res) {

	});
	app.post('/manager/term-delete/', isAdmin, function (req, res) {

	});
// END TERM

// EXAM
	app.get('/manager/exam', isAuthenticated, function (req, res) {
		let data = {
			page: 'main',
			body_class: '',
			content: 'create/exam',
			load_exam: null,
			title: 'Quản lý',
			username: req.user.username,
		}
		if(req.query.exam) data.load_exam = req.query.exam;
		res.render('layout', data)
	});
	app.post('/manager/exam-create/', isAuthenticated, function (req, res) {
		let data = {
			name: req.body.title,
			time: req.body.time,
			questions: [],
			shuffle: req.body.shuffle,
			done: false,
			tags: [],
			link: '',
			show_score: false,
			show_hint: false,
			do_again: false,
			creator: req.user.username,
		};
		Exam.insertOne(data, function(err, obj){
			res.send({ ok:true, exam: obj.insertedId})
		});
	});
	app.post('/manager/exam-update/', isAuthenticated, function (req, res) {
		if (req.body.id) {
			let shuffle = false;
			let id = req.body.id;
			let data = req.body;
			delete data.id;
			if (data.shuffle == 'true') data.shuffle = true
			else data.shuffle = false;
			if (data.score == 'true') data.show_score = true
			else data.show_score = false;
			if (data.hint == 'true') data.show_hint = true
			else data.show_hint = false;
			if (data.repeat == 'true') data.do_again = true
			else data.do_again = false;
			if(data.time) data.time = parseInt(data.time);
			Exam.update({_id: objectId(id)} , {$set: data}, res.send(alertCallback))
		}
	});
	app.post('/manager/exam-delete/', isAuthenticated, function (req, res) {
		if (req.body.id) {
			Exam.remove({_id: objectId(req.body.id)})
		}
	});
	app.post('/manager/exam-search/', isAuthenticated, function (req, res) {
		Exam.find().toArray(function(err, exams){
			res.send(exams)
		});
	});
	app.post('/manager/exam-load/', isAuthenticated, function (req, res) {
		Exam.findOne({_id: objectId(req.body.id)}, function(err, exam) {
			if (exam) {
				server_exist_question_load(exam.questions, function(questions) {
					delete exam._id;
		  		res.send({q: questions, e: exam})
		  	})
			} else res.send(null)
		})
	});
	app.post('/manager/exam-share/', isAuthenticated, function (req, res) {
		let data = req.body;
		if (data.id) {
			if(data.cancel && data.link) {
				Exam.update({_id: objectId(data.id)}, {$set: {link: ''}});
				Online.remove({_id: data.link});
				res.send(null)
			} else {
				Exam.findOne({_id: objectId(data.id)}, function(err, exam) {
					if (exam) {
						generate_exam_online(exam._id, data, function(link) {
							Exam.update({_id: objectId(exam._id)} , {$set: {link: link}})
							res.send({link: link})
						})
					} else res.send(null)
				})
			}
		}
	});
// END EXAM

// QUESTION
	app.post('/manager/question-create/', isAuthenticated, function (req, res) {
		if (req.body.exam) {
			let exam = req.body.exam;
			let data = {
				exam: exam,
				question: '',
				answers: generate_answers('true-false'),
				form: 'true-false',
				info: '',
				draft: true,
				tags: [],
				attachment: null,
				creator: req.user.username,
			};
			Question.insertOne(data, function(err, obj) {
				let id = obj.insertedId;
				let template = fs.readFileSync(__dirname+dir.templates+'question-form.ejs', 'utf8');
				insert_question_into_exam(exam, id);
				res.send(ejs.render(template, {
					id: id,
					question: null,
					answers: null,
					form: null,
					draft: true
				}))
			})
		}
	});
	app.post('/manager/question-update/', isAuthenticated, function (req, res) {
		let data = req.body;
		if(data.form != undefined) data.answers = generate_answers(data.form);
		if(data.question != undefined && data.question != '') data.draft = false;
		data.creator = req.user.username;
		let id = data.id;
		delete data.exam;
		delete data.id;
		Question.update({_id: objectId(id)}, {$set: data}, res.send(alertCallback))
	});
	app.post('/manager/question-delete/', isAuthenticated, function (req, res) {
		let data = req.body;
		if (data.id && data.question && data.exam) {
			async.parallel([
	      function(callback) {
	      	Question.remove({_id: objectId(data.id)}, function(err) {
						if(err) console.log(err)
						else callback()
					})
	      },
	      function(callback) {
	      	let target = {_id: objectId(data.exam)};
	      	Exam.findOne(target, function(err,doc) {
						doc.questions.splice(data.question, 1);
						Exam.update(target, {$set: {questions: doc.questions}})
					})
	        callback();
	      }], function(err) {
		    	if (err) return next(err);
		  });
		  res.send(alertCallback())
		} else res.send(alertCallback(false))
	});
	app.post('/manager/question-remove/', isAuthenticated, function (req, res) {
		let data = req.body;
		if (data.id && data.question && data.exam) {
			let target = {_id: objectId(data.exam)};
	  	Exam.findOne(target, function(err, doc) {
				doc.questions.splice(data.question, 1);
				Exam.update(target, {$set: {questions: doc.questions}})
			})
		  res.send(alertCallback())
		} else res.send(alertCallback(false))
	});
	app.post('/manager/question-search/', isAuthenticated, function (req, res) {
		Question.find({creator: req.user.username}).toArray(function(err, questions){
			res.send(questions)
		});
	});
	app.post('/manager/question-load/', isAuthenticated, function (req, res) {
		let data = req.body;
		if (data.id && data.exam) {
			Question.findOne({_id: objectId(data.id)}, function(err, question) {
				delete question._id;
				question.exam = data.exam;
				Question.insertOne(question, function(err, obj) {
					generate_template_question(obj.ops[0], function(data) {
						insert_question_into_exam(question.exam, obj.insertedId);
			    	res.send(data)
			    })
				})
			})
		}
	});
// END QUESTION

// ANSWER
	app.post('/manager/answer-create/', isAuthenticated, function (req, res) {
		if(req.body.question) {
			var data = {
				text: '',
				is_correct: false,
				attachment: null
			};

			Question.update({_id: objectId(req.body.question)}, {$push: {answers: data}}, res.send(alertCallback))
		} else res.send(alertCallback(false))
	});
	app.post('/manager/answer-update/', isAuthenticated, function (req, res) {
		let alert = { ok: false};
		if (req.body.id) {
			alert = update_answers({_id: objectId(req.body.id)},req.body);
		} else alert = alertCallback(false)
		res.send(alert);
	});
	app.post('/manager/answer-delete/', isAuthenticated, function (req, res) {
		if(req.body.question && req.body.answer) {
			Question.find({_id: objectId(req.body.question)}).toArray(function(err,doc) {
				doc[0].answers.splice(req.body.answer, 1);
				Question.update(target, {$set: {answers: doc[0].answers}})
			})
		} else res.send(alertCallback(false))
	});
// END ANSWER

// LIBRARY
	app.post('/upload', upload.array('image[]', 12), function(req, res) {
		let files = req.files;
		if(files)
			for (let i = 0; i < files.length; i++) {
				fs.readFile(files[i].path, function (err, data) {
			    let imageName = files[i].originalname
			    if(!imageName){
			      console.log("There was an error");
			      res.redirect("/");
			      res.end();
			    } else {
			      let newPath = __dirname + "/uploads/thumbs/" + imageName;
			      fs.writeFile(newPath, data, function (err) {
			        console.log("Done")
			      })
			    }
			  })
			}
	});
	app.get('/library', isAuthenticated, function(req, res) {
		res.redirect('/library/questions')
	});
	app.get('/library/questions', isAuthenticated, function(req, res) {
		get_questions_by_username(req.user.username, function(err, questions) {
			res.render('layout', {
				page: 'main',
				body_class: '',
				content: 'library/library',
				sub_view: 'question',
				questions: questions,
				title: 'upload',
				username: req.user.username,
			})
		})
		  
	});
	app.get('/library/files', isAuthenticated, function(req, res) {
	  res.render('layout', {
			page: 'main',
			body_class: '',
			content: 'library/library',
			sub_view: 'file',
			title: 'upload',
			username: req.user.username,
		})
	});
// END LIBRARY

// USER REQUEST
	app.post('/score-view/', isAuthenticated, function (req, res) {
		let data = req.body;
		let user = get_user_in_session(req);
		console.log(data.answers);
		if(data.id && data.answers) {
			let user_anwsers = data.answers;
			let score = 0;
			Online.findOne({_id: data.id}, function(err, doc) {
				if (err) res.send({ ok:false, err: err})
				else {
					for (let i = 0; i < doc.users.length; i++) {
						let u = doc.users[i];
						if (user._id == u.user) {
							let cheatsheet = u.logs[u.logs.length - 1].cheatsheet;
							let score_avg = 10/cheatsheet.length;
							for (let i = 0; i < cheatsheet.length; i++) {
								if (cheatsheet[i] == user_anwsers[i]) score += score_avg;
							}
							res.send({ ok:true, score: score.toFixed(2)})
						}
					}
				}
			})
		} else res.send({ ok:false, err: errors.not_found})
	});

	// app.get('/test', function(req, res) {
	// 	var url = 'http://api.violet.vn/test/generate/blog/14/cat_id/8257161/type/choice';
	// 	var questions = null;
	// 	async.series([
	//     function(callback) {
	//       http.get(url, function(res) {
	// 			res.on('data', function(data) {
	// 	      xml_parser.parseString(data.toString(), function (err, result) {
	// 		      questions = result;
	// 		      callback();
	// 		    })
	// 	    })
	// 		}).on('error', function(e) {
	// 			console.log('Got error: ' + e.message);
	// 		})
	//       },
	//       function(callback) {
	//       	res.render('layout', {
	// 			page: 'exam',
	// 			title: 'exam',
	// 			exam_info: questions['QUESTION_INFO']['$']['choice-title'],
	// 			questions: api_get_question_reformat(questions),
	// 		})
	//           callback();
	//       }
	//   ], function(err) {
	//       if (err) return next(err);
	//   })
	// });

	app.get('/test/:link', isAuthenticated, function(req, res) {
		let link = req.params.link;
		if (link) {
			let user = get_user_in_session(req);
			if(user) {
				Online.findOne({_id: link}, function(err, doc) {
					if (doc) {
						Exam.findOne({_id: doc.exam}, function(err, exam) {
							find_questions(exam.questions, function(err, questions) {
				    		let data = question_reformat(questions, exam.shuffle);
				    		let checker = false;
				    		let question_id_array = [];
				    		for (let i = 0; i < data.questions.length; i++) {
				    			question_id_array.push(data.questions[i]._id)
				    		};
				    		let user_data = {
									questions: question_id_array,
									cheatsheet: data.answers,
									answers: [],
									date: Date.now(),
									score: 0,
									done: false,
									finish_time: 0
								};
								for (let i = 0; i < doc.users.length; i++) {
									let tmp = doc.users[i];
									if(user._id == tmp.user) {
										checker = true;
										let insert = {
											user: user._id,
											data: user_data
										}
										update_user_exam_online(link, insert, function(result) {

										})
									}
								}
								if(!checker) {
									let insert = {
										user: user._id,
										logs: [user_data]
									}
									push_user_exam_online(link, insert, function(result) {

									})
								}
								res.render('layout', {
									page: 'test',
									title: 'exam',
									body_class: '',
									id: exam.link,
									time: exam.time,
									exam_info: 'Với mỗi câu hỏi, hãy chọn một phương án đúng nhất.',
									questions: data.questions,
								})
				    	})
						})
					} else res.send({error: errors.not_found})
				})
			}
		} else res.send({error: errors.not_found})
	});

// END USER REQUEST

// FUNCTIONS

	var objectId = function(id) {
		return new ObjectID(id);
	};

	var get_user_in_session = function(req) {
		return req.user;
	};

	var find_user_by_id = function(id, callback) {
		if (Array.isArray(id)) {
			User.find({_id: {$in: id}}).toArray(function(err, users) {
		 		callback(err, users)
		 	})
		} else {
			User.find({_id: objectId(id)}).toArray(function(err, user) {
		 		callback(err, user)
		 	})
		}
	};

	var generate_exam_online = function(id, data, _callback) {
		let exam_online_id = randomStringAsBase64Url(20);
		let insert = {
			_id: exam_online_id,
			exam: id,
			users: []
		}
		Online.insert(insert, function(err, obj) {
			_callback(exam_online_id)
		})
	};

	var push_user_exam_online = function(id, data, _callback) {
		Online.update({_id: id}, {$push: {users: data}}, function(err, obj) {
			if(err) _callback(err);
			_callback(true)
		})
	};

	var update_user_exam_online = function(id, data, _callback) {
		Online.update({_id: id, 'users.user': data.user},{$push: {'users.$.logs': data.data}}, function(err, obj) {
			if(err) _callback(err);
			_callback(true)
		})
	};

	var generate_answers = function(form) {
		var data = [];
		if (form == 'true-false') {
			data = [
				{ text: null, is_correct: false, attachment: null}
			]
		}
		if (form == 'one-answer' || form == 'multi-answer') {
			data = [
				{ text: '', is_correct: true, attachment: null},
				{ text: '', is_correct: false,  attachment: null}
			]
		}
		return data
	};

	var find_questions = function(id, _callback) {
		if(Array.isArray(id)) {
		 Question.find({_id: {$in: id}}).toArray(function(err, questions) {
		 		_callback(null, questions);
		 })
		}
	};

	var generate_template_question = function(questions, callback) {
		let result;
		let template = fs.readFileSync(__dirname+dir.templates+'question-form.ejs', 'utf8');
		if(Array.isArray(questions)) {
			result = [];
			for (let i = 0; i < questions.length; i++) {
				result[i] = ejs.render(template, {
					id: questions[i]['_id'],
					question: questions[i]['question'],
					answers: questions[i]['answers'],
					form: questions[i]['form'],
					draft: questions[i]['draft']
				})
			}
		} else {
			result = ejs.render(template, {
				id: questions['_id'],
				question: questions['question'],
				answers: questions['answers'],
				form: questions['form'],
				draft: questions['draft']
			})
		}
		callback(result)
	};

	var server_exist_question_load = function(id, _callback) {
		let q = [];
		async.series([
	    function(callback) {
	    	find_questions(id, function(err, questions) {
	    		if (err) return callback(err)
	    		else {
	    			q = questions;
	    			callback()
	    		}
	    	})
	    },
	    function(callback) {
	    	generate_template_question(q, function(data) {
	    		_callback(data)
	    	})
	    }
	  ], function(err) {
	    if (err) return next(err)
	  })
	};

	var insert_question_into_exam = function(exam, question) {
		Exam.update({_id: objectId(exam)}, {$push: {questions: objectId(question)}})
	};

	var update_answers = function(target, data) {
		Question.find(target).toArray(function(err,doc) {
			let question = doc[0];
			if (question.form == 'true-false') {
				if (data.correct != undefined && data.correct == 'true') {
					question.answers[0].is_correct = true;
				} else question.answers[0].is_correct = false;
			}

			if (question.form == 'one-answer') {
				let checker;
				for (let i = 0; i < question.answers.length; i++) {
					if (question.answers[i].is_correct) checker = i;
					if (i == data.answer) {
						if (data.correct != undefined && data.correct) {
							question.answers[i].is_correct = true;
							question.answers[checker].is_correct = false
						}
						if (data.text != undefined) question.answers[i].text = data.text;
					}
				}
			}

			if (question.form == 'multi-answer') {
				for (let i = 0; i < question.answers.length; i++) {
					if (i == data.answer) {
						if (data.correct != undefined) {
							if (data.correct == 'true') question.answers[i].is_correct = true
							else question.answers[i].is_correct = false
						}
						if (data.text != undefined) question.answers[i].text = data.text;
					}
				}
			}
			Question.update(target, {$set: question}, function(err) {
				if(err) return { error: err};
				return { ok:true}
			})
		})
	};

	var get_questions_by_username = function(username, _callback) {
		Question.find({creator: username}).toArray(_callback)
	};

	var alertCallback = function(err) {
		var alert = { ok: false }
		if (err) {
			console.log(err)
		} else alert.ok = true
		return alert;
	};

	var api_get_question_reformat = function(questions) {
		let result = [];
		let input_type = 'radio';
		let Q = questions.QUESTION_INFO.item;
		Q.forEach(function(question, i) {
			let q = question.$;
			let list_answer = [];
			for (let i = 1; i < 100; i++) {
				let tmp = 'Answer'+i;
				if (q[tmp] != undefined || q[tmp] != null) list_answer.push(q[tmp])
				else break
			}
			if (q.type == '') input_type = '';
			let data = {
				_id: q.Id,
				question: q.Question,
				answer: q.Result,
				answers:list_answer,
				type: input_type,
			}
			result.push(data);
		});
		return result;
	};

	var question_reformat = function(questions, shuffle_exam) {
		let res = {
			questions: [],
			answers: []
		};
		questions.forEach(function(question, i) {
			if (question.question != '') {
				let list_answer = [];
				let line_style = '-inline';
				let input_type = 'radio';
				let tmp_answer;
				if (question.form == 'true-false') {
					list_answer = ['Đúng','Sai'];
					if (question.answers[0].is_correct) {
						if(shuffle_exam) tmp_answer = 'Đúng'
						else tmp_answer = 0
					} else tmp_answer = 1
				}

				if (question.form == 'one-answer') {
					for (let i = 0; i < question.answers.length; i++) { 
						if (question.answers[i].text != '') {
							list_answer.push(question.answers[i].text);
							if (question.answers[i].is_correct) 
								if(shuffle_exam) tmp_answer = question.answers[i].text
								else tmp_answer = i
						}
						if(line_style != '' && question.answers[i].text.length > 30) line_style = '';
					}
				}

				if (question.form == 'multi-answer') {
					input_type = 'checkbox';
					tmp_answer = [];
					for (let i = 0; i < question.answers.length; i++) { 
						if (question.answers[i].text != '') {
							list_answer.push(question.answers[i].text);
							if (question.answers[i].is_correct) 
								if(shuffle_exam) tmp_answer.push(question.answers[i].text)
								else tmp_answer.push(i)
						}
						if(line_style != '' && question.answers[i].text.length > 30) line_style = '';
					}
				}

				if(shuffle_exam) {
					let tmp_list_answer = shuffle(list_answer);
					if (Array.isArray(tmp_answer)) {
						tmp_answer.forEach(function(v, index) {
							for (let i = 0; i < tmp_list_answer.length; i++) {
								if(tmp_list_answer[i] == v) tmp_answer[index] = i;
							}
						})
						tmp_answer.reverse();
					} else {
						for (let i = 0; i < tmp_list_answer.length; i++) {
							if(tmp_list_answer[i] == tmp_answer) tmp_answer = i;
						}
					}
					list_answer = tmp_list_answer;
				}
				res.answers.push(tmp_answer);
				let data = {
					_id: question._id,
					question: question.question,
					answers: list_answer,
					type: input_type,
					style: line_style
				}
				res.questions.push(data)
			}
		});
		if (shuffle_exam) shuffle2(res.questions,res.answers);
		return res;
	};

	function random(low, high) {
	  return Math.floor(Math.random() * (high - low + 1) + low);
	};

	function shuffle(a) {
	  for (let i = a.length; i; i--) {
	    let j = Math.floor(Math.random() * i);
	    [a[i - 1], a[j]] = [a[j], a[i - 1]];
	  }
	  return a
	};

	function shuffle2(a,b) {
	  for (let i = a.length; i; i--) {
	    let j = Math.floor(Math.random() * i);
	    [a[i - 1], a[j]] = [a[j], a[i - 1]];
	    [b[i - 1], b[j]] = [b[j], b[i - 1]];
	  }
	};

	function flatten_array(a) {
		return [].concat.apply([], a)
	};

	function randomStringAsBase64Url(size) {
	  return base64url(crypto.randomBytes(size));
	};
// END FUNCTIONS

// START APP
	var server = app.listen(3000, function () {
		var host = server.address().address;
		var port = server.address().port;
		console.log('Listening at http://%s:%s', host, port);
	})
// END START APP
})