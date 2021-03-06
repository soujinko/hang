const POST = (connection, checkDate) => {
  return (
    async (req, res, next) => {
      try {
        connection.beginTransaction();
        const { userPk } = res.locals.user;
        const { tripId } = req.body;
        // 오늘 날짜 구하기
        let today = new Date();
        today = today.toISOString().slice(0, 10);

        // 내지역 길잡이 비활된 상태라면 에러
        const getMyProfile = JSON.parse(
          JSON.stringify(
            await connection.query(
              `select guide, region from userView where userPk=${userPk}`
            )
          )
        )[0][0];

        if (getMyProfile.guide === 0)
          res.status(400).send({ errorMessage: "내 지역 길잡이를 활성화하세요" });

        // 해당 여행의 날짜 여행 주인 pk 가져오기
        const checkTripDate = JSON.parse(
          JSON.stringify(
            await connection.query(
              `select left(startDate, 10), left(endDate, 10), userPk, partner, region from trips where tripId=${tripId}`
            )
          )
        )[0].map((e) => [
          e["left(startDate, 10)"],
          e["left(endDate, 10)"],
          e.userPk,
          e.partner,
          e.region,
        ]);
        
        if (checkTripDate.length === 0)
          return res
            .status(400)
            .send({ errorMessage: "신청이 불가한 여행입니다" });

        if (checkTripDate[0][4] !== getMyProfile.region)
          return res
            .status(400)
            .send({ errorMessage: "여행 지역을 확인해 주세요" });

        let startMyDate = Date.parse(checkTripDate[0][0]);
        let endMyDate = Date.parse(checkTripDate[0][1]);
        let pagePk = checkTripDate[0][2];
        let partner = checkTripDate[0][3];

        const checkExistRequest = JSON.parse(
          JSON.stringify(
            await connection.query(
              `select * from requests where tripId=${tripId} and reqPk=${userPk} and recPk=${pagePk} `
            )
          )
        )[0];

        // 해당 여행이 기한 지났으면 오류
        if (endMyDate < Date.parse(today))
          return res.status(400).send({ errorMessage: "기한이 지난 여행입니다" });

        // 이미 신청했으면 오류 / 파트너가 있으면 오류
        if (checkExistRequest.length > 0) {
          return res
            .status(400)
            .send({ errorMessage: "이미 길잡이 신청한 여행입니다" });
        } else if (partner !== null) {
          return res
            .status(400)
            .send({ errorMessage: "이미 길잡이가 있는 여행입니다" });
        }

        // 나의 확정 약속과 겹치면 false 안겹치면 true
        const checkDates = await checkDate(userPk, startMyDate, endMyDate, res);

        const insertRequest = async () => {
          if (checkDates) {
            const result = await connection.query(
              `INSERT INTO requests (tripId, reqPk, recPk) VALUES (${tripId}, ${userPk}, ${pagePk})`
            );
            if (result[0].affectedRows === 0) throw new Error();

            await connection.commit();
            res.status(201).send();
          } else return;
        };
        // 약속 데이터 등록
        insertRequest();
      } catch (err) {
        console.error(err);
        await connection.rollback();
        res.status(400).send({ errorMessage: err.message });
      } finally {
        connection.release();
      }
    }
  )
}

export { POST }
