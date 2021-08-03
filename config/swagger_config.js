import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express'
import express from 'express'

const router = express.Router()

const options = {
  apis: ["./swagger/*.yaml"],
  definition: {
    schemes:['http','https'],
    openapi: '3.0.1',
    info: {
      title: 'HANG',
      version: '0.0.1',
      description: '나만 아는 여행, 또 너만 아는 여행. HANG 입니다!',
    },
    host: 'http://localhost:3000',
    basePath: '/',
  },
};

const specs = swaggerJSDoc(options)

router.use(swaggerUi.serve, swaggerUi.setup(specs, {explorer:true}))

export default router
