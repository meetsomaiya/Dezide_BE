const express = require('express');
const fs = require('fs'); // For file operations
const path = require('path'); // For file path operations
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
router.use(express.json());

// POST route to handle sub-cause creation and updates
router.post('/', async (req, res) => {
    const { modalName, parentCauseName, currentValue } = req.body; // Extract data from the request

    // Ensure required fields are provided in the request body
    if (!modalName || !parentCauseName || !currentValue) {
        return res.status(400).json({ message: 'Missing required fields in the request body' });
    }

    try {
        const dbConnection = await connectToDatabase();

        // First query: Fetch EventID and EventName for the provided modalName
        const firstQuery = `
            SELECT [ModelID], [EventID], [EventName]
            FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
            WHERE ParentID = '0' AND EventName = ?
        `;
        const firstResult = await dbConnection.query(firstQuery, [modalName]);

        if (firstResult.length === 0) {
            return res.status(404).json({ message: 'No data found for the provided modalName' });
        }

        const { EventID: parentEventID } = firstResult[0];

        // Second query: Fetch EventID for the provided parentCauseName under the parentEventID
        const secondQuery = `
            SELECT [EventID], [EventName]
            FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
            WHERE ParentID = ? AND EventName = ?
        `;
        const secondResult = await dbConnection.query(secondQuery, [parentEventID, parentCauseName]);

        if (secondResult.length === 0) {
            return res.status(404).json({ message: 'No data found for the provided parentCauseName' });
        }

        const { EventID: targetEventID } = secondResult[0];

        // Third query: Fetch EventID and EventName for the provided targetEventID as ParentID
        const thirdQuery = `
            SELECT [EventID], [EventName]
            FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
            WHERE ParentID = ?
        `;
        const thirdResult = await dbConnection.query(thirdQuery, [targetEventID]);

        if (thirdResult.length === 0) {
            return res.status(404).json({ message: 'No data found for the targetEventID' });
        }

        // Here we get the EventID and EventName for the third query
        const { EventID: finalEventID, EventName: finalEventName } = thirdResult[0];

        // Update query: Modify EventName to the currentValue and ParentID to the targetEventID
        const updateQuery = `
            UPDATE [Dezide_UAT].[dbo].[Tbl_Events_Main]
            SET EventName = ?, ParentID = ?
            WHERE EventID = ?
        `;
        await dbConnection.query(updateQuery, [currentValue, targetEventID, finalEventID]);

        // Save a verification log to JSON file
        const filePath = path.join(__dirname, 'subcause_data_verification.json');
        const logData = {
            timestamp: moment().format(),
            modalName,
            parentCauseName,
            currentValue,
            updatedEventID: finalEventID
        };

        // Append to the file
        fs.readFile(filePath, 'utf8', (err, data) => {
            let existingData = [];
            if (!err && data) {
                existingData = JSON.parse(data);
            }

            existingData.push(logData);

            fs.writeFile(filePath, JSON.stringify(existingData, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error('Error writing to file:', writeErr);
                }
            });
        });

        // Respond with success
        res.status(200).json({ message: 'Data updated successfully', logData });

        // Close the database connection
        await dbConnection.close();

    } catch (err) {
        console.error('Error handling request:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

// Export the router
module.exports = router;
