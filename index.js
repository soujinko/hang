import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/index.js";

dotenv.config();
const app = express();

const corsOption = {
  origin: "",
  Credential: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOption));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", router);
app.listen(process.env.PORT || 3000, () => {
  console.log("서버 연결 성공");
});
