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

// Route: Handle POST request for pause session
router.post('/', async (req, res) => {
    const payload = req.body; // Get the data from the request body

    try {
        // Validate the required fields
        if (!payload.model_name || !payload.session_id || !payload.time || !Array.isArray(payload.steps)) {
            return res.status(400).json({ message: 'Missing or invalid required fields in the request body.' });
        }

        // Convert the time to Asia/Kolkata timezone and format it as SQL-compatible datetime
        const formattedTime = moment(payload.time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        // Connect to the database
        const connection = await connectToDatabase();

        for (const step of payload.steps) {
            const query = `
                INSERT INTO [Dezide_UAT].[dbo].[session_info] (
                    model_name,
                    session_id,
                    time,
                    solved,
                    diagnosis,
                    performed_steps,
                    total_steps,
                    step_type,
                    step_name,
                    step_answer,
                    step_operation,
                    [order],
                    sequence_step_type,
                    sequence_step_name,
                    sequence_step_answer,
                    sequence_step_operation
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `;

            // Prepare and validate values for the query
            const values = [
                payload.model_name || null,               // model_name (varchar)
                payload.session_id || null,               // session_id (varchar)
                formattedTime,                            // time (datetime)
                payload.solved ? String(payload.solved) : null,             // solved (varchar)
                payload.diagnosis || null,                // diagnosis (varchar)
                payload.steps.length ? String(payload.steps.length) : null, // performed_steps (varchar)
                payload.steps.length ? String(payload.steps.length) : null, // total_steps (varchar)
                step.step_type || null,                   // step_type (varchar)
                step.step_name || null,                   // step_name (varchar)
                step.step_answer || null,                 // step_answer (varchar)
                step.step_operation || null,              // step_operation (varchar)
                step.order ? String(step.order) : null,   // order (varchar)
                step.sequence_step_type || null,          // sequence_step_type (varchar)
                step.sequence_step_name || null,          // sequence_step_name (varchar)
                step.sequence_step_answer || null,        // sequence_step_answer (varchar)
                step.sequence_step_operation || null      // sequence_step_operation (varchar)
            ];

            // Execute the query
            await connection.query(query, values);
        }

        // Close the database connection
        await connection.close();

        // Log success and send a response
        console.log('Data successfully inserted into the database.');
        res.status(200).json({ message: 'Pause session data inserted into the database.' });
    } catch (error) {
        console.error('Error handling pause session:', error);
        res.status(500).json({ message: 'An error occurred while handling the pause session.', error: error.message });
    }
});

// Export the router
module.exports = router;
