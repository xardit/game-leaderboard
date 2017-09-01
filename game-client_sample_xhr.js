
// A function that checks user auth automatically and sends data via ajax
// As parameters accepts a requests along with a optional callback on success
var statsRequest = function(req, callback) {
    var url = 'https://api.example.com/game-leaderboard/?user_auth='
        + (window.localStorage.user_auth || '0000000000000000000000000000000000000000000000000000000000000000')
        + '&' + req;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log("api response:", xhr.responseText);
                var data = JSON.parse(xhr.responseText)
                if (data) game.statsResponseDefault(data)
                if (data)(callback || function() {})(data)
            } else { // server error
                console.error(xhr.statusText);
                console.log("ERROR:", xhr.statusText);
            }
        }
    };
    xhr.onerror = function(e) { // no internet ?
        console.error(xhr.statusText);
        console.log("ERROR:", xhr.statusText);
    };
    xhr.send(null);
}

// announce that the game has started, and has started with 30s option
game.statsRequest('gameStart=30') // returns gameid for later use

// announce that the game has ended using gameid and sending points
game.statsRequest('gameEnd='+this.game_id+'&points='+this.points)

// get specific leaderboard list top 15 that played the game of 30s
game.statsRequest('getLeaderboard=30')

// get all leaderboards
game.statsRequest('getAllLeaderboards=1')

// register name
game.statsRequest('registerName='+name, function(resp){
  if(resp.nameRegistered){
    window.localStorage.setItem('user_name', name)
    game.window.multiSwitch('registername','leaderboard')
    game.getLeaderboard()
  }
})
