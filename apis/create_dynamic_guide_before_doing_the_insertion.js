const express = require('express');
const { connectToDatabase } = require('./connect2'); // Import the connection function (if needed)
const router = express.Router();
const fs = require('fs'); // File system module for writing the JSON file
const path = require('path'); // To resolve file paths

// Set up CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// Handle GET request to create dynamic guide
router.get('/', async (req, res) => {
  // Extract the data from the query string (GET parameters)
  const { guideName, selectedParentModel, selectedParentVariant } = req.query;

  // Check if all necessary data is provided
  if (!guideName || !selectedParentModel || !selectedParentVariant) {
    return res.status(400).json({ message: 'Missing required query parameters' });
  }

  // Prepare the data to be saved in the file
  const dataToSave = {
    guideName,
    selectedParentModel,
    selectedParentVariant,
  };

  console.log('Received data:', dataToSave);

  // Specify the file path where data will be stored
  const filePath = path.join(__dirname, 'data_for_creation_retrieved.json');

  // Write the data to the file (overwrite if the file exists)
  try {
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2)); // Save as pretty JSON
    console.log('Data successfully written to file.');
    res.status(200).json({ message: 'Guide created successfully', data: dataToSave });
  } catch (error) {
    console.error('Error writing to file:', error);
    res.status(500).json({ message: 'Error creating guide', error: error.message });
  }
});

module.exports = router;
