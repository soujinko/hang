import { Server } from "socket.io";
import server from "./index.js";

// import { app } from "./index.js";

// import redisAdapter from '@socket.io/redis-adapter';
// const server = app.listen(443);
// const io = Server.listen(server)
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// const pubClient = new Redis({password:process.env.REDIS_PASSWORD});
// const subClient = pubClient.duplicate();
// io.adapter(redisAdapter(pubClient, subClient));

// 로그인 할 때 유저 정보 받아서 socket id와 함께 저장하기
let currentOn = [];
let users = [];
io.on("connection", (socket) => {
  console.log("확인용 로그: 알람용 소켓 연결됨", socket.id);

  socket.on("login", (user) => {
    console.log("현재 접속중", currentOn, users);
    console.log("로그인 유저, 소켓아이디", user, socket.id);
    const userPk = user.uid;
    let userInfo = {};
    // user.uid 는 클라이언트에서 보내준 userPk
    userInfo.uid = userPk;
    userInfo.id = socket.id;

    if (currentOn.includes(userPk) && userPk !== "null") {
      for (let i in users) {
        if (users[i].uid === userPk) {
          users[i].id = userInfo.id;
          console.log("사용자 업데이트", userPk, users, socket.id);
        }
      }
    } else if (userPk !== "null") {
      console.log("새로운 닉넴");
      users.push(userInfo);
      currentOn.push(userPk);
      console.log("사용자 추가", currentOn, users);
    }
  });

  socket.on("request", (data) => {
    console.log("data", data);
    //  data.uid 는 클라이언트에서 보내준 타겟의 userPk
    console.log("접속중", users);
    users.forEach((e) => {
      let user = e.uid;
      let userSocketId = e.id;
      console.log("찾고있음", user);
      // 타겟유저가 현재 접속중이면  해당 소켓으로 전달
      if (user === data.uid) {
        console.log("타겟 유저 찾음", user, userSocketId);
        console.log("현재 접속 유저2", users);
        io.sockets.to(userSocketId).emit("requested", true);
        // io.sockets.socket(userSocketId).send(data.msg);
        return;
      }
    });
  });

  //  로그아웃 혹은 앱 웹 끄면 소켓 삭제
  socket.on("disconnect", () => {
    for (let i in users) {
      if (users[i].id === socket.id) {
        console.log("나가는 사람", users[i].uid, users[i].id);
        let userPk = users[i].uid;
        users.splice(currentOn.indexOf(users[i].uid), 1);
        currentOn.splice(currentOn.indexOf(userPk), 1);
      }
    }
    console.log("나감, 남은 목록", currentOn, users);
  });
});
