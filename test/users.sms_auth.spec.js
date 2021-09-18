import { sms_auth } from '../routes/controllers/users.js'

// status 1 && query 반환 값이 없는 경우
it('router users/sms_auth case 1', async() => {
  const req = {body: { pNum: '01011112222', status: 1 }}
  const res = {sendStatus: jest.fn()}
  const next = () => {}
  const connection = {
    beginTransaction: () => {},
    query:jest.fn().mockReturnValue([[]]),
    rollback:()=>{},
    release:jest.fn()
  }
  const NC_SMS = jest.fn()
  const redis = {set: jest.fn()}
  
  aawait (POST_sms_auth(connection, NC_SMS, redis))(req, res, next)

  expect(NC_SMS.mock.calls[0][2]).toBeGreaterThan(10000)
  expect(NC_SMS.mock.calls[0][2]).toBeLessThan(100000)
  expect(NC_SMS.mock.calls[0][2]).toBe(redis.set.mock.calls[0][1])
  expect(connection.query.mock.calls[0][1][0]).toBe(req.body.pNum)
  expect(connection.release).toHaveBeenCalledTimes(1)
  expect(res.sendStatus.mock.calls[0][0]).toBe(200)
})

// status 1 && query 반환 값이 존재 할 경우
it('router users/sms_auth case 2', async() => {
  const req = {body: { pNum: '01011112222', status: 1 }}
  const res = {sendStatus: jest.fn()}
  const next = () => {}
  const connection = {
    beginTransaction: () => {},
    query:jest.fn().mockReturnValue([['user']]),
    rollback:()=>{},
    release:jest.fn()
  }
  const NC_SMS = jest.fn()
  const redis = {set: jest.fn()}
  
  await (POST_sms_auth(connection, NC_SMS, redis))(req, res, next)
  
  expect(connection.query.mock.calls[0][1][0]).toBe(req.body.pNum)
  expect(connection.release).toHaveBeenCalledTimes(1)
  expect(res.sendStatus.mock.calls[0][0]).toBe(409)
})

// 에러 발생 할 경우
it('router users/sms_auth case 3', async() => {
  const req = {body: { pNum: '01011112222', status: 1 }}
  const res = {sendStatus: jest.fn()}
  const next = () => {}
  const connection = {
    beginTransaction: () => {},
    query:jest.fn().mockReturnValue(new Error()),
    rollback:jest.fn(),
    release:jest.fn()
  }
  const NC_SMS = jest.fn()
  const redis = {set: jest.fn()}
  
  await (POST_sms_auth(connection, NC_SMS, redis))(req, res, next)
  
  expect(connection.query.mock.calls[0][1][0]).toBe(req.body.pNum)
  expect(connection.release).toHaveBeenCalledTimes(1)
  expect(connection.rollback).toHaveBeenCalledTimes(1)
  expect(res.sendStatus).toHaveBeenCalledTimes(0)
})

// status가 0이라면 query를 거치지 않음
it('router users/sms_auth case 4', async() => {
  const req = {body: { pNum: '01011112222', status: 0 }}
  const res = {sendStatus: jest.fn()}
  const next = () => {}
  const connection = {
    beginTransaction: () => {},
    query:jest.fn().mockReturnValue(new Error()),
    rollback:jest.fn(),
    release:jest.fn()
  }
  const NC_SMS = jest.fn()
  const redis = {set: jest.fn()}
  
  await (POST_sms_auth(connection, NC_SMS, redis))(req, res, next)
  
  expect(connection.query).toHaveBeenCalledTimes(0)
  expect(connection.release).toHaveBeenCalledTimes(1)
  expect(NC_SMS).toHaveBeenCalledTimes(1)
  expect(connection.rollback).toHaveBeenCalledTimes(0)
  expect(res.sendStatus).toHaveBeenCalledWith(200)
})

