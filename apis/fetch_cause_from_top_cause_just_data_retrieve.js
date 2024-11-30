const express = require('express');
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

// Route to handle fetch_cause_from_top_cause
router.get('/', async (req, res) => {
    const { causeName } = req.query;

    if (!causeName) {
        return res.status(400).json({ message: 'Cause name is required.' });
    }

    try {
        // Define the path to the JSON file
        const filePath = './top_cause_retrieved_here.json';

        // Create a data object to write to the file
        const data = {
            causeName,
            timestamp: moment().format(), // Add a timestamp to the entry
        };

        // Write data to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        console.log(`Cause name "${causeName}" written to ${filePath}.`);
        res.json({ message: `Cause "${causeName}" retrieved and saved successfully.` });
    } catch (error) {
        console.error('Error writing to JSON file:', error);
        res.status(500).json({ message: 'Failed to save cause name.', error: error.message });
    }
});

// Export the router
module.exports = router;
