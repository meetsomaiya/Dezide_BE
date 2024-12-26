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

// POST endpoint to handle edited data and update in the database and file
router.post('/', async (req, res) => {
  // Get the payload from the request body
  const { modalName, fieldName, previousValue, currentValue } = req.body;

  // Validate that all necessary data is present
  if (!modalName || !fieldName || !previousValue || !currentValue) {
    return res.status(400).json({ error: 'Missing required fields in the request.' });
  }

  try {
    // Connect to the database
    const dbConnection = await connectToDatabase();

    // Step 1: Retrieve the EventID based on the modalName
    const eventQuery = `SELECT EventID, EventName FROM Tbl_Events_Main WHERE EventName = ? AND IsActive = 1`;
    const eventResult = await dbConnection.query(eventQuery, [modalName]);

    if (eventResult.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const eventId = eventResult[0].EventID;

    // Step 2: Use the EventID to query the parent row (ParentID)
    const parentQuery = `SELECT EventID, EventName FROM Tbl_Events_Main WHERE ParentID = ? AND IsActive = 1`;
    const parentResult = await dbConnection.query(parentQuery, [eventId]);

    if (parentResult.length === 0) {
      return res.status(404).json({ error: 'Parent event not found.' });
    }

    const parentEvent = parentResult[0];

    // Step 3: Compare the previousValue with the EventName
    if (parentEvent.EventName !== previousValue) {
      return res.status(400).json({ error: 'Previous value does not match the current EventName.' });
    }

    // Step 4: Update the EventName with the currentValue
    const updateQuery = `UPDATE Tbl_Events_Main SET EventName = ? WHERE EventID = ?`;
    await dbConnection.query(updateQuery, [currentValue, parentEvent.EventID]);

    // Step 5: Save the changes to editing_top_cause.json file
    const editedData = {
      modalName,
      fieldName,
      previousValue,
      currentValue,
      timestamp: moment().format(), // Add a timestamp for when the data was edited
    };

    // Read the current contents of the file (if it exists)
    fs.readFile('editing_top_cause.json', 'utf8', (err, data) => {
      let fileContents = [];
      
      // If file exists and contains data, parse it, otherwise start with an empty array
      if (!err) {
        try {
          fileContents = JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing existing JSON data:', parseError);
          return res.status(500).json({ error: 'Error parsing existing JSON data' });
        }
      }

      // Add the new edited data to the array
      fileContents.push(editedData);

      // Write the updated data back to the JSON file
      fs.writeFile('editing_top_cause.json', JSON.stringify(fileContents, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Error writing to file:', writeErr);
          return res.status(500).json({ error: 'Error writing to file' });
        }

        // Respond with success
        res.status(200).json({ message: 'Data successfully updated in the database and saved to editing_top_cause.json' });
      });
    });

    // Close the database connection
    await dbConnection.close();

  } catch (err) {
    console.error('Database or File Operation Failed:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Export the router
module.exports = router;
