import express from 'express';

const router = express.Router();

router.use(function (req, res, next) {
  next(createError(404));
});

// csrf error handle
router.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  console.error(err);
  res.status(403);
  res.send({ response: err });
});

// error handler
router.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

export default router;