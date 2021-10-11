const express = require("express");
const path = require("path");

const socketio = require("socket.io");
const http = require("http");

const Filter = require("bad-words");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const app = express();

const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

// let count = 0;

io.on("connection", (socket) => {
  console.log("New websocket connection");
  // socket.emit("countUpdate", count);

  // socket.on("increment", () => {
  //   count++;
  //   // socket.emit("countUpdate", count);
  //   io.emit("countUpdate", count);
  // });

  // socket.emit("message", generateMessage("Welcome! user..."));
  // socket.broadcast.emit("message", generateMessage("New user joined"));

  socket.on("join", (userDetails, callback) => {
    const { error, user } = addUser({ id: socket.id, ...userDetails });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage("Admin", `${user.username} has joined`));

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (msg, callback) => {
    const filter = new Filter();

    if (filter.isProfane(msg)) {
      return callback("No profanity");
    }

    const user = getUser(socket.id);

    io.to(user.room).emit("message", generateMessage(user.username, msg));
    callback("Delivered sendMessage to server");
  });

  socket.on("shareLocation", (coords, callback) => {
    const msgLoc = `https://www.google.com/maps?q=${coords.lat},${coords.lon}`;
    // io.emit("message", msgLoc);

    const user = getUser(socket.id);

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username, msgLoc)
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
