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

        // SQL query to fetch EventName and ModelID where ParentID = '0'
        const queryEvents = "SELECT DISTINCT ModelID, EventName FROM Tbl_Events_Main WHERE ParentID = '0'";
        const eventResult = await connection.query(queryEvents);

        const eventModelMap = []; // To store the complete data structure

        // Get the current date and time in Indian Standard Time
        const currentDate = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // Offset for IST in milliseconds
        const istDate = new Date(currentDate.getTime() + istOffset);
        const formattedDateTime = istDate.toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        for (const row of eventResult) {
            const { EventName, ModelID } = row;

            // Query to fetch ModelName using ModelID in Tbl_TurbineModels
            const queryModelNames = "SELECT ModelName FROM Tbl_TurbineModels WHERE ParentID = ?";
            const modelResult = await connection.query(queryModelNames, [ModelID]);

            const modelNameArray = modelResult.map(modelRow => modelRow.ModelName);

            // Add all the required fields
            eventModelMap.push({
                EventName,
                ModelNames: modelNameArray,
                language: ["us"],
                lastChange: formattedDateTime,
                lastChangeBy: "Meet Somaiya",
                published: formattedDateTime,
                createdBy: "Meet Somaiya",
                version: 1
            });
        }

        // Prepare data for JSON file
        const jsonFilePath = path.join(__dirname, 'main_table_data_back.json');
        const jsonData = JSON.stringify({ eventModelMap }, null, 4);

        // Write data to JSON file
        fs.writeFileSync(jsonFilePath, jsonData, 'utf8');

        // Close the database connection
        await connection.close();

        // Send response to client
        res.json({
            message: 'Data successfully written to main_table_data_back.json',
            eventModelMap
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
