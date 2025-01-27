const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Import the connection function
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

// POST endpoint to handle the received data
router.post('/', async (req, res) => {
  const payload = req.body; // Get the payload from the request
  const { causeName, actionName } = payload;

  // Validate the input
  if (!causeName || !actionName) {
    return res.status(400).json({ error: 'causeName and actionName are required' });
  }

  try {
    // Save the payload data to the JSON file
    const dataToWrite = { causeName, actionName };

    // Write the data to the JSON file
    fs.writeFileSync('match_actions_cause_reverify.json', JSON.stringify(dataToWrite, null, 2));
    console.log('Payload successfully written to match_actions_cause_reverify.json');

    // Proceed with the rest of the logic
    const dbConnection = await connectToDatabase();

    // Query for EventID based on causeName
    const eventQuery = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE [EventName] = ?;
    `;
    console.log('Executing SQL Query:', eventQuery);
    console.log('With Parameters:', [causeName]);
    const eventResult = await dbConnection.query(eventQuery, [causeName]);

    if (eventResult.length === 0) {
      await dbConnection.close();
      return res.status(404).json({ error: `No Event found for causeName: ${causeName}` });
    }

    const eventID = eventResult[0].EventID;

    // Query for ActionID based on actionName
    const actionQuery = `
      SELECT [ActionID], [EventID], [ActionName]
      FROM [Dezide_UAT].[dbo].[Tbl_Actions]
      WHERE [ActionName] = ?;
    `;
    console.log('Executing SQL Query:', actionQuery);
    console.log('With Parameters:', [actionName]);
    const actionResult = await dbConnection.query(actionQuery, [actionName]);

    if (actionResult.length === 0) {
      await dbConnection.close();
      return res.status(404).json({ error: `No Action found for actionName: ${actionName}` });
    }

    const actionID = actionResult[0].ActionID;

    // Log results for debugging
    console.log('EventID:', eventID, 'ActionID:', actionID);

    // Update EventID in the Tbl_Actions table for the corresponding ActionID
    const updateQuery = `
      UPDATE [Dezide_UAT].[dbo].[Tbl_Actions]
      SET [EventID] = ?
      WHERE [ActionID] = ?;
    `;
    console.log('Executing SQL Query:', updateQuery);
    console.log('With Parameters:', [eventID, actionID]);

    const updateResult = await dbConnection.query(updateQuery, [eventID, actionID]);

    if (updateResult.affectedRows === 0) {
      await dbConnection.close();
      return res.status(404).json({ error: 'Failed to update EventID in Tbl_Actions' });
    }

    console.log('EventID successfully updated in Tbl_Actions');

    // Close the database connection
    await dbConnection.close();

    return res.status(200).json({ message: 'EventID updated successfully in Tbl_Actions', EventID: eventID, ActionID: actionID });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

// Export the router
module.exports = router;
