const mongo = require('../mongo.js');

var db;
var _collection = function(name) {
  if(!db) db = mongo.get_db()
  return db.collection(name)
}

var objectId = function(id) {
  return mongo.get_object_id(id);
};

module.exports = {
  update_group: function(id, group, callback) {
    _collection('user_activity').update({_id: objectId(id)}, {$push: {group: group}}, {upsert: true}, callback);
  },
  update_exam: function(id, exam, callback) {
    _collection('user_activity').update({_id: objectId(id)}, {$push: {exam: exam}}, {upsert: true}, callback);
  }
};