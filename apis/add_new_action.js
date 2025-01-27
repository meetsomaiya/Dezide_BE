const express = require('express');
const fs = require('fs'); // For file operations
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

// Route to handle adding new action
router.post('/', async (req, res) => {
  const { modalName, action } = req.body; // Extract modalName and action details
  const { name } = action; // Extract action name
  const indianTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'); // Indian Standard Time

  try {
    // Connect to the database
    const dbConnection = await connectToDatabase();

    // Step 1: Fetch EventID from Tbl_Events_Main
    const eventQuery = `
      SELECT [EventID]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [ParentID] = '0' AND [EventName] = ?;
    `;
    const eventResult = await dbConnection.query(eventQuery, [modalName]);

    if (!eventResult.length) {
      throw new Error(`No EventID found for modalName: ${modalName}`);
    }

    const { EventID } = eventResult[0];

    // Step 2: Insert into Tbl_Actions
    const insertQuery = `
      INSERT INTO [Dezide_UAT].[dbo].[Tbl_Actions] (
        [EventID], [ActionName], [ActionTime], [ActionCost],
        [CreatedOn], [CreatedBy], [UpdatedOn], [UpdatedBy], [IsActive]
      ) VALUES (?, ?, NULL, NULL, ?, 40139, ?, 40139, 1);
    `;
    await dbConnection.query(insertQuery, [
      EventID,
      name,
      indianTime,
      indianTime,
    ]);

    // Write to action_creation_data_retrieved.json for verification
    const filePath = './action_creation_data_retrieved.json';
    fs.writeFileSync(
      filePath,
      JSON.stringify({ modalName, action, EventID, CreatedOn: indianTime }, null, 2)
    );

    // Send success response
    res.status(200).json({
      message: 'Action successfully inserted',
      data: { modalName, action, EventID, CreatedOn: indianTime },
    });

    // Close the database connection
    await dbConnection.close();
  } catch (error) {
    console.error('Error handling action creation:', error);
    res.status(500).json({ message: 'Error creating action', error: error.message });
  }
});

// Export the router
module.exports = router;
