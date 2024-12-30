const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const router = express.Router();

// Middleware for CORS
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// Middleware to parse incoming JSON
router.use(express.json());

// Handle 'deleted_subcause' POST requests
router.post('/', (req, res) => {
  const payload = req.body;

  // Validate incoming payload
  if (
    !payload.modalName ||
    !payload.parentCauseName ||
    !payload.parentSubCauseName ||
    !payload.nestedSubCauseName ||
    typeof payload.deletionFlag !== 'boolean'
  ) {
    return res.status(400).json({ error: 'Invalid payload structure' });
  }

  // Define the file path
  const filePath = path.join(__dirname, 'subcause_deletion_data_retrieve.json');

  // Prepare data with a timestamp
  const dataWithTimestamp = {
    ...payload,
    timestamp: moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss'),
  };

  // Write data to JSON file
  fs.writeFile(
    filePath,
    JSON.stringify(dataWithTimestamp, null, 2),
    (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        return res.status(500).json({ error: 'Failed to save data to file' });
      }

      console.log('Data saved to file:', dataWithTimestamp);
      res.status(200).json({ message: 'Data saved successfully', data: dataWithTimestamp });
    }
  );
});

module.exports = router;
