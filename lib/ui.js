var http = require('http');
var fs = require('fs');
var config = require('../config');
var ApiMsg = require('./src/api-msg');

var ApiUi = function(port) {
	this.msg = new ApiMsg();
	this.template_path = '/../html/';
	this.static_path = '/../static/';
	this.init(port);

	return this;
};

ApiUi.prototype.type_map = {
	'js': 'application/x-javascript',
	'css': 'text/css'
};

ApiUi.prototype.init = function(port) {
	var self = this;
	http.createServer(function(req, res) {
		var body = '';

		req.on('data', function(chunk) {
			body += chunk;
		});

		req.on('end', function() {
			self.auth(req, function(result) {
				if (result) return self.router(req.url, body, res);

				res.writeHead(401, {
					'WWW-Authenticate': 'Basic realm="DNSAPI Auth"'
				});
				res.end('DNSAPI Auth');
			});
		});
	}).listen(port);
};

ApiUi.prototype.router = function(path, body, res) {
	// `~` SAME AS `>= 0`

	// STATIC FILE
	if (~path.indexOf('/static')) {
		res.writeHead(200, {
			'content-type': this.type_map[path.split('.').reverse()[0]]
		});

		return res.pipe(this.readStatic(path.split('/').reverse()[0])).pipe(res);
	}

	// API
	if (~path.indexOf('/api'))
		return this.msg.send(path.substr(4), body, res);

	// HTML
	if (~path.indexOf('.html'))
		return res.pipe(this.readTemplate(path.split('/').reverse()[0])).pipe(res);

	// JUMP TO INDEX
	res.writeHead(302, {'Location': 'index.html'});
	res.end();
	
	return;
};

ApiUi.prototype.readStatic = function(path) {
	return fs.createReadStream(__dirname + this.static_path + path);
};

ApiUi.prototype.readTemplate = function(path) {
	return fs.createReadStream(__dirname + this.template_path + path);
};

ApiUi.prototype.auth = function(req, callback) {
	var user_hash = (new Buffer(config.USERNAME + ':' + config.PASSWORD)).toString('base64');
	var auth_hash = req.headers['authorization'] ? req.headers['authorization'].substr(6) : false;

	return callback(auth_hash && user_hash == auth_hash);
};

module.exports = ApiUi;