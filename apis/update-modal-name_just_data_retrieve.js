const express = require('express');
const fs = require('fs');
const path = require('path');
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
router.use(express.json()); // This middleware is required for parsing JSON requests

const DATA_FILE = path.join(__dirname, 'update_data_for_modal_retrieved.json');

// Ensure file exists with empty array if it doesn't
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

router.post('/', (req, res) => {
  const { previousName, currentName } = req.body;
  
  // Basic validation
  if (typeof previousName !== 'string' || typeof currentName !== 'string') {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  try {
    // Read current data
    const currentData = JSON.parse(fs.readFileSync(DATA_FILE));
    
    // Add new entry
    currentData.push({
      receivedAt: new Date().toISOString(),
      previousName,
      currentName
    });

    // Write back to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
    
    console.log('Data written to file:', { previousName, currentName });
    res.sendStatus(200);
  } catch (error) {
    console.error('Error writing to file:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

module.exports = router;