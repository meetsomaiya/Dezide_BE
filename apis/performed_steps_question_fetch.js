const express = require('express');
const fs = require('fs');
const path = require('path');
const { connectToDatabase } = require('./connect2.js'); // Your DB connection function

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

// API Endpoint: Save the question into a JSON file
router.get('/', (req, res) => {
    const { question } = req.query;

    if (!question) {
        return res.status(400).json({ error: 'Question parameter is missing' });
    }

    // Define file path
    const filePath = path.join(__dirname, 'question_retrieved_for_consecutive_click_fetch.json');

    // Prepare data to save
    const questionData = {
        question: question,
        timestamp: new Date().toISOString(),
    };

    // Write to JSON file (overwrite or append logic)
    fs.writeFile(filePath, JSON.stringify(questionData, null, 2), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return res.status(500).json({ error: 'Failed to save question' });
        }

        console.log('Question saved:', questionData);
        res.status(200).json({ success: true, message: 'Question saved successfully', data: questionData });
    });
});

// Export the router
module.exports = router;
