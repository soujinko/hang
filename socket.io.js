import server from './index.js';
import socketIo from 'socket.io';

const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

const Chat = require('./schemas/chat');

io.sockets.on('connection', (socket) => {
  console.log('확인용 로그: 새로운 소켓 연결됨');

  socket.on('join', async (data) => {
    if (!Object.keys(io.sockets.adapter.rooms).includes(data.room)) {
      if (!(await Chat.findOne({ postId: data.room }))) {
        await Chat.create({ postId: data.room, chatLog: [] });
      } else {
        const chatLogs = await Chat.findOne({ postId: data.room }).select({
          chatLog: 1,
          _id: 0,
        });
        io.to(data.room).emit('chatLogs', chatLogs);
      }
    }
    socket.name = data.username;
    socket.join(data.room);
    io.to(data.room).emit('updateMessage', {
      name: '오이마켓',
      message: socket.name + '님이 입장하셨습니다.',
    });
  });

  socket.on('disconnect', (data) => {
    io.to(data.room).emit('updateMessage', {
      name: '오이마켓',
      message: socket.name + '님이 퇴장하셨습니다',
    });
  });

  socket.on('sendMessage', async (data) => {
    io.to(data.room).emit('updateMessage', {
      name: socket.name,
      message: data.message,
    });

    await Chat.update(
      { postId: data.postId },
      {
        $push: {
          chatLog: {
            $each: [{ username: socket.name, message: data.message }],
            $slice: -50,
          },
        },
      }
    );
  });
});
