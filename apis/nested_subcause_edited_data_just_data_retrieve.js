const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

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

// Route to handle saving the nested sub-cause data
router.post('/', (req, res) => {
  const { modalName, parentCauseName, subCauseName, fieldName, previousValue, currentValue } = req.body;

  // Create a new object with the received data
  const dataToSave = {
    modalName,
    parentCauseName,
    subCauseName,
    fieldName,
    previousValue,
    currentValue,
    timestamp: moment().format(), // Add a timestamp for when the data was edited
  };

  // Define the path for the JSON file
  const filePath = path.join(__dirname, 'edited_nested_subcause_data.json');

  // Read the existing data from the file
  fs.readFile(filePath, 'utf8', (err, fileData) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error reading the file:', err);
      return res.status(500).json({ message: 'Error reading the file' });
    }

    // Parse the existing data or initialize it as an empty array if no file exists
    let existingData = [];
    if (fileData) {
      existingData = JSON.parse(fileData);
    }

    // Add the new data to the array
    existingData.push(dataToSave);

    // Write the updated data back to the file
    fs.writeFile(filePath, JSON.stringify(existingData, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error writing to the file:', writeErr);
        return res.status(500).json({ message: 'Error writing to the file' });
      }

      // Respond to the client that the data was saved successfully
      console.log('Data saved successfully:', dataToSave);
      res.status(200).json({ message: 'Data saved successfully' });
    });
  });
});

// Export the router
module.exports = router;
