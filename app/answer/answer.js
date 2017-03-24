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

var update_answers = function(target, data, callback) {
  _collection('question').findOne(target, function(err, question) {
    let q = func.answer_reformat(question, data);
    _collection('question').update(target, {$set: q}, callback)
  })
};
  
module.exports = {
  do_create: function(data, _callback) {
    if(data.question) {
      let insert = {
        text: '',
        is_correct: false,
        attachment: null
      };
      _collection('question').update({_id: objectId(data.question)}, {$push: {answers: insert}}, _callback)
    } else _callback(errors.not_enough_info)
  },
  do_update: function(data, _callback) {
    if (data.id) {
      update_answers({_id: objectId(data.id)}, data, _callback)
    } else _callback(errors.not_enough_info)
  },
  do_remove: function(data, _callback) {
    if(data.question && data.answer) {
      _collection('question').findOne({_id: objectId(data.question)}, function(err, question) {
        question.answers.splice(data.answer, 1);
        _collection('question').update(target, {$set: {answers: question.answers}}, _callback)
      })
    } else _callback(errors.not_enough_info)
  }
}