const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Set up CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// GET endpoint to retrieve and save actionName
router.get('/', (req, res) => {
    const actionName = req.query.actionName; // Retrieve the actionName from query parameters

    if (!actionName) {
        return res.status(400).json({ error: 'actionName query parameter is required.' });
    }

    // Define the JSON file path
    const jsonFilePath = path.join(__dirname, 'image_explanation_action.json');

    // Prepare the data to write
    const data = {
        actionName,
        timestamp: new Date().toISOString(), // Include a timestamp for logging
    };

    // Write data to the JSON file
    fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing to JSON file:', err);
            return res.status(500).json({ error: 'Failed to save actionName to JSON file.' });
        }

        console.log(`actionName "${actionName}" saved to file.`);
        // Respond with the saved data
        res.json({ message: 'Action name saved successfully.', data });
    });
});

module.exports = router;
