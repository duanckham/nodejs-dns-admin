exports.date = function(range) {
	var date = new Date(),
		_y = date.getFullYear() + '',
		_m = date.getMonth() + 1 + '',
		_d = date.getDate() + '',
		_h = date.getHours() + '';

	//
	_m = _m[1] ? _m : '0' + _m;
	_d = _d[1] ? _d : '0' + _d;
	_h = _h[1] ? _h : '0' + _h;

	var results = {
		year: _y,
		month: _y + _m,
		day: _y + _m + _d,
		hour: _y + _m + _d + _h
	};

	return results[range];
};