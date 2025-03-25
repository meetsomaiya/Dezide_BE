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

// Ensure express parses incoming JSON data
router.use(express.json());

// Path to the JSON file
const DELETION_LOG_FILE = path.join(__dirname, 'question_retreived_for_deletion.json');

// Ensure the file exists or create it
function ensureDeletionFileExists() {
  if (!fs.existsSync(DELETION_LOG_FILE)) {
    fs.writeFileSync(DELETION_LOG_FILE, JSON.stringify([], null, 2));
  }
}

// Endpoint to handle question deletion
router.post('/', async (req, res) => {
  try {
    ensureDeletionFileExists();
    
    const { questionName, modelName } = req.body;
    
    if (!questionName || !modelName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both questionName and modelName are required' 
      });
    }

    // Create deletion record with timestamp
    const deletionRecord = {
      questionName,
      modelName,
      deletedAt: moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
      status: 'pending deletion' // You can update this later if needed
    };

    // Read current content
    const currentData = JSON.parse(fs.readFileSync(DELETION_LOG_FILE));
    
    // Add new record
    currentData.push(deletionRecord);
    
    // Write back to file
    fs.writeFileSync(DELETION_LOG_FILE, JSON.stringify(currentData, null, 2));
    
    console.log('Deletion record saved:', deletionRecord);
    
    res.json({ 
      success: true, 
      message: 'Deletion request recorded',
      data: deletionRecord
    });
    
  } catch (error) {
    console.error('Error handling deletion request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;