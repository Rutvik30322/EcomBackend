import cron from 'node-cron';
import Product from '../models/Product.js';
import Purchase from '../models/Purchase.js';
import Notification from '../models/Notification.js';

export const initCronJobs = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running daily stock and expiry checks...');

            // 1. Expiry Check
            const now = new Date();
            const expiredPurchases = await Purchase.find({
                'items.expiryDate': { $lt: now }
            });

            console.log(`Found ${expiredPurchases.length} purchases with expired items.`);

            let expiredProductsCount = 0;
            for (const purchase of expiredPurchases) {
                for (const item of purchase.items) {
                    if (new Date(item.expiryDate) < now) {
                        const product = await Product.findById(item.product);
                        if (product && !product.isExpired) {
                            product.isActive = false;
                            product.isExpired = true;
                            await product.save();
                            expiredProductsCount++;

                            // Create notification
                            await Notification.create({
                                type: 'product',
                                title: 'Product Expired',
                                message: `${product.name} (SKU: ${product.slug || product._id.toString().substring(0, 8)}) has expired according to purchase record ${purchase.purchaseNo}.`,
                                data: {
                                    productId: product._id,
                                    purchaseId: purchase._id,
                                }
                            });
                        }
                    }
                }
            }

            if (expiredProductsCount > 0) {
                console.log(`Deactivated ${expiredProductsCount} expired products.`);
            }

            // 2. Low Stock Alerts
            const lowStockProducts = await Product.find({
                stock: { $lte: 30 },
                lowStockNotified: false,
                isActive: true
            });

            console.log(`Found ${lowStockProducts.length} newly low-stock products.`);

            for (const product of lowStockProducts) {
                await Notification.create({
                    type: 'product',
                    title: 'Low Stock Alert',
                    message: `${product.name} running low! Only ${product.stock} items remaining.`,
                    data: {
                        productId: product._id,
                        stock: product.stock
                    }
                });

                product.lowStockNotified = true;
                await product.save();
            }

            console.log('Daily checks completed.');
        } catch (error) {
            console.error('Error running daily cron jobs:', error);
        }
    });
};
