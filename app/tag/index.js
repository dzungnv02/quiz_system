const routes = require('../../config/util.js').routes;
const _tag = require('./tag.js');

module.exports = {
  route: function(app, auth) {
  	let route = routes.creator.tag;

		app.get(route.list, auth.is_authenticated, function (req, res) {
      _tag.list(req.user, function(err, obj){
				if(err) return res.send({ok: false, error: err});
				res.send(obj)
			})
    })
  }
};