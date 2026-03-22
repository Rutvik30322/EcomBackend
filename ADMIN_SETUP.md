# Admin User Setup Guide

This guide explains how to create an initial admin user for the ChocoApp backend.

## Method 1: Using the Seed Script (Recommended)

Run the seed script to create an initial admin user along with sample products:

```bash
npm run seed
```

Or if the seed script is not defined in package.json, run:

```bash
node seed.js
```

This will create an admin user with credentials from environment variables or defaults:
- Email: `admin@chocolateapp.com` (or `ADMIN_EMAIL` from .env)
- Password: `Admin@123456` (or `ADMIN_PASSWORD` from .env)
- Role: `superadmin`

## Method 2: Using the Create Admin Script

Create an admin user directly with custom credentials:

```bash
node create-admin.js --name "Your Admin Name" --email "your-email@example.com" --password "YourSecurePassword123"
```

## Method 3: Using Postman (For Testing)

You can also register an admin using the API directly through Postman:

### Register Admin via API
- **Endpoint**: `POST {{baseUrl}}/api/auth/register`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "name": "Admin Name",
    "email": "admin@example.com",
    "password": "SecurePassword123",
    "role": "admin"
  }
  ```

### Login as Admin
- **Endpoint**: `POST {{baseUrl}}/api/auth/admin/login`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "SecurePassword123"
  }
  ```

## Required Environment Variables

Make sure your `.env` file has the following variables set:

```env
ADMIN_EMAIL=admin@chocolateapp.com
ADMIN_PASSWORD=Admin@123456
```

## Environment Variables for Cloudinary (Required for Image Uploads)

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Default Credentials

If environment variables are not set, the system uses these defaults:
- **Email**: `admin@chocolateapp.com`
- **Password**: `Admin@123456`
- **Role**: `superadmin`

## Important Notes

1. The admin user creation will fail if an admin with the same email already exists
2. Passwords should meet security requirements (at least 8 characters with uppercase, lowercase, number, and special character)
3. After creating an admin user, you can use the admin token for product management operations
4. The seed script will not create duplicate admins or products if they already exist