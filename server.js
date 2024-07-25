const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let users = [];

const addUser = (id, name, room) => {
  users = [...users.filter((user) => user.id !== id), { id, name, room }];
};

const removeUser = (id) => {
  users = users.filter((user) => user.id !== id);
};

const getUser = (id) => {
  return users.find((user) => user.id === id);
};

const getUsersInRoom = (room) => {
  return users.filter((user) => user.room === room);
};

const getAllRooms = () => {
  return [...new Set(users.map((user) => user.room))];
};

const buildMsg = (name, text) => {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
};

io.on("connection", (socket) => {
  socket.emit("message", buildMsg("Admin", "Let's get chatty!"));

  socket.on("enterRoom", ({ name, room }) => {
    const prevRoom = getUser(socket.id)?.room;
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit(
        "message",
        buildMsg("Admin", `${name} has left the room`)
      );
      io.to(prevRoom).emit("userList", { users: getUsersInRoom(prevRoom) });
    }

    addUser(socket.id, name, room);
    socket.join(room);
    socket.emit(
      "message",
      buildMsg("Admin", `You have joined the ${room} chat room`)
    );
    socket.broadcast
      .to(room)
      .emit("message", buildMsg("Admin", `${name} has joined the room`));
    io.to(room).emit("userList", { users: getUsersInRoom(room) });
    io.emit("roomList", { rooms: getAllRooms() });
  });

  socket.on("disconnect", () => {
    const user = getUser(socket.id);
    if (user) {
      removeUser(socket.id);
      io.to(user.room).emit(
        "message",
        buildMsg("Admin", `${user.name} has left the room`)
      );
      io.to(user.room).emit("userList", { users: getUsersInRoom(user.room) });
      io.emit("roomList", { rooms: getAllRooms() });
    }
  });

  socket.on("message", ({ name, text }) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      io.to(room).emit("message", buildMsg(name, text));
    }
  });

  socket.on("activity", (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit("activity", getUser(socket.id)?.name);
    }
  });
});

app.use(cors());
app.use(express.json());

server.listen(4000, () => {
  console.log("Server is running on port 4000");
});
