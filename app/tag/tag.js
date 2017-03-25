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
	list: function(user, _callback) {
		_collection('subject_tag').find({}).toArray(function(err, tags) {
			if(err) return _callback(err);
			if (tags) {
				_callback(null, { ok:true, tags: tags})
			} else _callback(errors.not_found)
		})
	}
};