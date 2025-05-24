// fixDatabase.js
const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/empresspc');
    console.log('Connected to MongoDB');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Check quotations collection
    const quotationsExists = collections.some(c => c.name === 'quotations');
    if (!quotationsExists) {
      console.log('Quotations collection does not exist yet');
      return;
    }
    
    // List indexes
    console.log('Checking indexes on quotations collection...');
    const indexes = await mongoose.connection.db.collection('quotations').indexes();
    console.log('Current indexes:', indexes);
    
    // Look for problematic id_1 index
    const problematicIndex = indexes.find(index => index.name === 'id_1');
    
    if (problematicIndex) {
      console.log('Found problematic index id_1, dropping...');
      await mongoose.connection.db.collection('quotations').dropIndex('id_1');
      console.log('Successfully dropped problematic index');
    } else {
      console.log('No problematic id_1 index found');
    }
    
    // Check for documents with id field
    const documentsWithId = await mongoose.connection.db.collection('quotations').find({ id: { $exists: true } }).toArray();
    
    if (documentsWithId.length > 0) {
      console.log(`Found ${documentsWithId.length} documents with 'id' field, cleaning...`);
      
      // Update each document to remove id field
      for (const doc of documentsWithId) {
        console.log(`Cleaning document ${doc._id}...`);
        await mongoose.connection.db.collection('quotations').updateOne(
          { _id: doc._id },
          { $unset: { id: "" } }
        );
      }
      
      console.log('All documents cleaned');
    } else {
      console.log('No documents with id field found');
    }
    
    console.log('Database fix completed successfully');
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

fixDatabase();