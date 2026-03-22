import express from 'express';
import {
    getAllBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand
} from '../controllers/brandController.js';

import upload from '../middleware/upload.js';


const router = express.Router();

router.get('/', getAllBrands);
router.get('/:id', getBrandById);
router.post('/', upload.single('brandImage'), createBrand);
router.put('/:id', upload.single('brandImage'), updateBrand);
router.post('/', createBrand);
router.put('/:id', updateBrand)
router.delete('/:id', deleteBrand);

export default router;