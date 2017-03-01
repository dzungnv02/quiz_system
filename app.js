const modules = require('./module.js');
const func = require('./function.js');
const assert = modules.assert;
const http = modules.http;
const fs = modules.fs;
const app = modules.express();
const MongoStore = require('connect-mongo')(modules.session);
const passport = modules.passport;
const body_parser = modules.body_parser;
const xml_parser = new modules.xml2js.Parser();
const upload = modules.multer({ dest: '/uploads/'});
const async = modules.async;
const ejs = modules.ejs;
const database_server = 'mongodb://127.0.0.1:27017/exam_system';

app.set('view engine', 'ejs');
app.set('view cache', false);
app.set('trust proxy', 1);
app.set('json spaces', 2);

app.use(modules.express.static(__dirname + '/public'));
app.use(body_parser.urlencoded({ extended: true }));
app.use(body_parser.json());
app.use(modules.session({
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

modules.mongo.MongoClient.connect(database_server, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");

  var User = db.collection('user'),
			Group = db.collection('user_group'),
			Term = db.collection('term'),
			Exam = db.collection('exam'),
			Question = db.collection('question'),
			Online = db.collection('exam_online'),
			Tag = db.collection('subject_tag'),
			Library = db.collection('library'),
			Bank = db.collection('question_bank');

// LOGIN
	passport.serializeUser(function(user, done) {
		done(null, user);
	});
	passport.deserializeUser(function(user, done) {
		done(null, user);
	});
	passport.use(new modules.local(function(username, password, done) {
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
			})
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
						username: user.username
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
					if (exams.length > 0) {
						exams.forEach(function(exam, i, array) {
							func.find_by_id(Group, exam.groups, function(err, data) {
								array[i].groups = data;
								if (i === array.length - 1) {
									callback(err, array)
								}
							})
						})
					} else callback(err, [])
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
		let user = get_user_in_session(req);
		Group.find({creator: objectId(user._id)}).toArray(function(err, groups) {
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
		let user = get_user_in_session(req);
		if (data.title) {
			let insert = {
				name: req.body.title,
				users: [],
				exams: [],
				join_requests: [],
				creator: objectId(user._id),
			};
			Group.insertOne(insert, function(err, obj){
				res.send({ ok:true})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/group-delete', isCreator, function (req, res) {
		let data = req.body;
		if (data.id) {
			Group.remove({_id: objectId(data.id)}, function(err, obj) {
				res.send({ok: true})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/group-update', isCreator, function (req, res) {
		let data = req.body;
		if (data.id && data.link) {
			Group.update({_id: objectId(data.id)}, {$push: {exams: objectId(data.link)}}, function(err, obj) {
				res.send({ok: true})
			})
		} else if(data.id) {

		} else res.send({ ok: false, error: errors.not_enough_info})
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
		let target = {_id: objectId(data.id)};
		if(data.accept && data.id) {
			Group.update(target, {$push: {users: objectId(data.user)}, $pull: {join_requests: objectId(data.user)}}, function(err) {
				if(err) res.send({ok: false, error: err})
				else res.send({ ok: true})
			})
		} else if (data.id) {
			Group.findOne(target, function(err, group){
				if (group) {
					func.find_by_id(Group, group.join_requests, function(err, users) {
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
			Group.findOne({_id: objectId(data.id)}, function(err, group){
				if (group) {
					func.find_by_id(Group, group.users, function(err, users) {
						if(err) res.send({ok: false, error: err});
						if (users) res.send({ ok:true, users: users})
					})
				} else res.send({ ok: false, error: errors.not_found})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
	});
	app.get('/manager/group-list', isCreator, function (req, res) {
		let user = get_user_in_session(req);
		Group.find({creator: objectId(user._id)}).toArray(function(err, groups) {
			if(err) res.send({ok: false, error: err})
			else if (groups) {
				res.send({ ok:true, groups: groups})
			} else res.send({ ok: false, error: errors.not_found})
		});
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
		let user = get_user_in_session(req);
		let data = {
			name: req.body.title,
			time: req.body.time,
			questions: [],
			shuffle: req.body.shuffle,
			done: false,
			tags: [],
			groups: [],
			link: '',
			show_score: false,
			show_hint: false,
			do_again: false,
			creator: objectId(user._id),
		};
		Exam.insertOne(data, function(err, obj){
			res.send({ ok:true, exam: obj.insertedId})
		});
	});
	app.post('/manager/exam-update/', isAuthenticated, function (req, res) {
		let data = req.body;
		if (data.id) {
			let id = data.id;
			delete data.id;
			if (data.shuffle) data.shuffle = func.string_to_bool(data.shuffle);
			if (data.score) data.shuffle = func.string_to_bool(data.score);
			if (data.hint) data.show_hint = func.string_to_bool(data.hint);
			if (data.repeat) data.do_again = func.string_to_bool(data.repeat);
			if(data.time) data.time = parseInt(data.time);
			Exam.update({_id: objectId(id)} , {$set: data}, function(err){
				res.send({ok:true})
			})
		} else res.send({ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/exam-delete/', isAuthenticated, function (req, res) {
		if (req.body.id) {
			Exam.remove({_id: objectId(req.body.id)})
		} else res.send({ok: false, error: errors.not_enough_info})
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
				exam_cancel_share(data, function(obj) {
					res.send(obj)
				})
			} else exam_share(data, function(obj) { res.send(obj) })
		} else res.send({ok: false, error: errors.not_enough_info})
	});
// END EXAM

// QUESTION
	app.post('/manager/question-create/', isAuthenticated, function (req, res) {
		let user = get_user_in_session(req);
		if (req.body.exam) {
			let exam = req.body.exam;
			let data = {
				exam: exam,
				question: '',
				answers: func.answers_template('true-false'),
				form: 'true-false',
				info: '',
				draft: true,
				tags: [],
				attachment: null,
				creator: objectId(user._id),
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
					info: null,
					draft: true
				}))
			})
		}
	});
	app.post('/manager/question-update/', isAuthenticated, function (req, res) {
		let data = req.body;
		let user = get_user_in_session(req);
		if(data.form != undefined) data.answers = func.answers_template(data.form);
		if(data.question != undefined && data.question != '') data.draft = false;
		data.creator = user._id;
		let id = data.id;
		delete data.exam;
		delete data.id;
		Question.update({_id: objectId(id)}, {$set: data}, function(err){
				res.send({ok:true})
			})
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
	      	Exam.findOne(target, function(err,exam) {
						exam.questions.splice(data.question, 1);
						Exam.update(target, {$set: {questions: exam.questions}})
					})
	        callback();
	      }], function(err) {
		    	if (err) return next(err);
		  });
		  res.send({ok:true})
		} else res.send({ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/question-remove/', isAuthenticated, function (req, res) {
		let data = req.body;
		if (data.id && data.question && data.exam) {
			let target = {_id: objectId(data.exam)};
	  	Exam.findOne(target, function(err, exam) {
				exam.questions.splice(data.question, 1);
				Exam.update(target, {$set: {questions: exam.questions}})
			})
		  res.send({ok:true})
		} else res.send({ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/question-search/', isAuthenticated, function (req, res) {
		Question.find({creator: objectId(req.user._id)}).toArray(function(err, questions){
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
		} else res.send({ok: false, error: errors.not_enough_info})
	});
// END QUESTION

// ANSWER
	app.post('/manager/answer-create/', isAuthenticated, function (req, res) {
		let data = req.body;
		if(data.question) {
			var insert = {
				text: '',
				is_correct: false,
				attachment: null
			};
			Question.update({_id: objectId(data.question)}, {$push: {answers: insert}}, function(err){
				if(err) return res.send({ok: false, error: err});
				return res.send({ ok:true})
			})
		} else res.send({ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/answer-update/', isAuthenticated, function (req, res) {
		let data = req.body;
		if (data.id) {
			update_answers({_id: objectId(data.id)}, data, function(err) {
				if(err) return res.send({ok: false, error: err});
				return res.send({ ok:true})
			})
		} else res.send({ ok: false, error: errors.not_enough_info})
	});
	app.post('/manager/answer-delete/', isAuthenticated, function (req, res) {
		let data = req.body;
		if(data.question && data.answer) {
			Question.findOne({_id: objectId(data.question)}, function(err, question) {
				question.answers.splice(data.answer, 1);
				Question.update(target, {$set: {answers: question.answers}})
			})
		} else res.send({ok: false, error: errors.not_enough_info})
	});
// END ANSWER

// SUBJECT TAG
	app.get('/manager/tags-list', isAuthenticated, function (req, res) {
		Tag.find({}).toArray(function(err, tags) {
			if(err) res.send({ok: false, error: err})
			else if (tags) {
				res.send({ ok:true, tags: tags})
			} else res.send({ ok: false, error: errors.not_found})
		})
	});
// END SUBJECT TAG

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
		if(data.id && data.answers) {
			let user_anwsers = data.answers;
			let score = 0;
			Online.findOne({_id: data.id}, function(err, doc) {
				if (err) res.send({ ok:false, err: err})
				else if(doc) {
					for (let i = 0; i < doc.users.length; i++) {
						let u = doc.users[i];
						if (user._id == u.user) {
							let cheatsheet = u.logs[u.logs.length - 1].cheatsheet;
							let score_avg = 10/cheatsheet.length;
							for (let i = 0; i < cheatsheet.length; i++) 
								if (cheatsheet[i] == user_anwsers[i]) score += score_avg;
							res.send({ ok:true, score: score.toFixed(2)})
						}
					}
				} else res.send({ ok:false, err: errors.not_found})
			})
		} else res.send({ ok:false, err: errors.not_found})
	});

	// app.get('/test', function(req, res) {
	// 	var url = 'http://api.violet.vn/test/generate/blog/14/cat_id/8257161/type/choice';
 //    http.get(url, function(res) {
	// 	res.on('data', function(data) {
 //      xml_parser.parseString(data.toString(), function (err, questions) {
	//       callback();
	//     })
 //    })
	// });

	app.get('/test/:link', isAuthenticated, function(req, res) {
		let link = req.params.link;
		if (link) {
			let user = get_user_in_session(req);
			if(user) {
				Online.findOne({_id: link}, function(err, doc) {
					if (doc) {
						Exam.findOne({_id: doc.exam}, function(err, exam) {
							func.find_by_id(Question, exam.questions, function(err, questions) {
				    		let data = func.question_reformat(questions, exam.shuffle);
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
										exam_online_update_user(link, insert, function(result) {

										})
									}
								}
								if(!checker) {
									let insert = {
										user: user._id,
										logs: [user_data]
									}
									exam_online_add_user(link, insert, function(result) {

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

	app.post('/group-list-exam', isAuthenticated, function(req, res) {
		let groups = req.body.groups,
				exam_array = exams = [];
		async.series([
			function(callback) {
				for (let i = 0; i < groups.length; i++) {
					exams.push({exams:[]});
					find_group_in_exam(groups[i], function(err, exam_array) {
						for (let j = 0; j < exam_array.length; j++) {
							exams[i].exams.push({
								name: exam_array[j].name,
								time: exam_array[j].time,
								question_number: exam_array[j].questions.length,
								link: exam_array[j].link,
							})
						}
						if( i == groups.length - 1) callback()
					})
				}
			},
			function(callback) {
				res.send({ok: true, exams: exams})
			}
		])
				
	})
// END USER REQUEST

// FUNCTIONS

	var objectId = function(id) {
		return new modules.mongo.ObjectID(id);
	};

	var get_user_in_session = function(req) {
		return req.user;
	};

	var find_group_in_exam = function(id, callback) {
		Exam.find({groups: objectId(id)}).toArray(callback)
	};

	var frontend_render = function(user, callback) {
		Group.find({users: objectId(user._id)}).toArray(function(err, groups) {
			if (groups) {
				let exams = groups.exam;
				if(err) callback({ok: false, error: err})
				else callback(data);
			}
		})
	};

	var exam_online_generate = function(id, data, callback) {
		let exam_online_id = func.randomStringAsBase64Url(20);
		let insert = {
			_id: exam_online_id,
			exam: id,
			users: []
		}
		Online.insert(insert, function(err, obj) {
			callback(exam_online_id)
		})
	};

	var exam_online_add_user = function(id, data, callback) {
		Online.update({_id: id}, {$push: {users: data}}, function(err, obj) {
			if(err) callback(err)
			else callback(true)
		})
	};

	var exam_online_update_user = function(id, data, callback) {
		Online.update({_id: id, 'users.user': data.user},{$push: {'users.$.logs': data.data}}, function(err, obj) {
			if(err) callback(err);
			else callback(true)
		})
	};

	var	group_add_exam = function(exam, group, callback) {
		let target;
		if (Array.isArray(group)) target = {_id: {$in: group}}
		else target = {_id: objectId(group)}
		Group.update(target, {$push: {exams: exam}}, {multi: true}, callback)
	};

	var	group_remove_exam = function(exam, group, callback) {
		let target;
		if (Array.isArray(group)) target = {_id: {$in: group}}
		else target = {_id: objectId(group)};
		Group.update(target, {$pull: {exams: exam}}, {multi: true}, callback)
	};

	var exam_add_group = function(exam, group, callback) {
		let query;
		if (group === '' || group === []) group = []
		else if (Array.isArray(group)) {
			for (var i = 0; i < group.length; i++) group[i] = objectId(group[i])
		}

		let group_remove_exam_list = func.get_element_different(exam.groups, group);
		if(group_remove_exam_list) group_remove_exam(exam.link, group_remove_exam_list);

		Exam.update({_id: objectId(exam._id)} , {$set: {groups: group}}, function(err) {
			if(exam.link) {
				if(exam.start_share) group_add_exam(exam.link, exam.groups, callback)
				else {
					let group_push_exam_list = func.get_element_different(group, exam.groups);
					group_add_exam(exam.link, group_push_exam_list, callback)
				}
			}
		})
	};

	var exam_remove_group = function(exam, group, callback) {
		Exam.update({_id: objectId(exam)}, {$pull: {groups: objectId(group)}}, callback)
	};

	var exam_share = function(data, callback) {
		Exam.findOne({_id: objectId(data.id)}, function(err, exam) {
			if (exam) {
				if (data.group != undefined || data.group != null) {
					exam_add_group(exam, data.group, callback({ok:true}))
				} else {
					exam_online_generate(exam._id, data, function(link) {
						Exam.update({_id: objectId(exam._id)}, {$set: {link: link}}, function() {
							exam.link = link;
							exam.start_share = true;
							exam_add_group(exam, exam.groups, callback({link: link}))
						})
					})
				}
			} else callback({ ok: false, error: errors.not_found})
		})
	};

	var exam_cancel_share = function(data, callback) {
		Exam.findOne({_id: objectId(data.id)}, function(err, exam) {
			if (exam) {
				Online.remove({_id: data.link});
				let query = {$set: {link: ''}} , group = exam.groups;
				if (group) {
					query = {$set: {link: ''}, $pull: {groups: group}};
					Group.update({_id: {$in: group}}, {$pull: {exams: exam.link}}, {multi: true})
				}
				Exam.update({_id: objectId(exam._id)}, query);
				callback({ ok: true})
			} else callback({ ok: false, error: errors.not_found})
		})
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
					info: questions[i]['info'],
					answers: questions[i]['answers'],
					form: questions[i]['form'],
					draft: questions[i]['draft']
				})
			}
		} else {
			result = ejs.render(template, {
				id: questions['_id'],
				question: questions['question'],
				info: questions['info'],
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
	    	func.find_by_id(Question, id, function(err, questions) {
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

	var update_answers = function(target, data, callback) {
		Question.findOne(target, function(err, question) {
			let q = func.answer_reformat(question, data)
			Question.update(target, {$set: q}, callback)
		})
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