const common = require('../../config/util.js');
const mongo = require('../mongo.js');
const func = common.func;
const async = common.modules.async;
const errors = common.errors;

const upload = common.modules.multer({ dest: '/uploads/'});
const fs = common.modules.fs;

var db;
var _collection = function(name) {
  if(!db) db = mongo.get_db()
  return db.collection(name)
}

var objectId = function(id) {
  return mongo.get_object_id(id);
};

module.exports = {
  route: function(app, auth) {
		app.post('/upload', upload.array('image[]', 12), function(req, res) {
			let files = req.files;
			if(files)
				for (let i = 0; i < files.length; i++) {
					fs.readFile(files[i].path, function (err, data) {
				    let imageName = files[i].originalname
				    if(!imageName){
				      console.log("There was an error");
				      res.redirect("/");
				      res.end();
				    } else {
				      let newPath = "../../uploads/thumbs/" + imageName;
				      fs.writeFile(newPath, data, function (err) {
				        console.log("Done")
				      })
				    }
				  })
				}
		});
		app.get('/manager/library', auth.is_creator, function(req, res) {
			res.render('layout', {
				page: 'main',
				body_class: '',
				content: 'library/library',
				sub_view: 'file',
				title: 'upload',
				username: req.user.username,
			})
		});
		
  }
};