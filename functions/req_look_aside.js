import { redisClient } from "../index.js";

const checkMypageRedis = (req, res, next) => {
  const { userPk } = res.locals.user;
  const { pagePk } = req.params;
  console.log("레디스 확인", userPk, pagePk);
  if (parseInt(userPk) === parseInt(pagePk)) {
    console.log("마이페이지 레디스");
    redisClient.hget(
      `mypage-${userPk}`,
      "userInfo",
      function (error, userInfo) {
        if (error) next();
        if (userInfo) {
          redisClient.hget(
            `mypage-${userPk}`,
            "tripInfo",
            function (error, tripInfo) {
              if (error) next();
              console.log("레디스 데이터-마이페이지", userInfo, tripInfo);
              tripInfo = JSON.parse(tripInfo);
              userInfo = JSON.parse(userInfo);
              res.send({ userInfo, tripInfo });
            }
          );
        } else next();
      }
    );
  } else {
    console.log("유저페이지 레디스");
    redisClient.hget(
      `mypage-${pagePk}`,
      "userInfo",
      function (error, userInfo) {
        if (error) next();
        if (userInfo) {
          redisClient.hget(
            `mypage-${pagePk}`,
            "tripInfo",
            function (error, tripInfo) {
              if (error) next();
              redisClient.hget(
                `mypage-${userPk}`,
                "likes",
                function (error, likes) {
                  if (error) next();
                  if (likes) {
                    const likes2 = JSON.parse(likes);
                    tripInfo = JSON.parse(tripInfo);
                    userInfo = JSON.parse(userInfo);
                    userInfo.like = likes2.includes(parseInt(pagePk))
                      ? true
                      : false;

                    console.log(
                      "레디스 데이터-유저상세",
                      userInfo,
                      tripInfo,
                      likes2
                    );
                    res.send({ userInfo, tripInfo });
                  } else next();
                }
              );
            }
          );
        } else next();
      }
    );
  }
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
