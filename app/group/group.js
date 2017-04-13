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

var is_exists_group = function(name, callback) {
	_collection('user_group').findOne({name: name}, callback)
}

module.exports = {
	do_create: function(data, user, callback) {
		if (data.title) {
			is_exists_group(data.title, function(err, group) {
				if (group) return callback(errors.group_exists);
				_collection('user_group').insertOne({
					name: data.title,
					users: [],
					exams: [],
					join_requests: [],
					creator: objectId(user._id),
				}, callback)
			})
		} else callback(errors.not_enough_info)
	},
	do_remove: function(data, _callback) {
		if (data.id) {
			func.remove_by_id(_collection('user_group'), data.id, _callback)
		} else _callback(errors.not_enough_info)
	},
	do_join: function(data, user, _callback) {
		if (data.name) {
			let target = {name: data.name};
			_collection('user_group').findOne(target, function(err, group){
				if(err) return _callback(err);
				if(group) {
					for (let i = 0; i < group.users.length; i++) {
						if(group.users[i] === user._id) return _callback(errors.already_in_group)
					}
					send_join_request(user, target, _callback)
				} else _callback(errors.not_found)
			})
		} else _callback(errors.not_enough_info)
	},
	do_request: function(data, _callback) {
		if(data.accept && data.id) {
			accept_join_request(data.user,  {_id: objectId(data.id)}, _callback)
		} else if (data.id) {
			func.find_by_id(_collection('user_group'), data.id, function(err, group){
				if(err) return _callback(err);
				if (group) {
					func.find_by_id(_collection('user'), group.join_requests, _callback)
				} else _callback(errors.not_found)
			})
		} else _callback(errors.not_enough_info)
	},
	list_user: function(data, _callback) {
		if (data.id) {
			func.find_by_id(_collection('user_group'), data.id, function(err, group) {
				if(err) return _callback(err);
				if (group) {
					func.find_by_id(_collection('user'), group.users, _callback)
				} else _callback(errors.not_found)
			})
		} else _callback(errors.not_enough_info)
	},
	list: function(user, _callback) {
		func.find_by_creator(_collection('user_group'), user._id, function(err, groups) {
			if(err) return _callback(err);
			if (groups) {
				_callback(null, { ok:true, groups: groups})
			} else _callback(errors.not_found)
		})
	}
}