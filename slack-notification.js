
const async = require('async')
const Slack = require('node-slack');
const config = require('./config.json')

notify = (stats) => {

	async.parallel([() => {
		const slack = new Slack(config.slack_hook_url);
		slack.send({
		 text: ":rocket: New user registration!\nStatus: " + stats,
		 channel: '#game-stats',
		 username: 'Crazy Particles Bot',
		 icon_emoji: ":ghost:"
		});
	}])

}

const redis = require("redis")
const client = redis.createClient(config.redis_port)

const schedule =  require('node-schedule')
schedule.scheduleJob('0 15 * * *', () => {
	client.dbsizeAsync().then((res) => {
		notify(' dbsize is '+res[1])
	})
})
