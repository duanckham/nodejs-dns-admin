var config = require('../config');
var tools = require('./tools');
var DB = require('./db');
var nullcb = function() {};

var Api = function() {
	return this.init();
};

Api.prototype.init = function() {
	this.db_statistics = new DB(CONFIG.DB.STATISTICS);
	this.db_records = new DB(CONFIG.DB.RECORDS);
	this.db_index = new DB(CONFIG.DB.INDEX);
	this.db_proxy = new DB(CONFIG.DB.PROXY);
	this.db_report = new DB(CONFIG.DB.REPORT);
	return this;
};

Api.prototype.type_map = {
	'A': 1,
	'NS': 2,
	'CNAME': 5,
	'MX': 15,
	'AAAA': 28
};

Api.prototype.dnsRecordCreate = function(req, res) {
	req.body.record_type = this.type_map[req.body.record_type];

	var self = this;
	var data = req.body;
	var _id = data.record_name + ':' + data.record_type;
	var condition = {_id: _id};
	var answers = [];

	this.db_records.collection('main').one(condition, function(result) {
		// IF NOT EXIST
		if (!result)
			result = {};

		// ANSWERS
		for (var i in data.answers) {
			var _record = {
				name: data.answers[i].name,
				type: self.type_map[data.answers[i].type],
				ttl: data.answers[i].ttl,
				address: data.answers[i].address,
				data: data.answers[i].address, // FOR NS/CNAME/PTR RECORD
				class: 1
			};

			// FOR MX RECORD
			if (_record.type === 15) {
				if (data.answers[i].address.indexOf(':') < 0) {
					_record.exchange = _record.address;
					_record.priority = 5;
				} else {
					_record.exchange = _record.address.split(':')[0];
					_record.priority = _record.address.split(':')[1];
				}
			}

			answers.push(_record);
		}

		// CREATE OBJ
		result.custom = true;
		result[data.record_line] = {
			answer: answers,
			authority: [{
				name: data.record_name,
				type: 2,
				ttl: 3600,
				class: 1,
				data: CONFIG.NS.NAME[0]
			}, {
				name: data.record_name,
				type: 2,
				ttl: 3600,
				class: 1,
				data: CONFIG.NS.NAME[1]
			}],
			additional: [{
				name: CONFIG.NS.NAME[0],
				type: 1,
				ttl: 9950,
				class: 1,
				address: CONFIG.NS.IP[0]
			}, {
				name: CONFIG.NS.NAME[1],
				type: 1,
				ttl: 9950,
				class: 1,
				address: CONFIG.NS.IP[1]
			}]
		};

		// UPDATE
		self.db_records.collection('main').set(condition, result, nullcb);
		// INSERT INDEX
		self.db_index.collection('main').set({_id: 'records:' + _id}, {
			id: _id,
			name: data.record_name,
			type: data.record_type
		}, nullcb);

		res.send({success: 1});
	});
};

Api.prototype.dnsRecordList = function(req, res) {
	this.db_index.collection('main').get({_id: /^records:.*/}, function(results) {
		res.send({success: 1, data: results});
	});
};

Api.prototype.dnsRecordRemove = function(req, res) {
	req.body.record_type = this.type_map[req.body.record_type];

	var data = req.body;
	var _id = data.name + ':' + data.record_type;

	// DELETE RECORD AND INDEX
	this.db_records.collection('main').remove({_id: _id, custom: true}, nullcb);
	this.db_index.collection('main').remove({_id: 'records:' + _id}, nullcb);

	res.send({success: 1});
};

Api.prototype.dnsRecordInfo = function(req, res) {
	req.body.record_type = this.type_map[req.body.record_type];

	var data = req.body;
	var _id = data.name + ':' + data.record_type;

	this.db_records.collection('main').one({_id: _id, custom: true}, function(result) {
		result
			? res.send({success: 1, data: result})
			: res.send({success: 0});
	});
};

Api.prototype.dnsRecordCached = function(req, res) {
	var counter = 5;
	var results = {};
	var over = function(type, result) {
		results[type] = result;
		counter--;
		if (!counter)
			res.send({success: 1, data: results});
	};

	this.db_records.collection('main').count({_id: /^.*:1$/, custom: false}, function(count) {
		over(1, count);
	});

	this.db_records.collection('main').count({_id: /^.*:2$/, custom: false}, function(count) {
		over(2, count);
	});

	this.db_records.collection('main').count({_id: /^.*:5$/, custom: false}, function(count) {
		over(5, count);
	});

	this.db_records.collection('main').count({_id: /^.*:15$/, custom: false}, function(count) {
		over(15, count);
	});

	this.db_records.collection('main').count({_id: /^.*:28$/, custom: false}, function(count) {
		over(28, count);
	});
};

Api.prototype.dnsRecordClean = function(req, res) {
	var exp = new RegExp('^.*:' + req.body.type + '$');

	this.db_records.collection('main').remove({_id: exp, custom: false}, nullcb);
	this.db_index.collection('main').remove({record: exp}, nullcb);

	res.send({success: 1});
};

Api.prototype.proxyRuleList = function(req, res) {
	var results = [];

	this.db_proxy.collection('main').get({}, function(results) {
		res.send({success: 1, data: results});
	});
};

Api.prototype.proxyRuleInfo = function(req, res) {
	var data = req.body;

	this.db_proxy.collection('main').one(data.domain, function(result) {
		res.send({success: 1, data: result});
	});
};

Api.prototype.proxyRuleCreate = function(req, res) {
	req.body._id = req.body.domain;
	// CREATE OR MODIFY
	this.db_proxy.set(req.body, nullcb);
	res.send({success: 1});
};

Api.prototype.proxyRuleRemove = function(req, res) {
	// DELETE RECORD
	this.db_proxy.collection('main').remove({_id: data.domain}, nullcb);
	res.send({success: 1});
};

Api.prototype.statisticsDnsReqs = function(range) {
	var self = this,
		_ranges,
		_search,
		_results = {},
		_counter = 0;

	return function(req, res) {
		switch (range) {
			case 'month':
				_ranges = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
				_search = tools.date('year');
				break;

			case 'day':
				_ranges = [
					'01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
					'11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
					'21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'
				];
				_search = tools.date('month');
				break;

			case 'hour':
				_ranges = [
					'01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
					'13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'
				];
				_search = tools.date('day');
				break;
		}

		_counter = _ranges.length;

		_ranges.forEach(function(el) {
			self.db_statistics.collection('main').one({_id: 'total:' + _search + el}, function(result) {				
				_results[_search + el] = result.count;
				_counter--;
				if (_counter === 0) 
					_callback();
			});
		});

		var _callback = function() {
			var _return = {
				x: [],
				y: []
			};

			for (var i in _ranges) {
				_return.x.push(_ranges[i]);
				_return.y.push(parseInt(_results[_search + _ranges[i]] || 0));
			}

			res.send({success: 1, data: {x: _return.x, y: _return.y}});
		};
	}
};

Api.prototype.statisticsProxyFlow = function(range) {
	var self = this,
		_ranges,
		_search,
		_results = {},
		_counter = 0;

	return function(req, res) {
		switch (range) {
			case 'month':
				_ranges = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
				_search = tools.date('year');
				break;

			case 'day':
				_ranges = [
					'01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
					'11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
					'21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'
				];
				_search = tools.date('month');
				break;

			case 'hour':
				_ranges = [
					'01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
					'13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'
				];
				_search = tools.date('day');
				break;
		}

		_counter = _ranges.length;

		for (var i in _ranges) {
			self.db_statistics.collection('main').get('total:proxy:flow:' + _search + _ranges[i], function(key, value, error) {
				if (!error && key && value)
					_results[key.replace('total:proxy:flow:', '')] = value;
				
				_counter--;
				if (_counter === 0) 
					_callback();
			});
		}

		var _callback = function() {
			var _return = {
				x: [],
				y: []
			};

			for (var i in _ranges) {
				_return.x.push(_ranges[i]);
				_return.y.push(parseInt(_results[_search + _ranges[i]] || 0) / 1024); // KB
			}

			res.send({success: 1, data: {x: _return.x, y: _return.y}});
		};
	}
};

Api.prototype.serviceNoticeStatus = function(req, res) {
	this.db_report
		.collection('main')
		.count({read: 0}, function(notice_count) {
			res.send({success: 1, data: { notice: notice_count }});
		});
};

Api.prototype.serviceNoticeList = function(req, res) {
	var self = this;
	var condition = {};
	
	if (req.body.page && req.body.page === 'prev')
		condition = { date: { $lt: parseInt(req.body.date) } };

	if (req.body.page && req.body.page === 'next')
		condition = { date: { $gt: parseInt(req.body.date) } };

	this.db_report
		.collection('main')
		.coll
		.find(condition)
		.limit(20)
		.sort({date: req.body.page === 'next' ? 1 : -1})
		.toArray(function(error, results) {
			if (req.body.page === 'next') {
				results.sort(function(a, b) {
					return a.date < b.date;
				});
			}

			res.send({success: 1, data: results});
		});
};

Api.prototype.serviceNoticeRead = function(req, res) {
	var self = this;
	var id = req.body.id;

	id === 'all'
		? this.db_report.collection('main').set({read: 0}, {$set: {read: 1}}, nullcb)
		: this.db_report.collection('main').set({_id: id}, {$set: {read: 1}}, nullcb);

	res.send({success: 1});
};

Api.prototype.serviceNoticeClean = function(req, res) {
	this.db_report.collection('main').coll.drop();
	res.send({success: 1});
};

module.exports = Api;