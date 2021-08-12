import server from "./index.js";
import "./alarmsocket.io.js";
// import "./chat.io.js";

server.listen(443, () => {
  console.log("서버 연결 성공!!");
});
