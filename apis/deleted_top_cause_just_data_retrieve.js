const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js'); // Import the connection function
const odbc = require('odbc');

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

// Ensure express parses incoming JSON data in the request body
router.use(express.json());

// Handle the "deleted_top_cause" API endpoint
router.post('/', (req, res) => {
  const { modalName, causeName, deletionFlag } = req.body;

  // Log the received data for debugging
  console.log("Received cause deletion data:", req.body);

  // Create an object with the received data
  const dataToSave = {
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'), // Current timestamp
    modalName,
    causeName,
    deletionFlag,
  };

  // Define the path for the JSON file
  const filePath = path.join(__dirname, 'topcause_deletion_data.json');

  // Read the existing file data
  fs.readFile(filePath, 'utf8', (err, fileData) => {
    let fileContent = [];
    if (err) {
      if (err.code === 'ENOENT') {
        // If the file doesn't exist, initialize it with an empty array
        fileContent = [];
      } else {
        // Handle other errors
        return res.status(500).json({ error: 'Error reading file' });
      }
    } else {
      try {
        // Parse the existing data if the file exists
        fileContent = JSON.parse(fileData);
      } catch (parseErr) {
        // Handle JSON parsing errors
        return res.status(500).json({ error: 'Error parsing file data' });
      }
    }

    // Append the new data to the array
    fileContent.push(dataToSave);

    // Write the updated content to the file
    fs.writeFile(filePath, JSON.stringify(fileContent, null, 2), (writeErr) => {
      if (writeErr) {
        return res.status(500).json({ error: 'Error writing to file' });
      }

      // Respond with success
      res.status(200).json({ message: 'Cause deletion data saved successfully' });
    });
  });
});

// Export the router
module.exports = router;
