const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const { connectToDatabase } = require('./connect2.js'); // Database connection function

const router = express.Router(); // Define the router

// Set up CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// Ensure express parses incoming JSON data in the request body
router.use(express.json());

// Mock data storage (for demonstration purposes)
let causeDataLog = [];

// API to handle POST requests and save data in memory
router.post('/', (req, res) => {
  const payload = req.body;

  if (!payload || !payload.modalName || !payload.parentCauseName || !payload.subCauseName || payload.currentValue === undefined) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  console.log('Received payload:', payload);

  // Store the data in memory (could also store in a database)
  causeDataLog.push(payload);

  // Save to JSON file
  const filePath = path.join(__dirname, 'cause_slider_data_retrieved.json');
  fs.writeFile(filePath, JSON.stringify(causeDataLog, null, 2), (err) => {
    if (err) {
      console.error('Error saving to file:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
    console.log('Data successfully saved to file');
    res.status(200).json({ message: 'Data received and saved successfully' });
  });
});

// Export the router
module.exports = router;
