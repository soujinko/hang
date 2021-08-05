import { getConnection } from '../models/db.js';

const alarms = (req, res, next) => {
  const { userPk } = res.locals.user;
  getConnection(conn => {
    try{
      conn.beginTransaction()
      conn.query(`SELECT * FROM requests WHERE tripId IN (SELECT tripId FROM trips WHERE userPk = ${userPk});`, (err, data) => {
        if (err) throw err
        res.locals.alarms = JSON.parse(JSON.stringify(data))
        next()
      })
    } catch(err) {
      conn.rollback();
      next(err)
    } finally {
      conn.release()
    }
  })
}

export default alarms;