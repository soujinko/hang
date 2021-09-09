import xssFilter from '../middleware/xssFilter.js';
import verification from '../middleware/verification.js';
import jwt from 'jsonwebtoken'

// xssFilter 처리 시험
it('middleware/xssFilter', async() => {
  const req = {
    body:
    {
      1:'<script>your password is mine</script>',
      2:['<script>your account is mine</script>','<script>your secret is mine</script>'],
      3:{1:'<script>your password is mine</script>', 2:['<script>your account is mine</script>', '<script>your secret is mine</script>']},
      4:'I\'m not dangerous :)'
    }
  }
  const res = {}
  const next = jest.fn()
  await xssFilter(req, res, next)
  expect(req.body).toEqual({ 1: '', 2: [ '', '' ], 3:{ '1': '', '2': [ '', '' ] }, 4:'I\'m not dangerous :)'})
  expect(next).toHaveBeenCalledTimes(1)
})

// 토근이 정상적으로 들어올 경우
it('middleware/verification case 1', () => {
  const req = { cookies: {jwt:'user'}, headers: {token:'user'} }
  let res = { locals: {} }
  const next = jest.fn()
  
  jwt.verify = jest.fn(x=>x)
  verification(req, res, next)
  
  expect(res.locals.user).toBe('user')
  expect(next).toHaveBeenCalledTimes(1)
  expect(jwt.verify.mock.calls[0].length).toBe(3)
  expect(jwt.verify.mock.calls[0][0]).toBe('user')
})

it('middleware/verification case 2', () => {
  // 토큰이 정상적으로 들어오지 않은 경우
  const req = { cookies: {jwt:'user1'}, headers: {token:'user2'} }
  const res = {sendStatus: jest.fn(x=>x)}
  const next = jest.fn()
  verification(req, res, next)
  expect(next).toHaveBeenCalledTimes(0)
  expect(res.sendStatus.mock.results[0].value).toBe(401)
})

// jwt와 refresh가 모두 실패한 경우
it('middleware/verification case 3', () => {
  const req = { cookies: {jwt:'user'}, headers: {token:'user'} }
  let res = { locals: {} }
  const next = jest.fn(x=>x)
  jwt.verify = jest.fn(x=>{throw new Error()})
  verification(req, res, next)
  expect(next).toHaveBeenCalledTimes(1)
  expect(next.mock.results[0].value.status).toBe(401)
})

// jwt는 유효기간이 경과했지만 변조되지 않았고 refresh는 성공한 경우
it('middleware/verification case 4', async() => {
  const connection = {
    beginTransaction:jest.fn(),
    query:jest.fn((x, y) => [[{refreshToken:'refresh'}]]),
    release:jest.fn()
  }

  const req = { 
    cookies: {jwt:'user', refresh: 'refresh'}, 
    headers: {token:'user'}}
  
   const res = {
    status: code => ({
      cookie: (tokenType, option, algorithm) => ({
        json: data => ({code, tokenType, option, algorithm, data})
      })
    }),
  };
  
  const next = jest.fn(x=>x)
  jwt.verify = jest.fn().mockReturnValueOnce(new Error()).mockReturnValue(1)
  jwt.sign = jest.fn()
  
  const result = await verification(req, res, next, connection)
  expect(next).toHaveBeenCalledTimes(0)
  expect(result.code).toBe(307)
})
