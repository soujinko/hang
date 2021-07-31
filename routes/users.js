import express from 'express';
import crypto from 'crypto';
import { getConnection } from '../models/db.js';
import dotenv from 'dotenv';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import verification from '../middleware/verification.js';

dotenv.config();

const router = express.Router();

router.post('/', (req, res, next) => {
	const { userId, nickname } = req.body;
	getConnection(async (conn) => {
		try{
			conn.beginTransaction();
			conn.query(`SELECT userPk FROM users WHERE userId='${userId}' OR nickname='${nickname}'`, function (err, data) {
				if (err) throw err;
				if (data.length > 0) {
					conn.release()
					res.status(400).json({message: '이미 사용 중인 아이디 혹은 닉네임 입니다.'})
				} else {
					next()
				}
			})
		} catch(err) {
			next(err)
		}
	})
	}, (req,res,next)=>{
	const { userId, nickname, password, age, region, city, profileImg } = req.body;
	getConnection(async (conn) => {
		try {
			conn.beginTransaction();

			const salt = crypto.randomBytes(64).toString('base64');
			const hashedPassword = crypto.pbkdf2Sync(password, salt, Number(process.env.ITERATION_NUM), 64, 'SHA512').toString('base64');
			
			conn.query(
				`INSERT INTO 
         users(nickname, userId, password, salt, region, city, age, profileImg)
         VALUES(?,?,?,?,?,?,?,?)`,
				[nickname, userId, hashedPassword, salt, age, region, city, profileImg]
			);

			conn.commit();
			res.sendStatus(200);
		} catch (err) {
			conn.rollback();
			err.status = 400;
			next(err);
		} finally {
			conn.release();
		}
	});
});

router.post('/signin', (req, res, next) => {
	try {
		passport.authenticate('local', (err, user, info) => {
			if (err || !user) {
				return res.status(400).json({ message: info.message });
			}
			req.login(user, { session: false }, (err) => {
				if (err) throw err;
				const accessToken = jwt.sign(
					{
						userPk: user.userPk,
						nickname: user.nickname,
						profileImg: user.profileImg,
					},
					process.env.PRIVATE_KEY,
					{ expiresIn: '3h', algorithm: 'HS512' }
				);
				const refreshToken = jwt.sign({}, process.env.PRIVATE_KEY, { expiresIn: '7d', algorithm:'HS512'})
				
				getConnection((conn) => {
					try {
						conn.beginTransaction();
						conn.query(`UPDATE users SET refreshToken='${refreshToken}' WHERE userPk='${user.userPk}'`)
						conn.commit()
					} catch(err) {
						conn.rollback()
						err.status = 400;
						next(err)
					} finally {
						conn.release()
					}
				})
				
				res.cookie( 'jwt', accessToken, { httpOnly:true });
				res.cookie( 'refresh', refreshToken, { httpOnly:true });
				res.status(200).json({message: info.message});
			});
		})(req, res);
	} catch {
		next(err);
	}
});

router.get('/a', verification, (req, res) => {
	res.send('true')
})



export default router;
