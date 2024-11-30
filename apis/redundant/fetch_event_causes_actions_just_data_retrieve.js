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

// Define the GET endpoint
router.get('/', (req, res) => {
    const eventName = req.query.eventName; // Extract eventName from query parameters

    if (!eventName) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    const dataToWrite = {
        eventName,
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'), // Include a timestamp for reference
    };

    const filePath = './event_retrieved_for_processing.json';

    // Write data to JSON file
    fs.writeFile(filePath, JSON.stringify(dataToWrite, null, 2), (err) => {
        if (err) {
            console.error('Failed to write to JSON file:', err);
            return res.status(500).json({ error: 'Failed to write data to file' });
        }

        console.log('Event name saved to JSON file:', dataToWrite);
        res.status(200).json({ message: 'Event name saved successfully', data: dataToWrite });
    });
});

// Export the router
module.exports = router;
