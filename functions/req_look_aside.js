import { redisClient } from "../index.js";

const checkMypageRedis = (req, res, next) => {
  const { userPk } = res.locals.user;
  redisClient.hget(`mypage-${userPk}`, "userInfo", function (error, userInfo) {
    if (error) res.status(400).send(error);
    console.log("레디스 데이터", userInfo);

    if (userInfo) {
      redisClient.hget(
        `mypage-${userPk}`,
        "tripInfo",
        function (error, tripInfo) {
          console.log("레디스 데이터", tripInfo);
          tripInfo = JSON.parse(tripInfo);
          userInfo = JSON.parse(userInfo);
          res.send({ userInfo, tripInfo });
        }
      );
    } else next();
  });
};

const checkLikeRedis = (req, res, next) => {
  const { userPk } = res.locals.user;
  console.log(1, userPk);

  redisClient.get(`like=${userPk}`, (error, likeusers) => {
    if (error) res.status(400).send(error);
    if (likeusers !== null) {
      console.log("redisdata", likeusers);
      res.status(200).send(likeusers);
    } else next();
  });
};

export { checkMypageRedis, checkLikeRedis };
