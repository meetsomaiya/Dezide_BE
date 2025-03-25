const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Parse JSON bodies
router.use(express.json());

// Handle OPTIONS preflight
router.options('/', (req, res) => res.status(200).end());

// POST endpoint
router.post('/', (req, res) => {
  try {
    console.log('Raw request:', req.body);

    // Extract all fields including modalName
    const { oldAnswer, newAnswer, questionName, eventID, modalName } = req.body;
    
    // Validate required fields
    if (!oldAnswer || !newAnswer || !questionName || eventID === undefined || !modalName) {
      throw new Error('Missing required fields');
    }

    // Create complete record
    const record = {
      timestamp: new Date().toISOString(),
      metadata: {
        modalName: modalName.toString(), // <-- Include modalName in metadata
        source: 'answer-edit-endpoint'
      },
      updateDetails: {
        oldAnswer: oldAnswer.toString(),
        newAnswer: newAnswer.toString(),
        questionName: questionName.toString(),
        eventID: Number(eventID)
      }
    };

    // Write to file
    const filePath = path.join(__dirname, 'answer_retrieved_for_updation.json');
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
    
    console.log('Update recorded:', record);
    
    res.status(200).json({
      success: true,
      message: 'Update logged',
      data: record
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      received: req.body
    });
  }
});

module.exports = router;