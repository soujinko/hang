import { server } from "./index.js";
import { Server } from "socket.io";
import redisAdapter from "@socket.io/redis-adapter";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const io = new Server({
  cors: { origin: "*", methods: ["GET", "POST"] },
}).listen(server);

const pubClient = new Redis({ password: process.env.REDIS_PASSWORD });
const subClient = pubClient.duplicate();
const redis = pubClient.duplicate();
const pipeline = pubClient.pipeline();
const multi = pubClient.multi();

io.adapter(redisAdapter(pubClient, subClient));

io.sockets.on("connection", (socket) => {
  console.log("확인용 로그: 새로운 소켓 연결됨");

  socket.on("join", async (data) => {
    const { joiningUserPk, targetUserPk, nickname } = data;
    socket.username = nickname;
    const roomName =
      (joiningUserPk < targetUserPk && `${joiningUserPk}:${targetUserPk}`) ||
      `${targetUserPk}:${joiningUserPk}`;

    redis.lrange(roomName, 0, -1, (err, chatLogs) => {
      if (err) return io.use((sock, next) => next(err));
      io.to(roomName).emit("chatLogs", {
        userPk: joiningUserPk,
        targetPk: targetUserPk,
        chatLogs: chatLogs,
      });
    });

    // remoteJoin 파라미터가 무조건 string이라서 문자열로 변환
    await io.of("/").adapter.remoteJoin(joiningUserPk + "", roomName);
  });

  socket.on("sendMessage", async (data) => {
    const { roomName, targetPk, message } = data;

    const curTime = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });

    // 방에 혼자 있다면
    if ((await io.of("/").adapter.sockets(new Set(roomName)).size) < 2) {
      // 방이 없었다면 상대방의 sorted set에 생성되고, 있었다면 읽지 않은 채팅마다 + 1
      redis.zadd(targetPk + "", "INCR", 1, roomName);
      // 특정 소켓에게 new message이벤트 발송
      const target = users.targetPk?.socketId;
      if (target)
        io.sockets.to(target).emit("newMessage", {
          roomName: roomName,
          message: message,
          time: curTime,
        });
    }

    redis.lpush(roomName, socket.username, message, curTime);

    io.to(roomName).emit("updateMessage", {
      name: socket.username,
      message: message,
    });
  });

  socket.on("leave", (data) => {
    const { userPk, roomName } = data;
    pipeline
      // 자신이 방금 나온 방의 읽지 않은 갯수는 0으로
      .zadd(userPk + "", 0, roomName)
      // 메세지 100개로 제한. 채팅 하나당 3개씩 저장되니까 300요소로 제한
      .ltrim(roomName, 0, 300)
      // 마지막 채팅으로 부터 3일간 유지
      .expireat(roomName, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3)
      .exec((err, result) => {
        if (err) return io.use((sock, next) => next(err));
        for (let [err, res] of result) {
          if (err !== null) return io.use((sock, next) => next(err));
        }
      });
    await io.of("/").adapter.remoteLeave(userPk + "", roomName);
  });

  socket.on("quit", (data) => {
    const { userPk, roomName } = data;
    // 사용자의 sorted set으로부터 채팅방 삭제. 채팅방 자체의 데이터도 삭제.
    multi
      .zrem(userPk + "", roomName)
      .unlink(roomName)
      .exec((err, result) => {
        if (err) return io.use((sock, next) => next(err));
        for (let [err, res] of result) {
          if (err !== null) return io.use((sock, next) => next(err));
          else if (+res !== 1)
            return io.use((sock, next) =>
              next(new Error("room in sorted set or chat list was not deleted"))
            );
        }
      });

    await io.of("/").adapter.remoteLeave(userPk + "", roomName);
  });

  socket.on("disconnect", (data) => {
    console.log("소켓 연결 해제");
  });
});
