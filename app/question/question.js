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

var insert_question_into_exam = function(exam, question) {
	_collection('exam').update({_id: objectId(exam)}, {$push: {questions: objectId(question)}})
};

module.exports = {
	do_create: function(data, user, _callback) {
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
			_collection('question').insertOne(insert, function(err, obj) {
				let id = obj.insertedId;
				insert_question_into_exam(data.exam, id);
				_callback(err, func.questions_template({_id: id}))
			})
		} else _callback(errors.not_enough_info)
	},
	do_update: function(data, user, _callback) {
		if(data.form != undefined) data.answers = func.answers_template(data.form);
		if(data.question != undefined && data.question != '') data.draft = false;
		data.creator = objectId(user._id);
		let id = data.id;
		delete data.exam;
		delete data.id;
		_collection('question').update({_id: objectId(id)}, {$set: data}, _callback)
	},
	do_delete: function(data, _callback) {
		if (data.id && data.question && data.exam) {
			async.parallel([
	      function(callback) {
	      	_collection('question').remove({_id: objectId(data.id)}, callback)
	      },
	      function(callback) {
	      	let target = {_id: objectId(data.exam)};
	      	_collection('exam').findOne(target, function(err,exam) {
						exam.questions.splice(data.question, 1);
						_collection('exam').update(target, {$set: {questions: exam.questions}}, callback)
					})
	      }
	    ], _callback)
		} else _callback(errors.not_enough_info)
	},
	do_remove: function(data, _callback) {
		if (data.id && data.question && data.exam) {
			let target = {_id: objectId(data.exam)};
	  	_collection('exam').findOne(target, function(err, exam) {
				exam.questions.splice(data.question, 1);
				_collection('exam').update(target, {$set: {questions: exam.questions}}, _callback)
			})
		} else _callback(errors.not_enough_info)
	},
	do_search: function(data, _callback) {
		if(!data.string) {
			_collection('question').find({creator: objectId(req.user._id)}).limit(5).toArray(_callback)
		} else {
			let tags = func.return_data_with_info(data.tags, ['_id']);
			let limit = (data.step) ? Number(data.step) : 5;
			_collection('question').find({
				question:{$regex: data.string, $options: 'i'},
				tags: {$in: tags}
			}).limit(limit).toArray(_callback)
		}
	},
	do_load: function(data, _callback) {
		if (data.id && data.exam) {
			async.waterfall([
				function(callback) {
					_collection('question').findOne({_id: objectId(data.id)}, callback)
				},
				function(question, callback) {
					delete question._id;
					question.exam = data.exam;
					_collection('question').insertOne(question, callback)
				}
			], function (err, obj) {
				insert_question_into_exam(obj.ops[0].exam, obj.insertedId);
				_callback(err, func.questions_template(obj.ops[0]))
			})
		} else _callback(errors.not_enough_info)
	}
}