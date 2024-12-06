const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Database connection

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

router.get('/', async (req, res) => {
    try {
        const { turbineModel } = req.query; // Retrieve turbineModel from query parameters

        if (!turbineModel) {
            return res.status(400).json({ success: false, message: 'TurbineModel is required' });
        }

        // Step 1: Connect to the database
        const dbConnection = await connectToDatabase();

        try {
            // Step 2: Retrieve the ModelID from Tbl_TurbineModels
            const modelIdQuery = `
                SELECT ModelID 
                FROM [Dezide_UAT].[dbo].[Tbl_TurbineModels] 
                WHERE ModelName = ?;
            `;
            const modelIdResult = await dbConnection.query(modelIdQuery, [turbineModel]);

            if (modelIdResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ModelName not found in Tbl_TurbineModels',
                });
            }

            const modelId = modelIdResult[0].ModelID;
            console.log(`Retrieved ModelID: ${modelId}`);

            // Step 3: Retrieve EventName from Tbl_Events_Main for the given ModelID
            const eventNameQuery = `
                SELECT EventName 
                FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] 
                WHERE ParentID = '0' AND ModelID = ?;
            `;
            const eventNameResult = await dbConnection.query(eventNameQuery, [modelId]);

            if (eventNameResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No events found in Tbl_Events_Main for the given ModelID',
                });
            }

            const eventNames = eventNameResult.map(row => row.EventName);

            // Step 4: Respond with the retrieved event names
            res.status(200).json({
                success: true,
                data: eventNames,
            });
        } finally {
            // Close the database connection
            await dbConnection.close();
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request',
            error,
        });
    }
});

// Export the router
module.exports = router;
