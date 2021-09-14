import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

const { window } = new JSDOM('')
const { sanitize } = DOMPurify(window)

const purifier = async(body) => {
  if (!body) return
  for (let prop of Object.keys(body)) {
    if (typeof body[prop] === 'string'){ 
      if (body[prop] !== '0') body[prop] = await sanitize(body[prop])
    }
    else if (typeof body[prop] == 'object') {
      body[prop] = await purifier(body[prop])
    }
  }
  return body
}

const xssFilter = async(req, res, next) => {
  const sanitized = await purifier(req.body)
  if (sanitized) req.body = sanitized
  next()
}

export default xssFilter
