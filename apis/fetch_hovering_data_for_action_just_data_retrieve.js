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

// Define the route to handle the GET request and log data to a JSON file
router.get('/', (req, res) => {
  const actionName = req.query.actionName;

  if (!actionName) {
    return res.status(400).json({ error: 'actionName parameter is missing' });
  }

  // Prepare the data to be written to the file
  const dataToWrite = {
    actionName: actionName,
    timestamp: moment().format(),
  };

  // Log the data to the console for validation
  console.log('Data received for hovering action:', dataToWrite);

  // Write the data to the JSON file
  fs.writeFile('action_retrieved_for_hovering.json', JSON.stringify(dataToWrite, null, 2), (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      return res.status(500).json({ error: 'Failed to write to file' });
    }

    // Send a success response back to the client
    res.status(200).json({ message: 'Data logged successfully' });
  });
});

// Export the router
module.exports = router;
