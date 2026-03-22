import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { PDFParse } from 'pdf-parse';
import axios from 'axios';
import { emitDataUpdate, emitDashboardStatsUpdate } from '../utils/notifications.js';

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
export const getAllCategories = async (req, res, next) => {
  try {
    const { active } = req.query;
    
    const query = {};
    if (active === 'true') {
      query.isActive = true;
    }
    
    const categories = await Category.find(query).sort({ name: 1 });

    const categoriesWithProductCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ 
          category: category.name,
          isActive: true 
        });
        
        return {
          ...category.toObject(),
          productCount
        };
      })
    );
    
    return successResponse(res, 200, 'Categories fetched successfully', { 
      categories: categoriesWithProductCount 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    
    return successResponse(res, 200, 'Category fetched successfully', { category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new category (Admin only)
 * @route   POST /api/categories
 * @access  Private/Admin
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, icon, description } = req.body;

    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      throw new ApiError(400, 'Category with this name already exists');
    }
    
    const category = await Category.create({
      name: name.trim(),
      icon: icon || '🍫',
      description: description?.trim() || '',
    });

    emitDataUpdate('categories', 'create', category);
    emitDashboardStatsUpdate();
    
    return successResponse(res, 201, 'Category created successfully', { category });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Category with this name already exists'));
    }
    next(error);
  }
};

/**
 * @desc    Update category (Admin only)
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { name, icon, description, isActive } = req.body;
    
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({ name: name.trim() });
      if (existingCategory) {
        throw new ApiError(400, 'Category with this name already exists');
      }
      category.name = name.trim();
    }
    
    if (icon !== undefined) category.icon = icon;
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive;
    
    await category.save();

    emitDataUpdate('categories', 'update', category);
    emitDashboardStatsUpdate();
    
    return successResponse(res, 200, 'Category updated successfully', { category });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Category with this name already exists'));
    }
    next(error);
  }
};

/**
 * @desc    Delete category (Admin only)
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const Product = (await import('../models/Product.js')).default;
    const productsCount = await Product.countDocuments({ category: category.name });
    
    if (productsCount > 0) {
      throw new ApiError(400, `Cannot delete category. It is used by ${productsCount} product(s). Please remove or reassign products first.`);
    }
    
    await Category.findByIdAndDelete(req.params.id);

    emitDataUpdate('categories', 'delete', { _id: category._id });
    emitDashboardStatsUpdate();
    
    return successResponse(res, 200, 'Category deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * Extract product/item names from text (excluding Sr. No)
 */
const extractProductNames = (text) => {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  const products = [];

  const skipPatterns = [
    /^sr\.?\s*no\.?/i,
    /^item\s*list/i,
    /^super\s*traders/i,
    /^page/i,
    /^table\s*of\s*contents/i,
    /^\d+\s*$/ // Just a number
  ];
  
  for (const line of lines) {

    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    let productName = line
      .replace(/^\d+\s*[\.\|\)]\s*/, '') // Remove "1. " or "1 | " or "1) "
      .replace(/^\d+\s+/, '') // Remove "1 " at start
      .trim();

    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 2) {

        productName = parts.slice(1).join(' ').trim();
      }
    }

    if (productName.length >= 3 && productName.length <= 200) {

      if (!/^\d+$/.test(productName) && productName.length >= 3) {
        products.push(productName);
      }
    }
  }

  const uniqueProducts = Array.from(
    new Map(products.map(name => [name.toLowerCase().trim(), name])).values()
  );
  
  return uniqueProducts;
};

/**
 * Use AI to analyze product names and extract category names using SambaNova AI (DeepSeek-R1)
 */
const extractCategoriesWithAI = async (productNames) => {
  try {
    const apiKey = process.env.SAMBANOVA_AI_API_KEY || '84957ec7-5ad4-4606-9a96-e26995fae37b';
    
    if (!apiKey) {

      return null;
    }

    const systemPrompt = `You are an expert e-commerce category analyst. Analyze product names and suggest appropriate category names for organizing products in an online store.`;

    const userPrompt = `Analyze the following list of product names and suggest appropriate category names for an e-commerce store. 
    
Product names:
${productNames.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Instructions:
1. Analyze the product names and identify common product types, brands, or characteristics
2. Group similar products together
3. Suggest 5-10 category names that would logically organize these products
4. Each category should be a single, clear name (e.g., "Chocolates", "Beverages", "Coffee", "Jellies")
5. Categories should be broad enough to group multiple products but specific enough to be meaningful
6. Return ONLY a JSON array of category names, nothing else
7. Format: ["Category 1", "Category 2", "Category 3"]

Example response format:
["Chocolates", "Chocolate Spreads", "Jellies", "Puddings", "Malt Drinks", "Coffee", "Ice Creams & Candies"]

Return the categories as a JSON array:`;

    const response = await axios.post(
      'https://api.sambanova.ai/v1/chat/completions',
      {
        stream: false,
        model: 'DeepSeek-R1-0528',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120 seconds (2 minutes) timeout for AI processing
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    
    if (!content) {

      return null;
    }

    let categoriesJson = content.trim();

    categoriesJson = categoriesJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {

      const jsonArrayMatch = categoriesJson.match(/\[[\s\S]*?\]/);
      if (jsonArrayMatch) {
        const categories = JSON.parse(jsonArrayMatch[0]);
        if (Array.isArray(categories) && categories.length > 0) {
          return categories.map(cat => typeof cat === 'string' ? cat.trim() : String(cat).trim()).filter(cat => cat.length > 0);
        }
      }

      const categories = JSON.parse(categoriesJson);
      if (Array.isArray(categories) && categories.length > 0) {
        return categories.map(cat => typeof cat === 'string' ? cat.trim() : String(cat).trim()).filter(cat => cat.length > 0);
      }
    } catch (parseError) {

      const arrayMatches = categoriesJson.match(/\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/g);
      if (arrayMatches && arrayMatches.length > 0) {
        for (const match of arrayMatches) {
          try {
            const categories = JSON.parse(match);
            if (Array.isArray(categories) && categories.length > 0) {
              return categories.map(cat => typeof cat === 'string' ? cat.trim() : String(cat).trim()).filter(cat => cat.length > 0);
            }
          } catch (e) {
            continue;
          }
        }
      }

      const quotedMatches = categoriesJson.match(/"([^"]+)"/g);
      if (quotedMatches && quotedMatches.length > 0) {
        const categories = quotedMatches
          .map(match => match.replace(/^"|"$/g, '').trim())
          .filter(cat => cat.length > 0 && cat.length < 100); // Reasonable category name length
        if (categories.length > 0) {
          return categories;
        }
      }

      const arrayMatch = categoriesJson.match(/\[(.*?)\]/s);
      if (arrayMatch) {
        const arrayContent = arrayMatch[1];
        const categories = arrayContent
          .split(',')
          .map(cat => {

            cat = cat.trim().replace(/^["']|["']$/g, '');

            cat = cat.replace(/[^\w\s&-]/g, '').trim();
            return cat;
          })
          .filter(cat => cat.length > 0 && cat.length < 100);
        if (categories.length > 0) {
          return categories;
        }
      }
    }
    
    return null;
  } catch (error) {

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('AI category extraction timeout:', error.message);
    } else {
      console.error('AI category extraction error:', error.response?.data || error.message);
    }
    return null; // Fallback to keyword-based
  }
};

/**
 * Intelligently extract category names from product names using keyword matching (fallback method)
 */
const extractCategoriesFromProductsSync = (productNames) => {

  const categoryKeywords = [
    { name: 'Chocolate Spreads', keywords: ['spread', 'nutella', 'lotus'], icon: '🥜' },
    { name: 'Chocolates', keywords: ['chocolate', 'choco', 'dalfi', 'coin', 'twistar', 'hazelnut'], icon: '🍫' },
    { name: 'Jellies', keywords: ['jelly', 'jellies', 'cocon'], icon: '🍮' },
    { name: 'Puddings', keywords: ['pudding', 'puddings'], icon: '🍮' },
    { name: 'Malt Drinks', keywords: ['malt', 'bavaria'], icon: '🥤' },
    { name: 'Coffee', keywords: ['coffee', 'davidoff', 'cafe', 'crema', 'brazil'], icon: '☕' },
    { name: 'Ice Creams & Candies', keywords: ['ice', 'candy', 'yogo', 'candies'], icon: '🍦' },
    { name: 'Beverages', keywords: ['drink', 'bottle', 'ml'], icon: '🥤' },
  ];

  const categoryProducts = {};
  const uncategorizedProducts = [];

  for (const product of productNames) {
    const productLower = product.toLowerCase();
    let categorized = false;
    
    for (const { name, keywords } of categoryKeywords) {
      if (keywords.some(keyword => productLower.includes(keyword))) {
        if (!categoryProducts[name]) {
          categoryProducts[name] = [];
        }
        categoryProducts[name].push(product);
        categorized = true;
        break; // Stop at first match (more specific categories checked first)
      }
    }
    
    if (!categorized) {
      uncategorizedProducts.push(product);
    }
  }

  const categories = Object.keys(categoryProducts);

  if (uncategorizedProducts.length > 0) {

    const wordGroups = {};
    
    for (const product of uncategorizedProducts) {
      const words = product.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();

        return w.length > 3 && 
               !/^\d+/.test(w) && 
               !['with', 'and', 'the', 'for', 'from', 'original', 'bottle', 'ml', 'gms', 'gms.'].includes(wLower);
      });
      
      if (words.length > 0) {
        const firstWord = words[0].toLowerCase();
        if (!wordGroups[firstWord]) {
          wordGroups[firstWord] = [];
        }
        wordGroups[firstWord].push(product);
      }
    }

    for (const [word, products] of Object.entries(wordGroups)) {
      if (products.length >= 2) {
        const categoryName = word.charAt(0).toUpperCase() + word.slice(1);
        if (!categories.includes(categoryName)) {
          categories.push(categoryName);
        }
      }
    }

    if (uncategorizedProducts.length > 3 && categories.length === 0) {
      categories.push('Other Products');
    }
  }

  if (categories.length === 0 && productNames.length > 0) {
    categories.push('Products');
  }
  
  return categories.sort();
};

/**
 * @desc    Parse PDF and extract category names (Admin only)
 * @route   POST /api/categories/parse-pdf
 * @access  Private/Admin
 */
export const parsePdfForCategories = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'PDF file is required');
    }

    if (req.file.mimetype !== 'application/pdf') {
      throw new ApiError(400, 'File must be a PDF');
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    const text = result.text;

    await parser.destroy();

    const productNames = extractProductNames(text);
    
    if (productNames.length === 0) {
      return successResponse(res, 200, 'No products found in PDF', { 
        categories: [],
        products: []
      });
    }

    let categoryNames = await extractCategoriesWithAI(productNames);
    let usedAI = true;

    if (!categoryNames || categoryNames.length === 0) {
      categoryNames = extractCategoriesFromProductsSync(productNames);
      usedAI = false;
    }

    const getCategoryIcon = (categoryName) => {
      const name = categoryName.toLowerCase();

      const predefinedCategories = [
        { name: 'chocolate spreads', icon: '🥜' },
        { name: 'chocolates', icon: '🍫' },
        { name: 'jellies', icon: '🍮' },
        { name: 'puddings', icon: '🍮' },
        { name: 'malt drinks', icon: '🥤' },
        { name: 'coffee', icon: '☕' },
        { name: 'ice creams & candies', icon: '🍦' },
        { name: 'beverages', icon: '🥤' },
      ];
      
      for (const { name: catName, icon } of predefinedCategories) {
        if (name === catName || name.includes(catName) || catName.includes(name)) {
          return icon;
        }
      }

      if (name.includes('chocolate')) return '🍫';
      if (name.includes('coffee')) return '☕';
      if (name.includes('jelly')) return '🍮';
      if (name.includes('pudding')) return '🍮';
      if (name.includes('malt') || name.includes('drink') || name.includes('beverage')) return '🥤';
      if (name.includes('ice') || name.includes('cream') || name.includes('candy')) return '🍦';
      if (name.includes('spread')) return '🥜';
      return '📦';
    };

    return successResponse(res, 200, usedAI 
      ? 'Categories extracted successfully using AI' 
      : 'Categories extracted successfully using keyword matching', { 
      categories: categoryNames.map(name => ({
        name,
        icon: getCategoryIcon(name),
        description: `Category for ${name.toLowerCase()}`,
        isActive: true,
      })),
      products: productNames, // Also return products for reference
      productCount: productNames.length,
      usedAI: usedAI // Indicate if AI was used
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(new ApiError(500, 'Error parsing PDF: ' + (error.message || 'Unknown error')));
  }
};

/**
 * Use AI to research and get product details for a product name
 */
const getProductDetailsWithAI = async (productName, categoryName) => {
  try {
    const apiKey = process.env.SAMBANOVA_AI_API_KEY || '84957ec7-5ad4-4606-9a96-e26995fae37b';
    
    if (!apiKey) {
      return null;
    }

    const systemPrompt = `You are an expert product information researcher. Analyze product names and provide detailed product information in JSON format.`;

    const userPrompt = `Research and provide detailed information for the following product:

Product Name: ${productName}
Category: ${categoryName}

Provide the following information in JSON format:
{
  "description": "A brief, appealing product description (max 200 words)",
  "price": 0.00,
  "weight": "100g",
  "ingredients": ["ingredient1", "ingredient2"],
  "stock": 100
}

Guidelines:
- Description should be marketing-friendly and highlight key features (max 200 words)
- Price should be a reasonable estimate in the product's typical price range (provide as number, e.g., 4.99)
- Weight should be in format like "100g", "250ml", "500g", etc.
- Ingredients should be an array of main ingredients (3-8 items)
- Stock should be a reasonable number (50-200)
- If you cannot determine specific details, provide reasonable estimates based on the product type

Return ONLY valid JSON, nothing else:`;

    const response = await axios.post(
      'https://api.sambanova.ai/v1/chat/completions',
      {
        stream: false,
        model: 'DeepSeek-R1-0528',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120 seconds (2 minutes) timeout for AI processing
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    
    if (!content) {
      return null;
    }

    let productJson = content.trim();
    productJson = productJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {

      const jsonObjectMatch = productJson.match(/\{[\s\S]*?\}/);
      if (jsonObjectMatch) {
        const productData = JSON.parse(jsonObjectMatch[0]);
        return {
          description: productData.description || `${productName} - High quality product.`,
          price: productData.price || 9.99,
          weight: productData.weight || '100g',
          ingredients: Array.isArray(productData.ingredients) ? productData.ingredients : [],
          stock: productData.stock || 100
        };
      }

      const productData = JSON.parse(productJson);
      return {
        description: productData.description || `${productName} - High quality product.`,
        price: productData.price || 9.99,
        weight: productData.weight || '100g',
        ingredients: Array.isArray(productData.ingredients) ? productData.ingredients : [],
        stock: productData.stock || 100
      };
    } catch (parseError) {

      const jsonMatches = productJson.match(/\{[\s\S]*?\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        for (const match of jsonMatches) {
          try {
            const productData = JSON.parse(match);
            return {
              description: productData.description || `${productName} - High quality product.`,
              price: productData.price || 9.99,
              weight: productData.weight || '100g',
              ingredients: Array.isArray(productData.ingredients) ? productData.ingredients : [],
              stock: productData.stock || 100
            };
          } catch (e) {
            continue;
          }
        }
      }

      const jsonMatch = productJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {

          let braceCount = 0;
          let jsonStart = -1;
          let jsonEnd = -1;
          
          for (let i = 0; i < jsonMatch[0].length; i++) {
            if (jsonMatch[0][i] === '{') {
              if (jsonStart === -1) jsonStart = i;
              braceCount++;
            } else if (jsonMatch[0][i] === '}') {
              braceCount--;
              if (braceCount === 0 && jsonStart !== -1) {
                jsonEnd = i;
                break;
              }
            }
          }
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const validJson = jsonMatch[0].substring(jsonStart, jsonEnd + 1);
            const productData = JSON.parse(validJson);
            return {
              description: productData.description || `${productName} - High quality product.`,
              price: productData.price || 9.99,
              weight: productData.weight || '100g',
              ingredients: Array.isArray(productData.ingredients) ? productData.ingredients : [],
              stock: productData.stock || 100
            };
          }
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e.message);
        }
      }
    }
    
    return null;
  } catch (error) {

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('AI product details timeout for', productName, ':', error.message);
    } else {
      console.error('AI product details error for', productName, ':', error.response?.data || error.message);
    }
    return null;
  }
};

/**
 * Match product to category based on product name and available categories
 */
const matchProductToCategory = (productName, categories) => {
  const productLower = productName.toLowerCase();

  for (const category of categories) {
    const categoryLower = category.toLowerCase();
    const categoryWords = categoryLower.split(/\s+/);

    for (const word of categoryWords) {
      if (word.length > 3 && productLower.includes(word)) {
        return category;
      }
    }
  }

  return categories.length > 0 ? categories[0] : 'Products';
};

/**
 * @desc    Parse PDF and create products with AI-generated details (Admin only)
 * @route   POST /api/categories/parse-pdf-create-products
 * @access  Private/Admin
 */
export const parsePdfAndCreateProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'PDF file is required');
    }

    if (req.file.mimetype !== 'application/pdf') {
      throw new ApiError(400, 'File must be a PDF');
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    const text = result.text;
    await parser.destroy();

    const productNames = extractProductNames(text);
    
    if (productNames.length === 0) {
      return successResponse(res, 200, 'No products found in PDF', { 
        categoriesCreated: 0,
        productsCreated: 0,
        products: []
      });
    }

    let categoryNames = await extractCategoriesWithAI(productNames);
    let usedAI = true;
    
    if (!categoryNames || categoryNames.length === 0) {
      categoryNames = extractCategoriesFromProductsSync(productNames);
      usedAI = false;
    }

    const getCategoryIcon = (categoryName) => {
      const name = categoryName.toLowerCase();
      if (name.includes('chocolate')) return '🍫';
      if (name.includes('coffee')) return '☕';
      if (name.includes('jelly')) return '🍮';
      if (name.includes('pudding')) return '🍮';
      if (name.includes('malt') || name.includes('drink') || name.includes('beverage')) return '🥤';
      if (name.includes('ice') || name.includes('cream') || name.includes('candy')) return '🍦';
      if (name.includes('spread')) return '🥜';
      return '📦';
    };

    const createdCategories = [];
    const existingCategories = await Category.find({});
    const existingCategoryNames = existingCategories.map(c => c.name);

    for (const categoryName of categoryNames) {
      if (!existingCategoryNames.includes(categoryName)) {
        try {
          const category = await Category.create({
            name: categoryName,
            icon: getCategoryIcon(categoryName),
            description: `Category for ${categoryName.toLowerCase()}`,
            isActive: true,
          });
          createdCategories.push(category);
          existingCategoryNames.push(categoryName);
        } catch (error) {
          console.error(`Error creating category ${categoryName}:`, error.message);
        }
      }
    }

    const createdProducts = [];
    const failedProducts = [];
    const skippedProducts = [];

    for (const productName of productNames) {
      try {

        const existingProduct = await Product.findOne({ name: productName.trim() });
        if (existingProduct) {
          skippedProducts.push({ name: productName, reason: 'Already exists' });
          continue;
        }

        const matchedCategory = matchProductToCategory(productName, categoryNames);

        let productDetails = await getProductDetailsWithAI(productName, matchedCategory);

        if (!productDetails) {
          productDetails = {
            description: `${productName} - Premium quality product.`,
            price: 9.99,
            weight: '100g',
            ingredients: [],
            stock: 100
          };
        }

        const product = await Product.create({
          name: productName.trim(),
          description: productDetails.description.substring(0, 500), // Ensure max length
          price: productDetails.price,
          category: matchedCategory,
          weight: productDetails.weight,
          ingredients: productDetails.ingredients,
          stock: productDetails.stock,
          inStock: true,
          isActive: true,
          image: '🍫', // Default emoji, no image upload
          images: [],
          rating: 0,
          numReviews: 0
        });

        createdProducts.push({
          id: product._id,
          name: product.name,
          category: product.category,
          price: product.price
        });
      } catch (error) {
        console.error(`Error creating product ${productName}:`, error.message);
        failedProducts.push({ name: productName, error: error.message });
      }
    }

    return successResponse(res, 201, 'Products created successfully', {
      categoriesCreated: createdCategories.length,
      categories: createdCategories.map(c => ({ name: c.name, icon: c.icon })),
      productsCreated: createdProducts.length,
      productsSkipped: skippedProducts.length,
      productsFailed: failedProducts.length,
      products: createdProducts,
      skipped: skippedProducts,
      failed: failedProducts,
      usedAI: usedAI
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(new ApiError(500, 'Error parsing PDF and creating products: ' + (error.message || 'Unknown error')));
  }
};