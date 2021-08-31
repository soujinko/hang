import { Server } from "socket.io";
import { connection } from "./models/db.js";
import server from "./index.js";
import redisAdapter from "@socket.io/redis-adapter";
import redis from "./config/redis.cluster.config.js";

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket"],
});

const pubClient = redis;
const subClient = pubClient.duplicate();

io.adapter(redisAdapter(pubClient, subClient));

// 로그인 할 때 유저 정보 받아서 socket id와 함께 저장하기
<<<<<<< HEAD
// let currentOn = {};
=======
>>>>>>> 27052cd94d729327dbd7ed227332994a5a6b3907

io.on("connection", (socket) => {
  socket.on("login", async (user) => {
    const userPk = user.uid;
    let id = socket.id;
<<<<<<< HEAD
    console.log("소켓테스트1", userPk, id);

=======
>>>>>>> 27052cd94d729327dbd7ed227332994a5a6b3907
    // zscan 으로 전체 찾는 것 대신 가장 큰거 하나 찾아서 검증하는 zrevrange로 바꿈
    // zmemebers가 아무도 없더라도 room, unchecked가 undefined이므로 0과의 비교가 false가 되어 검증 가능
    const [room, unchecked] = await redis.zrevrange(
      userPk + "",
      0,
      0,
      "WITHSCORES"
    );
    if (unchecked > 0) await io.sockets.to(id).emit("unchecked");
    if (userPk) await redis.hset(`currentOn`, userPk, id);
<<<<<<< HEAD
    console.log("현재 접속중", await redis.hgetall("currentOn"));
=======
>>>>>>> 27052cd94d729327dbd7ed227332994a5a6b3907
  });

  socket.on("request", async (data) => {
    //  data.uid 는 클라이언트에서 보내준 타겟의 userPk
    const userPk = data.uid;
<<<<<<< HEAD
    let stringPk = String(userPk);
    redis.hget(`currentOn`, userPk, async (error, id) => {
      // console.log("리퀘스트 보낸당", id);
=======
    redis.hget(`currentOn`, userPk, async (error, id) => {
>>>>>>> 27052cd94d729327dbd7ed227332994a5a6b3907
      if (id) await io.sockets.to(id).emit("requested", true);
    });
  });

  socket.on("join", (data) => {
    const { joiningUserPk, targetUserPk, nickname } = data;
    // 데이터가 제대로 전달되지 않은 경우
    if (!joiningUserPk || !targetUserPk || !nickname) return;

    socket.username = nickname;
    const roomName =
      (joiningUserPk < targetUserPk && `${joiningUserPk}:${targetUserPk}`) ||
      `${targetUserPk}:${joiningUserPk}`;

    redis.zadd(joiningUserPk + "", 0, roomName);
    redis.zadd("delCounts", "NX", 0, roomName);
    redis
      .lrange(roomName, 0, -1, async (err, chatLogs) => {
        if (err) console.error(err);
        try {
          await connection.beginTransaction();
          const [one, two] = (
            await connection.query(
              "SELECT userPk, nickname FROM users WHERE userPk IN (?,?)",
              roomName.split(":")
            )
          )[0];
          const user = (one.userPk === joiningUserPk && one) || two;
          const target = (user === one && two) || one;
          io.to(roomName).emit("chatLogs", {
            user: user,
            target: target,
            chatLogs: chatLogs,
          });
        } catch (err) {
          connection.rollback();
          console.error(err);
        } finally {
          connection.release();
        }
      })
      .then(async (res) => {
        await io.of("/").adapter.remoteJoin(socket.id, roomName);
      });
  });

  socket.on("sendMessage", async (data) => {
    const { roomName, targetPk, message, userPk } = data;
    const curTime = Date.now();
    const currentRoom = await io.of("/").adapter.sockets(new Set([roomName]));
    // 방에 혼자 있다면
    if (currentRoom.size < 2) {
      // 상대방에게 차단당하지 않았다면
      if (!(await redis.sismember(`block:${targetPk}`, userPk))) {
        // 방이 없었다면 상대방의 sorted set에 생성되고, 있었다면 읽지 않은 채팅마다 + 1
        redis.zadd(targetPk + "", "INCR", 1, roomName, async (err, res) => {
          // 특정 소켓에게 new message이벤트 발송
          const target = await redis.hget("currentOn", targetPk + "");
          // 상대방이 방에는 없지만 접속해 있는 경우:
          if (target)
            await io.sockets
              .to(target)
              .emit("newMessage", { userPk, message, time: curTime });
        });
      }
    }

    const log = JSON.stringify({
      userPk: userPk,
      message: message,
      curTime: curTime,
    });

    redis.zadd("delCounts", "GT", 1, roomName);
    redis
      .rpush(roomName, log)
      .then(
        async (res) => {
          await io
            .to(roomName)
            .emit("updateMessage", { userPk: userPk, message: message })
        }  
      );
  });

  // 상대방이 채팅방 목록을 보고 있으며 메시지를 송신한 사람과의 대화방은 없을 때 새로운 방을 생성
  socket.on("newRoom", async (data) => {
    const { targetPk } = data;
    const nickAndProf = await connection.query(
      "SELECT profileImg, nickname FROM users WHERE userPk=?",
      [targetPk]
    );
    await io.sockets.to(socket.id).emit("newRoom", {
      profileImg: nickAndProf[0][0].profileImg,
      nickname: nickAndProf[0][0].nickname,
    });
  });

  socket.on("leave", (data) => {
    const { userPk, roomName } = data;
    // 자신이 방금 나온 방의 읽지 않은 갯수는 0으로
    redis.zadd(userPk + "", "XX", 0, roomName);
    // 메세지 100개로 제한.
    redis.ltrim(roomName, -100, -1);
    // 마지막 채팅으로 부터 3일간 유지
    redis
      .expireat(roomName, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3)
      .then(
        async (res) => await io.of("/").adapter.remoteLeave(socket.id, roomName)
      );
  });

  socket.on("quit", (data) => {
    const { userPk, targetPk } = data;
    const roomName =
      (userPk < targetPk && `${userPk}:${targetPk}`) ||
      `${targetPk}:${userPk}`;
    // 사용자의 sorted set으로부터 채팅방 삭제. 채팅방 자체의 데이터는 delCount 0일 경우 삭제
    redis.zscore("delCounts", roomName, (err, delCount) => {
      if (+delCount < 1) {
        redis.del(roomName);
        redis.zrem("delCounts", roomName);
      } else redis.zadd("delCounts", "LT", 0, roomName);
    });
    redis
      .zrem(userPk + "", roomName)
      .then(
        async (res) => await io.of("/").adapter.remoteLeave(socket.id, roomName)
      );
  });

  //  로그아웃 혹은 앱 웹 끄면 소켓 삭제
<<<<<<< HEAD
  socket.on("logout", (data) => {
    socket.on("disconnect", async () => {
      await redis.hdel("currentOn", data.uid);
      // delete currentOn[data.uid];
    });
=======
  socket.on("logout", async(data) => {
    await redis.hdel("currentOn", data.uid);
  });

  socket.on("disconnect", async () => {
    let currentOn = await redis.hgetall('currentOn')
    Object.assign(currentOn, {length:Math.max(...Object.keys(currentOn).map(x=>+x))})
    await redis.hdel('currentOn', Array.prototype.indexOf.call(currentOn, socket.id)+'')
>>>>>>> 27052cd94d729327dbd7ed227332994a5a6b3907
  });
});

  
