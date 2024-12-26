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

// POST endpoint to handle edited data and write it to a JSON file
router.post('/', (req, res) => {
  // Get the payload from the request body
  const { modalName, fieldName, previousValue, currentValue } = req.body;

  // Validate that all necessary data is present
  if (!modalName || !fieldName || !previousValue || !currentValue) {
    return res.status(400).json({ error: 'Missing required fields in the request.' });
  }

  // Create the data object that will be written to the file
  const editedData = {
    modalName,
    fieldName,
    previousValue,
    currentValue,
    timestamp: moment().format(), // Add a timestamp for when the data was edited
  };

  // Read the current contents of the file (if it exists), or initialize it as an empty array
  fs.readFile('editing_top_cause.json', 'utf8', (err, data) => {
    let fileContents = [];
    
    // If file exists and contains data, parse it, otherwise start with an empty array
    if (!err) {
      try {
        fileContents = JSON.parse(data);
      } catch (parseError) {
        console.error('Error parsing existing JSON data:', parseError);
        return res.status(500).json({ error: 'Error parsing existing JSON data' });
      }
    }

    // Add the new edited data to the array
    fileContents.push(editedData);

    // Write the updated data back to the JSON file
    fs.writeFile('editing_top_cause.json', JSON.stringify(fileContents, null, 2), 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing to file:', writeErr);
        return res.status(500).json({ error: 'Error writing to file' });
      }

      // Respond with success
      res.status(200).json({ message: 'Data successfully saved to editing_top_cause.json' });
    });
  });
});

// Export the router
module.exports = router;
