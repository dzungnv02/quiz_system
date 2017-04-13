const routes = require('../../config/util.js').routes;
const _question = require('./question.js');

function reports(err, info, res) {
	if(err) return res.send({ok: false, error: err});
	res.send(info)
}

module.exports = {
	route: function(app, auth) {
		let route = routes.creator.question;

		app.post(route.create, auth.is_authenticated, function (req, res) {
			_question.do_create(req.body, req.user, function(err, info){
				if(err) return res.send({ok: false, error: err});
				res.send(info)
			})
		});
		app.post(route.update, auth.is_authenticated, function (req, res) {
			_question.do_update(req.body, req.user, function(err, info){
				if(err) return res.send({ok: false, error: err});
				res.send(info)
			})
		});
		app.post(route.delete, auth.is_authenticated, function (req, res) {
			_question.do_delete(req.body, function(err, info){
				if(err) return res.send({ok: false, error: err});
				res.send(info)
			})
		});
		app.post(route.remove, auth.is_authenticated, function (req, res) {
			_question.do_remove(req.body, function(err, info){
				if(err) return res.send({ok: false, error: err});
				res.send(info)
			})
		});
		app.post(route.search, auth.is_authenticated, function (req, res) {
			_question.do_search(req.body, req.user, function(err, questions){
				if(err) return res.send({ok: false, error: err});
				res.send(questions)
			})
		});
		app.post(route.load, auth.is_authenticated, function (req, res) {
			_question.do_load(req.body, function(err, info){
				if(err) return res.send({ok: false, error: err});
				res.send(info)
			})
		});
	}
}