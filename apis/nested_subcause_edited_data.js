const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js'); // Import the connection function
const odbc = require('odbc');

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

// Route to handle saving the nested sub-cause data
router.post('/', async (req, res) => {
  const { modalName, parentCauseName, subCauseName, fieldName, previousValue, currentValue } = req.body;

  try {
    // Connect to the database
    const dbConnection = await connectToDatabase();

    // Step 1: Fetch EventID for modalName
    const modalEventQuery = `SELECT [ModelID], [EventID], [EventName] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = '0' AND EventName = ?`;
    const modalResult = await dbConnection.query(modalEventQuery, [modalName]);

    if (modalResult.length === 0) {
      return res.status(404).json({ message: 'Event not found for modalName' });
    }

    const eventId = modalResult[0].EventID;

    // Step 2: Fetch EventID for parentCauseName
    const parentCauseQuery = `SELECT [EventID], [EventName] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = ? AND EventName = ?`;
    const parentCauseResult = await dbConnection.query(parentCauseQuery, [eventId, parentCauseName]);

    if (parentCauseResult.length === 0) {
      return res.status(404).json({ message: 'Event not found for parentCauseName' });
    }

    const parentEventId = parentCauseResult[0].EventID;

    // Step 3: Fetch EventID for subCauseName
    const subCauseQuery = `SELECT [EventID], [EventName] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = ? AND EventName = ?`;
    const subCauseResult = await dbConnection.query(subCauseQuery, [parentEventId, subCauseName]);

    if (subCauseResult.length === 0) {
      return res.status(404).json({ message: 'Event not found for subCauseName' });
    }

    const subEventId = subCauseResult[0].EventID;

    // Step 4: Fetch EventID for the previousValue
    const previousValueQuery = `SELECT [EventID], [EventName] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE ParentID = ? AND EventName = ?`;
    const previousValueResult = await dbConnection.query(previousValueQuery, [subEventId, previousValue]);

    if (previousValueResult.length === 0) {
      return res.status(404).json({ message: 'Event not found for previousValue' });
    }

    // Step 5: Update the previous value to currentValue
    const updateQuery = `UPDATE [Dezide_UAT].[dbo].[Tbl_Events_Main] SET EventName = ? WHERE EventID = ?`;
    await dbConnection.query(updateQuery, [currentValue, previousValueResult[0].EventID]);

    // Data to be saved
    const dataToSave = {
      modalName,
      parentCauseName,
      subCauseName,
      fieldName,
      previousValue,
      currentValue,
      timestamp: moment().format(), // Add a timestamp for when the data was edited
    };

    // Save the data to a JSON file (optional)
    const filePath = path.join(__dirname, 'edited_nested_subcause_data.json');
    fs.readFile(filePath, 'utf8', (err, fileData) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error reading the file:', err);
        return res.status(500).json({ message: 'Error reading the file' });
      }

      let existingData = [];
      if (fileData) {
        existingData = JSON.parse(fileData);
      }

      existingData.push(dataToSave);

      fs.writeFile(filePath, JSON.stringify(existingData, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error writing to the file:', writeErr);
          return res.status(500).json({ message: 'Error writing to the file' });
        }

        console.log('Data saved successfully:', dataToSave);
        res.status(200).json({ message: 'Data saved successfully' });
      });
    });

  } catch (err) {
    console.error('Error during database operation:', err);
    res.status(500).json({ message: 'Error during database operation' });
  }
});

// Export the router
module.exports = router;
