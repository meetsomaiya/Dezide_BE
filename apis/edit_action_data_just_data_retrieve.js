const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
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
router.use(express.json()); // This middleware is required for parsing JSON requests

// API to handle editing action data
router.post('/', (req, res) => {
  const data = req.body; // Get data from the request body

  // Log the incoming data for debugging
  console.log('Received data:', data);

  // Path to the JSON file
  const filePath = './action-data_for_editing.json';

  // Write the received data to the JSON file
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      return res.status(500).json({ message: 'Failed to write data to file' });
    }

    console.log('Data successfully written to file');
    res.status(200).json({ message: 'Data saved successfully', savedData: data });
  });
});

// Export the router
module.exports = router;
