import express from "express";
import redis from "../config/redis.cluster.config.js";
import { connection } from "../models/db.js";
import { checkLikeRedis } from "../functions/req_look_aside.js";
import xssFilter from "../middleware/xssFilter.js";
import asyncHandle from "../util/async_handler.js";
import { GET, POST } from './controllers/like.js'

const router = express.Router();

// 내가 좋아하는 유저리스트, 이미 redis에 있다면 미들웨어에서 반환
router.get(
  "/",
  checkLikeRedis,
  asyncHandle(
    GET(connection, redis)
    )
);

// 이미 디비에 있다면 좋아요 취소, 없다면 좋아요 등록
router.post(
  "/",
  xssFilter,
  asyncHandle(
    POST(connection, redis)
    )
);

export default router;
