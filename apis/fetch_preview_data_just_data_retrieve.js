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
router.use(express.json()); // This middleware is required for parsing JSON requests

// API endpoint to fetch preview data
router.post('/', (req, res) => {
  try {
    const data = req.body; // Retrieve the data sent in the request body

    // Log the received data for debugging
    console.log('Received data:', data);

    // Write the received data to a JSON file
    const filePath = './preview_modal_data.json';
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        return res.status(500).json({ message: 'Failed to save data to file.' });
      }

      console.log('Data successfully written to file:', filePath);
      res.status(200).json({ message: 'Data saved successfully.', data });
    });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ message: 'An error occurred.', error: error.message });
  }
});

// Export the router
module.exports = router;
