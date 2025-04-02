const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const { connectToDatabase } = require('./connect2.js');

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

router.use(express.json());

const DATA_FILE = path.join(__dirname, 'update_data_for_modal_retrieved.json');

// Initialize data file
(async () => {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]');
  }
})();

router.post('/', async (req, res) => {
  const { previousName, currentName } = req.body;
  
  if (typeof previousName !== 'string' || typeof currentName !== 'string') {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  try {
    // Update database
    const connection = await connectToDatabase();
    try {
      const updateQuery = `
        UPDATE [Tbl_Events_Main]
        SET [EventName] = ?
        WHERE [EventName] = ?
      `;
      
      const result = await connection.query(updateQuery, [currentName, previousName]);
      
      if (result.count === 0) {
        console.warn('No rows updated - name might not exist');
      } else {
        console.log(`Updated ${result.count} row(s)`);
      }
    } finally {
      await connection.close();
    }

    // Log to JSON file
    const currentData = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    currentData.push({
      timestamp: new Date().toISOString(),
      previousName,
      currentName,
      dbUpdated: true
    });
    await fs.writeFile(DATA_FILE, JSON.stringify(currentData, null, 2));
    
    res.status(200).json({ 
      success: true,
      message: 'Name updated in database and logged locally'
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Log failure to JSON file
    try {
      const currentData = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
      currentData.push({
        timestamp: new Date().toISOString(),
        previousName,
        currentName,
        dbUpdated: false,
        error: error.message
      });
      await fs.writeFile(DATA_FILE, JSON.stringify(currentData, null, 2));
    } catch (fileError) {
      console.error('Failed to log error:', fileError);
    }
    
    res.status(500).json({ 
      error: 'Failed to update name',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;