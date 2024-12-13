const express = require('express');
const fs = require('fs');
const path = require('path');
const { connectToDatabase } = require('./connect2.js'); // Database connection function

const router = express.Router();

// Set up CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// Route to fetch and write data to JSON file
router.get('/', async (req, res) => {
    try {
        // Establish a connection to the database
        const connection = await connectToDatabase();

        // SQL query to fetch EventName where ParentID = '0'
        const query = "SELECT EventName FROM Tbl_Events_Main WHERE ParentID = '0'";
        const result = await connection.query(query);

        // Prepare data for JSON file
        const eventData = result.map(row => row.EventName);

        const jsonFilePath = path.join(__dirname, 'main_table_data_back.json');
        const jsonData = JSON.stringify({ events: eventData }, null, 4);

        // Write data to JSON file
        fs.writeFileSync(jsonFilePath, jsonData, 'utf8');

        // Close the database connection
        await connection.close();

        // Send response to client
        res.json({ message: 'Data successfully written to main_table_data_back.json', events: eventData });
    } catch (err) {
        console.error('Error fetching EventName data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
