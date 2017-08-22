
console.log("# http-server starting...")
const { leaderboard } = require('./game-leaderboard.js')

const http = require('http')
const url = require('url')
const incoming_requests_port = 31002


http.createServer(function (req, res) {
    let q = url.parse(req.url, true).query;
    if(Object.keys(q).length===0) res.end('{"end":"stardust"}')
	
	
	const end = (r) => {
		res.setHeader('Access-Control-Allow-Origin', "null");
		// res.setHeader('Access-Control-Allow-Origin', req.header.origin);
		// res.setHeader('Access-Control-Request-Method', '*');
		// res.setHeader('Access-Control-Allow-Methods', 'GET');
		// res.setHeader('Access-Control-Allow-Headers', '*');
		return res.end(JSON.stringify(r))
	}

	const game = new leaderboard(q)

	// process each request to corresponding function
	if(q.gameStart) game.gameStart().then(end)
	if(q.gameEnd) game.gameEnd().then(end)
	if(q.registerName) game.registerName().then(end)
	if(q.getLeaderboard) game.getLeaderboard().then(end)
	if(q.getAllLeaderboards) game.getAllLeaderboards().then(end)

}).listen(incoming_requests_port)

console.log("# http-server running at http://localhost:%s/", incoming_requests_port);




