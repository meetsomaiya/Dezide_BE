const express = require('express');
const fs = require('fs').promises;
const path = require('path');
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
const HOVERING_ITEMS_FILE = path.join(__dirname, 'hovering_items_for_question.json');

// Endpoint to fetch and store hovering data
router.post('/', async (req, res) => {
  try {
    const { answer, questionName, modalName } = req.body;
    
    if (!answer || !questionName || !modalName) {
      return res.status(400).json({ 
        error: 'answer, questionName and modalName are all required' 
      });
    }

    // Read existing data
    let existingData = {};
    try {
      const fileContent = await fs.readFile(HOVERING_ITEMS_FILE, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Create a composite key to store all answer-question-modal combinations
    const recordKey = `${questionName}_${answer.substring(0, 20).replace(/\s+/g, '_')}`;
    
    // Store all three parameters with timestamp
    existingData[recordKey] = {
      answer,
      questionName,
      modalName,
      timestamp: new Date().toISOString()
    };

    // Write back to file
    await fs.writeFile(
      HOVERING_ITEMS_FILE,
      JSON.stringify(existingData, null, 2),
      'utf-8'
    );

    // Return the stored data in response
    res.json({
      answer,
      questionName,
      modalName,
      status: 'success'
    });

  } catch (error) {
    console.error('Error handling hovering data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the router
module.exports = router;