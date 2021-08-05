import express from "express";
import mainRouter from "./main.js";
import likeRouter from "./like.js";
import usersRouter from "./users.js";
import userRouter from "./user.js";
import mypageRouter from "./mypage.js";

const router = express.Router();

router.use("/users", usersRouter);

router.use(verification())
router.use(alarms())

router.use("/main", mainRouter);
router.use("/like", likeRouter);
router.use("/user", userRouter);
router.use("/mypage", mypageRouter);

export default router;
