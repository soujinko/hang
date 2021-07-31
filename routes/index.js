import express from "express";
import mainRouter from "./main.js";
import likeRouter from "./like.js";
import userRouter from "./user.js";

const router = express.Router();
router.use("/main", mainRouter);
router.use("/like", likeRouter);
router.use("/user", userRouter);

router.use("/users", usersRouter);

export default router;
