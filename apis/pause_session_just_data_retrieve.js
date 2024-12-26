const express = require('express');
const fs = require('fs'); // File system module to work with files
const moment = require('moment-timezone'); // For working with timezones

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

// Route: Handle POST request for pause session
router.post('/', async (req, res) => {
    try {
        // Retrieve the JSON payload from the request body
        const payload = req.body;

        // Log payload to the console for debugging
        console.log('Received POST payload:', payload);

        // Validate the required fields (if needed)
        if (!payload.model_name || !payload.session_id || !payload.time || !payload.steps) {
            return res.status(400).json({ message: 'Missing required fields in the request body.' });
        }

        // Write the data object to a JSON file
        const filePath = './pause_session_data_retrieve.json';
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

        // Log success and send a response
        console.log('Data successfully written to file:', filePath);
        res.status(200).json({ message: 'Pause session data received and saved.', data: payload });
    } catch (error) {
        console.error('Error handling pause session:', error);
        res.status(500).json({ message: 'An error occurred while handling the pause session.', error: error.message });
    }
});

// Export the router
module.exports = router;
