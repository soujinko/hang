import express from "express";
import { connection } from "../models/db.js";
import searchAndPaginate from "../functions/search_paginate.js";
import asyncHandle from "../util/async_handler.js";
import xssFilter from "../middleware/xssFilter.js";
import { GET, POST_search } from './controllers/main.js'

const router = express.Router();

router.get(
  "/",
  asyncHandle(
    GET(connection)
    )
);

router.post(
  "/search",
  xssFilter,
  asyncHandle(
    POST_search(searchAndPaginate)
    )
);

export default router;
