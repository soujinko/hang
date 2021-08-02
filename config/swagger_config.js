import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express'
import express from 'express'

const router = express.Router()

const options = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'HANG',
      version: '0.0.1',
      description: '나만 아는 여행, 또 너만 아는 여행. HANG 입니다!',
    },
    scheme: ['http', 'https'],
    host: '127.0.0.1:3000',
    basePath: '/',
  },
  apis: ["./swagger/*.yaml"],
};

const specs = swaggerJSDoc(options)

router.use(swaggerUi.serve, swaggerUi.setup(specs, {explorer:true}))

export default router
