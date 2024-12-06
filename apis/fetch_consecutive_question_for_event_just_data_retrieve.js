const express = require('express');
const fs = require('fs');
const path = require('path');
const { connectToDatabase } = require('./connect2.js'); // Assuming you're still using DB connection if needed

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

// Handle GET request for /fetch_consecutive_question_for_event
router.get('/', (req, res) => {
    const trackerCount = req.query.trackerCount;  // Extract the tracker count
    const selectedItem = req.query.selectedItem;  // Extract the selected item

    // Create an object with the received data
    const data = {
        trackerCount,
        selectedItem
    };

    console.log('Received data:', data);  // Log the received data for verification

    // Path to the JSON file where data will be saved
    const filePath = path.join(__dirname, 'consecutve_data_get-retireveal.json');

    console.log('File path:', filePath);  // Log the full path for debugging

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File does not exist, creating a new file.');
            // If the file doesn't exist, create an empty file
            fs.writeFile(filePath, JSON.stringify([]), 'utf8', (writeError) => {
                if (writeError) {
                    console.error('Error creating file:', writeError);
                    return res.status(500).json({ message: 'Error creating new data file' });
                }
                // Proceed with adding data after file is created
                handleDataSave(filePath, data, res);
            });
        } else {
            // If the file exists, read and save the data
            handleDataSave(filePath, data, res);
        }
    });
});

// Helper function to handle reading, updating, and saving the data
const handleDataSave = (filePath, data, res) => {
    // Read the existing data in the JSON file
    fs.readFile(filePath, 'utf8', (err, existingData) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ message: 'Error reading data file' });
        }

        let jsonData = [];
        try {
            jsonData = existingData ? JSON.parse(existingData) : [];  // Parse existing JSON data or initialize as an empty array
        } catch (parseError) {
            console.error('Error parsing existing JSON:', parseError);
        }

        // Add the new data to the array
        jsonData.push(data);

        // Write the updated data back to the file
        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeError) => {
            if (writeError) {
                console.error('Error writing to file:', writeError);
                return res.status(500).json({ message: 'Error saving data to file' });
            }

            // Respond with a success message
            res.status(200).json({
                message: 'Data received and saved successfully',
                data: data
            });
        });
    });
};

// Export the router
module.exports = router;
