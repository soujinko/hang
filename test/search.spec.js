import searchAndPaginate from '../functions/search_paginate.js'

// 아무런 검색 조건도 없을 때
it('functions/searchAndPaginate case 1', async() => {
  const req = {
    body:
    {
      keyword: '', 
      region: '', 
      city: '', 
      traveler: 0, 
      guide: 0, 
      pageNum: undefined
    }
  }
  const next = () => {}
  const userPk = 1
  const connection = {
    beginTransaction: () => {},
    query:() => {},
    release:() => {}
  }
  const redis = {smembers: () => []}
  const querySpy = jest.spyOn(connection, 'query')
  querySpy.mockReturnValue(['some data'])
  
  const result = await searchAndPaginate(req, userPk, next, connection, redis)
  
  expect(querySpy).toBeCalledTimes(1)
  expect(querySpy.mock.calls[0][1].length).toBe(3)
  expect(result).toBe('some data')

  querySpy.mockRestore()
})

// 모든 조건이 다 채워져 있을 때
it('functions/searchAndPaginate case 2', async() => {
  const req = {
    body:
    {
      keyword: '레미', 
      region: '노원', 
      city: '서울', 
      traveler: 1, 
      guide: 1, 
      pageNum: 3
    }
  }
  const next = () => {}
  const userPk = 1
  const connection = {
    beginTransaction: () => {},
    query:() => {},
    release:() => {}
  }
  const redis = {smembers: () => []}
  const querySpy = jest.spyOn(connection, 'query')
  querySpy.mockReturnValue(['some data'])
  
  const result = await searchAndPaginate(req, userPk, next, connection, redis)
  
  expect(querySpy).toBeCalledTimes(1)
  expect(querySpy.mock.calls[0][1]).toEqual([1, 1, '레미*', '노원', '서울', (req.body.pageNum-1)*10])
  expect(result).toBe('some data')

  querySpy.mockRestore()
})

