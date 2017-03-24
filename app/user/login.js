const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const errors = common.errors;
const passport = common.modules.passport;
const routes = require('../../config/util.js').routes;

var isAuthenticated = function (req, res, next) {
	if (req.isAuthenticated()) return next()
	else res.redirect(routes.login);
}

var isAdmin = function (req, res, next) {
	if (req.isAuthenticated() && req.user.is_admin === true) return next()
  else res.redirect(routes.login);
}

var isCreator = function (req, res, next) {
	if (req.isAuthenticated() && (req.user.is_creator === true || req.user.is_admin === true )) return next()
  else res.redirect(routes.login);
}

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

		passport.use(new common.modules.local(function(username, password, done) {
		  mongo.get_db().collection('user').findOne({username: username}, function(err, user) {
				if (err) { return done(err); }
				if (!user) { return done(null, false);}
				if (user.password != password) { return done(null, false); }
				return done(null, user);
		  });
		}));

		app.post(routes.login,
			passport.authenticate('local', { successRedirect: '/', failureRedirect: routes.login })
		);

		app.get(routes.login, function (req, res) {
			if (!req.user) {
				res.render('layout', {
					page: 'login',
					body_class: 'full-width page-condensed',
					title: 'Đăng nhập'
				})
			}
		});

		app.get(routes.logout, function(req, res) {
			req.session.destroy();
			req.logout();
			res.redirect(routes.login);
		});
	}
}