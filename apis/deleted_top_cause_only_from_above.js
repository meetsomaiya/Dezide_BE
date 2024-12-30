const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js'); // Import the connection function

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

// Handle the "deleted_top_cause" API endpoint
router.post('/', async (req, res) => {
  const { modalName, causeName, deletionFlag } = req.body;

  console.log("Received cause deletion data:", req.body);

  if (!modalName || !causeName || deletionFlag === undefined) {
    return res.status(400).json({ error: 'Invalid data received' });
  }

  try {
    // Connect to the database
    const connection = await connectToDatabase();

    // Step 1: Query the EventID for the given modalName
    const modalQuery = `
      SELECT [ModelID], [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = '0' AND EventName = ?`;
    const modalResult = await connection.query(modalQuery, [modalName]);

    if (modalResult.length === 0) {
      return res.status(404).json({ error: 'Modal name not found' });
    }

    const eventId = modalResult[0].EventID;

    // Step 2: Query and delete the row for the given causeName
    const causeQuery = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = ? AND EventName = ?`;
    const causeResult = await connection.query(causeQuery, [eventId, causeName]);

    if (causeResult.length === 0) {
      return res.status(404).json({ error: 'Cause name not found under the given modal name' });
    }

    const deleteQuery = `
      DELETE FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = ? AND EventName = ?`;
    await connection.query(deleteQuery, [eventId, causeName]);

    // Step 3: Save the deletion data in a JSON file
    const dataToSave = {
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      modalName,
      causeName,
      deletionFlag,
    };

    const filePath = path.join(__dirname, 'topcause_deletion_data.json');
    let fileContent = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      fileContent = JSON.parse(fileData);
    }
    fileContent.push(dataToSave);
    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2));

    // Respond with success
    res.status(200).json({ message: 'Cause deleted successfully and logged in JSON file' });

    // Close the database connection
    await connection.close();
  } catch (error) {
    console.error('Error handling deletion:', error);
    res.status(500).json({ error: 'An error occurred during deletion' });
  }
});

// Export the router
module.exports = router;
