const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');

const router = express.Router();

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// JSON parsing
router.use(express.json());

// Path to the JSON file
const MAPPING_FILE_PATH = path.join(__dirname, 'question_mapping_with_cause.json');

// Endpoint to handle question-cause mapping
router.post('/', async (req, res) => {
  try {
    const { causeName, actionType, questionAnswer, modalName } = req.body;
    
    // Log the received data
    console.log('Received data:', { causeName, actionType, questionAnswer, modalName });
    
    // Create the mapping object with timestamp
    const mappingEntry = {
      timestamp: moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
      modalName: modalName || 'default', // Use 'default' if modalName is not provided
      causeName,
      actionType,
      questionAnswer
    };
    
    // Read existing data or create new array if file doesn't exist
    let existingData = [];
    try {
      const fileContent = await fs.readFile(MAPPING_FILE_PATH, 'utf8');
      existingData = JSON.parse(fileContent);
      if (!Array.isArray(existingData)) {
        existingData = []; // Reset if file is corrupted
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading mapping file:', error);
      }
    }
    
    // Add new entry
    existingData.push(mappingEntry);
    
    // Write back to file
    await fs.writeFile(
      MAPPING_FILE_PATH,
      JSON.stringify(existingData, null, 2),
      'utf8'
    );
    
    console.log('Successfully saved mapping:', mappingEntry);
    
    res.status(200).json({
      success: true,
      message: 'Mapping saved successfully',
      data: mappingEntry
    });
    
  } catch (error) {
    console.error('Error in link_question_with_cause:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save mapping',
      error: error.message
    });
  }
});

// Export the router
module.exports = router;