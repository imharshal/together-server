require("dotenv").config();
const express = require("express");
var cors = require("cors");
const http = require("http");
const app = express();
app.use(cors());
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
  cors: {
    origins: "http://localhost:5173, https://meet-together.netlify.app/",
  },
});
const port = process.env.PORT || 8000;
const meetings = {};

app.get("/", (req, res) => {
  res.send({
    status: "Running",
  });
});
app.get("/meetings", (req, res) => {
  if (req.query.pass === process.env.PASSWORD) res.send({ meetings });
  else
    res.send({
      status: "failed",
      message: "Unauthorized request",
    });
});

io.on("connection", (socket) => {
  console.log("connected", socket.id);
  socket.on("joinRoom", (userDetails) => {
    const { username, roomID, audio, video } = userDetails;
    socket.username = username;
    socket.room = roomID;
    socket.audio = audio;
    socket.video = video;
    socket.join(roomID);
    let participants = io.sockets.adapter.rooms.get(roomID);

    participants = Array.from(participants);
    console.log("from join", participants);
    socket.emit("allUsers", participants);
  });

  socket.on("requestToJoin", (payload) => {
    console.log(payload.callerID, " requested to join ");
    io.to(payload.userToSignal).emit("participantJoined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });
  socket.on("allowToJoin", (payload) => {
    console.log("allowed to join ", socket.id, new Date());
    if (socket.id)
      io.to(payload.callerID).emit("stream", {
        signal: payload.signal,
        id: socket.id,
        username: socket.username,
        audio: socket.audio,
        video: socket.video,
      });
  });
  // when the user disconnects.. perform this
  socket.on("disconnect", function () {
    const participants = io.sockets.adapter.rooms.get(socket.room);
    console.log(socket.id, socket.room);
    console.log("from disconnect", participants);
    io.to(socket.room).emit("participantLeft", socket.id);
    socket.leave(socket.room);
  });
});

server.listen(port, () => console.log("server is running on port " + port));
