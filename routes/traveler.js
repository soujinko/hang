import express from "express";
import { connection } from "../models/db.js";
import checkDate from "../functions/checkDatefunc.js";
import xssFilter from "../middleware/xssFilter.js";
import asyncHandle from "../util/async_handler.js";
import { POST } from './controllers/traveler.js'

const router = express.Router();

router.post(
  "/",
  xssFilter,
  asyncHandle(POST(connection, checkDate))
);

export default router;
