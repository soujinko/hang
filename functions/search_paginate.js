import { connection } from "../models/db.js";

/**
 * For faster query, we applied:
 *
 * 1. Full-Text-Search
 * 2. Late Row Lookup (to get rid of Row-Lookup's weakness. index query first, then join)
 *
 *
 * To apply Full-Text-Search, follow these steps:
 *
 * 1. Check your MySQL configs for minimum length for search : SHOW VARIABLES LIKE '%ft%'
 * 2. Change config in 'my.ini'(or 'my.cnf') if you MUST:
 *    ft_min_word_len=1
 *    innodb_ft_min_token_size=1
 * 3. check variables whether changed or not
 * 4. After you replaced configs, restart the MySQL server
 * 5. Then you have to alter table unless you applied when table was created:
 *    ALTER TABLE users ADD FULLTEXT INDEX index_name (column_name);
 * 6. Then run : OPTIMIZE TABLE 'TABLE_NAME' if you already have some instances
 *    (for InnoDB tables, OPTIMIZE TABLE is mapped to ALTER TABLE ... FORCE,
 *     which rebuilds the table to update index statistics and free unused space in the clustered index)
 *     https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html#optimize-table-innodb-details
 *
 * Finally, if you run this function, you'll get like this:
 *
 * +----------+-----+--------+--------+------+-------------+------+
 * | nickname | age | gender | region | city | profileImg  | like |
 * +----------+-----+--------+--------+------+-------------+------+
 * | gosu111  | 20  |      1 | 경기   | 서울 | afd/asfs/ew |    0 |
 * | gosu11   | 20  |      1 | 경기   | 서울 | afd/asfs/ew |    1 |
 * +----------+-----+--------+--------+------+-------------+------+
 */

const searchAndPaginate = async (req, userPk, next) => {
  const { keyword, region, city, traveler, guide, pageNum } = req.body;
  try {
    await connection.beginTransaction();

    let sequel = `SELECT a.userPk, nickname, age, gender, region, city, profileImg, 
                 CASE WHEN a.userPk IN 
                 (SELECT targetPk FROM likes WHERE userPk=${userPk}) 
                 THEN 1 ELSE 0 END 'like'
                 FROM (SELECT userPk FROM users`;

    if (keyword || region || city || guide || traveler) {
      sequel += ` WHERE`;
      if (keyword)
        sequel += ` MATCH(nickname) AGAINST('*${keyword}*' IN BOOLEAN MODE)`;

      const options = [region, city, guide, traveler];
      const sequelAddOns = [
        ` region='${region}'`,
        ` city='${city}'`,
        ` guide=${guide}`,
        ` userPk IN (SELECT userPk FROM trips)`,
      ];

      for (let [i, v] of Object.entries(options)) {
        if (v)
          if (sequel.slice(sequel.length - 5) === "WHERE")
            sequel += sequelAddOns[i];
          else sequel += " AND" + sequelAddOns[i];
      }
    }

    sequel += ` LIMIT ${
      (10 * (pageNum - 1) && 10 * (pageNum - 1) > 0 && 10 * (pageNum - 1)) || 0
    }, 10) a JOIN users b ON a.userPk = b.userPk`;
    const data = await connection.query(sequel);
    await connection.release(); // return이 있어서 finally가 실행 안될까봐 넣어 둠
    return JSON.parse(JSON.stringify(data[0]));
  } catch (err) {
    await connection.rollback();
    await connection.release();
    next(err);
  }
};

export default searchAndPaginate;