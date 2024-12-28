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

// Handle POST request for batch update
router.post('/', async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.modalName || !Array.isArray(payload.updatedCauses)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { modalName, updatedCauses } = payload;

  try {
    const connection = await connectToDatabase();

    // Step 1: Query for Parent EventID
    const parentQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = '0' AND [EventName] = ?
    `;
    const parentResult = await connection.query(parentQuery, [modalName]);

    if (parentResult.length === 0) {
      return res.status(404).json({ error: 'Modal name not found in database' });
    }

    const parentEventID = parentResult[0].EventID;

    // Step 2: Loop through updatedCauses and update each one
    for (const cause of updatedCauses) {
      const { name: causeName, probability: currentValue } = cause;

      if (!causeName || currentValue === undefined) {
        console.warn(`Skipping invalid cause: ${JSON.stringify(cause)}`);
        continue;
      }

      // Query for Child EventID
      const childQuery = `
        SELECT [EventID]
        FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
        WHERE [ParentID] = ? AND [EventName] = ?
      `;
      const childResult = await connection.query(childQuery, [parentEventID, causeName]);

      if (childResult.length === 0) {
        console.warn(`Cause name not found for modal name: ${causeName}`);
        continue;
      }

      const childEventID = childResult[0].EventID;

      // Update ProbabilityPercentage
      const updateQuery = `
        UPDATE [Dezide_UAT].[dbo].[Tbl_Events_Main]
        SET [ProbabilityPercentage] = ?
        WHERE [EventID] = ?
      `;
      await connection.query(updateQuery, [currentValue, childEventID]);

      console.log(`Updated ProbabilityPercentage for EventID: ${childEventID}, Cause: ${causeName}`);
    }

    // Close the connection
    await connection.close();

    // Respond to the client
    res.status(200).json({ message: 'All causes updated successfully' });
  } catch (error) {
    console.error('Error processing batch update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Export the router
module.exports = router;