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

// Matchens tid
let gameTime = 60;

let gameEnded = false;

// Matchtimer
setInterval(() => {

    gameTime--;

    io.emit("timer", gameTime);

    // Match slut
    if(gameTime <= 0 && !gameEnded) {

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
    }

}, 1000);

// När någon ansluter
io.on("connection", (socket) => {

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
        points: 0
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
    

    // När spelaren får poäng
        socket.on("addPoints", (points) => {

            // Lägger till poäng
            players[socket.id].points += points;

            // Skickar uppdaterade spelare
            io.emit("players", players);
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