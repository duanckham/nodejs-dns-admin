global.CONFIG = {
	PORT: process.env.PORT || 10002,

	// AUTH
	AUTH_USERNAME: 'admin',
	AUTH_PASSWORD: 'goyoo123456',

	// DB
	DB: {
		INDEX: 'mongodb://127.0.0.1:27017/dns-index',
		RECORDS: 'mongodb://127.0.0.1:27017/dns-records',
		STATISTICS: 'mongodb://127.0.0.1:27017/dns-statistics',
		PROXY: 'mongodb://127.0.0.1:27017/dns-proxy',
		EXPIRES: 'mongodb://127.0.0.1:27017/dns-expires',
		REPORT: 'mongodb://127.0.0.1:27017/dns-report'
	},

	// NS
	NS: {
		NAME: [
			'ns1.dnspro.cn',
			'ns2.dnspro.cn'
		],
		IP: [
			'116.255.220.138',
			'116.255.220.139'
		]
	}	
};