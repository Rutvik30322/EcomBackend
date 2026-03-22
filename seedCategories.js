import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import connectDB from './config/database.js';

dotenv.config();

const categories = [
  { name: 'Bars', icon: '🍫', description: 'Chocolate bars in various flavors' },
  { name: 'Truffles', icon: '🍬', description: 'Delicious chocolate truffles' },
  { name: 'Fudge', icon: '🍮', description: 'Creamy chocolate fudge' },
  { name: 'Pralines', icon: '🌰', description: 'Nut-filled chocolate pralines' },
  { name: 'Fruits', icon: '🍓', description: 'Fruit-flavored chocolates' },
  { name: 'Caramels', icon: '🍯', description: 'Caramel-filled chocolates' },
  { name: 'Flavored', icon: '🍊', description: 'Flavored chocolate varieties' },
];

const seedCategories = async () => {
  try {
    await connectDB();

    await Category.deleteMany({});

    const createdCategories = await Category.insertMany(categories);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
