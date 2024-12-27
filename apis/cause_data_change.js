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

  if (!payload || !payload.modalName || !payload.parentCauseName || !payload.subCauseName || payload.currentValue === undefined) {
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
    const parentEventID = modalNameResult[0].EventID;

    // Step 2: Retrieve Child Events for parentCauseName
    const childEventQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = ? AND [EventName] = ?
    `;
    const childEventResult = await dbConnection.query(childEventQuery, [parentEventID, payload.parentCauseName]);
    if (childEventResult.length === 0) {
      return res.status(404).json({ error: 'Parent cause name not found' });
    }

    const childEventIDs = childEventResult.map(row => row.EventID);

    // Step 3: Retrieve Sub-Child Events for subCauseName
    const subChildEventQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] IN (${childEventIDs.join(',')}) AND [EventName] = ?
    `;
    const subChildEventResult = await dbConnection.query(subChildEventQuery, [payload.subCauseName]);
    if (subChildEventResult.length === 0) {
      return res.status(404).json({ error: 'Sub-cause name not found' });
    }

    // Step 4: Update ProbabilityPercentage for Sub-Child Events in Batches
    const updateQuery = `
      UPDATE [Dezide_UAT].[dbo].[Tbl_Events_Main]
      SET [ProbabilityPercentage] = ?
      WHERE [EventID] = ?
    `;

    // Perform updates in batches of 2000
    const batchSize = 2000;
    for (let i = 0; i < subChildEventResult.length; i += batchSize) {
      const batch = subChildEventResult.slice(i, i + batchSize);
      const updatePromises = batch.map(row =>
        dbConnection.query(updateQuery, [payload.currentValue, row.EventID])
      );
      await Promise.all(updatePromises);
    }

    res.status(200).json({ message: 'Probability percentages updated successfully' });
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