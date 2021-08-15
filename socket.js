import { Server } from "socket.io";
import { connection } from './models/db.js'
import server from "./index.js";
import redisAdapter from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config()

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const pubClient = new Redis({password:process.env.REDIS_PASSWORD});
const subClient = pubClient.duplicate();
const redis = pubClient
const multi = pubClient.multi();

export default redis

io.adapter(redisAdapter(pubClient, subClient));

// 로그인 할 때 유저 정보 받아서 socket id와 함께 저장하기
let currentOn = {}; 

const next = (err) => io.use((sock, next) => next(err))

io.on("connection", (socket) => {
    socket.on("login", async(user) => {
      const userPk = user.uid;
      let id = socket.id;

      // zscan 으로 전체 찾는 것 대신 가장 큰거 하나 찾아서 검증하는 zrevrange로 바꿈
      // zmemebers가 아무도 없더라도 room, unchecked가 undefined이므로 0과의 비교가 false가 되어 검증 가능
      const [room, unchecked] = await redis.zrevrange(userPk+'', 0, 0, 'WITHSCORES')
      if (unchecked > 0) await io.sockets.to(id).emit('unchecked')
      
      if (currentOn.hasOwnProperty(userPk) && userPk !== "null") {
        currentOn[userPk] = id;
      } else if (userPk !== "null") {
        currentOn[userPk] = id;
      }
    });

    socket.on("request", async (data) => {
      //  data.uid 는 클라이언트에서 보내준 타겟의 userPk
      const userPk = data.uid;
      let stringPk = String(userPk);
      if (currentOn.hasOwnProperty(stringPk)) {
        await io.sockets.to(currentOn[userPk]).emit("requested", true);
      }
    });

    socket.on('join', (data) => {
      const { joiningUserPk, targetUserPk, nickname } = data;
      console.log('JOIN!!!',joiningUserPk, targetUserPk, nickname)
      // 데이터가 제대로 전달되지 않은 경우
      if (!joiningUserPk || !targetUserPk || !nickname) return
      console.log('JOIN Falsy 검사 통과!!')
      
      socket.username = nickname
      const roomName = 
        joiningUserPk < targetUserPk && 
        `${joiningUserPk}:${targetUserPk}` || 
        `${targetUserPk}:${joiningUserPk}`;
        
        multi
          .zadd(joiningUserPk+'', 0, roomName)
          .zadd('delCounts', 'NX', 1, roomName)
          .lrange(roomName, 0, -1, async (err, chatLogs) => {
            if (err) console.error(err)
            console.log(chatLogs)
            try {
              await connection.beginTransaction()
              const [one, two] = (await connection.query('SELECT userPk, nickname FROM users WHERE userPk IN (?,?)', roomName.split(':')))[0]
              const user = one.userPk === joiningUserPk && one || two
              const target = user === one && two || one
              io.to(roomName).emit('chatLogs', {user: user, target: target, chatLogs: chatLogs});
            } catch(err) {
              connection.rollback()
              next(err)
            } finally {
              connection.release()
            }
          })
          .exec()
          // remoteJoin 파라미터가 무조건 string이라서 문자열로 변환
          .then(async res => await io.of('/').adapter.remoteJoin(socket.id , roomName))
      });

    socket.on('sendMessage', async (data) => {
      const { roomName, targetPk, message, userPk } = data;
      console.log('sendMessag!!:', roomName, targetPk, message, userPk)
      const curTime = Date.now()
      // 방에 혼자 있다면
      const currentRoom = await io.of('/').adapter.sockets(new Set([roomName]))
      
      if (currentRoom.size < 2) {
        // 방이 없었다면 상대방의 sorted set에 생성되고, 있었다면 읽지 않은 채팅마다 + 1
        redis.zadd(targetPk+'','INCR', 1, roomName, (err, ress)=>{
          if (err) return next(err)
        })
        // 특정 소켓에게 new message이벤트 발송
        const target = currentOn[targetPk+'']
        // 상대방이 방에는 없지만 접속해 있는 경우:
        if (target)
          await io.sockets.to(target).emit('newMessage', {userPk:userPk, message:message, time:curTime})
      }

      const log = JSON.stringify({userPk:userPk, message:message, curTime:curTime})
      
      multi
        .rpush(roomName, log, (err, res) => {
          console.log('룸이름:', roomName)
          console.log('rpush결과:', res)
        })
        .zadd('delCounts', 'GT', 1, roomName)
        .exec()
        .then(async res => await io.to(roomName).emit('updateMessage', {userPk: userPk,message: message}))
      
      
    });

    // 상대방이 채팅방 목록을 보고 있으며 메시지를 송신한 사람과의 대화방은 없을 때 새로운 방을 생성
    socket.on('newRoom', async(data) => {
      const { targetPk } = data
      const nickAndProf = await connection.query('SELECT profileImg, nickname FROM users WHERE userPk=?',[targetPk])
      await io.sockets.to(socket.id).emit('newRoom', {profileImg:nickAndProf[0][0].profileImg, nickname: nickAndProf[0][0].nickname})
    })

    socket.on('leave', async (data) => {
      const { userPk, roomName } = data
      console.log('leave 확인!')
      multi
        // 자신이 방금 나온 방의 읽지 않은 갯수는 0으로
        .zadd(userPk+'', 'XX', 0, roomName)
        // 메세지 100개로 제한. 
        .ltrim(roomName, -100, -1)
        // 마지막 채팅으로 부터 3일간 유지
        .expireat(roomName, Math.floor(Date.now()/1000) + 60*60*24*3)
        .exec((err, res) => {
          if (err) console.error(err)
        })
        console.log('leave 확인! 3')
      await io.of('/').adapter.remoteLeave(socket.id, roomName);
    })


    socket.on('ByeBye', async(data) => {
      console.log('quit!!!!')
      const { userPk, roomName } = data
      // 사용자의 sorted set으로부터 채팅방 삭제. 채팅방 자체의 데이터도 삭제.
      multi
        .zrem(userPk+'', roomName, (err, data) => console.log(data))
        .zscore('delCounts', roomName, (err, delCount) => {
          +delCount < 1 ? 
          multi
          .del(roomName) 
          .zrem('delCounts',roomName)
          .exec()
          : 
          redis.zadd('delCounts','LT', 0, roomName)
        })
        .exec((err, res) => {
          if (err) console.error(err)
        })
        await io.of('/').adapter.remoteLeave(socket.id, roomName);
    })

    //  로그아웃 혹은 앱 웹 끄면 소켓 삭제
    socket.on("logout", (data) => {
      const userPk = data.uid;
      socket.on("disconnect", () => {
        delete currentOn[userPk];
      });
    });

})

