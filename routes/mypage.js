import express from "express";
import { connection } from "../models/db.js";
import { checkMypageRedis } from "../functions/req_look_aside.js";
import redis from "../config/redis.cluster.config.js";
import checkDate from "../functions/checkDatefunc.js";
import xssFilter from "../middleware/xssFilter.js";
import asyncHandle from "../util/async_handler.js";
import { 
  DELETE, 
  GET_profile_pagePk, 
  GET_promise, 
  PATCH, 
  PATCH_reject_confirm, 
  PATCH_reject_request, 
  PATCH_update_guide, 
  POST_create_trip, 
  POST_make_promise 
} from './controllers/mypage.js';

const router = express.Router();

// 내 프로필, 여행 일정, 확정 약속 불러오기
router.get(
  "/profile/:pagePk",
  checkMypageRedis,
  asyncHandle(
    GET_profile_pagePk(connection, redis)
    )
);

// 나의 약속 불러오기
router.get(
  "/promise",
  asyncHandle(
    GET_promise(connection)
    )
);

// 여행 등록하기
router.post(
  "/create_trip",
  xssFilter,
  asyncHandle(
    POST_create_trip(connection, redis, checkDate)
    )
);

// 여행삭제 -> 관련 약속도 함께 삭제 -> db설정 ON DELETE CASCADE
router.delete(
  "/",
  xssFilter,
  asyncHandle(
    DELETE(connection, redis)
    )
);

// 내 가이디 설정 켜기
router.patch(
  "/update_guide",
  asyncHandle(
    PATCH_update_guide(connection, redis)
    )
);

// 내 프로필 수정
router.patch(
  "/",
  xssFilter,
  asyncHandle(
    PATCH(connection, redis)
    )
);

// 나의 신청한/신청받은 약속 취소 거절
router.patch(
  "/reject_request",
  xssFilter,
  asyncHandle(
    PATCH_reject_request(connection)
    )
);

// 나의 확정 약속 취소
router.patch(
  "/reject_confirm",
  xssFilter,
  asyncHandle(
    PATCH_reject_confirm(connection)
    )
);

// 나의 약속 확정 // 중복수락 안되게
router.post(
  "/make_promise",
  xssFilter,
  asyncHandle(
    POST_make_promise(connection)
    )
);

export default router;
