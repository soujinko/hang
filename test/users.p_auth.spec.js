
import { POST_p_auth } from '../routes/controllers/users.js'

// 입력 받은 번호가 인증 번호와 일치할 때
test('router users/p_auth test case 1', async()=>{
  const req = {body: { pNum: '01011112222', aNum: '11111' }}
  const redis = { get: jest.fn().mockReturnValue('11111')}
  const res = { sendStatus: jest.fn() }

  await (POST_p_auth(redis))(req, res)

  expect(res.sendStatus).not.toBeCalledWith(406)
  expect(res.sendStatus).toBeCalledWith(200)
  expect(res.sendStatus).toBeCalledTimes(1)
})

// 입력 받은 번호와 인증 번호가 일치하지 않을 때
test('router users/p_auth test case 2', async()=>{
  const req = {body: { pNum: '01011112222', aNum: '11111' }}
  const redis = { get: jest.fn().mockReturnValue('22222')}
  const res = { sendStatus: jest.fn() }

  await (POST_p_auth(redis))(req, res)

  expect(res.sendStatus).toBeCalledWith(406)
  expect(res.sendStatus).not.toBeCalledWith(200)
  expect(res.sendStatus).toBeCalledTimes(1)
})
