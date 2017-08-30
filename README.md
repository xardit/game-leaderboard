# game-leaderboard
A high-performance game leaderboard with redis + redis-server + http api server used with nginx proxy

#### Installation
```
npm install
```

#### Before starting configure:
* nginx.conf edit and copy/ln on your nginx config directory
* redis-server.conf contains redis server configuration like tcp port & redis data directory
* http-server.js contains http listener along with tcp port
* game-leaderboard.js contains all functions for requests to be processed at redis with some checks and automatic authenticates user

#### Start/stop node along with redis-server and http-server
```
npm start
npm stop
```
