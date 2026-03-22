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

// 1. DATABASE
if (process.env.MONGODB_URI) {
    connectDB().catch(err => console.error('DB Connection Error:', err));
}

// 2. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
    origin: (origin, callback) => {
        const allowed = process.env.NODE_ENV === 'production'
            ? [process.env.CLIENT_URL || '*', 'https://rutvik30322.github.io']
            : ['http://localhost:3001', 'http://localhost:5173', 'http://172.20.10.5:3001'];
        if (!origin || allowed.includes(origin) || allowed.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// 3. LIMITER
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 500,
    message: 'Too many requests',
    skip: (req) => req.path === '/' || req.path === '/api/health'
});
app.use('/api', limiter);

// 4. ROUTES
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.VERCEL ? 'vercel' : 'local' }));

app.get('/', (req, res) => {
    res.send(`
    <div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5;">
      <div style="background: white; padding: 3rem; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;">
        <h1 style="color: #4f46e5; font-size: 2.5rem; margin-bottom: 1rem;">ShopNova API</h1>
        <div style="display: inline-block; padding: 0.5rem 1.5rem; background: #d1fae5; color: #065f46; border-radius: 50px; font-weight: bold; font-size: 1.2rem;">
          ● RUNNING
        </div>
        <p style="margin-top: 1.5rem; color: #6b7280;">Backend is active and serving requests.</p>
        <p style="font-size: 0.8rem; color: #9ca3af; margin-top: 2rem;">Vercel Serverless Ready</p>
      </div>
    </div>
  `);
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
app.use('/api/brand', brandRoutes);

// 5. ERROR HANDLING
app.use((req, res) => res.status(404).json({ success: false, message: 'Not Found' }));
app.use(errorHandler);

// 6. SERVER & SOCKETS (LOCAL ONLY)
let io = null;
if (!process.env.VERCEL) {
    const startServer = async () => {
        try {
            configureCloudinary();
            initCronJobs();
            
            const httpServer = createServer(app);
            io = new Server(httpServer, {
                cors: { origin: '*', credentials: true }
            });

            io.on('connection', (socket) => {
                socket.on('join-admin', () => socket.join('admin'));
            });

            global.io = io;
            const PORT = process.env.PORT || 5001;
            httpServer.listen(PORT, '0.0.0.0', () => {
                console.log(`🚀 Local Server: http://localhost:${PORT}`);
            });
        } catch (err) {
            console.error('Local startup error:', err);
        }
    };
    startServer();
}

export default app;
export { io };