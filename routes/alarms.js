import express from "express";
import { connection } from "../models/db.js";
import asyncHandle from "../util/async_handler.js";
import { GET, GET_detail, DELETE } from './controllers/alarm.js'

const router = express.Router();

//새로운 알람 유무
router.get(
  "/",
  asyncHandle(GET(connection))
);

// 세부 알람 내역 호출
router.get(
  "/detail",
  asyncHandle(GET_detail(connection))
);

// 알람 삭제
router.delete(
  "/",
  asyncHandle(DELETE(connection))
);

export default router;
