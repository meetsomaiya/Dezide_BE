const express = require('express');
const fs = require('fs');
const path = require('path');

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

// Route to handle FM retrieval and save it
router.get('/', (req, res) => {
    const { fm } = req.query;

    if (!fm) {
        return res.status(400).json({ error: 'FM parameter is required' });
    }

    // Define the JSON file path
    const filePath = path.join(__dirname, 'fm_retrieved_on_backend.json');

    // Write the FM parameter to a JSON file
    const dataToWrite = { fm };
    fs.writeFile(filePath, JSON.stringify(dataToWrite, null, 2), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return res.status(500).json({ error: 'Failed to save FM data' });
        }

        console.log(`FM parameter "${fm}" written to file: ${filePath}`);
    });

    // Respond back with confirmation
    res.json({ message: `FM parameter "${fm}" has been saved successfully.` });
});

// Export the router
module.exports = router;
