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