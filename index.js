const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

app.use(express.static(path.join(__dirname, "client")));

app.get("/healthcheck", (req, res) => {
  res.send("<h2>RPS App running...</h2>");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

io.on("connection", (socket) => {
  console.log("a user is connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("createGame", () => {
    const roomUniqueId = makeid(12);
    console.log(roomUniqueId);
    rooms[roomUniqueId] = {};
    socket.join(roomUniqueId);
    socket.emit("newGame", { roomUniqueId: roomUniqueId });
  });

  socket.on("joinGame", (data) => {
    if (rooms[data.roomUniqueId] != null) {
      socket.join(data.roomUniqueId);
      socket.to(data.roomUniqueId).emit("playersConnected", {});
      socket.emit("playersConnected");
    }
  });

  socket.on("p1Choice", (data) => {
    let rpsValue = data.rpsValue;
    rooms[data.roomUniqueId].p1Choice = rpsValue;
    socket.to(data.roomUniqueId).emit("p1Choice", { rpsValue: data.rpsValue });
    if (rooms[data.roomUniqueId].p2Choice != null) {
      declareWinner(data.roomUniqueId);
    }
  });

  socket.on("p2Choice", (data) => {
    let rpsValue = data.rpsValue;
    rooms[data.roomUniqueId].p2Choice = rpsValue;
    socket.to(data.roomUniqueId).emit("p2Choice", { rpsValue: data.rpsValue });
    if (rooms[data.roomUniqueId].p1Choice != null) {
      declareWinner(data.roomUniqueId);
    }
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * charactersLength)];
  }
  return result;
}

function declareWinner(roomUniqueId) {
  let p1Choice = rooms[roomUniqueId].p1Choice;
  let p2Choice = rooms[roomUniqueId].p2Choice;
  let winner = null;

  const rules = {
    "Rock": ["Scissors", "Well"],
    "Paper": ["Rock", "Well"],
    "Scissors": ["Paper", "Well"],
    "Well": ["Rock", "Scissors"]
  };

  if (p1Choice === p2Choice) {
    winner = "d";
  } else if (rules[p1Choice].includes(p2Choice)) {
    winner = "p1";
  } else {
    winner = "p2";
  }

  io.sockets.to(roomUniqueId).emit("result", {
    winner: winner
  });

  rooms[roomUniqueId].p1Choice = null;
  rooms[roomUniqueId].p2Choice = null;
}
