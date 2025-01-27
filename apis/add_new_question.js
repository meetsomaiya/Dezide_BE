const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Import the connection function
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

// Endpoint to handle the incoming request and save data to a JSON file
router.post('/', (req, res) => {
    // Extract the data from the request body
    const requestData = req.body;
  
    // Log the received data for debugging
    console.log('Data received on backend:', requestData);
  
    // Define the file path for saving the JSON data
    const filePath = './question_retrieved_on_backend.json';
  
    // Write the received data to the JSON file
    fs.writeFile(filePath, JSON.stringify(requestData, null, 2), (err) => {
      if (err) {
        console.error('Error saving data to file:', err);
        return res.status(500).json({ error: 'Failed to save data to file.' });
      }
  
      // Respond to the client indicating success
      res.status(200).json({
        message: 'Data received and saved successfully.',
        savedData: requestData,
      });
    });
  });
  
  module.exports = router;
  