import express from "express";
import { connection } from "../models/db.js";
import checkDate from "../functions/checkDatefunc.js";
import xssFilter from "../middleware/xssFilter.js";
import asyncHandle from "../util/async_handler.js";
import { GET, POST } from './controllers/guide.js'

const router = express.Router();

router.get(
  "/",
  asyncHandle(GET(connection))
);

router.post(
  "/",
  xssFilter,
  asyncHandle(POST(connection, checkDate))
);

export default router;
