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

router.post('/', async (req, res) => {
  const { modalName, parentCauseName, subCauseName, deletionFlag } = req.body;

  // Validate the required input fields
  if (!modalName || !subCauseName || deletionFlag === undefined) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    // Prepare the data to write to the JSON file
    const deletionData = {
      timestamp: moment().tz('UTC').format(), // Include a timestamp for tracking
      modalName,
      parentCauseName: parentCauseName || null, // Replace undefined with null
      subCauseName,
      deletionFlag,
    };

    const filePath = path.join(__dirname, 'causes_data_deletion.json');

    // Check if the JSON file exists
    if (fs.existsSync(filePath)) {
      // If the file exists, read its content and append the new data
      const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      existingData.push(deletionData);
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
    } else {
      // If the file does not exist, create a new one with the data
      fs.writeFileSync(filePath, JSON.stringify([deletionData], null, 2), 'utf8');
    }

    console.log('Deletion data logged:', deletionData);
    res.status(200).json({ message: 'SubCause deletion logged successfully', data: deletionData });
  } catch (error) {
    console.error('Error writing to causes_data_deletion.json:', error);
    res.status(500).json({ error: 'An error occurred while logging the deletion' });
  }
});

// Export the router
module.exports = router;
