import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import express from 'express';

const router = express.Router();

const options = {
  swaggerDefinition: {
    info: {
      title: 'HANG',
      version: '0.0.1',
      description: '나만 아는 여행, 또 너만 아는 여행. HANG 입니다!',
    },
    host: '127.0.0.1:3000',
    basePath: '/',
  },
  apis: ['./routes/*.js', './models/*.js'],
};

const specs = swaggerJsdoc(options);

router.use(
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

export default router;
