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
router.get('/', (req, res) => {
    const CauseName = req.query.CauseName; // Retrieve the subCauseName from query parameters

    if (!CauseName) {
        return res.status(400).json({ error: 'CauseName is required' }); // Handle missing parameter
    }

    console.log(`Received subCauseName: ${CauseName}`); // Log the received subCauseName

    // Prepare the data to write to the file
    const dataToSave = {
        CauseName,
        timestamp: moment().format(), // Add a timestamp for reference
    };

    // Write the data to a JSON file
    const filePath = './cause_retrieved_for_subcauses_fetch.json';
    fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return res.status(500).json({ error: 'Failed to write to file' });
        }

        console.log('Data successfully saved to subcause-retrieved.json');
        res.json({ success: true, message: 'Sub-cause saved successfully', data: dataToSave });
    });
});

// Export the router
module.exports = router;
