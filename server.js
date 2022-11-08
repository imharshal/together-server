require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);
const port = process.env.PORT || 8000;
const users = {};

const socketToRoom = {};
app.get("/", (req, res) => {
  res.send({
    status: "Running",
  });
});
app.get("/meetings", (req, res) => {
  if (req.query.pass === process.env.PASSWORD)
    res.send({ meetings: { users } });
  res.send({
    status: "failed",
    message: "Unauthorized request",
    query: req.query.pass,
  });
});
io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    if (users[roomID]) {
      const length = users[roomID].length;

      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    socket.emit("all users", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }
  });
});

server.listen(port, () => console.log("server is running on port" + port));
