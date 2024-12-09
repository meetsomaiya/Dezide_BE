const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js');
const odbc = require('odbc');

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

// Fetch Action Explanation API
router.get('/', (req, res) => {
    const actionName = req.query.actionName; // Retrieve actionName from query parameters

    if (!actionName) {
        return res.status(400).json({ error: 'actionName is required' });
    }

    // Prepare JSON data
    const actionData = {
        actionName,
        timestamp: moment().format(), // Add a timestamp for validation
    };

    // Path to the JSON file
    const filePath = './action_explanation.json';

    // Write the actionName to the JSON file
    fs.writeFile(filePath, JSON.stringify(actionData, null, 2), (err) => {
        if (err) {
            console.error('Error writing to JSON file:', err);
            return res.status(500).json({ error: 'Failed to write to JSON file' });
        }

        console.log('Action data written to file:', actionData);

        // Send a success response
        res.json({ message: 'Action explanation saved successfully', actionData });
    });
});

module.exports = router;
