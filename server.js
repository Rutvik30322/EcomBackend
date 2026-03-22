import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { networkInterfaces } from 'os';

import connectDB from './config/database.js';
import configureCloudinary from './config/cloudinary.js';
import errorHandler from './middleware/errorHandler.js';
import { initCronJobs } from './utils/cronJobs.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import brandRoutes from './routes/brandRoutes.js';

dotenv.config();

const app = express();

connectDB();
initCronJobs();

configureCloudinary();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : ['http://localhost:3001', 'http://localhost:5173', 'http://172.20.10.5:3001', 'http://180.179.21.98:3001',], // Allow specific dev origins
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(helmet());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window (reduced from 15 minutes)
  max: 200, // limit each IP to 200 requests per minute (increased from 100 per 15 min)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {

    return req.path === '/api/health';
  },
});

const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 500, // Higher limit for admin operations (500 requests per minute)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/orders/admin', adminLimiter);
app.use('/api/users', adminLimiter);
app.use('/api/admins', adminLimiter);
app.use('/api/products', adminLimiter);
app.use('/api/categories', adminLimiter);
app.use('/api/reviews', adminLimiter);
app.use('/api/banners', adminLimiter);
app.use('/api/orders', adminLimiter);
app.use('/api/brands', adminLimiter);

app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.send('<h1>ShopNova API is Running Ready to host on Vercel</h1>');
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/brands', brandRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

const getLocalIP = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

if (!process.env.VERCEL) {
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : ['http://localhost:3000', 'http://localhost:5173', 'http://172.20.10.5:3001', 'http://172.16.10.249:3001'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-admin', () => {
      socket.join('admin');
    });

    socket.on('request-dashboard-update', async () => {
      try {
        const { emitDashboardStatsUpdate } = await import('./utils/notifications.js');
        await emitDashboardStatsUpdate();
      } catch (error) {
        console.error('Error handling dashboard update request:', error);
      }
    });
  });

  global.io = io;

  const PORT = process.env.PORT || 5001;
  const HOST = '0.0.0.0';
  const LOCAL_IP = getLocalIP();
  
  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://${LOCAL_IP}:${PORT}`);
  });
}

export default app;
export { io };