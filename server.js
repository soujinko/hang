import server from "./index.js";
import dotenv from "dotenv";
import "./socket.js";

dotenv.config();

server.listen(3000, () => {
  console.log("서버 연결 성공!!");
});
