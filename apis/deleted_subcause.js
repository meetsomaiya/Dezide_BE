const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js'); // Database connection function

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
router.post('/', async (req, res) => {
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

  try {
    const dbConnection = await connectToDatabase();

    // Step 1: Get EventID for modalName
    const modalQuery = `SELECT [EventID] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = '0' AND EventName = ?`;
    const modalResult = await dbConnection.query(modalQuery, [payload.modalName]);

    if (modalResult.length === 0) {
      return res.status(404).json({ error: 'modalName not found' });
    }

    const modalEventID = modalResult[0].EventID;

    // Step 2: Get EventID for parentCauseName
    const parentCauseQuery = `SELECT [EventID] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = ? AND EventName = ?`;
    const parentCauseResult = await dbConnection.query(parentCauseQuery, [modalEventID, payload.parentCauseName]);

    if (parentCauseResult.length === 0) {
      return res.status(404).json({ error: 'parentCauseName not found' });
    }

    const parentCauseEventID = parentCauseResult[0].EventID;

    // Step 3: Get EventID for parentSubCauseName
    const parentSubCauseQuery = `SELECT [EventID] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = ? AND EventName = ?`;
    const parentSubCauseResult = await dbConnection.query(parentSubCauseQuery, [parentCauseEventID, payload.parentSubCauseName]);

    if (parentSubCauseResult.length === 0) {
      return res.status(404).json({ error: 'parentSubCauseName not found' });
    }

    const parentSubCauseEventID = parentSubCauseResult[0].EventID;

    // Step 4: Delete nestedSubCauseName
    const deleteQuery = `DELETE FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = ? AND EventName = ?`;
    const deleteResult = await dbConnection.query(deleteQuery, [parentSubCauseEventID, payload.nestedSubCauseName]);

    if (deleteResult.count === 0) {
      return res.status(404).json({ error: 'nestedSubCauseName not found or already deleted' });
    }

    // Save the deletion details to a JSON file
    const filePath = path.join(__dirname, 'subcause_deletion_data_retrieve.json');
    const dataWithTimestamp = {
      ...payload,
      timestamp: moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss'),
    };

    fs.writeFileSync(filePath, JSON.stringify(dataWithTimestamp, null, 2));

    res.status(200).json({ message: 'nestedSubCauseName deleted successfully', data: dataWithTimestamp });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
