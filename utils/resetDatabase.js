// server/utils/resetDatabase.js
const mongoose = require('mongoose');
const Party = require('../models/Party');
const Quotation = require('../models/Quotation');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Model = require('../models/Model');

const resetDatabase = async () => {
  try {
    console.log('🗑️  Clearing database...');
    
    // Delete all collections
    await Promise.all([
      Quotation.deleteMany({}),
      Party.deleteMany({}),
      Model.deleteMany({}),
      Brand.deleteMany({}),
      Category.deleteMany({})
    ]);
    
    console.log('✅ Database cleared successfully!');
    console.log('📝 Next party will start from P0001');
    console.log('📝 Next quotation will be quote-P0001');
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with sample data...');
    
    // Create sample categories
    const categories = await Category.insertMany([
      { name: 'Processor' },
      { name: 'Memory' },
      { name: 'Storage' },
      { name: 'Graphics Card' },
      { name: 'Motherboard' },
      { name: 'Power Supply' },
      { name: 'Cabinet' },
      { name: 'Monitor' },
      { name: 'Keyboard' },
      { name: 'Mouse' }
    ]);
    
    // Create sample brands
    const brands = await Brand.insertMany([
      { name: 'Intel' },
      { name: 'AMD' },
      { name: 'Corsair' },
      { name: 'Samsung' },
      { name: 'NVIDIA' },
      { name: 'ASUS' },
      { name: 'MSI' },
      { name: 'Antec' },
      { name: 'LG' },
      { name: 'Logitech' }
    ]);
    
    // Create sample models
    const models = await Model.insertMany([
      {
        name: 'Core i5-12400F',
        category: categories[0]._id, // Processor
        brand: brands[0]._id, // Intel
        hsn: '8471',
        warranty: '3 Years',
        purchasePrice: 12000,
        salesPrice: 15000,
        gstRate: 18
      },
      {
        name: 'Ryzen 5 5600X',
        category: categories[0]._id, // Processor
        brand: brands[1]._id, // AMD
        hsn: '8471',
        warranty: '3 Years',
        purchasePrice: 15000,
        salesPrice: 18000,
        gstRate: 18
      },
      {
        name: 'Vengeance LPX 16GB DDR4',
        category: categories[1]._id, // Memory
        brand: brands[2]._id, // Corsair
        hsn: '8473',
        warranty: 'Lifetime',
        purchasePrice: 4500,
        salesPrice: 6000,
        gstRate: 18
      },
      {
        name: '980 EVO 1TB NVMe SSD',
        category: categories[2]._id, // Storage
        brand: brands[3]._id, // Samsung
        hsn: '8471',
        warranty: '5 Years',
        purchasePrice: 8000,
        salesPrice: 10000,
        gstRate: 18
      },
      {
        name: 'RTX 4060 Ti',
        category: categories[3]._id, // Graphics Card
        brand: brands[4]._id, // NVIDIA
        hsn: '8471',
        warranty: '3 Years',
        purchasePrice: 35000,
        salesPrice: 42000,
        gstRate: 18
      }
    ]);
    
    // Create sample parties (clients)
    const sampleParties = [
      {
        name: 'John Doe',
        phone: '+91-9876543210',
        email: 'john.doe@email.com',
        address: '123 Main Street, Mumbai, Maharashtra 400001'
      },
      {
        name: 'Jane Smith',
        phone: '+91-9876543211',
        email: 'jane.smith@email.com',
        address: '456 Park Avenue, Delhi, Delhi 110001'
      },
      {
        name: 'Raj Patel',
        phone: '+91-9876543212',
        email: 'raj.patel@email.com',
        address: '789 Garden Road, Bangalore, Karnataka 560001'
      }
    ];
    
    const parties = [];
    for (const partyData of sampleParties) {
      const party = new Party(partyData);
      await party.save();
      parties.push(party);
      console.log(`✅ Created party: ${party.partyId} - ${party.name}`);
    }
    
    // Create sample quotations
    const sampleQuotations = [
      {
        party: parties[0]._id,
        components: [
          {
            category: categories[0]._id,
            brand: brands[0]._id,
            model: models[0]._id,
            hsn: '8471',
            warranty: '3 Years',
            quantity: 1,
            purchasePrice: 12000,
            salesPrice: 15000,
            gstRate: 18
          },
          {
            category: categories[1]._id,
            brand: brands[2]._id,
            model: models[2]._id,
            hsn: '8473',
            warranty: 'Lifetime',
            quantity: 1,
            purchasePrice: 4500,
            salesPrice: 6000,
            gstRate: 18
          }
        ],
        totalAmount: 21000,
        totalPurchase: 16500,
        totalTax: 3390,
        notes: 'Basic gaming setup for client',
        termsAndConditions: 'Payment terms: 100% advance\nDelivery: Within 7 working days\nWarranty: As per manufacturer',
        status: 'sent'
      },
      {
        party: parties[1]._id,
        components: [
          {
            category: categories[0]._id,
            brand: brands[1]._id,
            model: models[1]._id,
            hsn: '8471',
            warranty: '3 Years',
            quantity: 1,
            purchasePrice: 15000,
            salesPrice: 18000,
            gstRate: 18
          },
          {
            category: categories[3]._id,
            brand: brands[4]._id,
            model: models[4]._id,
            hsn: '8471',
            warranty: '3 Years',
            quantity: 1,
            purchasePrice: 35000,
            salesPrice: 42000,
            gstRate: 18
          }
        ],
        totalAmount: 60000,
        totalPurchase: 50000,
        totalTax: 9661,
        notes: 'High-end gaming setup',
        termsAndConditions: 'Payment terms: 50% advance, 50% on delivery\nDelivery: Within 10 working days\nWarranty: As per manufacturer',
        status: 'draft'
      }
    ];
    
    for (const quotationData of sampleQuotations) {
      const quotation = new Quotation(quotationData);
      await quotation.save();
      console.log(`✅ Created quotation: ${quotation.title}`);
    }
    
    console.log('🎉 Database seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   • ${categories.length} categories`);
    console.log(`   • ${brands.length} brands`);
    console.log(`   • ${models.length} models`);
    console.log(`   • ${parties.length} parties`);
    console.log(`   • ${sampleQuotations.length} quotations`);
    
    return true;
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

module.exports = {
  resetDatabase,
  seedDatabase
};