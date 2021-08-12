import server from "./index.js";
import "./alarmsocket.io.js";
import "./chat.io.js";

server.listen(process.env.PORT || 443, () => {
  console.log("서버 연결 성공!");
});
