const express = require('express');
const fs = require('fs');
const { connectToDatabase } = require('./connect2.js');
const path = require('path');

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

// Handle GET request to fetch question and write to JSON
router.get('/', (req, res) => {
  const { questionName } = req.query;  // Get the questionName from the query parameter

  if (!questionName) {
    return res.status(400).json({ error: 'Question name is required' });
  }

  // Write the questionName to the JSON file
  const dataToWrite = { questionName: questionName };

  fs.writeFile(path.join(__dirname, 'subquestion_retrieved.json'), JSON.stringify(dataToWrite, null, 2), (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      return res.status(500).json({ error: 'Failed to write to file' });
    }

    // Respond with success
    res.status(200).json({ message: 'Data written to file successfully' });
  });
});

module.exports = router;
