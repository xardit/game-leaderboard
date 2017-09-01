# game-leaderboard
A high-performance game leaderboard with redis + redis-server standalone + http api server used with nginx proxy + slack notifications

# Installation
```
npm install
```

# Before starting configure:
* config_example.json edit and rename to config.json. It contains configurations for tcp listen ports of http server and redis server. Also contains slack notify on a sample channel and  user default auth used from the game's api requests on the initial verification
* nginx_example.conf example config for nginx for your domain/subdomain, this is used when nginx is used as a proxy on the backend
* redis-server.conf contains redis server configuration like tcp port & redis data directory
* http-server.js contains http listener along with tcp port
* game-leaderboard.js contains all functions for requests to be processed at redis with some checks using async promise bluebird
Note: redis is saved on the data dir automatically

# Start / Stop the app server
It uses nohup and requires to be on project dir.
```
npm start
npm stop
```

This leaderboard is being used currently for the game [Crazy Particles](https://itunes.apple.com/us/app/crazy-particles/id1274479274?mt=8)
