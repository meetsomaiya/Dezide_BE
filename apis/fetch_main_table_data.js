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

        for (const row of eventResult) {
            const { EventName, ModelID } = row;

            // Query to fetch ModelName using ModelID in Tbl_TurbineModels
            const queryModelNames = "SELECT ModelName FROM Tbl_TurbineModels WHERE ParentID = ?";
            const modelResult = await connection.query(queryModelNames, [ModelID]);

            const modelNameArray = modelResult.map(modelRow => modelRow.ModelName);

            // Query to fetch additional fields for the EventName
            const queryEventDetails = `
                SELECT UpdatedOn, UpdatedBy, CreatedOn, CreatedBy 
                FROM Tbl_Events_Main 
                WHERE EventName = ?
            `;
            const eventDetailsResult = await connection.query(queryEventDetails, [EventName]);

            // Extract the required fields from the query result
            const { UpdatedOn, UpdatedBy, CreatedOn, CreatedBy } = eventDetailsResult[0];

            // Add all the required fields
            eventModelMap.push({
                EventName,
                ModelNames: modelNameArray,
                language: ["us"],
                lastChange: UpdatedOn,
                lastChangeBy: UpdatedBy,
                published: CreatedOn,
                createdBy: CreatedBy,
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