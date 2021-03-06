const cors = require("cors");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;

const socketio = require("socket.io");
const Users = require("./models").user;
const Pets = require("./models").pet;
const http = require("http");
const server = http.createServer(app);
const io = socketio(server);
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

app.use(cors());

const bodyParserMiddleWare = express.json();
app.use(bodyParserMiddleWare);

io.on("connection", (socket) => {
  console.log("we have a new connection");

  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to the chatroom ${user.room}`,
    });
    socket.broadcast.to(user.room).emit("message", {
      user: "admin",
      text: `${user.name} has joined the chatroom ${user.room}!`,
    });

    socket.join(user.room);

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left.`,
      });
    }
  });
});

app.get("/", (req, res) => {
  res.send("Hi from express");
});

app.get("/pets", async (req, res) => {
  const pets = await Pets.findAll();
  res.status(200).send({ message: "ok", pets });
});

const userRouter = require("./routers/auth");
app.use("/user", userRouter);

const chatroomRouter = require("./routers/chatrouter");
app.use("/chatroom", chatroomRouter);

const caretakersRouter = require("./routers/caretakers");
app.use("/caretakers", caretakersRouter);

server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
