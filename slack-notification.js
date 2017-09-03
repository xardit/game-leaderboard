
const async = require('async')
const Slack = require('node-slack');
const config = require('./config.json')
const moment = require('moment')
const bluebird = require('bluebird')
const redis = require("redis")

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(config.redis_port)

notify = (stats) => {

	async.parallel([() => {
		const slack = new Slack(config.slack_hook_url);
		slack.send({
		 text: stats,
		 channel: '#game-stats',
		 username: 'Crazy Particles Statistics',
		 icon_emoji: ":ghost:"
		});
	}])

}

const schedule =  require('node-schedule')
schedule.scheduleJob('0 16 * * *', () => {
	client.keysAsync('user:*').then(data => {
			let all = client.multi()
			for (let i = 0; i < data.length; i++) {
				all.hgetall(data[i])
			}
			all.execAsync().then(res => {
				let not_played = 0
				for (let i = 0; i < res.length; i++) {
					if(res[i]['played_count']==='0') ++not_played;
				}
				let last_user = 'Last user ' + res.length + ' registered ' + moment(res[res.length-1]['registered'].replace(' (CEST)',''), 'ddd MMM DD YYYY HH:mm:ss').fromNow()
				let msg = [
						'Users never played: ' + not_played,
						last_user,
					].join("\n");
				notify(msg)
			})
	})
})
