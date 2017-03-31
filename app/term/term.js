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
	do_create: function(data, user, callback) {
		var insert = {
			name: data.name,
			groups: [],
			exams: [],
			info: {
				organization: '',
				email: '',
				address: '',
				time_start: '',
				time_end: '',
				date_start: '',
				date_end: '',
			},
			start: false,
			creator: objectId(user._id)
		}
		func.insert_one(_collection('term'), insert, callback)
	}
}