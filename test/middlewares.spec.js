import xssFilter from '../middleware/xssFilter.js';
import verification from '../middleware/verification.js';

// xssFilter 처리
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

// 토큰이 정상적으로 들어올 경우
it('middleware/verification case 1', async() => {
  const req = { cookies: {jwt:'user'}, headers: {token:'user'} }
  let res = { locals: {} }
  const next = jest.fn()
  const connection = {}
  const jwt = { verify: jest.fn().mockReturnValue('user') }
  
  await verification(req, res, next, connection, jwt)
  
  expect(res.locals.user).toBe('user')
  expect(next).toHaveBeenCalledTimes(1)
  expect(jwt.verify.mock.calls[0].length).toBe(3)
  expect(jwt.verify.mock.calls[0][0]).toBe('user')
})

// 토큰의 값이 일치하지 않는 경우
it('middleware/verification case 2', () => {
  const req = { cookies: {jwt:'user1'}, headers: {token:'user2'} }
  const res = {sendStatus: jest.fn(x=>x)}
  const next = jest.fn()
  const connection = {}
  const jwt = {}
  
  verification(req, res, next, connection, jwt)
  
  expect(next).toHaveBeenCalledTimes(0)
  expect(res.sendStatus.mock.results[0].value).toBe(401)
})

// jwt와 refresh가 모두 verify 실패한 경우
it('middleware/verification case 3', async() => {
  const req = { cookies: {jwt:'user'}, headers: {token:'user'} }
  const res = {}
  const next = jest.fn(x=>x)
  const connection = {}
  const jwt = { verify: jest.fn().mockReturnValue(new Error())}
  
  await verification(req, res, next, connection, jwt)
  
  expect(next).toHaveBeenCalledTimes(1)
  expect(next.mock.results[0].value.status).toBe(401)
})

// jwt는 유효기간이 경과했지만 변조되지 않았고 refresh는 성공한 경우
it('middleware/verification case 4', async() => {
  const connection = {
    beginTransaction: () => {},
    query:jest.fn().mockReturnValue([[{refreshToken:'refresh'}]]),
    release: () => {}
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
  const next = jest.fn()
  const jwt = {
    verify: jest.fn().mockReturnValueOnce(new Error()).mockReturnValue(1),
    sign: () => {}
  }
  
  const result = await verification(req, res, next, connection, jwt)
  
  expect(next).toHaveBeenCalledTimes(0)
  expect(result.code).toBe(307)
})
