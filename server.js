// Importerar bibliotek
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Skapar express app
const app = express();

// Skapar HTTP-server
const server = http.createServer(app);

// Kopplar socket.io till servern
const io = new Server(server);

// Gör så public-mappen kan visas i webbläsaren
app.use(express.static("public"));


// Objekt som sparar alla spelare
let players = {};

// Alla enemies på servern
let enemies = [];
let serverShootingEnemies = [];

//array för skott
let bullets = [];

//array för motståndarskott
let enemyBullets = []

// Matchens tid
let gameTime = 60;

let gameEnded = false;
//Startar om spelet
function resetGame() {

    enemies = [];
    serverShootingEnemies = [];

    bullets = [];
    enemyBullets = [];

    gameTime = 60;
    gameEnded = false;

    // Reset spelare
    for (let id in players) {

        players[id].points = 0;
        players[id].magazine = 10;

        players[id].x = 500;
        players[id].y = 300;
    }

    io.emit("players", players);

    io.emit("enemies", enemies);

    io.emit("shootingEnemies", serverShootingEnemies);

    io.emit("bullets", bullets);

    io.emit("enemyBullets", enemyBullets);
}

// Matchtimer
setInterval(() => {

    if (gameEnded) return;

    gameTime--;

    io.emit("timer", gameTime);

    if(gameTime <= 0) {

        let winner = "Draw";

        let playerIds = Object.keys(players);

        if(playerIds.length >= 2) {

            let p1 = players[playerIds[0]];
            let p2 = players[playerIds[1]];

            if(p1.points > p2.points) {

                winner = "Player 1 won";

            } else if(p2.points > p1.points) {

                winner = "Player 2 won";
            }
        }

        gameEnded = true;

        io.emit("gameOver", {

            players,
            winner
        });

        setTimeout(() => {

            resetGame();

        }, 5000);
    }

}, 1000);

// Spawnar enemies på servern
setInterval(() => {

    enemies.push({

        id: Date.now(),

        posX: Math.random() * 1000,
        posY: -200,

        speed: 2 + Math.random() * 2,

        scale: 0.4,

        state: "enemy",

        height: 192,
        width: 150
    });

    // Skickar enemies till alla
    io.emit("enemies", enemies);

}, 2000);

// Spawnar shooting enemies
setInterval(() => {

    serverShootingEnemies.push({

        id: Date.now(),

        posX: Math.random() * 1000,
        posY: -200,

        speed: 1 + Math.random() * 2,

        scale: 0.4,

        state: "enemy",

        height: 192,
        width: 150
    });

    // Skickar shooting enemies till alla
    io.emit("shootingEnemies", serverShootingEnemies);

}, 5000);

//Skott för motståndare
setInterval(() => {

    for (let enemy of serverShootingEnemies) {
        if (Math.random() < 0.01) {

            enemyBullets.push({

                id: Date.now() + Math.random(),

                x: enemy.posX + 13,
                y: enemy.posY + 65,

                speed: 7,

                width: 20,
                height: 13
            });
        }
    }

}, 1000 / 60);

//uppdaterar enemy bullets
setInterval(() => {

    for (let bullet of enemyBullets) {

        bullet.y += bullet.speed;
    }

    enemyBullets = enemyBullets.filter(
        bullet => bullet.y < 1200
    );

    io.emit("enemyBullets", enemyBullets);

}, 1000 / 60);

//uppdaterar bullets
setInterval(() => {

    for (let bullet of bullets) {

        bullet.y -= bullet.speed;
    }

    bullets = bullets.filter(bullet => bullet.y > -50);

    for (let bullet of bullets) {

    //Avgör träffar på motståndare
    for (let enemy of enemies) {

            if (
                bullet.x < enemy.posX + 150 * enemy.scale &&
                bullet.x + bullet.width > enemy.posX &&

                bullet.y < enemy.posY + 192 * enemy.scale &&
                bullet.y + bullet.height > enemy.posY
            ) {
                // Ta bort enemy
                enemies = enemies.filter(e => e.id !== enemy.id);

                // Ta bort bullet
                bullets = bullets.filter(b => b !== bullet);

                // Ge poäng
                if (players[bullet.owner]) {                    
                    players[bullet.owner].points += 50;
                    players[bullet.owner].magazine += 1;
                }

                // Uppdatera alla spelare
                io.emit("players", players);
            }
        }
    
    for (let enemy of serverShootingEnemies) {

            if (
                bullet.x < enemy.posX + 150 * enemy.scale &&
                bullet.x + bullet.width > enemy.posX &&

                bullet.y < enemy.posY + 192 * enemy.scale &&
                bullet.y + bullet.height > enemy.posY
            ) {

                serverShootingEnemies =
                    serverShootingEnemies.filter(
                        e => e.id !== enemy.id
                    );

                bullets = bullets.filter(b => b !== bullet);

                if (players[bullet.owner]) {
                    players[bullet.owner].points += 100;
                    players[bullet.owner].magazine += 2;
                }

                io.emit("players", players);
            }
        }
    }

    io.emit("bullets", bullets);

    io.emit("enemies", enemies);

    io.emit("shootingEnemies", serverShootingEnemies);

}, 1000 / 60);

// Uppdaterar enemies
setInterval(() => {

    for (let enemy of enemies) {

        enemy.posY += enemy.speed;
    }

    for (let enemy of serverShootingEnemies) {

        enemy.posY += enemy.speed;
    }

    // Tar bort enemies utanför skärmen
    enemies = enemies.filter(enemy => enemy.posY < 1200);

    serverShootingEnemies = serverShootingEnemies.filter(
        enemy => enemy.posY < 1200

    );

    // Skickar uppdaterade enemies
    io.emit("enemies", enemies);

    io.emit("shootingEnemies", serverShootingEnemies);

}, 1000 / 60);


// När någon ansluter
io.on("connection", (socket) => {

    socket.on("shootBullet", (data) => {
        if (!players[socket.id]) return;

        if (players[socket.id].magazine <= 0) {

            return;
        }
        
        players[socket.id].magazine--;

        bullets.push({
            x: data.x,
            y: data.y,

            speed: 15,

            width: 20,
            height: 13,

            owner: socket.id
        });
    });

    console.log("Ny spelare:", socket.id);

    // Tillåter max 2 spelare
    if (Object.keys(players).length >= 2) {

        socket.emit("full"); // skickar meddelande
        socket.disconnect(); // kastar ut spelaren

        return;
    }

    // Skapar ny spelare
    players[socket.id] = {

        x: 500,
        y: 300,
        points: 0,
        magazine: 10
    };

    // Skickar alla spelare till alla klienter
    io.emit("players", players);


    // När en spelare rör sig
    socket.on("playerMove", (data) => {

        // Kollar att spelaren finns
        if (players[socket.id]) {

            // Uppdaterar position
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            // Skickar nya positioner till alla
            io.emit("players", players);
        }
    });
    
    socket.on("playerHitEnemy", (enemyId) => {

        enemies = enemies.filter(
            enemy => enemy.id !== enemyId
        );

        io.emit("enemies", enemies);
    });

    socket.on("playerHitShootingEnemy", (enemyId) => {

        serverShootingEnemies =
            serverShootingEnemies.filter(
                enemy => enemy.id !== enemyId
            );

        io.emit(
            "shootingEnemies",
            serverShootingEnemies
        );
    });

    socket.on("removeEnemyBullet", (bulletId) => {

        enemyBullets = enemyBullets.filter(
            bullet => bullet.id !== bulletId
        );

        io.emit("enemyBullets", enemyBullets);
    });

    // Tar bort poäng
    socket.on("removePoints", (points) => {

        players[socket.id].points -= points;

        // Förhindrar negativa poäng
        if(players[socket.id].points < 0) {

            players[socket.id].points = 0;
        }

        io.emit("players", players);
    });


    // När spelare disconnectar
    socket.on("disconnect", () => {

        console.log("Spelare lämnade");

        // Tar bort spelaren
        delete players[socket.id];

        // Uppdaterar alla klienter
        io.emit("players", players);
    });
});


// Startar servern
server.listen(3000, () => {

    console.log("Server körs på port 3000");
});