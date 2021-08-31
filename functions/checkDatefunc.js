import { connection } from "../models/db.js";

const checkDate = async (userPk, startMyDate, endMyDate, res) => {
  connection.beginTransaction();
  // 나의 확정약속/여행정보 모두 불러오기
  const userTripDates = JSON.parse(
    JSON.stringify(
      await connection.query(
        `select left(startDate, 10), left(endDate, 10), tripId from trips where userPk=? or partner=?`,
        [userPk, userPk]
      )
    )
  )[0];

  // 나의 확정 약속 및 여행일정이 있으면 날짜 겹치는지 확인 하고 리퀘스트 저장
  if (userTripDates.length > 0) {
    const userTripDates2 = userTripDates.map((e) => [
      e["left(startDate, 10)"],
      e["left(endDate, 10)"],
    ]);

    let count = 0;
    await userTripDates2.forEach((e) => {
      let startOld = Date.parse(e[0]);
      let endOld = Date.parse(e[1]);

      if (startMyDate > startOld && startMyDate < endOld) {
        return res
          .status(400)
          .send({ errorMessage: "해당 날짜에 이미 약속이 있어요" });
        // throw new Error("해당 날짜에 이미 약속이 있어요");
      } else if (endMyDate > startOld && endMyDate < endOld) {
        return res
          .status(400)
          .send({ errorMessage: "해당 날짜에 이미 약속이 있어요" });

        // throw new Error("해당 날짜에 이미 약속이 있어요");
      } else if (startMyDate <= startOld && endMyDate >= endOld) {
        return res
          .status(400)
          .send({ errorMessage: "해당 날짜에 이미 약속이 있어요" });

        // throw new Error("해당 날짜에 이미 약속이 있어요");
      } else {
        count += 1;
        console.log("count", count);
      }
    });
    //   겹치는 날짜 없으면 true 반환
    if (count === userTripDates.length) {
      console.log("returncount", count);
      return true;
    }
    // 등록 약속 없으면 true 반환
  } else return true;
};

export default checkDate;
