const express = require('express');
const fs = require('fs'); // For file operations
const path = require('path'); // For file paths
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

// POST endpoint to save nested sub-cause data
router.post('/', (req, res) => {
  const {
    modalName,
    parentCauseName,
    fieldName,
    previousValue,
    currentValue,
    subCauseName,
    nestedSubCauseName
  } = req.body;

  // Prepare the data object from the request
  const data = {
    modalName: modalName || "Unknown Modal",
    parentCauseName: parentCauseName || "Unknown Parent",
    fieldName: fieldName || "CauseName",
    previousValue: previousValue || null,
    currentValue: currentValue || "New Event",
    subCauseName: subCauseName || "Unknown SubCause",
    nestedSubCauseName: nestedSubCauseName || "New Nested SubCause",
    timestamp: moment().format() // Add timestamp to the data
  };

  // Path to save the JSON file
  const filePath = path.join(__dirname, 'nested_subcause_data_retrieve.json');

  // Check if the file exists, if not create it with an empty array
  fs.readFile(filePath, 'utf8', (err, dataFile) => {
    let fileData = [];
    if (err && err.code === 'ENOENT') {
      // File doesn't exist, create an empty array
      fileData = [];
    } else if (err) {
      // Other errors
      return res.status(500).json({ error: 'Error reading file', details: err });
    } else {
      try {
        // Try to parse existing file data
        fileData = dataFile ? JSON.parse(dataFile) : [];
      } catch (parseError) {
        // If there's a JSON parse error, return an error response
        return res.status(500).json({ error: 'Error parsing JSON data', details: parseError });
      }
    }

    // Add the new data to the array
    fileData.push(data);

    // Write the updated data back to the file
    fs.writeFile(filePath, JSON.stringify(fileData, null, 2), (writeErr) => {
      if (writeErr) {
        return res.status(500).json({ error: 'Error writing to file', details: writeErr });
      }

      // Respond with success
      res.status(200).json({ message: 'Data saved successfully', data });
    });
  });
});

// Export the router
module.exports = router;
