import { POST_duplicate } from '../routes/controllers/users';

// req.body에 userId만 존재할 때 (정상) && 이미 가입된 데이터가 없을 때
test('router users/duplicate test case 1', async() => {
  const connection = {
    beginTransaction: () => {},
    query: jest.fn().mockReturnValue([[]]),
    release: jest.fn()
  }
  const req = { body: { userId: 'user' }}
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()

  await (POST_duplicate(connection))(req, res, next)
  
  expect(connection.query.mock.calls[0]).toEqual([ 'SELECT userPk FROM users WHERE userId=?', [ 'user' ] ])
  expect(res.sendStatus).toBeCalledWith(200)
  expect(res.sendStatus).not.toBeCalledWith(409)
  expect(res.sendStatus).toBeCalledTimes(1)
  expect(next).toBeCalledTimes(0)
  expect(connection.release).toBeCalledTimes(1)
})

// req.body에 userId만 존재할 때 (정상) && 이미 가입된 데이터가 있을 때
test('router users/duplicate test case 2', async() => {
  const connection = {
    beginTransaction: () => {},
    query: jest.fn().mockReturnValue([['user']]),
    release: jest.fn()
  }
  const req = { body: { userId: 'user' }}
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  
  await (POST_duplicate(connection))(req, res, next)
  
  expect(connection.query.mock.calls[0]).toEqual([ 'SELECT userPk FROM users WHERE userId=?', [ 'user' ] ])
  expect(res.sendStatus).toBeCalledWith(409)
  expect(res.sendStatus).not.toBeCalledWith(200)
  expect(res.sendStatus).toBeCalledTimes(1)
  expect(next).toBeCalledTimes(0)
  expect(connection.release).toBeCalledTimes(1)
})

// req.body에 nickname만 존재할 때 (정상) && 중복된 닉네임이 없을 때
test('router users/duplicate test case 3', async() => {
  const connection = {
    beginTransaction: () => {},
    query: jest.fn().mockReturnValue([[]]),
    release: jest.fn()
  }
  const req = { body: { nickname: 'haha' }}
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()

  await (POST_duplicate(connection))(req, res, next)
  
  expect(connection.query.mock.calls[0]).toEqual([ 'SELECT userPk FROM users WHERE nickname=?', [ 'haha' ] ])
  expect(res.sendStatus).toBeCalledWith(200)
  expect(res.sendStatus).not.toBeCalledWith(409)
  expect(res.sendStatus).toBeCalledTimes(1)
  expect(next).toBeCalledTimes(0)
  expect(connection.release).toBeCalledTimes(1)
})

// req.body에 nickname만 존재할 때 (정상) && 중복된 닉네임이 있을 때
test('router users/duplicate test case 4', async() => {
  const connection = {
    beginTransaction: () => {},
    query: jest.fn().mockReturnValue([['haha']]),
    release: jest.fn()
  }
  const req = { body: { nickname: 'haha' }}
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  
  await (POST_duplicate(connection))(req, res, next)
  
  expect(connection.query.mock.calls[0]).toEqual([ 'SELECT userPk FROM users WHERE nickname=?', [ 'haha' ] ])
  expect(res.sendStatus).toBeCalledWith(409)
  expect(res.sendStatus).not.toBeCalledWith(200)
  expect(res.sendStatus).toBeCalledTimes(1)
  expect(next).toBeCalledTimes(0)
  expect(connection.release).toBeCalledTimes(1)
})

// req.body에 userId, nickname 모두 존재 할 때 (비정상)
test('router users/duplicate test case 5', async() => {
  const connection = {
    beginTransaction: () => {},
    query: jest.fn().mockReturnValue([[]]),
    release: jest.fn()
  }
  const req = { body: { nickname: 'haha', userId: 'user' }}
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  
  await (POST_duplicate(connection))(req, res, next)
  
  expect(connection.query).toBeCalledTimes(0)
  expect(res.sendStatus).toBeCalledWith(409)
  expect(res.sendStatus).not.toBeCalledWith(200)
  expect(res.sendStatus).toBeCalledTimes(1)
  expect(next).toBeCalledTimes(0)
  expect(connection.release).toBeCalledTimes(0)
})

// req.body에 userId만 존재 할 때 (정상) && userId가 String이 아닐 때 (비정상)
test('router users/duplicate test case 6', async() => {
  const connection = {
    beginTransaction: () => {},
    query: jest.fn().mockReturnValue([[]]),
    release: jest.fn()
  }
  const req = { body: { userId: 12345 }}
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  
  await (POST_duplicate(connection))(req, res, next)
  
  expect(connection.query).toBeCalledTimes(0)
  expect(res.sendStatus).toBeCalledWith(409)
  expect(res.sendStatus).not.toBeCalledWith(200)
  expect(res.sendStatus).toBeCalledTimes(1)
  expect(next).toBeCalledTimes(0)
  expect(connection.release).toBeCalledTimes(0)
})

// req.body에 userId, nickname 모두 존재하지 않을 때 (비정상)
test('router users/duplicate test case 7', async() => {
  const connection = {
    beginTransaction: () => {},
    query: jest.fn().mockReturnValue([[]]),
    release: jest.fn()
  }
  const req = { body: {}}
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  
  await (POST_duplicate(connection))(req, res, next)
  
  expect(connection.query).toBeCalledTimes(0)
  expect(res.sendStatus).toBeCalledWith(409)
  expect(res.sendStatus).not.toBeCalledWith(200)
  expect(res.sendStatus).toBeCalledTimes(1)
  expect(next).toBeCalledTimes(0)
  expect(connection.release).toBeCalledTimes(0)
})
