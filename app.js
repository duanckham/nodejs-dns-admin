var express = require('express');
var bodyParser = require('body-parser');
var config = require('./config');
var router = require('./lib/router');
var app = express();

app.use(bodyParser());
app.use('/', router);
app.use(express.static(__dirname + '/html'));
app.use(express.static(__dirname + '/public'));
app.listen(CONFIG.PORT);

console.log('; api service running.');