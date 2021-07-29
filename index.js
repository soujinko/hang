import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/index.js';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import csrfProtection from 'csurf';
import errorHandlers from './error_handlers.js';
import swaggerDocs from './swaggerDocs.js';
import http from 'http';

const app = express();
const server = http.createServer(app);

dotenv.config();

const corsOption = {
  origin: '',
  Credential: true,
  optionSuccessStatus: 200,
};

app.use(csrfProtection({ cookie: true }));
app.use(cors(corsOption));
app.use(logger('dev'));
app.use(helmet());
app.use(cookieParser());
app.use(express.json()); // body-parser 기능 포함
app.use(express.urlencoded({ extended: false }));

app.use('/api', router);
app.use('/docs', swaggerDocs);
app.use(errorHandlers);

server.listen(process.env.PORT || 3000, () => {
  console.log('서버 연결 성공');
});

export default server
