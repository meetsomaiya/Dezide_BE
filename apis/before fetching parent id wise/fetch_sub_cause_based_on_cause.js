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

// Define the API endpoint for fetching sub-cause data
router.get('/', async (req, res) => {
    const causeName = req.query.CauseName; // Retrieve the CauseName from query parameters

    if (!causeName) {
        return res.status(400).json({ error: 'CauseName is required' }); // Handle missing parameter
    }

    console.log(`Received CauseName: ${causeName}`); // Log the received CauseName

    let dbConnection;

    try {
        // Connect to the database
        dbConnection = await connectToDatabase();

        // Query to fetch the CauseID based on CauseName
        const causeQuery = `
            SELECT [CauseID]
            FROM [Dezide_UAT].[dbo].[Tbl_Cause]
            WHERE [CauseName] = ? AND [IsActive] = 1
        `;
        const causeResult = await dbConnection.query(causeQuery, [causeName]);

        if (causeResult.length === 0) {
            return res.status(404).json({ error: 'Cause not found' });
        }

        const causeID = causeResult[0].CauseID;
        console.log(`Retrieved CauseID: ${causeID}`);

        // Query to fetch rows from Tbl_SubCause based on CauseID
        const subCauseQuery = `
            SELECT 
                [SubCauseID],
                [CauseID],
                [ProbabilityPercentage],
                [CreatedOn],
                [CreatedBy],
                [UpdatedOn],
                [UpdatedBy],
                [IsActive],
                [TopCauseID],
                [SubCauseName] -- Place VARCHAR(MAX) columns at the end
            FROM [Dezide_UAT].[dbo].[Tbl_SubCause_temporary]
            WHERE [CauseID] = ? AND [IsActive] = 1
        `;
        const subCauseResult = await dbConnection.query(subCauseQuery, [causeID]);

        console.log('Fetched Sub-Cause Data:', subCauseResult);

        // Prepare the data to save to a JSON file
        const filePath = './subcause_data_sent_back.json';
        fs.writeFileSync(filePath, JSON.stringify(subCauseResult, null, 2), (err) => {
            if (err) {
                console.error('Error writing to file:', err);
                throw new Error('Failed to write to file');
            }
        });

        console.log('Data successfully saved to subcause_data_sent_back.json');

        // Respond with the fetched data
        res.json({
            success: true,
            message: 'Sub-cause data fetched successfully',
            data: subCauseResult,
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'An error occurred while fetching sub-cause data' });
    } finally {
        // Close the database connection
        if (dbConnection) {
            await dbConnection.close();
            console.log('Database connection closed.');
        }
    }
});

// Export the router
module.exports = router;
