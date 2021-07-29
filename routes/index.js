import express from "express";
import mainRouter from "./main.js";
import likeRouter from "./like.js";

const router = express.Router();
router.use("/main", mainRouter);
router.use("/like", likeRouter);

export default router;
