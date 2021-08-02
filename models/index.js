import { getConnection } from './db.js';
import users from './users.js';
import trips from './trips.js';
import likes from './likes.js';
import requests from './requests.js';
import alarms from './alarms.js';

// 이 파일을 실행해서 db를 세팅하세요

getConnection(async (conn) => {
	// 유저 테이블 생성
	conn.query(users, function (err, result) {
		if (err) throw err;
		console.log('users table created');
	});

	// 트립 테이블 생성
	conn.query(trips, function (err, result) {
		if (err) throw err;
		console.log('trips table created');
	});
	// 라이크 테이블 생성
	conn.query(likes, function (err, result) {
		if (err) throw err;
		console.log('likes table created');
	});
	// 리퀘스트 테이블 생성
	conn.query(requests, function (err, result) {
		if (err) throw err;
		console.log('requests table created');
	});
	// 알람 테이블 생성
	conn.query(alarms, function (err, result) {
		if (err) throw err;
		console.log('alarms table created');
	});

	conn.release();
});

