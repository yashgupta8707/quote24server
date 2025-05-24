// server/scripts/resetAndSeed.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { resetDatabase, seedDatabase } = require('../utils/resetDatabase');

dotenv.config();

const runScript = async () => {
  try {
    console.log('🚀 Starting database reset and seed process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📡 Connected to MongoDB');
    
    // Reset database
    await resetDatabase();
    
    // Seed with sample data
    await seedDatabase();
    
    console.log('✅ Process completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Start your server: npm run dev');
    console.log('   2. Start your client: npm start');
    console.log('   3. Visit http://localhost:3000');
    console.log('\n📝 Sample data includes:');
    console.log('   • 3 clients: P0001, P0002, P0003');
    console.log('   • 2 quotations: quote-P0001, quote-P0002');
    console.log('   • Various PC components and categories');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
};

// Run the script if called directly
if (require.main === module) {
  runScript();
}

module.exports = runScript;