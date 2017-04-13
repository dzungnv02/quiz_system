const routes = require('../../config/util.js').routes;
const _group = require('./group.js');

module.exports = {
	route: function(app, auth) {
		let route = routes.creator.group;

		app.get(route.index.path, auth.is_authenticated, function (req, res) {
			res.render('layout', {
				page: 'main',
				body_class: '',
				content: 'creator/group',
				title: route.index.title,
				username: req.user.username
			})
    });
    
		app.post(route.create, auth.is_authenticated, function (req, res) {
      _group.do_create(req.body, req.user, function(err, obj){
				if(err) return res.send({ok: false, error: err});
				res.send({ok: true, group: obj.insertedId})
			})
    });
    app.post(route.remove, auth.is_authenticated, function (req, res) {
      _group.do_remove(req.body, function(err, obj){
				if(err) return res.send({ok: false, error: err});
				res.send(obj)
			})
    });
    app.post(route.join, auth.is_authenticated, function (req, res) {
      _group.do_join(req.body, req.user, function(err, obj){
				if(err) return res.send({ok: false, error: err});
				res.send({ok: true})
			})
    });
    app.post(route.request, auth.is_authenticated, function (req, res) {
      _group.do_request(req.body, function(err, users){
				if(err) return res.send({ok: false, error: err});
				res.send({ ok:true, users: users})
			})
    });
    app.post(route.user, auth.is_authenticated, function (req, res) {
      _group.list_user(req.body, function(err, users){
				if(err) return res.send({ok: false, error: err});
				res.send({ ok:true, users: users})
			})
    });
    app.get(route.list, auth.is_authenticated, function (req, res) {
      _group.list(req.user, function(err, obj){
				if(err) return res.send({ok: false, error: err});
				res.send(obj)
			})
    });
	}
}