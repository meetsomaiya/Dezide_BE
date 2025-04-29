const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');

const router = express.Router();

// Set up CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

router.use(express.json());

// Helper function to save deletion data to JSON file
// const saveDeletionData = (data) => {
//   const filePath = path.join(__dirname, 'top_cause_retrieved_for_deletion.json');
//   const timestamp = moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');
  
//   const record = {
//     timestamp,
//     ...data
//   };

//   // Read existing data or create new array if file doesn't exist
//   let existingData = [];
//   try {
//     if (fs.existsSync(filePath)) {
//       existingData = JSON.parse(fs.readFileSync(filePath));
//     }
//   } catch (err) {
//     console.error('Error reading existing file:', err);
//   }

//   // Add new record
//   existingData.push(record);

//   // Write back to file
//   fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
//   console.log('Deletion data saved to:', filePath);
// };


// Modified helper function to overwrite deletion data in JSON file
const saveDeletionData = (data) => {
  const filePath = path.join(__dirname, 'top_cause_retrieved_for_deletion.json');
  const timestamp = moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');
  
  const record = {
    timestamp,
    ...data
  };

  // Write the new record (this will overwrite any existing file)
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log('Deletion data saved to:', filePath);
};
// Delete top cause endpoint
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Save the deletion request data to JSON file
    saveDeletionData({ name, action: 'delete_request' });

    // Your existing database deletion logic would go here
    // const db = await connectToDatabase();
    // await db.collection('top_causes').deleteOne({ name });
    
    res.status(200).json({ message: `${name} deleted successfully` });
  } catch (error) {
    console.error('Error deleting top cause:', error);
    saveDeletionData({ 
      name: req.body.name || 'unknown', 
      action: 'delete_error',
      error: error.message 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;