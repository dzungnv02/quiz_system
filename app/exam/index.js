const routes = require('../../config/util.js').routes;
const _exam = require('./exam.js');

module.exports = {
	route: function(app, auth) {
		let route = routes.creator.exam;

		app.get(route.index.path, auth.is_authenticated, function (req, res) {
      let data = {
				page: 'main',
				body_class: '',
				content: 'creator/exam',
				load_exam: null,
				title: route.index.title,
				username: req.user.username,
			}
			if(req.query.exam) data.load_exam = req.query.exam;
			res.render('layout', data)
    });
		app.post(route.create, auth.is_authenticated, function (req, res) {
      _exam.do_create(req.body, req.user, function(err, obj){
				if(err) return res.send({ok: false, error: err});
				res.send({ ok:true, exam: obj.insertedId})
			})
    });
    app.post(route.update, auth.is_authenticated, function (req, res) {
      _exam.do_update(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
    app.post(route.remove, auth.is_authenticated, function (req, res) {
      _exam.do_remove(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
    app.post(route.search, auth.is_authenticated, function (req, res) {
      _exam.do_search(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
    app.post(route.load, auth.is_authenticated, function (req, res) {
      _exam.do_load(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
    app.post(route.share, auth.is_authenticated, function (req, res) {
      _exam.do_share(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
	}
}