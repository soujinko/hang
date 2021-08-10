// import { server2 } from "./index.js";
// // import { readFileSync } from "fs";
// import { WebSocketServer } from "ws";

import { server } from "./index.js";
import redisAdapter from '@socket.io/redis-adapter';
import socketIo from "socket.io";

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

const pubClient = new Redis({password:process.env.REDIS_PASSWORD});
const subClient = pubClient.duplicate();
io.adapter(redisAdapter(pubClient, subClient));

let users = [];
io.sockets.on("connection", (socket) => {
  console.log("확인용 로그: 알람용 소켓 연결됨");

  socket.on("login", (user) => {
    console.log("로그인 소켓 연결");
    console.log("로그인 유저, 소켓아이디", user, socket.id);
    let userInfo = new Object();
    userInfo.uid = user.uid;
    userInfo.id = socket.id;
    users.push(userInfo)
  });

  socket.on("request", (data) => {
    console.log("data", data)
      users.forEach(e=> {
        let user = e.uid
        let userSocketId = e.id
        console.log('찾고있음', user )
        if (user === data.uid){
        console.log('타겟 유저 찾음',user )
        io.sockets.socket(userSocketId).send(data.msg);
        break;
        }
      })
    })

    socket.on("disconnect", (data) => {
      console.log("disconnect", data)
        users.forEach(e=> {
          let user = e.uid
          if (user === data.uid){
            users.splice(e,1);
            ("로그아웃",  data.uid)
            break
          }

        })
      })
})



// const webSocket = (server2) => {
//   const wss = new WebSocketServer({ server2 });
//   let users = [];
//   wss.on("connection", (ws, req) => {
//     // 웹 소켓 연결 시
//     console.log("서버 소켓 연결");

//     ws.on("login", (user) => {
//       console.log("로그인 소켓 연결");
//       console.log("로그인 유저, 소켓아이디", user, ws.id);
//       let userInfo = new Object();
//       userInfo.uid = data.uid;
//       userInfo.id = ws.id
//     });

//     ws.on("request", (data) => {
//       console.log("data", data)
//       users.forEach(e=> {
//         let user = e.uid
//         let userSocketId = e.id
//         console.log('찾고있음',user )
//         if (user === data.uid){
//         console.log('타겟 유저 찾음',user )
//           userSocketId.send("received");
//           break
//         }
//       })
//     });

//     ws.on("error", (error) => {
//       // 에러 시
//       console.error(error);
//     });

//     ws.on("close", () => {
//       // 연결 종료 시
//       console.log("클라이언트 접속 해제", ip);
//       clearInterval(ws.interval);
//     });

//     // ws.interval = setInterval(() => {
//     //   // 3초마다 클라이언트로 메시지 전송
//     //   if (ws.readyState === ws.OPEN) {
//     //     ws.send("서버에서 클라이언트로 메시지를 보냅니다.");
//     //   }
//     // }, 3000);

//   });
// };

