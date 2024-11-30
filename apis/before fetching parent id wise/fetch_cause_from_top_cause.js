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

        // Fetch TopCauseID based on the topCauseName
        const topCauseQuery = `
            SELECT [TopCauseID]
            FROM [Dezide_UAT].[dbo].[Tbl_TopCause]
            WHERE [TopCauseName] = ? AND [IsActive] = 1
        `;
        const topCauseResult = await connection.query(topCauseQuery, [topCauseName]);

        if (topCauseResult.length === 0) {
            return res.status(404).json({ message: 'TopCauseID not found for the given topCauseName.' });
        }

        const topCauseID = topCauseResult[0].TopCauseID;

        // Fetch all related causes based on the TopCauseID
        const causeQuery = `
            SELECT 
                [CauseID], 
                [TopCauseID], 
                [ProbabilityPercentage], 
                [CreatedOn], 
                [UpdatedOn], 
                [IsActive], 
                [CreatedBy], 
                [UpdatedBy],
                [CauseName]
            FROM [Dezide_UAT].[dbo].[Tbl_Cause]
            WHERE [TopCauseID] = ? AND [IsActive] = 1
        `;
        const causeResult = await connection.query(causeQuery, [topCauseID]);

        // Prepare the response object with non-varchar fields first, followed by varchar fields
        const organizedCauseObjects = causeResult.map(cause => ({
            CauseID: cause.CauseID,                     // Non-VARCHAR
            TopCauseID: cause.TopCauseID,               // Non-VARCHAR
            ProbabilityPercentage: cause.ProbabilityPercentage, // Non-VARCHAR
            CreatedOn: cause.CreatedOn,                 // Non-VARCHAR
            UpdatedOn: cause.UpdatedOn,                 // Non-VARCHAR
            IsActive: cause.IsActive,                   // Non-VARCHAR
            CauseName: cause.CauseName,                 // VARCHAR
            CreatedBy: cause.CreatedBy,                 // VARCHAR
            UpdatedBy: cause.UpdatedBy                  // VARCHAR
        }));

        // Prepare data for JSON file and response
        const responseData = {
            topCauseName,
            topCauseID,
            causeObject: organizedCauseObjects,
            timestamp: moment().format(),
        };

        // Define the path to the JSON file
        const filePath = './top_cause_retrieved_here.json';

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
