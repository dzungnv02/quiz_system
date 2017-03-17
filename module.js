Module = {
	mongo: require('mongodb'),
	assert: require('assert'),
	http: require('http'),
	fs: require('fs'),
	path: require('path'),
	express: require('express'),
	session: require('express-session'),
	crypto: require('crypto'),
	base64url: require('base64url'),
	async: require('async'),
	ejs: require('ejs'),
	multer: require('multer'),
	xml2js: require('xml2js'),
	passport: require('passport'),
	local: require('passport-local').Strategy,
	body_parser: require('body-parser'),
	compression: require('compression'),
};

module.exports = Module;