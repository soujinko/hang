import { server } from "./index.js";
import { Server } from "socket.io";
import redisAdapter from "@socket.io/redis-adapter";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const io = new Server(server, { cors: { origin: "*" } });

const pubClient = new Redis({ password: process.env.REDIS_PASSWORD });
const subClient = pubClient.duplicate();
const redis = pubClient.duplicate();
const pipeline = pubClient.pipeline();

io.adapter(redisAdapter(pubClient, subClient));

io.sockets.on("connection", (socket) => {
  console.log("확인용 로그: 새로운 소켓 연결됨");

  socket.on("join", async (data) => {
    // 그냥 방 이름은 프론트에서 정해서 주는게 좋을 듯. userPk활용하면 될것 같음.
    const { joiningUserPk, targetUserPk, nickname } = data;
    socket.username = nickname;
    const roomName =
      (joiningUserPk < targetUserPk && `${joiningUserPk}:${targetUserPk}`) ||
      `${targetUserPk}:${joiningUserPk}`;

    redis.lrange(roomName, 0, -1, (err, chatLogs) => {
      if (err) io.use((sock, next) => next(err));
      io.to(roomName).emit("chatLogs", chatLogs);
    });
    // remoteJoin 파라미터가 무조건 string이라서 문자열로 변환
    await io.of("/").adapter.remoteJoin(joiningUserPk + "", roomName);
  });

  socket.on("sendMessage", async (data) => {
    io.to(roomName).emit("updateMessage", {
      name: socket.username,
      message: data.message,
    });

    pipeline
      .lpush(data.roomName, socket.username, data.message)
      .ltrim(data.roomName, 0, 100)
      .expireat(data.roomName, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3)
      .exec((err, result) => {
        if (err) return io.use((sock, next) => next(err));
        for (let [err, res] of result) {
          if (err !== null) return io.use((sock, next) => next(err));
        }
      });
  });

  socket.on("leave", (data) => {
    await io.of("/").adapter.remoteLeave(userPk + "", roomName);
    io.to(data.room).emit("updateMessage", {
      name: "행",
      message: socket.name + "님이 퇴장하셨습니다",
    });
  });

  socket.on("disconnect", (data) => {
    console.log("소켓 연결 해제");
  });
});
