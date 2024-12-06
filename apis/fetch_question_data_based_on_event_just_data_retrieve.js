const express = require('express');
const fs = require('fs');
const path = require('path');
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

// GET route to fetch event name and write it to a file
router.get('/', (req, res) => {
    const eventName = req.query.event;

    if (!eventName) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    // Create a JSON object with just the event name
    const eventData = { event: eventName };

    // Define the path to the JSON file
    const filePath = path.join(__dirname, 'question_data_event.json');

    // Write the event name to the JSON file
    fs.writeFile(filePath, JSON.stringify(eventData, null, 2), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return res.status(500).json({ error: 'Failed to save event name to file' });
        }

        console.log(`Event name '${eventName}' saved to question_data_event.json`);
        res.status(200).json({ message: 'Event name saved successfully', event: eventName });
    });
});

// Export the router
module.exports = router;
