import express from "express";
import Crypto from "crypto";
import { connection } from "../models/db.js";
import NC_SMS from "../services/NC_SMS.js";
import dotenv from "dotenv";
import passport from "passport";
import jwt from "jsonwebtoken";
import verification from "../middleware/verification.js";
import asyncHandle from "../util/async_handler.js";
import redis from '../config/redis.cluster.config.js'
import zscanner from '../functions/zscanner.js'
import xssFilter from '../middleware/xssFilter.js'
import { 
  DELETE_quit, 
  DELETE_signOut, 
  GET_block, 
  GET_chat, 
  PATCH_block, 
  POST, 
  POST_block, 
  POST_duplicate, 
  POST_exists, 
  POST_password, 
  POST_p_auth, 
  POST_signIn, 
  POST_sms_auth 
} from './controllers/users.js';

dotenv.config();

const router = express.Router();
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ITERATION_NUM = process.env.ITERATION_NUM

router.post(
  "/sms_auth", 
  xssFilter, 
  POST_sms_auth(connection, NC_SMS, redis)
  );
router.post(
  "/p_auth", 
  xssFilter, 
  asyncHandle(
    POST_p_auth(redis)
    )
  );
router.post(
  "/duplicate", 
  xssFilter, 
  POST_duplicate(connection)
  );
router.post(
  "/", 
  xssFilter, 
  POST(Crypto, connection, ITERATION_NUM)
  );
router.post(
  "/signin", 
  xssFilter, 
  POST_signIn(passport, jwt, connection, PRIVATE_KEY)
  );
router.delete(
  "/signout", 
  verification, 
  DELETE_signOut()
  );
router.get(
  "/chat", 
  verification, 
  asyncHandle(
    GET_chat(zscanner, connection, redis)
    )
  );
router.get(
  '/block', 
  verification, 
  asyncHandle(
    GET_block(redis, connection)
    )
  );
router.post(
  '/block', 
  xssFilter, 
  verification, 
  asyncHandle(
    POST_block(redis, connection)
    )
  );
router.patch(
  '/block', 
  verification, 
  asyncHandle(
    PATCH_block(redis)
    )
  );
router.delete(
  '/quit', 
  verification, 
  asyncHandle(
    DELETE_quit(zscanner, redis, connection)
    )
  );
router.post(
  '/exists', 
  xssFilter, 
  POST_exists(connection)
  );
router.post(
  '/password', 
  xssFilter, 
  POST_password(Crypto, connection, ITERATION_NUM)
  );

export default router;
