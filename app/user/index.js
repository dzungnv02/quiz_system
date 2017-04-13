const routes = require('../../config/util.js').routes;

module.exports = {
	route: function(app, auth) {
		app.get(routes.people.index.path, auth.is_authenticated, function (req, res) {
			let user = req.user;
			if (user.is_admin || user.is_creator) return res.redirect(routes.creator.index.path);
			res.render('layout', {
				page: 'people/main',
				body_class: 'full-width',
				content: 'home1',
				title: routes.people.index.title,
				username: user.username
			})
		})

		app.get(routes.creator.index.path, auth.is_creator, function (req, res) {
			let user = req.user;
		  res.render('layout', {
				page: 'main',
				body_class: '',
				content: 'creator/home',
				title: routes.creator.index.title,
				username: user.username
			})
		})

	}
}