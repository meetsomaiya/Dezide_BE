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

// Define the route to handle the GET request and log data to a JSON file
router.get('/', async (req, res) => {
  const actionName = req.query.actionName;

  if (!actionName) {
    return res.status(400).json({ error: 'actionName parameter is missing' });
  }

  // Connect to the database
  try {
    const dbConnection = await connectToDatabase();

    // Step 1: Fetch ActionID and EventID for the given ActionName
    const actionQuery = `SELECT [ActionID], [EventID], [ActionName]
                         FROM [Dezide_UAT].[dbo].[Tbl_Actions]
                         WHERE ActionName = ?`;

    const actionResult = await dbConnection.query(actionQuery, [actionName]);

    if (actionResult.length === 0) {
      return res.status(404).json({ error: 'ActionName not found' });
    }

    // Extract EventID from the first query result
    const eventID = actionResult[0].EventID;

    // Step 2: Fetch the EventName for the retrieved EventID
    const eventQuery = `SELECT [EventID], [EventName]
                        FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
                        WHERE EventID = ?`;

    const eventResult = await dbConnection.query(eventQuery, [eventID]);

    if (eventResult.length === 0) {
      return res.status(404).json({ error: 'EventID not found in Tbl_Events_Main' });
    }

    // Extract the EventName (cause) from the query result
    const eventName = eventResult[0].EventName;

    // Write the data to the JSON file
    const dataToWrite = {
      actionName: actionName,
      causes: [eventName], // Wrap the single cause in an array for consistency
      timestamp: moment().format(),
    };

    fs.writeFile('action_retrieved_for_hovering.json', JSON.stringify(dataToWrite, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        return res.status(500).json({ error: 'Failed to write to file' });
      }

      // Send a success response back to the client
      res.status(200).json({ message: 'Data logged successfully', causes: [eventName] });
    });

    // Don't forget to close the connection when done
    await dbConnection.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the router
module.exports = router;