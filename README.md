# Chocolate App Backend API

A comprehensive Node.js + Express + MongoDB REST API for the Chocolate App with authentication, product management, orders, and Cloudinary integration.

## 🚀 Features

- ✅ User Authentication (Register/Login with JWT)
- ✅ Separate Admin & Customer Authentication
- ✅ Profile Picture Upload to Cloudinary
- ✅ Product Management (CRUD operations)
- ✅ Order Management
- ✅ Admin Dashboard with Statistics
- ✅ Input Validation
- ✅ Error Handling
- ✅ Security (Helmet, Rate Limiting, CORS)
- ✅ MongoDB Atlas Integration

## 📋 Prerequisites

- Node.js (v20 or higher)
- MongoDB Atlas account
- Cloudinary account
- npm or yarn

## 🛠️ Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Connection - Choose ONE option:
   # OPTION 1: MongoDB Atlas (Cloud)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chocolateapp?retryWrites=true&w=majority
   
   # OPTION 2: MongoDB Local (Uncomment and use this for local MongoDB)
   # MONGODB_URI=mongodb://localhost:27017/chocolateapp
   # OR
   # MONGODB_URI=mongodb://127.0.0.1:27017/chocolateapp
   
   # SambaNova AI (Optional - for AI-powered category extraction from PDF)
   # Uses DeepSeek-R1-0528 model for intelligent category analysis
   SAMBANOVA_AI_API_KEY=your_sambanova_ai_api_key_here
   
   # JWT
   JWT_SECRET=your_super_secret_key
   JWT_EXPIRE=7d
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   
   # Admin
   ADMIN_EMAIL=admin@chocolateapp.com
   ADMIN_PASSWORD=Admin@123456
   ```

5. **Seed database with initial data:**
   ```bash
   npm run seed
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new customer | Public |
| POST | `/login` | Customer login | Public |
| POST | `/admin/login` | Admin login | Public |
| GET | `/me` | Get current user/admin profile | Private |
| PUT | `/profile` | Update user profile | Private (Customer) |
| PUT | `/change-password` | Change password | Private (Customer) |

### Products (`/api/products`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all products (with filters) | Public |
| GET | `/categories/all` | Get all categories | Public |
| GET | `/:id` | Get product by ID | Public |
| POST | `/` | Create new product | Private (Admin) |
| PUT | `/:id` | Update product | Private (Admin) |
| DELETE | `/:id` | Delete product | Private (Admin) |

### Categories (`/api/categories`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all categories | Public |
| GET | `/:id` | Get category by ID | Public |
| POST | `/` | Create new category | Private (Admin) |
| POST | `/parse-pdf` | Parse PDF and extract categories using AI | Private (Admin) |
| PUT | `/:id` | Update category | Private (Admin) |
| DELETE | `/:id` | Delete category | Private (Admin) |

**Note:** The `/parse-pdf` endpoint uses SambaNova AI (DeepSeek-R1-0528) to intelligently analyze product names from a PDF and suggest appropriate category names. If `SAMBANOVA_AI_API_KEY` is not set, it will fall back to keyword-based category extraction.

### Orders (`/api/orders`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create new order | Private (Customer) |
| GET | `/my-orders` | Get user's orders | Private (Customer) |
| GET | `/:id` | Get order by ID | Private |
| PUT | `/:id/pay` | Update order to paid | Private (Customer) |
| GET | `/` | Get all orders (admin) | Private (Admin) |
| PUT | `/:id/status` | Update order status | Private (Admin) |
| GET | `/admin/stats` | Get dashboard statistics | Private (Admin) |

### Upload (`/api/upload`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/profile-picture` | Upload profile picture | Private |
| DELETE | `/profile-picture` | Delete profile picture | Private |

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 📦 Request/Response Examples

### Register User
**POST** `/api/auth/register`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "1234567890",
  "password": "password123"
}
```

### Login User
**POST** `/api/auth/login`
```json
{
  "mobile": "1234567890",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "1234567890",
      "profilePicture": null,
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Upload Profile Picture
**POST** `/api/upload/profile-picture`
- Content-Type: `multipart/form-data`
- Body: `profilePicture` (file)

## 🎯 Admin Credentials

Default admin credentials (configured in `.env`):
- Email: `admin@chocolateapp.com`
- Password: `Admin@123456`

## 📂 Project Structure

```
backend/
├── config/
│   ├── database.js          # MongoDB connection
│   └── cloudinary.js        # Cloudinary configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── productController.js # Product management
│   ├── orderController.js   # Order management
│   └── uploadController.js  # File upload logic
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── errorHandler.js     # Global error handler
│   ├── upload.js           # Multer configuration
│   └── validate.js         # Validation middleware
├── models/
│   ├── User.js             # User schema
│   ├── Admin.js            # Admin schema
│   ├── Product.js          # Product schema
│   └── Order.js            # Order schema
├── routes/
│   ├── authRoutes.js       # Authentication routes
│   ├── productRoutes.js    # Product routes
│   ├── orderRoutes.js      # Order routes
│   └── uploadRoutes.js     # Upload routes
├── utils/
│   ├── apiResponse.js      # Response utilities
│   ├── apiError.js         # Error utilities
│   └── jwtHelper.js        # JWT utilities
├── validators/
│   └── authValidator.js    # Input validation schemas
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
├── seed.js                 # Database seeder
└── server.js               # Main server file
```

## 🔧 Scripts

```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
npm run seed    # Seed database with initial data
```

## 🛡️ Security Features

- JWT authentication
- Password hashing with bcrypt
- Helmet for security headers
- Rate limiting
- CORS protection
- Input validation
- File upload size limits

## 📝 License

ISC
