const express = require('express');
const moment = require('moment-timezone'); // For working with timezones
const fs = require('fs'); // For file operations
const path = require('path'); // To handle file paths
const { connectToDatabase } = require('./connect2.js'); // Database connection function

const router = express.Router(); // Define the router

// Middleware: Set up CORS
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// Middleware: Parse JSON bodies for POST requests
router.use(express.json()); // Ensure body is parsed as JSON

// Define the API endpoint
router.post('/', async (req, res) => {
    try {
        // Retrieve the session_id from the request body
        const { session_id } = req.body;

        if (!session_id) {
            // If no session_id is provided, return an error
            return res.status(400).json({ error: 'Session ID is required.' });
        }

        // Define the path to the JSON file where the session ID will be saved
        const filePath = path.join(__dirname, 'resume_session_id_retrieved.json');

        // Create the data object to save
        const dataToSave = {
            session_id,
            timestamp: moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), // Add a timestamp in Asia/Kolkata timezone
        };

        // Write the session ID and timestamp to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');

        // Send a success response
        res.status(200).json({
            message: 'Session ID retrieved and saved successfully.',
            data: dataToSave, // Optionally send the saved data back to the client
        });
    } catch (error) {
        console.error('Error handling the session ID:', error);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});

// Export the router
module.exports = router;
