const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect3.js'); // Import the connection function
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

// Route to handle the POST request and save data to JSON file
router.post('/', (req, res) => {
  // Extract data from the request body
  const { questionName, newAnswer, modalName } = req.body;

  // Create an object with the retrieved data
  const dataToSave = {
    questionName,
    newAnswer,
    modalName,
    timestamp: moment().tz('UTC').format(), // Add a timestamp in UTC
  };

  // Define the file path
  const filePath = 'answer_retrieved_for_insertion.json';

  // Write the data to the JSON file
  fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), (err) => {
    if (err) {
      console.error('Error writing to JSON file:', err);
      return res.status(500).json({ success: false, message: 'Failed to save data to file' });
    }

    console.log('Data successfully written to JSON file:', filePath);
    res.status(200).json({ success: true, message: 'Data saved successfully', data: dataToSave });
  });
});

module.exports = router;