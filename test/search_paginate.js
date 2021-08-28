import { connection } from "../models/db.js";
import Redis from "ioredis"
import dotenv from 'dotenv'

dotenv.config()

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
 * 
 * 21/08/15 We added ngram parser to the full text index to search in 'word boundaries' so called
 */

const redis = new Redis({password:process.env.REDIS_PASSWORD})

const searchAndPaginate = async (req, userPk, next) => {
  const { keyword, region, city, traveler, guide, pageNum } = req.body;
  let sequel = `SELECT a.userPk, nickname, age, gender, region, tags, city, profileImg, 
                CASE WHEN a.userPk IN 
                (SELECT targetPk FROM likes WHERE userPk = ?) 
                THEN 1 ELSE 0 END 'like' 
                FROM (SELECT userPk FROM users WHERE userPk NOT IN (?`;
  let inputs = [userPk, userPk]

  const blockedPk = await redis.smembers(`block:${userPk}`)
  for (let i=0; i<blockedPk.length; i++) {
    sequel += ',?'
    inputs.push(blockedPk[i])
  }
  sequel += ')'

  // 공통사항인 keyword부터
  if (keyword) {
    sequel += ` AND MATCH(nickname) AGAINST(? IN BOOLEAN MODE)`;
    inputs.push(keyword+'*')
  }

  if ((!traveler && !guide) && region ) {

    sequel += ` AND (userPk IN (SELECT userPk FROM trips`
    let options = [region, city]
    let sequelAddOns = [' region=?', ' city=?']
    
    for (let [i, v] of Object.entries(options)) {
      if (v) {
        sequel.slice(-5) === 'trips' ? sequel += ' WHERE' + sequelAddOns[i] : sequel += ' AND' + sequelAddOns[i]
        inputs.push(options[i])
      }
    }
    sequel += `) OR`

    options = [region, city];
    sequelAddOns = [
      ` region=?`,
      ` city=?`,
    ];

    for (let [i, v] of Object.entries(options)) {
      if (v) {
        sequel.slice(-2) === 'OR' ? sequel += sequelAddOns[i] : sequel += 'AND' + sequelAddOns[i]
        inputs.push(options[i])
      }
    }
    sequel += ')'

  } else if (keyword || region || city || guide || traveler) {
    // traveler가 true라면 city, region을 trips에서 검색해야 한다
    if (traveler) {
      sequel += ` AND userPk IN (SELECT userPk FROM trips`
      
      const options = [region, city]
      const sequelAddOns = [' region=?', ' city=?']
      
      for (let [i, v] of Object.entries(options)) {
        if (v) {
          sequel.slice(-5) === 'trips' ? sequel += ' WHERE' + sequelAddOns[i] : sequel += ' AND' + sequelAddOns[i]
          inputs.push(options[i])
        }
      }
      sequel += `)`
    } else {
      const options = [region, city, guide];
      const sequelAddOns = [
        ` AND region=?`,
        ` AND city=?`,
        ` AND guide=?`,
      ];

      for (let [i, v] of Object.entries(options)) {
        if (v) {
          sequel += sequelAddOns[i];
          inputs.push(options[i])
        }
      }
    }
  }

  sequel += ` LIMIT ?, 10) a JOIN users b ON a.userPk = b.userPk ORDER BY RAND()`;
  const limitParam = pageNum && pageNum > 0 && 10 * (pageNum - 1) || 0
  inputs.push(limitParam)
  
  try {
    await connection.beginTransaction();
    const data = await connection.query(sequel, inputs);
    await connection.release(); // return이 있어서 finally가 실행 안될까봐 넣어 둠
    return JSON.parse(JSON.stringify(data[0]));
  } catch (err) {
    await connection.rollback();
    await connection.release();
    next(err);
  }
};

export default searchAndPaginate;
