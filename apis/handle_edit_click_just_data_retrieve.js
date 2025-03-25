const express = require('express');
const fs = require('fs'); // For file operations
const path = require('path'); // For handling file paths
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

// Define the path to the JSON file
const dataFilePath = path.join(__dirname, 'data_retrieved_for_updation_question.json');

// Function to ensure the file exists
const ensureFileExists = (filePath, callback) => {
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File does not exist, create it with an empty array
      fs.writeFile(filePath, JSON.stringify([]), 'utf8', (writeErr) => {
        if (writeErr) {
          return callback(writeErr);
        }
        callback(null); // File created successfully
      });
    } else {
      callback(null); // File already exists
    }
  });
};

// Route to handle the edit click
router.post('/', (req, res) => {
  const { previousValue, newValue, field, modalName } = req.body; // Include modalName

  // Create an object with the received data
  const dataToSave = {
    previousValue,
    newValue,
    field,
    modalName, // Include modalName in the saved data
    timestamp: moment().tz('America/New_York').format(), // Add a timestamp
  };

  // Ensure the file exists before reading/writing
  ensureFileExists(dataFilePath, (err) => {
    if (err) {
      console.error('Error ensuring file exists:', err);
      return res.status(500).json({ error: 'Failed to create data file' });
    }

    // Read the existing data from the JSON file
    fs.readFile(dataFilePath, 'utf8', (err, fileData) => {
      if (err) {
        console.error('Error reading file:', err);
        return res.status(500).json({ error: 'Failed to read data file' });
      }

      let jsonData = [];
      if (fileData) {
        try {
          jsonData = JSON.parse(fileData); // Parse existing data
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          return res.status(500).json({ error: 'Failed to parse existing data' });
        }
      }

      // Add the new data to the array
      jsonData.push(dataToSave);

      // Write the updated data back to the JSON file
      fs.writeFile(dataFilePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Error writing file:', writeErr);
          return res.status(500).json({ error: 'Failed to write data to file' });
        }

        // Send a success response
        res.json({ message: 'Data saved successfully', data: dataToSave });
      });
    });
  });
});

module.exports = router;