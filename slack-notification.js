
const async = require('async')
const Slack = require('node-slack');
const config = require('./config.json')

exports.notify = (stats) => {

	async.parallel([() => {
		const slack = new Slack(config.slack_hook_url);
		slack.send({
		 text: ":rocket: New user registration!\nStatus: " + stats,
		 channel: '#game-stats',
		 username: 'game-leaderboard Bot',
		 icon_emoji: ":ghost:"
		});
	}])

}
