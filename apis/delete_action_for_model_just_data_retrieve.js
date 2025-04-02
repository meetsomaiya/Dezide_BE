const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js'); // Database connection function

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

// Add this route to your existing router
router.post('/', async (req, res) => {
    try {
      const { action, model } = req.body;
      
      if (!action || !model) {
        return res.status(400).json({ error: 'Both action and model parameters are required' });
      }
  
      // Create the data object to be saved
      const deletionData = {
        timestamp: moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
        action,
        model,
        deleted: false // This will be set to true when actually implemented
      };
  
      // Define the file path
      const filePath = path.join(__dirname, 'action_retrieved_for_deletion.json');
      
      // Write to the file (append if exists, create if not)
      fs.readFile(filePath, (err, data) => {
        let json = [];
        if (!err && data.length > 0) {
          try {
            json = JSON.parse(data);
          } catch (parseError) {
            console.error('Error parsing existing JSON:', parseError);
          }
        }
        
        json.push(deletionData);
        
        fs.writeFile(filePath, JSON.stringify(json, null, 2), (writeErr) => {
          if (writeErr) {
            console.error('Error writing to file:', writeErr);
            return res.status(500).json({ error: 'Failed to save deletion record' });
          }
          
          console.log('Deletion request saved:', deletionData);
          res.json({ 
            success: true,
            message: 'Deletion request received and logged',
            data: deletionData
          });
        });
      });
  
    } catch (error) {
      console.error('Error in delete_action_for_model:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


// Export the router
module.exports = router;