const routes = require('../../config/util.js').routes;
const _term = require('./term.js');

module.exports = {
  route: function(app, auth) {
  	let route = routes.creator.term;

  	app.get(route.index.path, auth.is_authenticated, function (req, res) {
      let data = {
				page: 'main',
				body_class: '',
				content: 'creator/term',
				load_exam: null,
				title: route.index.title,
				username: req.user.username,
			}
			res.render('layout', data)
    })

		app.post(route.create, auth.is_authenticated, function (req, res) {
      _term.do_create(req.body, req.user, function(err, obj){
				if(err) return res.send({ok: false, error: err});
				res.send(obj)
			})
    })
  }
};