// import redis from "../config/redis.cluster.config.js";
import redis from "../config/redis.cluster.config.js";

const checkMypageRedis = (req, res, next) => {
  const { userPk } = res.locals.user;
  const { pagePk } = req.params;
  // console.log("마이페이지 레디스");
  redis.hget(`mypage-${pagePk}`, "userInfo", function (error, userInfo) {
    if (error) next();
    if (userInfo) {
      redis.hget(`mypage-${pagePk}`, "tripInfo", function (error, tripInfo) {
        if (error) next();
        if (tripInfo) {
          tripInfo = JSON.parse(tripInfo);
          userInfo = JSON.parse(userInfo);
          if (parseInt(userPk) === parseInt(pagePk)) {
            if (Object.keys(userInfo).includes("like")) delete userInfo["like"];

            res.send({ userInfo, tripInfo });
          } else {
            redis.hget(`mypage-${userPk}`, "likes", function (error, likes) {
              // console.log("likes-유저페이지", likes);
              if (error) next();
              if (likes) {
                const likes2 = JSON.parse(likes);
                userInfo.like = likes2.includes(parseInt(pagePk))
                  ? true
                  : false;
                res.send({ userInfo, tripInfo });
              } else next();
            });
          }
        } else next();
      });
    } else next();
  });
};

const checkLikeRedis = (req, res, next) => {
  const { userPk } = res.locals.user;

  redis.get(`like=${userPk}`, (error, likeusers) => {
    if (error) next();
    if (likeusers !== null) {
      // console.log("redisdata-like", likeusers);
      res.status(200).send(likeusers);
    } else next();
  });
};

export { checkMypageRedis, checkLikeRedis };
