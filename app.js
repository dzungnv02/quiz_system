const modules = require('./module.js');
const func = require('./function.js');
const errors = require('./error.js');
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
const compression = modules.compression;

const database_server = 'mongodb://127.0.0.1:27017/exam_system';
const dir = {
	templates: '/views/templates/'
}

app.set('view engine', 'ejs');
app.set('view cache', false);
app.set('trust proxy', 1);
app.set('json spaces', 2);

app.use(compression());
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

modules.mongo.MongoClient.connect(database_server, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");

  const User = db.collection('user'),
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

	app.get('/', isAuthenticated, function (req, res) {
		let user = get_user_in_session(req);
		if (user.is_admin) res.redirect('/manager');
		ui_frontend_get_data(user, function(err, data) {
			if(err) return res.send({ok: false, error: err});
			res.render('layout', {
				page: 'frontend/main',
				body_class: 'full-width',
				content: 'home',
				title: 'Quản lý',
				data: ui_frontend_calc_data(data),
				username: user.username
			})
		})
	});

	app.get('/manager', isAdmin, function (req, res) {
		let user = get_user_in_session(req);
		ui_creator_get_data(function(err, data) {
			if(err) return res.send({ok: false, error: err});
		  res.render('layout', {
				page: 'main',
				body_class: '',
				content: 'home',
				title: 'Quản lý',
				terms: data[0],
				exams: data[1],
				username: user.username
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
					func.find_by_id(User, group.join_requests, function(err, users) {
						if(err) return res.send({ok: false, error: err});
						res.send({ ok:true, users: users})
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
		})
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
			info: '',
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
			if (data.show_score) data.show_score = func.string_to_bool(data.show_score);
			if (data.show_hint) data.show_hint = func.string_to_bool(data.show_hint);
			if (data.do_again) data.do_again = func.string_to_bool(data.do_again);
			if(data.time) data.time = parseInt(data.time);
			if(data.tags) {
				let tags = data.tags;
				for (let i = 0; i < tags.length; i++) tags[i] = objectId(tags[i])
			}
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
				func.find_by_id(Tag, exam.tags, function(err, tags){
					exam.tags = tags;
					server_exist_question_load(exam.questions, function(questions) {
						delete exam._id;
			  		res.send({q: questions, e: exam})
			  	})
				})
			} else res.send({ok: false, error: errors.not_found})
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
		let data = req.body;
		if (data.exam) {
			let insert = {
				exam: data.exam,
				question: '',
				answers: func.answers_template('true-false'),
				form: 'true-false',
				info: '',
				draft: true,
				tags: func.return_array_of_info(data.tags, '_id'),
				attachment: null,
				creator: objectId(user._id),
			};
			Question.insertOne(insert, function(err, obj) {
				let id = obj.insertedId;
				let template = fs.readFileSync(__dirname+dir.templates+'question-form.ejs', 'utf8');
				insert_question_into_exam(data.exam, id);
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
		data.creator = objectId(user._id);
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
						if(err) return callback(err);
						callback()
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
		let data= req.body;
		if(!data.string) {
			Question.find({creator: objectId(req.user._id)}).limit(5).toArray(function(err, questions){
				res.send(questions)
			})
		} else {
			let tags = func.return_data_with_info(data.tags, ['_id']);
			let limit = (data.step) ? Number(data.step) : 5;
			Question.find({
				question:{$regex: data.string, $options: 'i'},
				tags: {$in: tags}
			}).limit(limit).toArray(function(err, questions){
				res.send(questions)
			})
		}
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
			let insert = {
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

	app.post('/load-more', isAuthenticated, function (req, res) {
		let data = req.body;
		if(data.type && data.step) {
			if (data.type == 'question') {
				Question.find({creator: objectId(req.user._id)}).limit(Number(data.step)+5).toArray(function(err, questions){
					res.send(func.return_data_with_info(questions, ['_id','question']))
				})
			}
			if (data.type == 'exam') {
				Exam.find({creator: objectId(req.user._id)}).limit(Number(data.step)+5).toArray(function(err, exams){
					res.send(func.return_data_with_info(exams, ['_id','name','done']))
				})
			}
		} else res.send({ok: false, error: errors.not_enough_info})
	});

	app.post('/get-score/', isAuthenticated, function (req, res) {
		let data = req.body;
		let user = get_user_in_session(req);
		if(data.id && data.answers) {
			let user_anwsers = data.answers;

			Online.findOne({_id: data.id}, function(err, doc) {
				if (err) return res.send({ok:false, err: err});
				if(doc) {
					for (let i = 0; i < doc.users.length; i++) {
						let u = doc.users[i];
						if (user._id == u.user) {
							let user_log = u.logs.length - 1;
							let cheatsheet = u.logs[user_log].cheatsheet;
							let result = func.calculate_test_result(user_anwsers, cheatsheet);
							exam_online_update_user_logs(data.id, {
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

	// app.get('/test', function(req, res) {
	// 	let url = 'http://api.violet.vn/test/generate/blog/14/cat_id/8257161/type/choice';
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
			if(user) exam_online_get_questions(link, function(data) {
				user_update_exam(user._id, data.exam._id);
				exam_online_update_user(link, {
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
						page: 'test',
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

	app.post('/get-histories', isAuthenticated, function(req, res) {
		let data = req.body;
		let user = get_user_in_session(req);
		if(data.id) {
			user_exam_histories(data.id, user, function(result) {
				res.send({ok: true, data: result})
			})
		}
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

	var user_update_exam = function(id, exam, callback) {
		User.update({_id: objectId(id)}, {$push: {exam: objectId(exam)}}, callback);
	};

	var exam_online_generate = function(id, data, callback) {
		Online.findOne({exam: id}, function(err, exam) {
			if (err) return callback(err);
			if (exam) return callback(exam._id);
			let exam_online_id = func.randomStringAsBase64Url(20);
			let insert = {
				_id: exam_online_id,
				exam: id,
				users: []
			}
			Online.insert(insert, function(err, obj) {
				callback(exam_online_id)
			})
		})
	};

	var exam_online_update_user = function(id, data, callback) {
		let checker = false;
		let question_id_array = [];
		let user_data = {
			cheatsheet: data.answers,
			answers: [],
			date: Date.now(),
			score: 0,
			done: false,
			finish_time: 0
		};
		for (let i = 0; i < data.users.length; i++) {
			if(data.user == data.users[i].user) {
				checker = true;
				Online.update({_id: id, 'users.user': data.user},{$push: {'users.$.logs': user_data}}, callback)
			}
		}
		if(!checker) Online.update({_id: id}, {$push: {users: {user: data.user, logs: [user_data] }}}, callback)
	};

	var exam_online_update_user_logs = function(id, data, callback) {
		let log = data.log, user = data.user;
		Online.update({_id: id}, {$set: {['users.'+user+'.logs.'+log]: data.logs}}, callback)
	};

	var exam_online_get_questions = function(link, _callback) {
		async.waterfall([
	    function(callback) {
	      Online.findOne({_id: link}, function(err, doc) {
	      	if (err) return callback(err);
	      	callback(null, {users: doc.users, exam: doc.exam})
	      })
	    },
	    function(data, callback) {
	      Exam.findOne({_id: data.exam}, function(err, exam) {
	      	if (err) return callback(err);
	      	data.exam = exam;
	      	callback(null, data)
	      })
	    },
	    function(data, callback) {
	      func.find_by_id(Question, data.exam.questions, function(err, questions) {
	      	if (err) return callback(err);
	      	data.qa = func.question_reformat(questions, data.exam.shuffle);
	      	callback(null, data)
				})
	    }
		], function (err, data) {
		    _callback(data)
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
			for (let i = 0; i < group.length; i++) group[i] = objectId(group[i])
		}

		let group_remove_exam_list = func.get_element_different(exam.groups, group);
		if(group_remove_exam_list) group_remove_exam(exam._id, group_remove_exam_list);

		Exam.update({_id: objectId(exam._id)} , {$set: {groups: group}}, function(err) {
			if(exam.link) {
				if(exam.start_share) group_add_exam(exam._id, exam.groups, callback)
				else {
					let group_push_exam_list = func.get_element_different(group, exam.groups);
					group_add_exam(exam._id, group_push_exam_list, callback)
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

	var ui_creator_get_data = function(_callback) {
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
		], _callback)
	};

	var ui_frontend_get_data = function(user, _callback) {
		async.parallel([
			function(callback){
				for(let i = 0; i < user.exam.length; i++) user.exam[i] = objectId(user.exam[i]);
				Exam.find({_id: {$in: user.exam}}).toArray(function(err, exams) {
					if(err) return callback(err);
					callback(null, exams)
				})
			},
			function(callback) {
				Group.find({users: objectId(user._id)}).toArray(function(err, groups) {
					if(err) return callback(err);
					for (let i = 0; i < groups.length; i++) {
						func.find_by_id(Exam, groups[i].exams, function(err, exams) {
							groups[i].exams = exams;
							if(i == groups.length - 1) callback(null, groups)
						})
					}
				})
			}
		], _callback)
	};

	var ui_frontend_calc_data = function(result) {
		let exams = result[0], groups = result[1];
		let data = {
			groups: {
				list: []
			},
			exams: {
				histories: []
			}
		}
		for(let i = 0; i < groups.length; i++) {
			data.groups.list.push({
				name: groups[i].name,
				exams: groups[i].exams
			})
		}
		for(let i = 0; i < exams.length; i++) {
			let tmp = exams[i];
			data.exams.histories.push({
				name: tmp.name,
				time: tmp.time / 60,
				question_number: tmp.questions.length,
				link: tmp.link,
				groups: []
			})
			for(let j = 0; j < tmp.groups.length; j++) {
				for(let k = 0; k < groups.length; k++) {
					if(tmp.groups[j].equals(groups[k]._id))
						data.exams.histories[i].groups.push(groups[k].name);
				}
			}
		}
		return data
	};

	var user_exam_histories = function(exam, user, callback) {
		Online.findOne({_id: exam}, function(err, exam) {
			if (err) return callback(err);
			let logs = null, data = null;
			if(exam) {
				data = {
					try_number: 0,
					avg_score: 0,
					avg_time_finish: 0,
					scores: [],
					last_try: null,
				}
				for (let i = 0; i < exam.users.length; i++) 
					if(user._id = exam.users[i].user) logs = exam.users[i].logs;
				if (logs) {
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
	    		if (err) return callback(err);
    			q = questions;
    			callback()
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
		let host = server.address().address;
		let port = server.address().port;
		console.log('Listening at http://%s:%s', host, port);
	})
// END START APP
})