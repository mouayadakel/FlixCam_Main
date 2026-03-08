import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { sourceImages, ProductForSourcing } from '../src/lib/services/image-sourcing.service';
import type { SourcedImage } from '../src/lib/types/backfill.types';

const prisma = new PrismaClient();

async function run() {
    console.log('🚀 Starting Automated Image Sourcing Pipeline...');
    console.log(`🔑 Pexels API Key: ${process.env.PEXELS_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`🔑 Gemini API Key: ${(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`🔑 Unsplash Access Key: ${process.env.UNSPLASH_ACCESS_KEY ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`🔑 Google CSE Key: ${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID ? 'Configured ✅' : 'Missing ❌'}`);

    // Fetch all active products with related data
    const allProducts = await prisma.product.findMany({
        where: { status: { not: 'ARCHIVED' } },
        include: {
            brand: true,
            category: true,
            translations: true,
            equipment: true,
        },
    });

    // Filter products that need images (less than 5 total) and are in the warehouse
    const warehouseProducts = allProducts.filter(p => {
        const hasFeatured = p.featuredImage && !p.featuredImage.includes('placehold.co') ? 1 : 0;
        const galleryCount = p.galleryImages && Array.isArray(p.galleryImages) ? p.galleryImages.length : 0;
        const needsImages = (hasFeatured + galleryCount) < 5;
        const inWarehouse = p.equipment?.quantityAvailable && p.equipment.quantityAvailable > 0;
        return needsImages && inWarehouse;
    });

    console.log(`\n📦 Found ${warehouseProducts.length} warehouse products needing additional images to reach 5.`);

    let successCount = 0;
    let skippedCount = 0;
    let failCount = 0;

    for (const product of warehouseProducts) {
        const englishTranslation = product.translations.find(t => t.locale === 'en');
        const productName = englishTranslation?.name || product.equipment?.nameEn || product.sku || 'Unknown Product';
        const brandName = product.brand?.name || '';

        console.log(`\n--------------------------------------------------`);
        console.log(`📸 Processing: [${product.sku}] ${brandName} ${productName}`);

        const sourcingProduct: ProductForSourcing = {
            id: product.id,
            name: productName,
            sku: product.sku,
            category: product.category,
            brand: product.brand,
            translations: product.translations,
        };

        try {
            const searchQueries = [
                `${brandName} ${productName} camera`.trim(),
                `${productName} photography equipment`.trim(),
                `${brandName} camera lens`.trim(),
            ];

            console.log('   🔍 Searching using Pexels/Gemini pipeline...');

            const currentFeatured = product.featuredImage && !product.featuredImage.includes('placehold.co') ? product.featuredImage : null;
            const currentGallery = product.galleryImages && Array.isArray(product.galleryImages) ? (product.galleryImages as string[]) : [];
            const currentTotal = (currentFeatured ? 1 : 0) + currentGallery.length;
            const needed = Math.max(0, 5 - currentTotal);
            if (needed === 0) continue;

            const sourcedImages = await sourceImages(sourcingProduct, needed, searchQueries);
            const approvedImages = sourcedImages.filter((img: SourcedImage) => img.approved || (img.qualityScore && img.qualityScore >= 0.7));

            if (approvedImages.length > 0) {
                console.log(`   ✅ Found ${approvedImages.length} suitable images! (Top Pick: ${approvedImages[0].url})`);
                const newUrls = approvedImages.map((img: SourcedImage) => img.url);
                let finalFeatured = currentFeatured;
                let finalGallery = [...currentGallery];
                if (!finalFeatured && newUrls.length > 0) {
                    finalFeatured = newUrls.shift() as string;
                }
                finalGallery.push(...newUrls);
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        featuredImage: finalFeatured || '',
                        galleryImages: finalGallery.length > 0 ? finalGallery : undefined,
                        photoStatus: 'sufficient',
                    },
                });
                successCount++;
            } else {
                console.log('   ⚠️ No suitable images found passing the Gemini quality threshold (0.7).');
                await prisma.product.update({
                    where: { id: product.id },
                    data: { photoStatus: 'reviewing' },
                });
                skippedCount++;
            }
        } catch (error) {
            console.error(`   ❌ Error sourcing images for ${product.sku}:`, (error as Error).message || String(error));
            failCount++;
        }
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n==================================================');
    console.log('🎉 Image Sourcing Complete!');
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ⚠️ Skipped (no good match): ${skippedCount}`);
    console.log(`   ❌ Failed (errors): ${failCount}`);
    console.log('==================================================\n');
}

run().catch(console.error).finally(() => prisma.$disconnect());
