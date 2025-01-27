const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones

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

// POST endpoint to handle the received data
router.post('/', (req, res) => {
  const payload = req.body; // Get the payload from the request

  // Log the received payload for debugging purposes
  console.log('Received payload:', payload);

  // Read the current data from the match_actions_causes.json file (if exists)
  fs.readFile('match_actions_causes.json', 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error reading JSON file:', err);
      return res.status(500).json({ error: 'Failed to read data from file' });
    }

    // Parse the existing JSON data (if any)
    const jsonData = data ? JSON.parse(data) : [];

    // Add the new payload to the existing data
    jsonData.push(payload);

    // Write the updated data back to the JSON file
    fs.writeFile('match_actions_causes.json', JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON file:', err);
        return res.status(500).json({ error: 'Failed to write data to file' });
      }

      console.log('Data successfully written to match_actions_causes.json');
      return res.status(200).json({ message: 'Data saved successfully' });
    });
  });
});

// Export the router
module.exports = router;
