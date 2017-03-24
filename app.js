const modules = require('./config/module.js');
const config = require('./config/config.js');
const database = require(config.app_path+'/mongo.js');
const assert = modules.assert;
const app = modules.express();
const MongoStore = require('connect-mongo')(modules.session);
const passport = modules.passport;
const body_parser = modules.body_parser;
const xml_parser = new modules.xml2js.Parser();
const compression = modules.compression;

app.set('view engine', 'ejs');
app.set('view cache', false);
app.set('trust proxy', 1);
app.set('json spaces', 2);

app.use(compression());
app.use(modules.express.static(__dirname + '/public'));
app.use(body_parser.urlencoded({ extended: true }));
app.use(body_parser.json());
app.use(modules.session({
  secret: 'keyboard cat',
  name: 'APPID',
  proxy: true,
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({
    url: config.url_database,
  })
}));
app.use(passport.initialize());
app.use(passport.session());

var user = {
	login: require(config.app_path+'/user/login.js'),
	index: require(config.app_path+'/user/index.js'),
	request: require(config.app_path+'/user/request.js'),
	group: require(config.app_path+'/group/index.js')
}

var exam = {
	index: require(config.app_path+'/exam/index.js'),
	online: require(config.app_path+'/exam/online.js')
}

var question = {
	index: require(config.app_path+'/question/index.js')
}

var answer = {
	index: require(config.app_path+'/answer/index.js'),
}

var tag = require(config.app_path+'/tag/index.js');

var auth = {
	is_authenticated: user.login.isAuthenticated,
	is_admin: user.login.isAdmin,
	is_creator: user.login.isCreator
}

database.connect_to_server(function(err) {
  assert.equal(null, err);

	user.login.route(app);
	user.index.route(app, auth);
	user.group.route(app, auth);
	user.request.route(app, auth);

	exam.index.route(app, auth);
	exam.online.route(app, auth);

	question.index.route(app, auth);

	answer.index.route(app, auth);

	tag.route(app, auth);

	var server = app.listen(3000, function () {
		let port = server.address().port;
		console.log('Listening at http://localhost:%s', port);
	})
})