import { connection } from '../models/db.js';

/**
 * For faster query, we applied:
 * 
 * 1. Full-Text-Search
 * 2. Late Row Lookup (to get rid of Row-Lookup's weakness. index query first, then join)
 * 
 * to function below.
 * 
 * To apply Full-Text-Search, follow these steps: 
 * 
 * 1. Check your MySQL configs for minimum length for search : SHOW VARIABLES LIKE '%ft%'
 * 2. Change config in 'my.ini' if you MUST:
 *    ft_min_word_len=1
 *    innodb_ft_min_token_size=1
 * 3. Then you have to check whether variables changed or not
 * 4. After you replaced configs, you have to restart the MySQL server
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
  const { keyword, region, city, traveler, guide, pageNum } = req.query;
  try{
    await connection.beginTransaction()
    let sequel= `SELECT nickname, age, gender, region, city, profileImg, 
                 CASE WHEN a.userPk IN 
                 (SELECT targetPk FROM likes WHERE userPk=${userPk})
                 THEN 1 ELSE 0 END AS 'like'
                 FROM (SELECT userPk FROM users 
                 WHERE MATCH(nickname) AGAINST('*${keyword}*' IN BOOLEAN MODE)`
    if (region) sequel += ` AND region='${region}'`
    if (city) sequel += ` AND city='${city}'`
    if (guide) sequel += ` AND guide=${guide}`
    if (traveler) sequel += ` AND userPk IN (SELECT userPk FROM trips)`
    sequel += ` LIMIT ${10*(pageNum-1)}, 10) a JOIN users b ON a.userPk = b.userPk`
    const data = await connection.query(sequel)
    return JSON.parse(JSON.stringify(data[0]))
  } catch(err) {
    await connection.rollback()
    next(err)
  } finally {
    await connection.release()
  }
}

export default searchAndPaginate;

