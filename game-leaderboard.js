
const bluebird = require("bluebird")
const redis = require("redis")
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const crypto = require('crypto')

const redis_server_port = 31001

class leaderboard {
	constructor(queries){
		this.queries = queries
		console.log("# request queries:", JSON.stringify(queries))
		this.db = redis.createClient(redis_server_port)
	}


	/*
		@gameStart
		check or register auth by returning its value to json.registerAuth=1234
		regiter new game
		return game_id
		table games:game_id expire_sec leaderboard_sec
		gameStart=30  user_auth=1234
	*/
	// /?gameStart=30&user_auth=289469946e797e961a13a60b5890fac9457f35a946e51300a305ee0e957ffee1
	gameStart(){
		if(!this.validQuery('gameStart')) return Promise.resolve({"error":"invalid gameStart game_id"})
		this.queries.gameStart = parseInt(this.queries.gameStart)

		return this.authenticate().then(resp => {
			let game_id = this.genRandomSHA256('_creating_new_game_id')
			
			return this.db.multi()
				// increment played_count
				.hincrby([
					'user:'+this.user_auth,
					'played_count', 1,
				])
				// add game_id to database 
				.setex([ // create game_id and expire by game time+5s, when gameEnd and if doesnt exists dont save the new score bc its a fake
					'game:'+game_id,
					(this.queries.gameStart + 20), // 20s is the ideal delay for gameStart+gameEnd requests
					this.queries.gameStart,
				])
				.execAsync().then(() =>{
					this.db.save()
					return Object.assign({}, {game_id}, resp)
				})

		})
	}


	/*
		@gameEnd
		check or register auth by returning its value to json.registerAuth=1234
		check game_id existence and if is corresponding to user_auth
		-removed (added as SETEX): check game time if is equal/afersisht by calc games[game_id].game_end - games[game_id].game_start
		register points to leaderboard
		return nothing
		# table leaderboard: id, user_auth, user_name, points, leaderboard, updated_at
		# gameEnd=game_id  user_auth=1234  points=910
	 */
	// /?gameEnd=8eb9280cb825be5c1f489bc57f160c2b4a44ea18d4bfbc1b948cbb27167cbfb9&points=134&user_auth=289469946e797e961a13a60b5890fac9457f35a946e51300a305ee0e957ffee1
	gameEnd(){
		if(!this.validQuery('gameEnd')) return Promise.resolve({"error":"invalid gameEnd game_id"})
		if(!this.validQuery('points')) return Promise.resolve({"error":"invalid gameEnd points"})
		this.queries.points = parseInt(this.queries.points)

		return this.authenticate().then(resp => {
			// find game
			return this.db.getAsync('game:'+this.queries.gameEnd).then(leaderboard => {
				if(leaderboard!==null){
					console.log("# game exists with leaderboard:", leaderboard)
					
					// record score if is greater than last score
					return this.db.zscoreAsync(['leaderboard_'+leaderboard+'s', 'user:'+this.user_auth]).then(current_score => {
						console.log("# get score if any:", current_score)
						if(current_score===null || parseInt(current_score) < this.queries.points){
							console.log("# score doesnt exists at all OR is greater than previews score, so lets save it")
							
							// ZADD leaderboard_30s 190 user:key
							this.db.zaddAsync(['leaderboard_'+leaderboard+'s', this.queries.points , 'user:'+this.user_auth]).then(() => this.db.save())
							console.log("# score recoreded :), thats it :/")
						}
					})
				}else{
					console.log("game DOES NOT exists")
				}
			})
		}).then( () => Object.assign({gameEndSuccess: true}))
	}

	// /?user_auth=4f2c7ffbb1a4d8eebd525e27b34766cce668ebe511deaed5d0ba8977cfbecc77&registerName=Hoolie
	registerName(){
		if(!this.validQuery('registerName')) return Promise.resolve({'error':'invalid registerName'})

		return this.authenticate().then(res => {
			return this.db.hsetAsync(['user:'+this.user_auth, 'user_name', this.queries.registerName]).then(ok => {
				if(ok!==null) ok={nameRegistered:true}
				this.db.save()
				return Object.assign({}, res, ok)
			})
		})
	}

	// returns top 15 + 1(current user)
	// /?getLeaderboard=30&user_auth=4f2c7ffbb1a4d8eebd525e27b34766cce668ebe511deaed5d0ba8977cfbecc77
	getLeaderboard(specific_leaderboard = false){
		if(!specific_leaderboard && !this.validQuery('getLeaderboard')) return Promise.resolve({'error':'invalid getLeaderboard'})

		let leaderboard_x = specific_leaderboard || parseInt(this.queries.getLeaderboard)
		return this.authenticate().then(resp => {
			// ZREVRANGE leaderboard_30s 0 14 WITHSCORES
			return this.db.zrevrangeAsync(['leaderboard_'+leaderboard_x+'s', 0, 14, 'WITHSCORES']).then(res => {
				console.log('getLeaderboard:', leaderboard_x, 'top15:', res)
				// res = [user, score, user, score, ...]
				if(res===null) return Promise.resolve(Object.assign({}, {error:'empty leaderboard'}))

				let top15_with_keys = []
				let keys = []
				res.forEach((el, index) => {
					if(el.match(/^user/)!==null){
						keys.push(el)
						top15_with_keys.push([el, res[index+1]])
					}
				})
				let multiExec = this.db.multi()
				keys.forEach((v, i) => {
					multiExec.hget([v, 'user_name'])
				})

				multiExec
					// get current player name
					.hget(['user:'+this.user_auth, 'user_name'])
					// get current player rank - zrevrank leaderboard_30s user:key
					.zrevrank(['leaderboard_'+leaderboard_x+'s', 'user:'+this.user_auth])
					// get current player score - zscore leaderboard_30s user:key
					.zscore(['leaderboard_'+leaderboard_x+'s', 'user:'+this.user_auth])


				return multiExec.execAsync().then(res_array => {
					// construct and return top15
					console.log(res_array)

					let current_player = {
						name: res_array[ res_array.length-3 ],
						position: res_array[ res_array.length-2 ] + 1, // rank + 1 bc it starts from 0
						score: res_array[ res_array.length-1 ],
					}
					res_array.splice(res_array.length-3, 3) // remove last 3 items which is current player name, rank and score
					
					let top15 = []
					// foreach top 15
					res_array.forEach((v, index) => {
						top15.push({
							position: index+1, // rank + 1 bc it starts from 0
							name: v,
							score: top15_with_keys[index][1]
						})
					})

					top15.push(current_player)

					return Object.assign({}, resp, {['leaderboard_'+leaderboard_x+'s']: top15})
				})
			})
		})
	}

	// /?getAllLeaderboards=1&user_auth=4f2c7ffbb1a4d8eebd525e27b34766cce668ebe511deaed5d0ba8977cfbecc77
	getAllLeaderboards(){
		return this.authenticate().then(resp => {
			return Promise.all([ this.getLeaderboard(30), this.getLeaderboard(90), this.getLeaderboard(180) ])
					.then(leaderboards => {
						let leaderboards_all = Object.assign({}, leaderboards[0], leaderboards[1], leaderboards[2])
						return Object.assign({}, resp, {leaderboards: leaderboards_all})
					})
		})
	}


	validQuery(query){
		if(this.queries[query] === undefined) return false
		switch(query){
			case 'game_id':
			case 'gameEnd':
			case 'user_auth': // valid sha256
				return this.queries[query].match(/^[a-fA-F0-9]{64}$/)!==null
				break;
			case 'gameStart': // valid game interval in seconds
			case 'getLeaderboard':
				return [30,90,180].indexOf(parseInt(this.queries[query])) !== -1
				break;
			case 'points': // valid integer
				return parseInt(this.queries[query]) > -1
				break;
			case 'registerName':
				return this.queries[query].match(/^[a-zA-Z0-9_-]{3,}$/) !== null
				break;
		}
	}


	authenticate(force_authentication = false){
		const default_user_auth = '0000000000000000000000000000000000000000000000000000000000000000'

		if(!this.validQuery('user_auth')) return Promise.resolve({"error":"authentication error :/"});

		let user_auth = this.queries.user_auth.toLowerCase()

		// check if default
		if(!force_authentication && user_auth === default_user_auth){
			return this.createUser()
		}else{
			// check if this user doesnt exists in database
			return this.db.existsAsync('exists', "user:" + user_auth).then(res => {
				if(res===1){
					// user exists in db
					console.log('# user exists in db')
					this.user_auth = user_auth
					// return {};
				}else if(!force_authentication){
					// user DOES NOT exists in db
					console.log('# user DOES NOT exists in db')
					return this.createUser()
				}
			})
		}
	}


	createUser(){
		let newAuth = this.genRandomSHA256('creating_new_user')
		return this.db.hmsetAsync([
				"user:" + newAuth, // hash
				"user_name", "anonymous",
				"registered", new Date(),
				"played_count", 0,
			]).then(res => {
				this.user_auth = newAuth
				this.db.save()
				return {registerAuth: newAuth}
			});
	}


	genRandomSHA256(randomizeMore){
		return crypto.createHash('sha256').update(crypto.randomBytes(64).toString('hex') + new Date() + randomizeMore, 'utf8').digest('hex')
	}

}
exports.leaderboard = leaderboard


/*



# add scores to a table(autoranked by default from redis), names must be hashes
ZADD leaderboard_30s 190 "Arditi"
ZADD leaderboard_30s 21 "Polo"
ZADD leaderboard_30s 230 "Deneres"
ZADD leaderboard_30s 145 "Miza"
ZADD leaderboard_30s 1450 "Dragon"

# top 15
ZREVRANGE leaderboard_30s 0 14 WITHSCORES

# current user rank (starting from 0)
ZREVRANK leaderboard_30s "Arditi"

# multi get keys
MGET key1 key2 nonexisting

# set multiple fields
HMSET user:1000 username antirez password P1pp0 age 34

# change field
HSET user:1000 password 12345

# get field
HGET user:1000 username

# get all fields
HGETALL user:1000

# if user exists
HEXISTS user:1000



*/


