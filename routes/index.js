import express from "express";
import mainRouter from "./main.js";
import likeRouter from "./like.js";
import usersRouter from "./users.js";
import userRouter from "./user.js";
import mypageRouter from "./mypage.js";
import guideRouter from "./guide.js";
import travelerRouter from "./traveler.js";
import verification from "../middleware/verification.js";
const router = express.Router();

router.use("/users", usersRouter);
router.use(verification);
router.use("/main", mainRouter);
router.use("/like", likeRouter);
router.use("/user", userRouter);
router.use("/mypage", mypageRouter);
router.use("/guide", guideRouter);
router.use("/traveler", travelerRouter);

export default router;
