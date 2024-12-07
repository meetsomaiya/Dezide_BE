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

// GET route to handle the data sent from the frontend
router.get('/', (req, res) => {
    const { cause } = req.query;  // Extract the cause sent from the frontend (through query parameters)

    if (!cause) {
        return res.status(400).json({ error: "Cause name is required" });
    }

    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');  // Add timestamp to the data
    const dataToSave = {
        cause: cause,
        timestamp: timestamp
    };

    // Write the new data to the JSON file, replacing the old one
    fs.writeFile('hovering_item_retrieved.json', JSON.stringify(dataToSave, null, 2), (writeErr) => {
        if (writeErr) {
            return res.status(500).json({ error: 'Error writing to the file' });
        }

        // Send a success response
        res.status(200).json({ message: 'Data saved successfully', data: dataToSave });
    });
});

// Export the router
module.exports = router;
