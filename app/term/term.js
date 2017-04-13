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

var filter_data = function(data) {
	let result = {}, tmp;
	result.name = (data.term_name) ? data.term_name : '';
	result.groups = (data.term_group) ? data.term_group : [];
	result.exams = (data.term_exam) ? data.term_exam : [];
	result.organization = (data.term_organization) ? data.term_organization : '';
	result.email = (data.term_organization_email) ? data.term_organization_email : '';
	result.address = (data.term_organization_address) ? data.term_organization_address : '';
	tmp = data.term_date.split(' ');
	result.time_start = tmp[0];
	result.time_end = tmp[3];
	result.date_start = tmp[1];
	result.date_end = tmp[4];
	return result
};

module.exports = {
	do_create: function(data, user, callback) {
		data = filter_data(data);
		var insert = {
			name: data.name,
			link: func.hash_string(data.name),
			groups: data.groups,
			exams: data.exams,
			info: {
				organization: data.organization,
				email: data.email,
				address: data.address,
				time_start: data.time_start,
				time_end: data.time_end,
				date_start: data.date_start,
				date_end: data.date_end,
			},
			start: false,
			creator: objectId(user._id)
		}
		_collection('term').insertOne(insert, callback)
	}
}