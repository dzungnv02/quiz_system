const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const errors = common.errors;
const passport = common.modules.passport;
const crypto = common.modules.crypto;
const routes = require('../../config/util.js').routes;

var db;
var _collection = function(name) {
  if(!db) db = mongo.get_db()
  return db.collection(name)
}

var insert_new_user = function(info, callback) {
	let data = {
		username: info.username,
		password: info.password,
		is_admin: false,
		is_creator: true
	};
	_collection('user').insertOne(data , function(err, obj) {
		data._id = obj.insertedID;
		_collection('user_activity').insertOne({_id: obj.insertedID, group: [], exam: []}, callback(data))
	})
};

var get_current_session_from_api = function(callback) {
	let api_url = 'http://api.violet.vn/user/getcurrentuser'
	func.parse_api(api_url, callback)
};

var login_from_api = function(username, password, callback) {
	let token = crypto.createHash('md5').update(username+'violet').digest('hex');
	let api_url = 'http://api.violet.vn/user/login/username/'+username+'/password/'+password+'/src/es/token/'+token;
	func.parse_api(api_url, callback)
};

var api_error = function(code) {
	if (code == 'errInvalidRequest') return errors.not_enough_info;
	if (code == 'errInvalidRequestData') return errors.not_enough_info;
	if (code == 'errUserNotFound') return errors.user_not_found;
	if (code == 'errIncorrectPassword') return errors.password_not_match;
	if (code == 'errUnactivatedUser') return errors.permission_denied;
	if (code == 'errSystemLoginError') return errors.system_failed;
};

module.exports = {
	isAuthenticated: function(req, res, next) {
		if (req.isAuthenticated()) return next();
		res.redirect(routes.login)
	},
	isAdmin: function(req, res, next) {
		if (req.isAuthenticated() && req.user.is_admin === true) return next();
	 	res.redirect(routes.login)
	},
	isCreator: function(req, res, next) {
		if (req.isAuthenticated() && (req.user.is_creator === true || req.user.is_admin === true )) return next()
	  res.redirect(routes.login)
	},
	route: function(app) {
		passport.serializeUser(function(user, done) {
			done(null, user);
		});

		passport.deserializeUser(function(user, done) {
			done(null, user);
		});

		passport.use('api-login', new common.modules.local(function(username, password, callback) {
			_collection('user').findOne({username: username}, function(err, user) {
				if(err) return callback(err);
				if(!user) {
					login_from_api(username, password, function(data) {
						if (!data.errCode && data.id)
							return insert_new_user({
								username:username, 
								password:password
							}, function(user) {
			  				return callback(null, user);
			  			})
						else callback(api_error(data.errCode));
					})
				} else {
					if(user.password != password) return callback(errors.password_not_match);
					return callback(null, user);
				}
			})
		}));

		app.post(routes.login, function(req, res, next) {
				passport.authenticate('api-login', function(err, user, info) {
			    if(err) return res.send({ok:false, error: err});
			    req.logIn(user, function(err) {
			      if (err) return next(err);
			      return res.send({ok:true, redirect: '/'})
			    })
			  })(req, res, next)
			}
		);

		//api.violet.vn/user/login/username/bigguy9x/password/123456/src/space/token/eaf0111ed71bb40f863c5a51c4f3a58c
		app.get(routes.login, function (req, res) {
			get_current_session_from_api(function(data) {
				if(data.id > 0) {
					console.log(data.id)
				} else {
					if (!req.user) {
						res.render('layout', {
							page: 'login',
							body_class: 'full-width page-condensed',
							title: 'Đăng nhập'
						})
					}
				}
			})
		});

		app.get(routes.logout, function(req, res) {
			req.session.destroy();
			req.logout();
			res.redirect(routes.login);
		});
	}
}