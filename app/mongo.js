const modules = require('../config/module.js');
const config = require('../config/config.js');
var mongo = modules.mongo;
var _db;

module.exports = {
  connect_to_server: function(callback) {
    mongo.MongoClient.connect(config.url_database, function(err, db) {
    	if (err) return callback(err);
      _db = db;
  		console.log("Connected correctly to server.");
      return callback(err)
    });
  },
  get_db: function() {
  	return _db
  },
  get_object_id: function(string) {
    return new mongo.ObjectID(string)
  }
};