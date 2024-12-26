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
router.use(express.json());  // This middleware is required for parsing JSON requests

// POST route to handle the submission of cause data
router.post('/', async (req, res) => {
  try {
    // Destructure the payload from the request body
    const { mainEvent, causes } = req.body;

    // Check if 'topCauseName' and 'causes' exist in the payload
    if (!mainEvent || !Array.isArray(causes)) {
      return res.status(400).json({
        message: 'Invalid payload format',
        error: 'Missing required properties: mainEvent or causes.',
      });
    }

    // Log the received data (for debugging purposes)
    console.log('Received data:', req.body);

    // Save the received data to a simple JSON file called 'cause_data_on_backend.json'
    const filePath = './cause_data_on_backend.json';
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf8');

    // Respond back to the frontend with a success message
    res.status(200).json({
      message: 'Data successfully saved to file',
      data: req.body, // Optionally send the received data back to the client
    });

  } catch (error) {
    console.error('Error processing data:', error);

    // Send error response to the frontend
    res.status(500).json({
      message: 'Error processing data',
      error: error.message,
    });
  }
});

// Export the router
module.exports = router;
