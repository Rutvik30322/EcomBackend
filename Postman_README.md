# Postman Collection for ChocoApp Product API

This guide explains how to use the Postman collection to test the ChocoApp Product API with image uploads.

## Setup Instructions

### 1. Import Files
- Import the `Postman_Product_API_Test.json` file as a collection in Postman
- Import the `Postman_Environment.json` file as an environment in Postman

### 2. Configure Environment Variables
- Update the environment variables with your actual values:
  - `baseUrl`: Your backend server URL (default: `http://localhost:5001`)
  - `admin_email`: Your admin email
  - `admin_password`: Your admin password

## API Endpoints

### Authentication
- **Endpoint**: `POST {{baseUrl}}/api/auth/admin/login`
- **Purpose**: Authenticate as an admin user to get a JWT token
- **Request Body**:
  ```json
  {
    "email": "your_admin_email",
    "password": "your_admin_password"
  }
  ```
- **Response**: Contains a JWT token for subsequent authenticated requests

### Creating Products

#### Option 1: Create Product with Image Uploads (Form Data)
- **Endpoint**: `POST {{baseUrl}}/api/products`
- **Headers**: 
  - `Authorization: Bearer {{admin_token}}`
- **Body Type**: `form-data`
- **Form Fields**:
  - `name` (text): Product name
  - `description` (text): Product description
  - `price` (text): Product price
  - `category` (text): Product category
  - `inStock` (text): Whether product is in stock (true/false)
  - `stock` (text): Stock quantity
  - `weight` (text): Product weight
  - `ingredients` (text): JSON string of ingredients array
  - `mainImage` (file): Main product image file
  - `additionalImages` (file): Additional product images (can add multiple)

#### Option 2: Create Product with Image URLs (JSON)
- **Endpoint**: `POST {{baseUrl}}/api/products`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{admin_token}}`
- **Body Type**: `raw` JSON
- **Request Body**:
  ```json
  {
    "name": "Product Name",
    "description": "Product Description",
    "price": 9.99,
    "category": "Bars",
    "inStock": true,
    "stock": 50,
    "weight": "100g",
    "ingredients": ["Ingredient 1", "Ingredient 2"],
    "image": "https://res.cloudinary.com/your-cloud/image/upload/v123/main_image.jpg",
    "images": [
      "https://res.cloudinary.com/your-cloud/image/upload/v123/additional1.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v123/additional2.jpg"
    ]
  }
  ```

### Updating Products
- **Endpoint**: `PUT {{baseUrl}}/api/products/{{product_id}}`
- **Headers**: 
  - `Authorization: Bearer {{admin_token}}`
- **Body**: Same as create product (supports both form-data and JSON)

### Getting Products
- **Get All Products**: `GET {{baseUrl}}/api/products`
- **Get Single Product**: `GET {{baseUrl}}/api/products/{{product_id}}`

## Usage Steps

1. **Login First**: Run the "Admin Login" request to get an admin token
2. **Create Product**: Use either "Create Product with Images (Form Data)" or "Create Product with Image URLs (JSON)" request
3. **Update Product**: Use the "Update Product with New Images" request (requires a valid product ID)
4. **View Products**: Use the "Get All Products" or "Get Product by ID" requests

## Notes

- Make sure your backend server is running before testing
- Ensure your Cloudinary configuration is properly set in the backend `.env` file
- The admin token is automatically stored in the environment after successful login
- When using form-data uploads, update the file paths in the request body before sending
- Product IDs created during testing are stored in environment variables for use in subsequent requests