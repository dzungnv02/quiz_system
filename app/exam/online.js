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

module.exports = {
  generate: function(id, data, callback) {
    _collection('exam_online').findOne({exam: id}, function(err, exam) {
      if (err) return callback(err);
      if (exam) return callback(exam._id);
      let exam_online_id = func.randomStringAsBase64Url(20);
      let insert = {
        _id: exam_online_id,
        exam: id,
        users: []
      }
      _collection('exam_online').insert(insert, function(err, obj) {
        callback(exam_online_id)
      })
    })
  },
  update_user: function(id, data, callback) {
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
        _collection('exam_online').update({_id: id, 'users.user': data.user},{$push: {'users.$.logs': user_data}}, callback)
      }
    }
    if(!checker) _collection('exam_online').update({_id: id}, {$push: {users: {user: data.user, logs: [user_data] }}}, callback)
  },
  update_user_logs: function(id, data, callback) {
    let log = data.log, user = data.user;
    _collection('exam_online').update({_id: id}, {$set: {['users.'+user+'.logs.'+log]: data.logs}}, callback)
  },
  get_exam_and_users: function(link, callback) {
    _collection('exam_online').findOne({_id: link}, function(err, doc) {
      if (err) return callback(err);
      func.find_by_id(_collection('exam'), doc.exam, function(err, exam) {
        if (err) return callback(err);
        callback(null, {users: doc.users, exam: exam})
      })
    })
  },
  analytics: function(id, callback) {
    _collection('exam_online').findOne({exam: objectId(id)}, function(err, doc) {
      if (err) return callback(err);
      if (doc) {
        let result = {
          users: doc.users.length,
          info: []
        }, tmp = [];
        for (let i = 0; i < doc.users.length; i++) tmp.push(objectId(doc.users[i].user));
        _collection('user').find({_id: {$in: tmp}}).toArray(function(err, users) {
          if (err) return callback(err);
          for (let i = 0; i < doc.users.length; i++) {
            let hight_score = 0, time_to_finish = 0, user = doc.users[i];
            for (let j = 0; j < user.logs.length; j++) {
              if (user.logs[j].done) {
                tmp = Number(user.logs[j].score);
                if(tmp > hight_score) hight_score = tmp;
                tmp = user.logs[j].finish_time - user.logs[j].date;
                if (tmp > time_to_finish) time_to_finish = tmp
              }
            }
            for (let i = 0; i < users.length; i++) 
              if (users[i]._id.equals(objectId(user.user))) tmp = users[i].username;
            result.info.push({
              user: tmp,
              score: hight_score,
              time: time_to_finish
            })
          }
          callback(err, result)
        })
      } else callback(errors.not_found)
    })
  },
  get_questions: function(exam, callback) {
    func.find_by_id(_collection('question'), exam.questions, function(err, questions) {
      if (err) return callback(err);
      callback(null, func.question_reformat(questions, exam.shuffle))
    })
  }
}