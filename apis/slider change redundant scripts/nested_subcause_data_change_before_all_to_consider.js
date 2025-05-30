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

  if (!payload || !payload.modalName || !payload.parentCauseName || !payload.parentSubCauseName || !payload.nestedSubCauseName || payload.currentValue === undefined) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  console.log('Received payload:', payload);

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
    const level1EventID = modalNameResult[0].EventID;

    // Step 2: Retrieve EventID for parentCauseName
    const parentCauseQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = ? AND [EventName] = ?
    `;
    const parentCauseResult = await dbConnection.query(parentCauseQuery, [level1EventID, payload.parentCauseName]);
    if (parentCauseResult.length === 0) {
      return res.status(404).json({ error: 'Parent cause name not found' });
    }
    const level2EventID = parentCauseResult[0].EventID;

    // Step 3: Retrieve EventID for parentSubCauseName
    const parentSubCauseQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = ? AND [EventName] = ?
    `;
    const parentSubCauseResult = await dbConnection.query(parentSubCauseQuery, [level2EventID, payload.parentSubCauseName]);
    if (parentSubCauseResult.length === 0) {
      return res.status(404).json({ error: 'Parent sub-cause name not found' });
    }
    const level3EventID = parentSubCauseResult[0].EventID;

    // Step 4: Retrieve EventID for nestedSubCauseName
    const nestedSubCauseQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = ? AND [EventName] = ?
    `;
    const nestedSubCauseResult = await dbConnection.query(nestedSubCauseQuery, [level3EventID, payload.nestedSubCauseName]);
    if (nestedSubCauseResult.length === 0) {
      return res.status(404).json({ error: 'Nested sub-cause name not found' });
    }

    // Step 5: Update ProbabilityPercentage for Nested Sub-Cause
    const updateQuery = `
      UPDATE [Dezide_UAT].[dbo].[Tbl_Events_Main]
      SET [ProbabilityPercentage] = ?
      WHERE [EventID] = ?
    `;

    // Perform update for the single nestedSubCauseName
    await dbConnection.query(updateQuery, [payload.currentValue, nestedSubCauseResult[0].EventID]);

    res.status(200).json({ message: 'Probability percentage updated successfully' });
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
