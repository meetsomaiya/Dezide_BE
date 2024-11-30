const express = require('express');
const { connectToDatabase } = require('./connect2.js');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones

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

// Define the GET endpoint
router.get('/', async (req, res) => {
    const eventName = req.query.eventName; // Extract eventName from query parameters

    if (!eventName) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    let dbConnection;
    try {
        // Connect to the database
        dbConnection = await connectToDatabase();

        // Query the database for the specific event
        const query = `
            SELECT 
                [EventID],
                [ModelID],
                [EventName],
                [CreatedOn],
                [CreatedBy],
                [UpdatedOn],
                [UpdatedBy],
                [IsActive]
            FROM Tbl_Events
            WHERE EventName = ?
        `;

        const queryParams = [eventName];

        const results = await dbConnection.query(query, queryParams);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No data found for the given event name.' });
        }

        // Extract the single result into mainData
        const mainData = {
            EventID: results[0].EventID,
            ModelID: results[0].ModelID,
            EventName: results[0].EventName,
            CreatedOn: results[0].CreatedOn,
            CreatedBy: results[0].CreatedBy,
            UpdatedOn: results[0].UpdatedOn,
            UpdatedBy: results[0].UpdatedBy,
            IsActive: results[0].IsActive,
        };

        // Write the data to a JSON file
        const filePath = './events_data_sent_back.json';
        const dataToWrite = {
            eventName,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            mainData,
        };

        fs.writeFile(filePath, JSON.stringify(dataToWrite, null, 2), (err) => {
            if (err) {
                console.error('Failed to write to JSON file:', err);
                return res.status(500).json({ error: 'Failed to write data to file' });
            }

            console.log('Event data saved to JSON file:', dataToWrite);
        });

        // Send the data back in the response
        res.status(200).json({
            message: 'Data retrieved successfully',
            mainData,
        });

    } catch (error) {
        // Enhanced error logging
        console.error('Error while querying the database:');
        console.error('Event Name:', eventName);
        console.error('Query:', `
            SELECT 
                [EventID],
                [ModelID],
                [EventName],
                [CreatedOn],
                [CreatedBy],
                [UpdatedOn],
                [UpdatedBy],
                [IsActive]
            FROM Tbl_Events
            WHERE EventName = ?
        `);
        console.error('Query Parameters:', [eventName]);
        console.error('Detailed Error:', error.message);
        console.error('Stack Trace:', error.stack);

        res.status(500).json({
            error: 'An error occurred while fetching data from the database.',
            details: error.message,
        });
    } finally {
        if (dbConnection) {
            await dbConnection.close(); // Ensure the database connection is closed
        }
    }
});

// Export the router
module.exports = router;
