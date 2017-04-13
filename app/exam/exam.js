const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const async = common.modules.async;
const errors = common.errors;
const routes = common.routes;
const exam_online = require('./online.js');

var db;
var _collection = function(name) {
  if(!db) db = mongo.get_db()
  return db.collection(name)
}

var objectId = function(id) {
  return mongo.get_object_id(id);
};

var exist_question_load = function(id, _callback) {
	func.find_by_id(_collection('question'), id, function(err, questions) {
		if (err) return _callback(err);
		_callback(err, func.questions_template(questions))
	})
};

var	group_add_exam = function(exam, group, callback) {
	let target;
	if (Array.isArray(group)) target = {_id: {$in: group}}
	else target = {_id: objectId(group)}
	_collection('user_group').update(target, {$push: {exams: exam}}, {multi: true}, callback)
};

var	group_remove_exam = function(exam, group, callback) {
	let target;
	if (Array.isArray(group)) target = {_id: {$in: group}}
	else target = {_id: objectId(group)};
	_collection('user_group').update(target, {$pull: {exams: exam}}, {multi: true}, callback)
};

var exam_add_group = function(exam, group, callback) {
	let query;
	if (group === '' || group === []) group = []
	else for (let i = 0; i < group.length; i++) group[i] = objectId(group[i]);

	let group_remove_exam_list = func.get_element_different(exam.groups, group);
	if(group_remove_exam_list) group_remove_exam(exam._id, group_remove_exam_list);

	_collection('exam').update({_id: objectId(exam._id)} , {$set: {groups: group}}, function(err) {
		if(exam.link) {
			if(exam.start_share) group_add_exam(exam._id, exam.groups, callback)
			else {
				let group_push_exam_list = func.get_element_different(group, exam.groups);
				group_add_exam(exam._id, group_push_exam_list, callback)
			}
		}
	})
};

var exam_share = function(data, callback) {
	_collection('exam').findOne({_id: objectId(data.id)}, function(err, exam) {
		if (exam) {
			if (data.group != undefined || data.group != null) {
				exam_add_group(exam, data.group, callback)
			} else {
				exam_online.generate(exam._id, data, function(link) {
					_collection('exam').update({_id: objectId(exam._id)}, {$set: {link: link}}, function() {
						exam.link = link;
						exam.start_share = true;
						exam_add_group(exam, exam.groups, callback(null, {link: link}))
					})
				})
			}
		} else callback(errors.not_found)
	})
};

var exam_cancel_share = function(data, callback) {
	_collection('exam').findOne({_id: objectId(data.id)}, function(err, exam) {
		if (exam) {
			let query = {$set: {link: ''}} , group = exam.groups;
			if (group) {
				query = {$set: {link: ''}, $pull: {groups: group}};
				_collection('user_group').update({_id: {$in: group}}, {$pull: {exams: exam.link}}, {multi: true})
			}
			_collection('exam').update({_id: objectId(exam._id)}, query, callback);
		} else callback(errors.not_found)
	})
};

module.exports = {
	do_create: function(data, user, callback) {
		let insert = {
			name: data.title,
			time: data.time,
			questions: [],
			shuffle: true,
			done: false,
			tags: [],
			groups: [],
			info: '',
			link: '',
			show_score: true,
			show_hint: false,
			do_again: true,
			creator: objectId(user._id),
		};
		_collection('exam').insertOne(insert, callback)
	},
	do_update: function(data, _callback) {
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
			_collection('exam').update({_id: objectId(id)} , {$set: data}, _callback)
		} else _callback(errors.not_enough_info)
	},
	do_remove: function(data, _callback) {
		if (data.id) {
			_collection('exam').remove({_id: objectId(data.id)}, _callback)
		} else _callback(errors.not_enough_info)
	},
	do_search: function(data, _callback) {
		_collection('exam').find().toArray(_callback);
	},
	do_load: function(data, _callback) {
		if (data.id) {
			_collection('exam').findOne({_id: objectId(data.id)}, function(err, exam) {
				if (exam) {
					func.find_by_id(_collection('subject_tag'), exam.tags, function(err, tags){
						exam.tags = tags;
						exist_question_load(exam.questions, function(err, questions) {
							delete exam._id;
				  		_callback(err, {q: questions, e: exam})
				  	})
					})
				} else _callback(errors.not_found)
			})
		} else _callback(errors.not_enough_info)
	},
	do_share: function(data, _callback) {
		if (data.id) {
			if(data.cancel && data.link) {
				exam_cancel_share(data, _callback)
			} else exam_share(data, _callback)
		} else _callback(errors.not_enough_info)
	},
	do_analytics: function(data, _callback) {
		if (data.id) {
			exam_online.analytics(data.id, _callback)
		} else _callback(errors.not_enough_info)
	},
	list: function(user, _callback) {
		func.find_by_creator(_collection('exam'), user._id, function(err, exams) {
			if(err) return _callback(err);
			if (exams) {
				_callback(null, { ok:true, exams: exams})
			} else _callback(errors.not_found)
		})
	},
	create_from_api: function(data, user, callback) {
		if (data && data != []) {
			for (var i = 0; i < data.questions.length; i++) data.questions[i].creator = objectId(user._id);
			_collection('question').insertMany(data.questions, function(err, obj) {
				_collection('exam').insertOne({
					name: 'Bài kiểm tra '+ new Date().toJSON().slice(0,19).replace(/:|T/g,'-'),
					time: 3600,
					questions: obj.insertedIds,
					shuffle: true,
					done: false,
					tags: [],
					groups: [],
					info: data.info,
					link: '',
					show_score: true,
					show_hint: false,
					do_again: true,
					creator: objectId(user._id),
				}, callback)
			})
		} else callback(errors.not_enough_info)
	},
}