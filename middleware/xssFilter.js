import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

const { window } = new JSDOM('')
const { sanitize } = DOMPurify(window)

const purifier = async(body) => {
  if (!body) return
  for (let prop of Object.keys(body)) {
    if (typeof prop === 'string') body[prop] = await sanitize(req.body[prop])
    else if (typeof prop === 'object') {
      body[prop] = await purifier(prop)
    }
  }
  return body
}

const xssFilter = async(req, res, next) => {
  const sanitized = await purifier(req.body)
  if (sanitized) req.body = sanitized
  next()
}

// let req = {body:{1:`
//         hell <script>alert("hi");</script>
//         <div onclick="alert(123);">
//                 o
//         </div>
//         world
//         <img id="createElement">
// `,2:{1:`
//         hell <script>alert("hi");</script>
//         <div onclick="alert(123);">
//                 o
//         </div>
//         world
//         <img id="createElement">
// `,2:`
//         hell <script>alert("hi");</script>
//         <div onclick="alert(123);">
//                 o
//         </div>
//         world
//         <img id="createElement">
// `},3:[`
//         hell <script>alert("hi");</script>
//         <div onclick="alert(123);">
//                 o
//         </div>
//         world
//         <img id="createElement">
// `,`
//         hell <script>alert("hi");</script>
//         <div onclick="alert(123);">
//                 o
//         </div>
//         world
//         <img id="createElement">
// `]}}

// console.log(await xssFilter(req))

export default xssFilter