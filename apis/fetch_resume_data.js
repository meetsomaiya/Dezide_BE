const express = require('express');
const moment = require('moment-timezone'); // For working with timezones
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

// Endpoint to fetch resume data
router.post('/', async (req, res) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'Session ID is required.' });
        }

        // Connect to the database
        const dbConnection = await connectToDatabase();

        // Query to fetch the session data
        const query = `
            SELECT 
                [time], 
                [order],
                [model_name], 
                [session_id], 
                [solved], 
                [diagnosis], 
                [performed_steps], 
                [total_steps], 
                [step_type], 
                [step_name], 
                [step_answer], 
                [step_operation], 
                [sequence_step_type], 
                [sequence_step_name], 
                [sequence_step_answer], 
                [sequence_step_operation]
            FROM Dezide_UAT.dbo.your_table_name 
            WHERE session_id = ?;
        `;

        // Execute the query with the provided session_id
        const result = await dbConnection.query(query, [session_id]);

        // Close the database connection
        await dbConnection.close();

        if (result.length === 0) {
            return res.status(404).json({ error: 'No data found for the provided session ID.' });
        }

        // Respond with the data
        res.status(200).json({
            message: 'Session data retrieved successfully.',
            data: result, // Sending back the queried data
        });
    } catch (error) {
        console.error('Error fetching session data:', error);
        res.status(500).json({ error: 'An error occurred while fetching session data.' });
    }
});

// Export the router
module.exports = router;
