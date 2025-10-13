import express, { Application, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';  
import http from 'http';  
import router from './router/index';
import { transporter } from './utils/emailCron';
transporter;
import { config } from 'dotenv';
config();

const app: Application = express();
const server = http.createServer(app);  

mongoose.connect(process.env.MONGODB_URI ||'mongodb://localhost:27017/ticket')
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err: Error) => {
    console.log('Not connected', err.message);
  });

mongoose.connection.on('error', (err: Error) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting reconnect...');
});

app.use(cors({
  origin: process.env.CORS_ORIGIN ,
  methods: 'POST,PUT,DELETE,GET',
  credentials: true,
}));
app.use(express.json());
app.use(bodyParser.json());

app.use('/api', router);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinProject', (projectId: string) => {
    if (projectId) {
      socket.join(`project-${projectId}`);  
      console.log(`Socket ${socket.id} joined project room: project-${projectId}`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('authenticate', (token: string) => {
    console.log(`Socket ${socket.id} authenticated with token`);
  });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).io = io;  
  next();
});

server.listen(4000, () => {
  console.log('Server is running on port 4000 with Socket.io');
});
