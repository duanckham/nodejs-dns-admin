! function(window) {
	var exports = {};

	var type_map = {
		'1': 'A',
		'2': 'NS',
		'5': 'CNAME',
		'15': 'MX',
		'28': 'AAAA'
	};

	var init = function() {
		$('[data-action]').on('click', function(e) {
			var action_name = $(this).attr('data-action'),
				el = $('.action-' + action_name);

			if ($(this).hasClass('actived')) {
				return;
			}

			// TOGGLE MENU
			$('[data-action]').removeClass('actived');
			$(this).addClass('actived');

			// TOGGLE BLOCK
			$('[class^="action-"]').css('display', 'none');
			el.css('display', 'block');

			console.log(': action name', action_name);

			// ACTIONS
			switch (action_name) {
				case 'list-dns-records':
					renderDnsRecordsList(el);
					break;
				case 'create-dns-record':
					renderCreateRecord(el);
					break;
				case 'list-proxy-rules':
					renderProxyRulesList(el);
					break;
				case 'create-proxy-rule':
					renderCreateProxyRule(el);
					break;
			}
		});

		$('.action-index').css('display', 'block');
		renderIndex();
	};

	var renderIndex = function() {
		var _createData = function(obj) {
			return {
				labels: obj.x,
				datasets: [
					// {
					// 	fillColor: 'rgba(220,220,220,0.5)',
					// 	strokeColor: 'rgba(220,220,220,1)',
					// 	pointColor: 'rgba(220,220,220,1)',
					// 	pointStrokeColor: '#fff',
					// 	data: obj.y
					// },
					{
						fillColor: 'rgba(61, 101, 140, 0.5)',
						strokeColor: 'rgba(61, 101, 140, 1)',
						pointColor: 'rgba(61, 101, 140, 1)',
						pointStrokeColor: '#fff',
						data: obj.y
					}
				]
			};
		};

		// DNS REQS OF TODAY
		$.post('api/Statistics.Dns.Reqs.Hour', function(r) {
			if (r.success !== 1) 
				return;

			$('[data-for="chart-1"]').find('span').hide(300);
			new Chart($('#chart-1').get(0).getContext('2d')).Line(_createData(r.data));
		});

		// DNS REQS OF THIS MONTH
		$.post('api/Statistics.Dns.Reqs.Day', function(r) {
			if (r.success !== 1) 
				return;

			$('[data-for="chart-2"]').find('span').hide(300);
			new Chart($('#chart-2').get(0).getContext('2d')).Line(_createData(r.data));
		});

		// FLOW OF THIS MONTH
		$.post('api/Statistics.Proxy.Flow.Day', function(r) {
			if (r.success !== 1) 
				return;

			$('[data-for="chart-3"]').find('span').hide(300);
			new Chart($('#chart-3').get(0).getContext('2d')).Line(_createData(r.data));
		});
	};

	var renderServiceStatus = function() {

		// $.post

		// var html = [];

		// <div class="notice">
		// 	<div class="l">
		// 		<span class="date">2014/05/05</span>
		// 	</div>
		// 	<div class="r">
		// 		<span class="info">Numeric literals can contain extra formatting to make them easier to read.</span>
		// 		<textarea readonly="true" cols="100">aaa</textarea>
		// 	</div>
		// </div>
	};

	var renderDnsRecordsList = function(el) {
		$.post('api/Dns.Record.List', function(r) {
			if (r.success == 0) 
				return;

			// CLEAN TABLE
			el.find('table').html('');

			var html = [];
			for (var i = 0; i < r.data.length; i++) {
				var s = '';

				// console.log(r.data[i]);

				s += '<tr data-record="' + r.data[i].record_id + '">';
				s += '<td style="width:320px;" onclick="Ui.getRecordDetail(this);">' + r.data[i].record_name + '</td>';
				s += '<td style="width:520px;" onclick="Ui.getRecordDetail(this);">' + type_map[r.data[i].record_type] + '</td>';
				s += '<td style="width:120px; text-align: right;">';
				s += '<a href="javascript:void(0);" onclick="Ui.editRecordDetail(this);">Edit</a>';
				s += '<span> / </span>'
				s += '<a href="javascript:void(0);" onclick="Ui.removeRecord(\'' + r.data[i]._id + '\');">Remove</a>';
				s += '</td>';
				s += '</tr>';

				html.push(s);
			}

			el.find('table').append(html.join(''));
		}, 'json');
	};

	var renderCreateRecord = function(el) {
		el.find('[data-id][data-id!="1"]').remove();
		el.find('[data-name="title"]').remove();
		return el.find('form')[0].reset();
	};

	var createRecord = function(btn) {
		var el = $('.action-create-dns-record');
		var count = parseInt($(btn).attr('data-count'));

		var data = {
			record_name: el.find('[name="record_name"]').val(),
			record_type: el.find('[name="record_type"]').val(),
			record_line: el.find('[name="record_line"]').val(),
			answers: []
		};

		for (var i = 1; i <= count; i++) {
			var _tmp = {};

			el.find('[data-id="' + i + '"]').each(function() {
				var _child = $(this).find('input, select');

				if (_child.length > 0 && $(_child).val()) {
					_tmp[$(_child).attr('name')] = $(_child).val();
				} else {
					_tmp = false;
					return false;
				}
			});

			if (_tmp) 
				data.answers.push(_tmp);
		}

		$.post('api/Dns.Record.Create', data, function(r) {
			if (el.find('span.msg').length > 0)
				el.find('span.msg').remove();

			r.success === 1
				? $(btn).after('<span class="msg success">success<span>')
				: $(btn).after('<span class="msg error">error:' + r.message + '<span>');

		}, 'json');
	};

	var getRecordDetail = function(el, hold) {
		var el = $(el).closest('tr');
		var record_id = el.attr('data-record');

		var data = {
			name: record_id.split(':')[0],
			record_type: type_map[record_id.split(':')[1]]
		};

		$.post('api/Dns.Record.Info', data, function(r) {
			
			console.log(r);

			$('[data-expend="' + record_id + '"]').remove();

			if ($(el).hasClass('actived') && !hold)
				return $(el).removeClass('actived');
			
			if (r.success) {
				var content = JSON.stringify(r.data, null, 2);

				$(el).addClass('actived');
				$(el).after('<tr class="expend" data-expend="' + record_id + '"><td><textarea readonly="true" cols="100" rows="' + content.split('\n').length + '">' + content + '</textarea></td></tr>');
			}
		});
	};

	var editRecordDetail = function(el) {
		var el = $(el).closest('tr');
		var record_id = el.attr('data-record');

		var _insertEditForm = function(record_id, data) {
			$(el).addClass('actived');

			el.next() && el.next().hasClass('expend')
				? el.next().html('')
				: $(el).after($('<tr class="expend" data-expend="' + record_id + '"></tr>'));

			delete data._id;

			// INSERT
			for (var i in data) {
				var s = [];
				s.push('<td style="width: 470px;">');
				s.push('<table class="form" data-form="' + i + '">');
				s.push('	<tr><td><b>' + i.toLocaleUpperCase() + '</b></td></tr>');
				s.push('	<tr>');
				s.push('		<td class="key">name</td>');
				s.push('		<td class="value"><input type="text" name="record_name" value="' + record_id.split(':')[0] + '" readonly="true"></td>');
				s.push('	</tr>');
				s.push('	<tr>');
				s.push('		<td class="key">record type</td>');
				s.push('		<td class="value">');
				s.push('			<input type="text" name="record_type" value="' + type_map[record_id.split(':')[1]] + '" readonly="true">');
				s.push('		</td>');
				s.push('	</tr>');
				s.push('	<tr>');
				s.push('		<td class="key">record line</td>');
				s.push('		<td class="value">');
				s.push('			<input type="text" name="record_line" value="' + i + '" readonly="true">');
				s.push('		</td>');
				s.push('	</tr>');

				for (var j in data[i].answer) {
					var _id = parseInt(j) + 1;

					s.push('<tr><td><span class="title">ANSWER ' + j + ' SETTING</span></td></tr>');
					s.push('<tr data-id="' + _id + '">');
					s.push('	<td class="key">name</td>');
					s.push('	<td class="value"><input type="text" name="name" value="' + data[i].answer[j].name + '"></td>');
					s.push('</tr>');
					s.push('<tr data-id="' + _id + '">');
					s.push('	<td class="key">type</td>');
					s.push('	<td class="value">');
					s.push('		<select name="type">');
					s.push('			<option value="A" ' + (data[i].answer[j].type == '1' ? 'selected' : '') + '>A</option>');
					s.push('			<option value="NS" ' + (data[i].answer[j].type == '2' ? 'selected' : '') + '>NS</option>');
					s.push('			<option value="CNAME" ' + (data[i].answer[j].type == '5' ? 'selected' : '') + '>CNAME</option>');
					s.push('			<option value="MX" ' + (data[i].answer[j].type == '15' ? 'selected' : '') + '>MX</option>');
					s.push('			<option value="AAAA" ' + (data[i].answer[j].type == '28' ? 'selected' : '') + '>AAAA</option>');
					s.push('		</select>');
					s.push('	</td>');
					s.push('</tr>');
					s.push('<tr data-id="' + _id + '">');
					s.push('	<td class="key">ttl</td>');
					s.push('	<td class="value"><input type="text" name="ttl" value="' + data[i].answer[j].ttl + '"></td>');
					s.push('</tr>');
					s.push('<tr data-id="' + _id + '">');
					s.push('	<td class="key">address</td>');
					s.push('	<td class="value"><input type="text" name="address" value="' + data[i].answer[j].address + '"></td>');
					s.push('</tr>');
				}

				s.push('</table>');
				s.push('<button onclick="Ui.modifyRecord(\'' + record_id + '\', ' + data[i].answer.length + ', \'' + i + '\');">modify</button>');
				s.push('</td>');

				el.next().append(s.join(''));
			}
		};

		if ($(el).hasClass('actived')) {
			if ($(el).next().find('textarea').length === 0) {
				$(el).next().remove();
				$(el).removeClass('actived');
				return;
			}
		}

		if (el.next().find('textarea').length > 0) {
			var obj = JSON.parse(el.next().find('textarea').val());
			_insertEditForm(record_id, obj);
		} else {
			var data = {
				name: record_id.split(':')[0],
				record_type: type_map[record_id.split(':')[1]]
			};

			$.post('api/Dns.Record.Info', data, function(r) {
				_insertEditForm(record_id, r.data);
			}, 'json');
		}
	};

	var modifyRecord = function(record_id, count, form_name) {
		var el = $('[data-expend="' + record_id + '"]').find('table[data-form="' + form_name + '"]');
		var data = {
			record_name: el.find('[name="record_name"]').val(),
			record_type: el.find('[name="record_type"]').val(),
			record_line: el.find('[name="record_line"]').val(),
			answers: []
		};

		for (var i = 1; i <= count; i++) {
			var _tmp = {};

			el.find('[data-id="' + i + '"]').each(function() {
				var _child = $(this).find('input, select');

				_child.length > 0 && $(_child).val()
					? _tmp[$(_child).attr('name')] = $(_child).val()
					: _tmp = false;

				return _tmp;
			});

			if (_tmp) 
				data.answers.push(_tmp);
		}

		$.post('api/Dns.Record.Create', data, function(r) {
			if (el.find('span.msg').length > 0)
				el.find('span.msg').remove();

			if (r.success)
				getRecordDetail($('[data-record="' + record_id + '"]').find('td'), true);
		}, 'json');
	};

	var removeRecord = function(record_id) {
		var _data = {
			name: record_id.split(':')[0],
			record_type: type_map[record_id.split(':')[1]]
		};

		$.post('api/Dns.Record.Remove', JSON.stringify(_data), function(data) {
			if (data.status && data.status == 1) {
				$('[data-record="' + record_id + '"]').remove();
				$('[data-expend="' + record_id + '"]').remove();
			}
		}, 'json');
	};

	var renderProxyRulesList = function(el) {
		$.post('api/Proxy.Rule.List', function(r) {

			console.log('Proxy.Rule.List', r);

			if (!r.success) 
				return;

			// CLEAN TABLE
			el.find('table').html('');

			var html = [];
			
			for (var i = 0; i < r.data.length; i++) {
				var s = '';

				s += '<tr data-rule="' + r.data.rules[i] + '">';
				s += '<td style="width:840px;" onclick="Ui.getRuleDetail(this);">' + r.data.rules[i] + '</td>';
				s += '<td style="width:120px; text-align: right;">';
				s += '<a href="javascript:void(0);" onclick="Ui.removeRule(\'' + r.data.rules[i] + '\');">Remove</a>';
				s += '</td>';
				s += '</tr>';

				html.push(s);
			}

			el.find('table').append(html.join(''));
		}, 'json');
	};

	var renderCreateProxyRule = function(el) {
		return el.find('form')[0].reset();
	};

	var createRule = function(btn) {
		var el = $('form[name="custom_rule"]');

		var _data = {
			domain: el.find('input[name="domain"]').val(),
			note: el.find('input[name="note"]').val(),
			js: el.find('input[name="js"]').val(),
			header: el.find('input[name="header"]').val()
		};

		for (var i in _data) {
			if (!_data[i] || _data[i].length < 1) delete _data[i];
		}

		$.post('api/Proxy.Rule.Create', JSON.stringify(_data), function(data) {
			if (el.find('span.msg').length > 0) {
				el.find('span.msg').remove();
			}

			if (data.status && data.status == 1) {
				$(btn).after('<span class="msg success">success<span>');
			} else {
				$(btn).after('<span class="msg error">error:' + data.message + '<span>');
			}
		}, 'json');
	};

	var createFilterRule = function(btn) {
		var el = $('form[name="filter_rule"]');

		if (!el.find('input[name="domain"]').val()) {
			$(btn).after('<span class="msg error">domain empty<span>');
		}

		var _data = {
			domain: 'pass:' + el.find('input[name="domain"]').val()
		};

		$.post('api/Proxy.Rule.Create', JSON.stringify(_data), function(data) {
			if (el.find('span.msg').length > 0) {
				el.find('span.msg').remove();
			}

			if (data.status && data.status == 1) {
				$(btn).after('<span class="msg success">success<span>');
			} else {
				$(btn).after('<span class="msg error">error:' + data.message + '<span>');
			}
		}, 'json');
	};

	var getRuleDetail = function(el) {
		var el = $(el).closest('tr');
		var rule_id = el.attr('data-rule');

		var _data = {
			domain: rule_id
		};

		$.post('api/Proxy.Rule.Info', JSON.stringify(_data), function(data) {
			$('[data-expend="' + rule_id + '"]').remove();

			if ($(el).hasClass('actived')) {
				$(el).removeClass('actived');
				return;
			}

			if (~data.indexOf('"status": 1')) {
				$(el).addClass('actived');
				$(el).after('<tr class="expend" data-expend="' + rule_id + '"><td><textarea readonly="true" cols="100" rows="' + data.split('\n').length + '">' + data + '</textarea></td></tr>');
			}
		});
	};

	var removeRule = function(rule_id) {
		var _data = {
			domain: rule_id
		};

		$.post('api/Proxy.Rule.Remove', JSON.stringify(_data), function(data) {
			if (data.status && data.status == 1) {
				$('[data-rule="' + rule_id + '"]').remove();
				$('[data-expend="' + rule_id + '"]').remove();
			}
		}, 'json');
	};

	var addAnswerSetting = function(el) {
		var count = parseInt($('button[data-count]').attr('data-count'));

		$(el).closest('tr').before('<tr data-name="title"><td><span class="title">ANSWER ' + (count + 1) + ' SETTING</span></td></tr>');
		$('[data-id="' + count + '"]').each(function() {
			var _el = $(this).clone();
			_el.attr('data-id', count + 1)
			$(el).closest('tr').before(_el);
		});
		$('button[data-count]').attr('data-count', count + 1)
	};

	exports.modifyRecord = modifyRecord;
	exports.removeRecord = removeRecord;
	exports.createRecord = createRecord;
	exports.getRecordDetail = getRecordDetail;
	exports.editRecordDetail = editRecordDetail;
	exports.createRule = createRule;
	exports.createFilterRule = createFilterRule;
	exports.getRuleDetail = getRuleDetail;
	exports.removeRule = removeRule;
	exports.addAnswerSetting = addAnswerSetting;
	exports.init = init;

	window.Ui = exports;
}(window);