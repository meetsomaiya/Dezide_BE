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

// POST route to handle sub-cause creation
router.post('/', async (req, res) => {
  const { modalName, parentCauseName, currentValue } = req.body;

  // Validate the request body
  if (!modalName || !parentCauseName || !currentValue) {
    return res.status(400).json({ error: 'Missing required fields in the request.' });
  }

  try {
    // Connect to the database
    const dbConnection = await connectToDatabase();

    // Step 1: Retrieve the ModelID and EventID for the given modalName
    const modalQuery = `
      SELECT ModelID, EventID 
      FROM Tbl_Events_Main 
      WHERE ParentID = '0' AND EventName = ? AND IsActive = 1
    `;
    const modalResult = await dbConnection.query(modalQuery, [modalName]);

    if (modalResult.length === 0) {
      return res.status(404).json({ error: 'Modal not found.' });
    }

    const { ModelID, EventID: modalEventID } = modalResult[0];

    // Step 2: Retrieve the EventID for the given parentCauseName
    const parentQuery = `
      SELECT EventID 
      FROM Tbl_Events_Main 
      WHERE ParentID = ? AND EventName = ? AND IsActive = 1
    `;
    const parentResult = await dbConnection.query(parentQuery, [modalEventID, parentCauseName]);

    if (parentResult.length === 0) {
      return res.status(404).json({ error: 'Parent cause not found.' });
    }

    const parentEventID = parentResult[0].EventID;

    // Step 3: Update the IsParent field for the parent cause
    const updateParentQuery = `
      UPDATE Tbl_Events_Main 
      SET IsParent = 1 
      WHERE EventID = ?
    `;
    await dbConnection.query(updateParentQuery, [parentEventID]);

    // Step 4: Insert the new sub-cause
// Step 4: Insert the new sub-cause
const insertQuery = `
  INSERT INTO Tbl_Events_Main (ModelID, EventName, ParentID, IsActive, CreatedOn, CreatedBy, UpdatedOn, UpdatedBy) 
  VALUES (?, ?, ?, 1, ?, ?, ?, ?)
`;

// Get the current date and time in IST
const currentDateTimeIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

// Execute the query with the additional fields
await dbConnection.query(insertQuery, [
  ModelID,           // From Step 1
  currentValue,      // From the request payload
  parentEventID,     // From Step 2
  currentDateTimeIST, // CreatedOn
  40139,             // CreatedBy
  currentDateTimeIST, // UpdatedOn
  40139              // UpdatedBy
]);


    fs.readFile(filePath, 'utf8', (err, data) => {
      let existingData = [];
      if (!err && data) {
        try {
          existingData = JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing existing JSON data:', parseError);
        }
      }

      existingData.push(payload);

      fs.writeFile(filePath, JSON.stringify(existingData, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error writing to file:', writeErr);
        }
      });
    });

    // Respond with success
    res.status(200).json({ message: 'Data successfully updated in the database and saved to file.', payload });

    // Close the database connection
    await dbConnection.close();
  } catch (err) {
    console.error('Error occurred:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Export the router
module.exports = router;
