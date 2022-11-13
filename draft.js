require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
  cors: { origin: "*" },
});
const port = process.env.PORT || 8000;
const meetings = {};
const socketToRoom = {};
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

function getParticipants(roomID) {
  if (meetings[roomID]) return meetings[roomID]["participants"];
  return [];
}
function addParticipant(roomID, participantID) {
  if (meetings[roomID]) meetings[roomID]["participants"].push(participantID);
  else {
    meetings[roomID] = { participants: [participantID] };
  }
}

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomID) => {
    addParticipant(roomID, socket.id);

    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = getParticipants(roomID).filter(
      (id) => id !== socket.id
    );
    socket.emit("allUsers", usersInThisRoom);
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
      });
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let participants = getParticipants(roomID);
    if (participants) {
      participants = participants.filter((id) => id !== socket.id);
      meetings[roomID] = { participants };
    }
    socket.emit("participantLeft", {
      participantLeft: socket.id,
      participants,
    });
  });
});

server.listen(port, () => console.log("server is running on port " + port));
