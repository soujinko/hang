import dotenv from 'dotenv';
import { getConnection } from '../models/db.js';
import crypto from 'crypto';
import passport from 'passport';
import passportLocal from 'passport-local';
import passportJWT from 'passport-jwt';

dotenv.config();

const { Strategy: LocalStrategy } = passportLocal;
const { Strategy: JWTStrategy } = passportJWT;

const localConfig = { usernameField: 'userId', passwordField: 'password' };

const localVerify = (userId, password, done) => {
	try {
		getConnection(async (conn) => {
			 conn.beginTransaction();
			 conn.query(
				`SELECT * FROM users WHERE userId = '${userId}'`,
				function (err, user) {
					 conn.release()
					if (err) throw err;
					if (user.length < 1)
						return done(null, false, {
							message: 'ID or password invalid',
						});

					const { salt, password: storedPassword } = JSON.parse(JSON.stringify(user[0]));
					const hashedPassword = crypto.pbkdf2Sync(password, salt, Number(process.env.ITERATION_NUM), 64,'SHA512').toString('base64');

					if (storedPassword !== hashedPassword) {
						return done(null, false, {message: 'ID or password invalid',});
					} else {
						return done(null, user[0], { message: 'Success' });
					}
				}
			);
		});
	} catch (err) {
		next(err);
	}
};

const cookieExtractorAccess = function(req) {
	const accessToken = req.cookies?.['jwt']
	return accessToken
}

const JWTConfigAccess = {}
JWTConfigAccess.jwtFromRequest = cookieExtractorAccess
JWTConfigAccess.secretOrKey = process.env.PRIVATE_KEY
JWTConfigAccess.algorithms = ['HS512']

const JWTVerifyAccess = (jwtPayload, done) => {
	try {
		getConnection(async (conn) => {
		 conn.beginTransaction()
		 conn.query(`SELECT * FROM users WHERE userPk=${jwtPayload.userPk}`, function (err, user) {
			 conn.release();
			if (err) throw err
			if (user.length < 1) return done(null, false, {message:'유효하지 않은 인증입니다.'})
			return done(null, user)
		})
	})
	} catch(err) {
		next(err)
	}
}

const passportConfig = () => {
	passport.use('local', new LocalStrategy(localConfig, localVerify))
	passport.use('jwt', new JWTStrategy(JWTConfigAccess, JWTVerifyAccess))
}

export default passportConfig