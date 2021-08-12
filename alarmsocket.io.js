import { Server } from "socket.io";
import server from "./index.js";


import redisAdapter from '@socket.io/redis-adapter';

const io = new Server(server, { cors: { origin: "*" } });

const pubClient = new Redis({password:process.env.REDIS_PASSWORD});
const subClient = pubClient.duplicate();
io.adapter(redisAdapter(pubClient, subClient));

// 로그인 할 때 유저 정보 받아서 socket id와 함께 저장하기
let users = [];
io.sockets.on("connection", (socket) => {
  console.log("확인용 로그: 알람용 소켓 연결됨");

  socket.on("login", (user) => {
    console.log("로그인 소켓 연결");
    console.log("로그인 유저, 소켓아이디", user, socket.id);
    let userInfo = {}
    // user.uid 는 클라이언트에서 보내준 userPk
    userInfo.uid = user.uid;
    userInfo.id = socket.id;
    users.push(userInfo)
  });

  socket.on("request", (data) => {
    console.log("data", data)
    //  data.uid 는 클라이언트에서 보내준 타겟의 userPk
      users.forEach(e=> {
        let user = e.uid
        let userSocketId = e.id
        console.log('찾고있음', user )
        // 타겟유저가 현재 접속중이면  해당 소켓으로 전달
        if (user === data.uid){
        console.log('타겟 유저 찾음',user )
        io.sockets.to(userSocketId).emit('requested', true)
        // io.sockets.socket(userSocketId).send(data.msg);
        break;
        }
      })
    })

//  로그아웃 혹은 앱 웹 끄면 소켓 삭제
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

