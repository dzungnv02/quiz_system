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
  route: function(app, auth) {
    app.get('/manager/tags-list', auth.is_authenticated, function (req, res) {
			_collection('subject_tag').find({}).toArray(function(err, tags) {
				if(err) res.send({ok: false, error: err})
				else if (tags) {
					res.send({ ok:true, tags: tags})
				} else res.send({ ok: false, error: errors.not_found})
			})
		})
  }
};