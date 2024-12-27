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

// Ensure express parses incoming JSON data in the request body
router.use(express.json()); // This middleware is required for parsing JSON requests

// POST route to handle sub-cause creation data and write it to a JSON file
router.post('/', (req, res) => {
    const payload = req.body;

    // Define the file path where the data should be saved
    const filePath = path.join(__dirname, 'subcause_data_verification.json');

    // Read the existing data from the file if it exists
    fs.readFile(filePath, 'utf8', (err, data) => {
        let existingData = [];
        if (!err && data) {
            // If the file exists and contains data, parse the existing content
            existingData = JSON.parse(data);
        }

        // Add the new payload to the data array
        existingData.push(payload);

        // Write the updated data back to the JSON file
        fs.writeFile(filePath, JSON.stringify(existingData, null, 2), (err) => {
            if (err) {
                console.error("Error writing to file:", err);
                return res.status(500).json({ message: 'Error writing data to file' });
            }

            // Send a success response
            console.log("Data successfully written to subcause_data_verification.json");
            res.status(200).json({ message: 'Data successfully received and written to file', payload });
        });
    });
});

// Export the router
module.exports = router;
