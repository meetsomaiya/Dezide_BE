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

// API to handle POST requests
router.post('/', async (req, res) => {
  const payload = req.body;

  // Validate the payload
  if (
    !payload ||
    !payload.modalName ||
    !payload.parentCauseName ||
    !Array.isArray(payload.updatedSubCauses) ||
    payload.updatedSubCauses.some(sub => sub.currentValue === undefined || !sub.name)
  ) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  console.log('Received payload:', JSON.stringify(payload, null, 2));

  let dbConnection;

  try {
    dbConnection = await connectToDatabase();

    // Step 1: Retrieve EventID for modalName
    const modalNameQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = 0 AND [EventName] = ?
    `;
    const modalNameResult = await dbConnection.query(modalNameQuery, [payload.modalName]);
    if (modalNameResult.length === 0) {
      return res.status(404).json({ error: 'Modal name not found' });
    }
    const parentEventID = modalNameResult[0].EventID;

    // Step 2: Retrieve Child EventID for parentCauseName
    const parentCauseQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = ? AND [EventName] = ?
    `;
    const parentCauseResult = await dbConnection.query(parentCauseQuery, [parentEventID, payload.parentCauseName]);
    if (parentCauseResult.length === 0) {
      return res.status(404).json({ error: 'Parent cause name not found' });
    }
    const parentCauseEventID = parentCauseResult[0].EventID;

    // Step 3: Update ProbabilityPercentages for sub-causes one by one
    const updateQuery = `
      UPDATE [Dezide_UAT].[dbo].[Tbl_Events_Main]
      SET [ProbabilityPercentage] = ?
      WHERE [ParentID] = ? AND [EventName] = ?
    `;

    for (const subCause of payload.updatedSubCauses) {
      await dbConnection.query(updateQuery, [
        subCause.currentValue,
        parentCauseEventID,
        subCause.name,
      ]);
    }

    res.status(200).json({ message: 'Sub-cause probabilities updated successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (dbConnection) {
      await dbConnection.close();
    }
  }
});

// Export the router
module.exports = router;
