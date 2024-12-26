const express = require('express');
const { connectToDatabase } = require('./connect2'); // Import the connection function
const router = express.Router();
const fs = require('fs'); // File system module for writing the JSON file

// Set up CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// Route to handle GET request for turbine model or temperature variant
router.get('/', (req, res) => {
    const { type, value } = req.query; // Extract type and value from the request query

    if (!type || !value) {
        return res.status(400).json({ error: 'Type and value are required' });
    }

    // Create a JSON object to save
    const dataToSave = {
        type,  // model or variant
        value, // the selected model or variant
        timestamp: new Date().toISOString() // Optional: Add a timestamp for when the data was saved
    };

    // Write the data to the JSON file
    const filePath = './internal_model_or_variant.json';
    fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), (err) => {
        if (err) {
            console.error('Error writing to JSON file:', err);
            return res.status(500).json({ error: 'Failed to save data' });
        }
        console.log('Data successfully written to JSON file:', dataToSave);
        res.status(200).json({ message: 'Data saved successfully', data: dataToSave });
    });
});

module.exports = router;
