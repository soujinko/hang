import server from "./index.js";
import "./socket.js";

server.listen(443, () => {
  console.log("서버 연결 성공!");
});
