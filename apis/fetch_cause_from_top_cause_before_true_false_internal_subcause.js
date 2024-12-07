const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js');

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

// Route to handle fetch_cause_from_top_cause
router.get('/', async (req, res) => {
    const { topCauseName } = req.query;

    if (!topCauseName) {
        return res.status(400).json({ message: 'TopCause name is required.' });
    }

    let connection;
    try {
        // Connect to the database
        connection = await connectToDatabase();

        // Fetch EventID based on the topCauseName
        const eventQuery = `
            SELECT [EventID]
            FROM [Tbl_Events_Main]
            WHERE [EventName] = ? AND [IsActive] = 1
        `;
        const eventResult = await connection.query(eventQuery, [topCauseName]);

        if (eventResult.length === 0) {
            return res.status(404).json({ message: 'EventID not found for the given topCauseName.' });
        }

        const eventID = eventResult[0].EventID;

        // Fetch all related records based on the ParentID
        const relatedRecordsQuery = `
            SELECT 
                [EventID], 
                [ModelID], 
                [ParentID], 
                [IsParent], 
                [CreatedOn], 
                [UpdatedOn], 
                [IsActive], 
                [ProbabilityPercentage],
                [EventName],
                [CreatedBy],
                [UpdatedBy]
            FROM [Tbl_Events_Main]
            WHERE [ParentID] = ? AND [IsActive] = 1
        `;
        const relatedRecordsResult = await connection.query(relatedRecordsQuery, [eventID]);

        // Prepare the response object ensuring non-VARCHAR fields are placed first
        const organizedCauseObjects = relatedRecordsResult.map(record => ({
            EventID: record.EventID,                         // INT
            ModelID: record.ModelID,                         // INT
            ParentID: record.ParentID,                       // INT
            IsParent: record.IsParent,                       // BIT
            CreatedOn: record.CreatedOn,                     // DATETIME2
            UpdatedOn: record.UpdatedOn,                     // DATETIME2
            IsActive: record.IsActive,                       // BIT
            ProbabilityPercentage: record.ProbabilityPercentage, // DECIMAL
            CauseName: record.EventName,                     // VARCHAR
            CreatedBy: record.CreatedBy,                     // VARCHAR
            UpdatedBy: record.UpdatedBy                      // VARCHAR
        }));

        // Prepare data for JSON file and response
        const responseData = {
            topCauseName,
            eventID,
            causeObject: organizedCauseObjects,
            timestamp: moment().format(),
        };

        // Define the path to the JSON file
        const filePath = './event_related_data.json';

        // Write the data to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(responseData, null, 2), 'utf-8');
        console.log(`Data written to ${filePath}.`);

        // Send the data back in the response
        res.json({ message: 'Data retrieved and saved successfully.', data: responseData });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    } finally {
        // Close the database connection if it exists
        if (connection) {
            await connection.close();
        }
    }
});

// Export the router
module.exports = router;
