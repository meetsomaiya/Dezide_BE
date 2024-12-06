const express = require('express');
const fs = require('fs'); // For file operations

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

// Define the route to handle the API request
router.get('/', (req, res) => {
  const { modalName } = req.query; // Retrieve the modalName from the query parameter

  if (!modalName) {
    return res.status(400).json({ error: "modalName is required" });
  }

  try {
    // Data to be saved in JSON file (only modalName)
    const dataToWrite = { modalName: modalName };

    // Write the modalName to the JSON file
    fs.writeFileSync('question_to_be_fetched_for_the_following_event.json', JSON.stringify(dataToWrite, null, 2));

    // Send a response back to the client
    res.status(200).json(dataToWrite);
  } catch (error) {
    console.error('Error writing to file:', error);
    res.status(500).json({ error: 'An error occurred while writing data to the file.' });
  }
});

module.exports = router;
