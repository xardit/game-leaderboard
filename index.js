
const redis_server_port = 31001
const incoming_requests_port = 31002

console.log("# redis-server starting...")

const fs = require('fs');
const RedisServer = require('redis-server');
const server = new RedisServer({
  conf: 'redis-server.conf',
});

if (!fs.existsSync('redis-data-dir')){
    fs.mkdirSync('redis-data-dir');
}

server.open((err) => {
	if (err === null) {
		console.log("# redis-server started successfuly at 127.0.0.1:%s", redis_server_port)
		require('./http-server.js')
	}else if(err.code===-1){
		console.log("# redis-server already running at 127.0.0.1:%s", redis_server_port)
		require('./http-server.js')
	}else{
		console.log("# redis-server started with err:", err)
	}
});

