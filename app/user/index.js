const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const async = common.modules.async;
const errors = common.errors;
const routes = common.routes;

var ui_frontend_get_data = function(user, callback) {
	let db = mongo.get_db();
	func.find_by_id(db.collection('user_activity'), user._id, function(err, doc) {
		if(err) return callback(err, []);
		if (doc) {
			let tmp = doc.exam;
			if(tmp.length > 6) tmp = tmp.slice(-5);
			let exams = [];
			async.eachSeries(tmp, function(elem, next) {
				func.find_by_id(db.collection('exam'), elem, function(err, exam) {
					exams.push(exam);
					next()
				})
			}, function(err) {
			  callback(err, func.return_data_with_info(exams,['name','time','questions','link']))
			})
		} else callback(err, [])
	})
};

var ui_creator_get_data = function(user, _callback) {
	let db = mongo.get_db();
	async.parallel([
		function(callback) {
			func.find_by_creator(db.collection('term'), user._id, callback)
		},
		function(callback) {
			func.find_by_creator(db.collection('exam'), user._id, function(err, exams) {
				if (exams.length > 0) {
					async.eachSeries(exams, function(exam, next) {
						func.find_by_id(db.collection('user_group'), exam.groups, function(err, groups) {
							exam.groups = func.return_data_with_info(groups, ['_id','name']);
							next()
						})
					}, function(err) {
					  callback(err, exams)
					})
				} else callback(err, [])
			})
		}
	], _callback)
};

module.exports = {
	route: function(app, auth) {
		app.get(routes.people.index.path, auth.is_authenticated, function (req, res) {
			let user = req.user;
			if (user.is_admin) res.redirect(routes.creator.index);
			ui_frontend_get_data(user, function(err, data) {
				if(err) return res.send({ok: false, error: err});
				res.render('layout', {
					page: 'people/main',
					body_class: 'full-width',
					content: 'home',
					title: routes.people.index.title,
					exams: data,
					username: user.username
				})
			})
		})

		app.get(routes.creator.index.path, auth.is_admin, function (req, res) {
			let user = req.user;
			ui_creator_get_data(user, function(err, data) {
				if(err) return res.send({ok: false, error: err});
				let exams = func.return_data_with_info(data[1], ['_id','name','link','questions','groups']);
			  res.render('layout', {
					page: 'main',
					body_class: '',
					content: 'creator/home',
					title: routes.creator.index.title,
					exams: exams,
					username: user.username
				})
			})
		})
	}
}