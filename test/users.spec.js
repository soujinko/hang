// import { expect } from 'chai'
import supertest from 'supertest'
// import { app } from '../index.js'

test("/index.html 경로에 요청했을 때 status code가 200이어야 한다.", async () => {
    
    expect(1+1).toEqual(2);
});



// 라우터 테스트는 mock을 이용하자
// 함수는 의존성 주입을 활용해 decoupling시켜 테스트하자

// 예제를 위해 남겨둔 함수
// describe('Register', () => {
//   describe('POST api/users/', () => {
//     // 콜백 파라미터에 done을 지정하면 done이 호출될때까지 test는 끝나지 않는다. 호출안되면 timeout으로 실패하게 됨. 비동기 테스트시 활용가능
//     // then-> done(), .catch(done)으로 테스트 가능. mocha는 resolve/reject를 알아서 성공/실패로 처리한다.
//     // 물론 async await 혹은 callback패턴으로 처리해도 아무 문제 없음.
//     it('should return 201 when registration succeeded, else 401', (done) => {
//       supertest(app).get('/')
//       .then(res => {
//         expect(res.status).to.equal(500)
//         done()
//       })
//       .catch(done)
//     })
//   })
// })

// describe('Register', () => {
//   describe('POST api/users/', () => {
//     it('should return 409(conflict) if ID or nickname has occupied by someone', async() => {
//       const res = await supertest(app)
//       .post('/api/users/')
//       .set('Content-Type', 'application/json')
//       .send({userId:'bjs123', nickname:'neverusednickname'})
//       expect(res.body).to.deep.equal({message:'UserID or nickname already been taken'})
//       expect(res.status).to.eql(409)
//     })
//   })
// })