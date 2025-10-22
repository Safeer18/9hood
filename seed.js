// seed.js - Run this to add products to database
require('dotenv').config();
const mongoose = require('mongoose');

// Product Schema (simplified)
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    images: [String],
    badge: String,
    description: String,
    stock: Number,
    sizes: [String],
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Real 9hood Products
const products = [
    {
        name: 'NINEHOOD BASIC TEE - BLACK',
        price: 999,
        category: 'Men',
        images: [
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878912/7_q2ttva.png',
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878911/8_nnqi64.png',
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878912/9_tymgwg.png'
        ],
        badge: 'NEW',
        description: '100% Cotton • Bio Washed • Silicon Washed • French Terry Finish Inside • 240 GSM',
        stock: 50,
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        name: 'NINEHOOD BASIC TEE - WHITE',
        price: 999,
        category: 'Men',
        images: [
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878911/10_o948qh.png',
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878911/11_v99m5g.png',
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878912/12_o5zzjm.png'
        ],
        badge: 'NEW',
        description: '100% Cotton • Bio Washed • Silicon Washed • French Terry Finish Inside • 240 GSM',
        stock: 50,
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        name: 'NINEHOOD BASIC TEE - OLIVE GREEN',
        price: 999,
        category: 'Men',
        images: [
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878912/13_by38h2.png',
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878912/14_kcmg4u.png',
            'https://res.cloudinary.com/dhi41qihj/image/upload/v1760878913/15_ahmrrz.png'
        ],
        badge: 'NEW',
        description: '100% Cotton • Bio Washed • Silicon Washed • French Terry Finish Inside • 240 GSM',
        stock: 50,
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }
];

// Seed function
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/9hood');
        console.log('✅ Connected to MongoDB!\n');

        // Clear existing products
        console.log('🗑️  Clearing existing products...');
        const deleteResult = await Product.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} existing products\n`);

        // Insert new products
        console.log('📦 Adding new products...');
        const insertedProducts = await Product.insertMany(products);
        console.log(`✅ Successfully added ${insertedProducts.length} products!\n`);

        // Display products
        console.log('📋 Products added:');
        console.log('═══════════════════════════════════════');
        insertedProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - ₹${product.price}`);
            console.log(`   Images: ${product.images.length} photos`);
            console.log(`   Sizes: ${product.sizes.join(', ')}`);
        });
        console.log('═══════════════════════════════════════\n');

        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        console.log('\n✨ Seeding completed successfully! ✨\n');
        
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error seeding database:', error.message);
        console.error('\n💡 Make sure:');
        console.error('   1. MongoDB is running');
        console.error('   2. .env file has correct MONGODB_URI');
        console.error('   3. Internet connection is active (for Atlas)\n');
        process.exit(1);
    }
}

// Run the seed function
seedDatabase();

// Seed function
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/9hood');
        console.log('✅ Connected to MongoDB!\n');

        // Clear existing products
        console.log('🗑️  Clearing existing products...');
        const deleteResult = await Product.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} existing products\n`);

        // Insert new products
        console.log('📦 Adding new products...');
        const insertedProducts = await Product.insertMany(products);
        console.log(`✅ Successfully added ${insertedProducts.length} products!\n`);

        // Display products
        console.log('📋 Products added:');
        console.log('═══════════════════════════════════════');
        insertedProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.image} ${product.name} - ₹${product.price}`);
        });
        console.log('═══════════════════════════════════════\n');

        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        console.log('\n✨ Seeding completed successfully! ✨\n');
        
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error seeding database:', error.message);
        console.error('\n💡 Make sure:');
        console.error('   1. MongoDB is running');
        console.error('   2. .env file has correct MONGODB_URI');
        console.error('   3. Internet connection is active (for Atlas)\n');
        process.exit(1);
    }
}

// Run the seed function
seedDatabase();