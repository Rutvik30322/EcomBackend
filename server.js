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

// Database Connection - only connect if MONGODB_URI is present
// On Vercel, we don't want to block the entire function start if DB is slow
if (process.env.MONGODB_URI) {
  connectDB().catch(err => console.error('Initial DB connection error:', err));
} else {
  console.warn('⚠️ MONGODB_URI is missing. Database features will fail.');
}

// Only run Cron Jobs locally (they don't work on Vercel Serverless anyway)
if (!process.env.VERCEL) {
  initCronJobs();
}

configureCloudinary();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.NODE_ENV === 'production'
      ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'https://rutvik30322.github.io'] : ['*'])
      : ['http://localhost:3001', 'http://localhost:5173', 'http://172.20.10.5:3001', 'http://180.179.21.98:3001'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowed.indexOf(origin) !== -1 || allowed[0] === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(helmet({
  contentSecurityPolicy: false, // Disable only if needed for specific integrations
}));
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' || req.path === '/',
});

app.use('/api', generalLimiter);

// Health Check and Root Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    message: 'ShopNova API is running correctly',
    environment: process.env.VERCEL ? 'vercel' : 'local',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f3f4f6; color: #1f2937;">
      <div style="background: white; padding: 2rem; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center;">
        <h1 style="color: #4f46e5; margin-bottom: 0.5rem;">🚀 ShopNova API</h1>
        <p style="font-size: 1.2rem; color: #4b5563;">Status: <span style="color: #059669; font-weight: bold;">RUNNING</span></p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;">
        <p style="font-size: 0.9rem; color: #6b7280;">Backend version 1.0.0 | Environment: ${process.env.VERCEL ? 'Vercel Serverless' : 'Local Node'}</p>
        <div style="margin-top: 1.5rem;">
          <a href="/api/health" style="text-decoration: none; color: white; background: #4f46e5; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500;">Check API Health</a>
        </div>
      </div>
    </div>
  `);
});

// API Routes
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

// 404 Handler
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
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
};

let io = null;

if (!process.env.VERCEL) {
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : ['http://localhost:3000', 'http://localhost:5173', 'http://172.20.10.5:3001'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-admin', () => socket.join('admin'));
    socket.on('request-dashboard-update', async () => {
      try {
        const { emitDashboardStatsUpdate } = await import('./utils/notifications.js');
        await emitDashboardStatsUpdate();
      } catch (error) {
        console.error('Socket dashboard update error:', error);
      }
    });
  });

  global.io = io;

  const PORT = process.env.PORT || 5001;
  const HOST = '0.0.0.0';
  const LOCAL_IP = getLocalIP();
  
  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server running locally at http://${LOCAL_IP}:${PORT}`);
  });
}

export default app;
export { io };