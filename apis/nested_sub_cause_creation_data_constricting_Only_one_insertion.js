const express = require('express');
const fs = require('fs'); // For file operations
const path = require('path'); // For file paths
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Database connection function

const router = express.Router(); // Define the router

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
router.use(express.json()); // This middleware is required for parsing JSON requests

// POST endpoint to save nested sub-cause data
router.post('/', async (req, res) => {
  const {
    modalName,
    parentCauseName,
    fieldName,
    previousValue,
    currentValue,
    subCauseName,
    nestedSubCauseName
  } = req.body;

  try {
    // Prepare the data object from the request
    const data = {
      modalName: modalName || "Unknown Modal",
      parentCauseName: parentCauseName || "Unknown Parent",
      fieldName: fieldName || "CauseName",
      previousValue: previousValue || null,
      currentValue: currentValue || "New Event",
      subCauseName: subCauseName || "Unknown SubCause",
      nestedSubCauseName: nestedSubCauseName || "New Nested SubCause",
      timestamp: moment().format() // Add timestamp to the data
    };

    // Connect to the database
    const connection = await connectToDatabase();

    // Step 1: Fetch EventID and EventName for the first query
    const query1 = `
      SELECT [ModelID], [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = '0' AND EventName = ?
    `;
    const result1 = await connection.query(query1, [modalName]);

    if (result1.length === 0) {
      return res.status(404).json({ error: 'No event found for the given modalName' });
    }

    const { EventID: eventId, ModelID } = result1[0];

    // Step 2: Fetch EventID for the parentCauseName
    const query2 = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = ? AND EventName = ?
    `;
    const result2 = await connection.query(query2, [eventId, parentCauseName]);

    if (result2.length === 0) {
      return res.status(404).json({ error: 'No event found for the given parentCauseName' });
    }

    const parentEventID = result2[0].EventID;

    // Step 3: Update IsParent flag for matching subCauseName
    const query3 = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = ? AND EventName = ?
    `;
    const result3 = await connection.query(query3, [parentEventID, subCauseName]);

    if (result3.length === 0) {
      return res.status(404).json({ error: 'No matching subCauseName found' });
    }

    // Set IsParent = 1 for the matched record
    const updateQuery = `
      UPDATE [Dezide_UAT].[dbo].[Tbl_Events_Main]
      SET [IsParent] = 1
      WHERE EventID = ?
    `;
    await connection.query(updateQuery, [result3[0].EventID]);

    // Step 4: Insert a new record for nestedSubCauseName
    const insertQuery = `
      INSERT INTO [Dezide_UAT].[dbo].[Tbl_Events_Main] 
      ([ModelID], [EventName], [ParentID], [IsParent], [CreatedOn], [CreatedBy], [UpdatedOn], [UpdatedBy], [IsActive], [ProbabilityPercentage])
      VALUES (?, ?, ?, 0, ?, 40139, ?, 40139, 1, NULL)
    `;
    const createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
    await connection.query(insertQuery, [
      ModelID,
      nestedSubCauseName,
      result3[0].EventID, // Use the EventID from the matched subCauseName
      createdAt,
      createdAt
    ]);

    // Close the database connection
    await connection.close();

    // Respond with success
    res.status(200).json({ message: 'Data processed and saved successfully', data });

  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).json({ error: 'An error occurred', details: error.message });
  }
});

// Export the router
module.exports = router;
