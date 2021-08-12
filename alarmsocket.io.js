import { Server } from "socket.io";
import server from "./index.js";

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// const pubClient = new Redis({password:process.env.REDIS_PASSWORD});
// const subClient = pubClient.duplicate();
// io.adapter(redisAdapter(pubClient, subClient));

// 로그인 할 때 유저 정보 받아서 socket id와 함께 저장하기
let currentOn = {};

io.on("connection", (socket) => {
  console.log("확인용 로그: 알람용 소켓 연결됨", socket.id);

  socket.on("login", (user) => {
    console.log("현재 접속중", currentOn);
    console.log("로그인 유저, 소켓아이디", user, socket.id);
    const userPk = user.uid;
    let id = socket.id;

    if (currentOn.hasOwnProperty(userPk) && userPk !== "null") {
      currentOn[userPk] = id;
      console.log("사용자 업뎃", id, userPk);
    } else if (userPk !== "null") {
      console.log("새로운 닉넴");
      currentOn[userPk] = id;
    }
  });

  socket.on("request", (data) => {
    console.log("data", data);
    //  data.uid 는 클라이언트에서 보내준 타겟의 userPk
    console.log("접속중", currentOn);
    const userPk = data.uid;
    let stringPk = String(userPk);
    console.log("요청타겟", userPk, stringPk);
    if (currentOn.hasOwnProperty(stringPk)) {
      console.log("리퀘스트 대상 찾음", currentOn[userPk]);
      io.sockets.to(currentOn[userPk]).emit("requested", true);
    }
  });

  //  로그아웃 혹은 앱 웹 끄면 소켓 삭제
  socket.on("logout", (data) => {
    const userPk = data.uid;
    socket.on("disconnect", () => {
      delete currentOn[userPk];
      console.log("나감, 남은 목록", currentOn);
    });
  });
});
