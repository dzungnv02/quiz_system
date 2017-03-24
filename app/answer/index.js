const routes = require('../../config/util.js').routes;
const _answer = require('./answer.js');
  
module.exports = {
  route: function(app, auth) {
    let route = routes.creator.answer;

    app.post(route.create, auth.is_authenticated, function (req, res) {
      _answer.do_create(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
    app.post(route.update, auth.is_authenticated, function (req, res) {
      _answer.do_update(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
    app.post(route.remove, auth.is_authenticated, function (req, res) {
      _answer.do_remove(req.body, function(err, info){
        if(err) return res.send({ok: false, error: err});
        res.send(info)
      })
    });
  }
}