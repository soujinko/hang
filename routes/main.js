import express from "express";
import { connection } from "../models/db.js";
import searchAndPaginate from "../functions/search_paginate.js";
import asyncHandle from "../util/async_handler.js";
import xssFilter from "../middleware/xssFilter.js";

const router = express.Router();

router.get(
  "/",
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      let myuserPk = userPk;
      let promise = {};

      // 확정된 내 여행정보 1개 가져오기 (약속이 있고 가까운 날짜 순으로)
      const findTrip = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select * from trips where (userPk=? or partner=?) AND partner is not NULL ORDER BY startDate ASC  LIMIT 1`,
            [userPk, userPk]
          )
        )
      )[0];
      // 약속이 있다면 관련 유저정보 가져오기
      if (findTrip.length > 0) {
        const { endDate, startDate, partner, userPk } = findTrip[0];
        let findUser;
        if (partner !== myuserPk) {
          findUser = `select * from userView where userPk=${partner}`;
        } else {
          findUser = `select * from userView where userPk=${userPk}`;
        }

        const findMyUser = JSON.parse(
          JSON.stringify(await connection.query(findUser))
        )[0][0];
        promise.profileImg = findMyUser.profileImg;
        promise.nickname = findMyUser.nickname;
        promise.startDate = startDate;
        promise.endDate = endDate;
      } else {
        promise = {};
      }
      // 내 지역 정보
      const findMe = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select region from userView where userPk =?`,
            [userPk]
          )
        )
      )[0][0];
      const searchRegion = findMe.region;
      // 내 좋아요 리스트
      const myLikeList = JSON.parse(
        JSON.stringify(
          await connection.query(`select targetPk from likes where userPk=?`, [
            userPk,
          ])
        )
      )[0].map((e) => parseInt(e.targetPk));
      // 내 지역 길잡이 랜덤 3명
      const guide = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select * from userView where region =? and guide=1 and userPk not in (?) ORDER BY RAND() LIMIT 3`,
            [searchRegion, userPk]
          )
        )
      )[0];

      if (guide.length > 0) {
        await guide.forEach((e) => {
          // 내가 좋아요한 목록에 있으면 true
          if (myLikeList.includes(e.userPk)) {
            e.like = true;
          } else {
            e.like = false;
          }
        });
      }
      // 내 지역 여행자 랜덤 3명(여행자 정보 중복되지 않게)
      const traveler = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select a.* from userView a left join trips b on a.userPk = b.userPk where b.region =? and b.partner is NULL and a.userPk not in (?) Group by userPk ORDER BY RAND() LIMIT 3 `,
            [searchRegion, userPk]
          )
        )
      )[0];

      if (traveler.length > 0) {
        await traveler.forEach((e) => {
          // 내가 좋아요한 목록에 있으면 true
          if (myLikeList.includes(e.userPk)) {
            e.like = true;
          } else {
            e.like = false;
          }
        });
      }
      await connection.commit();

      res.send({ promise, guide, traveler });

      connection.commit();
    } catch (err) {
      console.error(err);
      connection.rollback();
      err.status = 400;
      next(err);
    } finally {
      connection.release();
    }
  })
);

router.post(
  "/search",
  xssFilter,
  asyncHandle(async (req, res, next) => {
    const { userPk } = res.locals.user;
    const result = await searchAndPaginate(req, userPk, next);
    res.status(200).json({ result });
  })
);

export default router;
