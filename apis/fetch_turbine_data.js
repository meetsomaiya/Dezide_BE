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

// Route to fetch distinct ModelName
router.get('/', async (req, res) => {
    try {
        // Connect to the database
        const connection = await connectToDatabase();

        // Query to fetch distinct ModelName
        // const query = `
        //     SELECT DISTINCT [ModelName]
        //     FROM [Tbl_TurbineModels];
        // `;

        const query = `
        SELECT DISTINCT [ModelName]
        FROM [Tbl_TurbineModels]  where ModelID = '1';
    `;
        
        const result = await connection.query(query);

        // Close the connection
        await connection.close();

        // Send the result as a JSON response
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching turbine models:', error);

        // Return an error response
        res.status(500).json({
            success: false,
            message: 'Failed to fetch turbine models',
            error: error.message
        });
    }
});

// Export the router
module.exports = router;
