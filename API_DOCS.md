# Product API with Image Upload Documentation

## Overview
This API allows admin users to add products with image uploads. The uploaded images are stored in Cloudinary and their URLs are saved with the product details.

## Authentication
All admin-only routes require authentication with a valid JWT token and admin privileges.

## Endpoints

### Create Product with Images
- **Method**: POST `/api/products`
- **Access**: Private/Admin only
- **Requires**: Valid admin JWT token in Authorization header

#### Request Body Options:

**Option 1: Upload images directly (multipart/form-data)**
```javascript
// Form fields:
- name: "Chocolate Bar"
- description: "Delicious milk chocolate bar"
- price: 4.99
- category: "Bars"
- inStock: true
- stock: 50
- weight: "100g"
- ingredients: ["Cocoa", "Sugar", "Milk"]
- mainImage: [file upload - single image]
- additionalImages: [file upload - multiple images, up to 10]
```

**Option 2: Provide image URLs in JSON body**
```javascript
{
  "name": "Chocolate Bar",
  "description": "Delicious milk chocolate bar",
  "price": 4.99,
  "category": "Bars",
  "inStock": true,
  "stock": 50,
  "weight": "100g",
  "ingredients": ["Cocoa", "Sugar", "Milk"],
  "image": "https://res.cloudinary.com/your-cloud/image/upload/v123/main_image.jpg",  // Main product image
  "images": [  // Additional product images
    "https://res.cloudinary.com/your-cloud/image/upload/v123/additional1.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/v123/additional2.jpg"
  ]
}
```

**Option 3: Mixed approach (JSON body + file uploads)**
```javascript
// JSON body:
{
  "name": "Chocolate Bar",
  "description": "Delicious milk chocolate bar",
  "price": 4.99,
  "category": "Bars",
  "inStock": true,
  "stock": 50,
  "weight": "100g",
  "ingredients": ["Cocoa", "Sugar", "Milk"]
}

// Form fields:
- mainImage: [file upload - single image]
- additionalImages: [file upload - multiple images, up to 10]
```

#### Response
```javascript
{
  "success": true,
  "statusCode": 201,
  "message": "Product created successfully",
  "data": {
    "product": {
      "_id": "60f1e2b3c4d5e6f7a8b9c0d1",
      "name": "Chocolate Bar",
      "description": "Delicious milk chocolate bar",
      "price": 4.99,
      "image": "https://res.cloudinary.com/your-cloud/image/upload/v123/main_image.jpg",
      "images": [
        "https://res.cloudinary.com/your-cloud/image/upload/v123/additional1.jpg",
        "https://res.cloudinary.com/your-cloud/image/upload/v123/additional2.jpg"
      ],
      "category": "Bars",
      "rating": 0,
      "numReviews": 0,
      "inStock": true,
      "stock": 50,
      "weight": "100g",
      "ingredients": ["Cocoa", "Sugar", "Milk"],
      "isActive": true,
      "createdAt": "2023-07-18T10:30:00.000Z",
      "updatedAt": "2023-07-18T10:30:00.000Z"
    }
  }
}
```

### Update Product with Images
- **Method**: PUT `/api/products/:id`
- **Access**: Private/Admin only
- **Requires**: Valid admin JWT token in Authorization header

#### Request Body Options:
Same as Create Product (supports multipart/form-data uploads and/or JSON with image URLs).

#### Response
```javascript
{
  "success": true,
  "statusCode": 200,
  "message": "Product updated successfully",
  "data": {
    "product": {
      // Updated product object
    }
  }
}
```

## Implementation Details

### File Upload Handling
- **Main image**: Uploaded via `mainImage` field (single file)
- **Additional images**: Uploaded via `additionalImages` field (up to 10 files)
- **Max file size**: 5MB per image
- **Supported formats**: JPG, JPEG, PNG, WEBP

### Image Processing
1. Files are uploaded directly to Cloudinary
2. Cloudinary generates public URLs for the images
3. These URLs are stored in the product document:
   - `image` field stores the main product image URL
   - `images` array stores additional product image URLs

### Error Handling
- Invalid file types return 400 error
- Missing authentication returns 401 error
- Insufficient permissions return 403 error
- Validation errors return 400 error with validation details

## Example Usage

### Using cURL to create a product with image uploads:

```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -F "name=Premium Chocolate" \
  -F "description=A delicious premium chocolate bar" \
  -F "price=9.99" \
  -F "category=Bars" \
  -F "mainImage=@/path/to/main_image.jpg" \
  -F "additionalImages=@/path/to/image1.jpg" \
  -F "additionalImages=@/path/to/image2.jpg" \
  -F "inStock=true" \
  -F "stock=100"
```

### Using JavaScript fetch to create a product:

```javascript
const formData = new FormData();
formData.append('name', 'Premium Chocolate');
formData.append('description', 'A delicious premium chocolate bar');
formData.append('price', '9.99');
formData.append('category', 'Bars');
formData.append('inStock', 'true');
formData.append('stock', '100');
formData.append('mainImage', mainImageFile); // File object
formData.append('additionalImages', additionalImageFile1); // File object
formData.append('additionalImages', additionalImageFile2); // File object

fetch('http://localhost:5001/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## Notes
- The system automatically handles Cloudinary uploads
- Images are stored in the 'chocolate-app/products' folder in Cloudinary
- The default image emoji '🍫' is ignored during creation/update
- Admin authentication is required for all product creation and modification operations