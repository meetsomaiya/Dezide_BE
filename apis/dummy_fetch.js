const express = require('express');
const { connectToDatabase } = require('./connect2.js'); // Assuming this is your database connection
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

// Define the GET endpoint for fetching event hierarchy for EventID 102
router.get('/', async (req, res) => {
    let dbConnection;
    try {
        // Connect to the database
        dbConnection = await connectToDatabase();

        // Define the query and parameters
        const eventHierarchyQuery = `
            EXEC Usp_GetEventHierarchy ?
        `;
        const eventHierarchyParams = [102]; // Using EventID 102 as the parameter

        // Log the query and parameters
        console.log('Executing SQL query:', eventHierarchyQuery);
        console.log('With parameters:', eventHierarchyParams);

        // Execute the query
        const eventHierarchyResults = await dbConnection.query(eventHierarchyQuery, eventHierarchyParams);

        // Send the raw response from the stored procedure back to the client
        res.status(200).json({
            message: 'Event hierarchy data retrieved successfully for EventID 102',
            data: eventHierarchyResults, // Directly send the raw response
        });

    } catch (error) {
        console.error('Error while querying the database:', error);
        res.status(500).json({
            error: 'An error occurred while fetching event hierarchy data.',
            details: error.message,
        });
    } finally {
        if (dbConnection) {
            await dbConnection.close();
        }
    }
});

// Export the router
module.exports = router;
