import express from "express";
import createError from "http-errors";
import logger from "../config/winston_config.js";

const router = express.Router();

router.use(function (req, res, next) {
  next(createError(404));
});

// error handler
router.use(function (err, req, res, next) {
  logger.error(
    `
    ${err.status || 500} - 
    ${err.message} - 
    ${req.originalUrl} - 
    ${req.method} - 
    ${req.ip}
    `
  );
  
  res.status(err.status || 500).json({ message: err.message });
});

export default router;
