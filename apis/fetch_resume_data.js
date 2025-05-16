const express = require('express');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');
const fs = require('fs');

const router = express.Router();

router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

router.use(express.json());

router.get('/', async (req, res) => {
    const session_id = req.query.session_id;

    if (!session_id) {
        return res.status(400).json({ error: 'Session ID is required.' });
    }

    // Write session_id to file
    fs.writeFileSync(
        'session_id_retrieved_for_resume.json',
        JSON.stringify({ session_id }, null, 4),
        'utf8'
    );

    try {
        const connection = await connectToDatabase();

        // Select 'time' first, then all other columns
        const query = `
            SELECT 
                [time],
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
                [order],
                [sequence_step_type],
                [sequence_step_name],
                [sequence_step_answer],
                [sequence_step_operation]
            FROM session_info
            WHERE session_id = ?
        `;
        const result = await connection.query(query, [session_id]);
        await connection.close();

        // Write result to file
        fs.writeFileSync(
            'response_for_sesion_id_sent_back.json',
            JSON.stringify(result, null, 4),
            'utf8'
        );

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({
            error: 'Database error',
            details: err.message,
            stack: err.stack
        });
    }
});

module.exports = router;