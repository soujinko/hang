import express from "express";
import { getConnection } from "../models/db.js";

const router = express.Router();

// router.get("/:userPk", async (req, res) => {
//   getConnection(async (conn) => {
//     try {
//       let tripInfo = [];
//       conn.beginTransaction();

//       //   const { userPk } = res.locals.user;
//       const { userPk } = req.params;
//       const findMyTrip = `select * from trips where userPk ='${userPk}'`;
//       // 해당 페이지 유저의 프로필 정보 가져오기
//       conn.query(findMyTrip, function (err, result) {
//         if (err) {
//           console.error(err);
//           conn.rollback();
//           next(err);
//         }
//         // console.log("나의 여행정보", result);
//         Object.values(JSON.parse(JSON.stringify(result))).forEach((e) => {
//           tripInfo.push(e);
//         });

//         res.send(tripInfo);
//       });
//       conn.commit();
//     } catch (err) {
//       console.log(err);
//       conn.rollback();
//       err.status = 400;
//       next(err);
//     } finally {
//       conn.release();
//     }
//   });
// });

// router.post("/:userPk", async (req, res) => {
//   getConnection(async (conn) => {
//     try {
//       conn.beginTransaction();
//       //   const { userPk } = res.locals.user;
//       const { userPk } = req.params;
//       const { tripId, pagePk } = req.body;
//       const findMyTrip = `select * from trips where userPk ='${userPk}' and partner is null`;
//       // 해당 페이지 유저의 프로필 정보 가져오기
//       conn.query(findMyTrip, function (err, result) {
//         if (err) {
//           console.error(err);
//           conn.rollback();
//           next(err);
//         }
//         // console.log("나의 여행정보", result);
//         Object.values(JSON.parse(JSON.stringify(result))).forEach((e) => {
//           tripInfo.push(e);
//         });
//         res.send(tripInfo);
//       });
//       conn.commit();
//     } catch (err) {
//       console.log(err);
//       conn.rollback();
//       err.status = 400;
//       next(err);
//     } finally {
//       conn.release();
//     }
//   });
// });

export default router;
