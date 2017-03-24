const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const async = common.modules.async;
const errors = common.errors;

var db;
var _collection = function(name) {
  if(!db) db = mongo.get_db()
  return db.collection(name)
}

var objectId = function(id) {
  return mongo.get_object_id(id);
};

var send_join_request = function(user, target, callback) {
	_collection('user_group').update(target, {
		$push: {join_requests: objectId(user._id)}
	}, callback)
}

var accept_join_request = function(user, target, callback) {
	_collection('user_group').update(target, {
		$push: {users: objectId(user)
	}, $pull: {join_requests: objectId(user)}}, callback)
}

module.exports = {
	route: function(app, auth) {
		app.get('/manager/group', auth.is_authenticated, function (req, res) {
			let user = req.user;
			func.find_by_creator(_collection('user_group'), user._id, function(err, groups) {
				if(err) return res.send({ok: false, error: err});
				res.render('layout', {
					page: 'main',
					body_class: '',
					content: 'creator/group',
					title: 'Nhóm',
					groups: groups,
					username: req.user.username
				})
			})
		})

		app.post('/manager/group-create', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let user = req.user;
			if (data.title) {
				let insert = {
					name: req.body.title,
					users: [],
					exams: [],
					join_requests: [],
					creator: objectId(user._id),
				};
				func.insert_one(_collection('user_group'), insert, function(err, obj){
					if(err) return res.send({ok: false, error: err});
					res.send({ ok:true})
				})

			} else res.send({ ok: false, error: errors.not_enough_info})
		})

		app.post('/manager/group-delete', auth.is_authenticated, function (req, res) {
			let data = req.body;
			if (data.id) {
				func.remove_by_id(_collection('user_group'), data.id, function(err, obj) {
					if(err) return res.send({ok: false, error: err});
					res.send({ ok:true})
				})
			} else res.send({ ok: false, error: errors.not_enough_info})
		})

		app.post('/manager/group-join', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let user = req.user;
			if (data.name) {
				let target = {name: data.name};
				func.find_by_query(_collection('user_group'), target, function(err, group){
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
							send_join_request(user, target, function(err) {
								if(err) res.send({ok: false, error: err});
								res.send({ ok: true})
							})
						}
					} else res.send({ ok: false, error: errors.not_found})
				})
			} else res.send({ ok: false, error: errors.not_enough_info})
		})

		app.post('/manager/group-requests', auth.is_authenticated, function (req, res) {
			let data = req.body;
			let target = {_id: objectId(data.id)};
			if(data.accept && data.id) {
				accept_join_request(data.user, target, function(err) {
					if(err) res.send({ok: false, error: err})
					else res.send({ ok: true})
				})
			} else if (data.id) {
				func.find_by_id(_collection('user_group'), data.id, function(err, group){
					if (group) {
						func.find_by_id(_collection('user'), group.join_requests, function(err, users) {
							if(err) return res.send({ok: false, error: err});
							res.send({ ok:true, users: users})
						})
					} else res.send({ ok: false, error: errors.not_found})
				})
			} else res.send({ ok: false, error: errors.not_enough_info})
		})

		app.post('/manager/group-users', auth.is_authenticated, function (req, res) {
			let data = req.body;
			if (data.id) {
				func.find_by_id(_collection('user_group'), data.id, function(err, group) {
					if(err) return res.send({ok: false, error: err});
					if (group) {
						func.find_by_id(_collection('user'), group.users, function(err, users) {
							if(err) res.send({ok: false, error: err});
							if (users) res.send({ ok:true, users: users})
						})
					} else res.send({ ok: false, error: errors.not_found})
				})
			} else res.send({ ok: false, error: errors.not_enough_info})
		})

		app.get('/manager/group-list', auth.is_authenticated, function (req, res) {
			let user = req.user;
			func.find_by_creator(_collection('user_group'), user._id, function(err, groups) {
				if(err) return res.send({ok: false, error: err});
				if (groups) {
					res.send({ ok:true, groups: groups})
				} else res.send({ ok: false, error: errors.not_found})
			})
		})
	}
}