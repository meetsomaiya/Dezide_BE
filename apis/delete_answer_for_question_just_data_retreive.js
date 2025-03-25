const express = require('express');
const fs = require('fs').promises; // Using promises for better async handling
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');

const router = express.Router();

// Constants
const DELETION_LOG_FILE = path.join(__dirname, 'answer_deletion_request.json');
const TIMEZONE = 'America/New_York';

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// JSON parsing
router.use(express.json());

// Helper function to ensure log file exists
async function ensureDeletionFileExists() {
  try {
    await fs.access(DELETION_LOG_FILE);
  } catch {
    await fs.writeFile(DELETION_LOG_FILE, JSON.stringify([], null, 2));
  }
}

// Answer deletion endpoint
router.post('/', async (req, res) => {
  try {
    await ensureDeletionFileExists();
    
    const { answerText, questionName, modelName } = req.body;
    
    // Validate required fields
    if (!answerText || !questionName || !modelName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: answerText, questionName, modelName' 
      });
    }

    // Create deletion record with timestamp
    const deletionRecord = {
      answerText,
      questionName,
      modelName,
      deletedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
      ip: req.ip,
      status: 'pending'
    };

    // Read current log entries
    const currentData = JSON.parse(await fs.readFile(DELETION_LOG_FILE));
    
    // Add new record
    currentData.push(deletionRecord);
    
    // Write back to file
    await fs.writeFile(DELETION_LOG_FILE, JSON.stringify(currentData, null, 2));
    
    console.log('Answer deletion request logged:', deletionRecord);
    
    res.json({ 
      success: true, 
      message: 'Deletion request received and logged',
      data: deletionRecord
    });
    
  } catch (error) {
    console.error('Error handling answer deletion:', error);
    
    // Log failed attempt
    const errorRecord = {
      error: error.message,
      timestamp: moment().tz(TIMEZONE).format(),
      requestBody: req.body,
      ip: req.ip
    };
    
    try {
      const currentData = JSON.parse(await fs.readFile(DELETION_LOG_FILE));
      currentData.push({ ...errorRecord, status: 'failed' });
      await fs.writeFile(DELETION_LOG_FILE, JSON.stringify(currentData, null, 2));
    } catch (fileError) {
      console.error('Failed to write error log:', fileError);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process deletion request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;