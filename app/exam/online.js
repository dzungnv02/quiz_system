const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const async = common.modules.async;
const errors = common.errors;

var exam_online_generate = function(id, data, callback) {
  exo_collection.findOne({exam: id}, function(err, exam) {
    if (err) return callback(err);
    if (exam) return callback(exam._id);
    let exam_online_id = func.randomStringAsBase64Url(20);
    let insert = {
      _id: exam_online_id,
      exam: id,
      users: []
    }
    exo_collection.insert(insert, function(err, obj) {
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
      exo_collection.update({_id: id, 'users.user': data.user},{$push: {'users.$.logs': user_data}}, callback)
    }
  }
  if(!checker) exo_collection.update({_id: id}, {$push: {users: {user: data.user, logs: [user_data] }}}, callback)
};

var exam_online_update_user_logs = function(id, data, callback) {
  let log = data.log, user = data.user;
  exo_collection.update({_id: id}, {$set: {['users.'+user+'.logs.'+log]: data.logs}}, callback)
};

var exam_online_get_questions = function(link, _callback) {
  async.waterfall([
    function(callback) {
      exo_collection.findOne({_id: link}, function(err, doc) {
        if (err) return callback(err);
        callback(null, {users: doc.users, exam: doc.exam})
      })
    },
    function(data, callback) {
      func.find_by_id(exam_collection, data.exam, function(err, exam) {
        if (err) return callback(err);
        data.exam = exam;
        callback(null, data)
      })
    },
    function(data, callback) {
      func.find_by_id(question_collection, data.exam.questions, function(err, questions) {
        if (err) return callback(err);
        data.qa = func.question_reformat(questions, data.exam.shuffle);
        callback(null, data)
      })
    }
  ], function (err, data) {
      _callback(data)
  })
};

module.exports = {
  route: function(app, auth) {
    let db = mongo.get_db();
    let exam_collection = db.collection('exam');
    let exo_collection = db.collection('exam_online');
    let question_collection = db.collection('question');
    let user_collection = db.collection('user');

  }
}