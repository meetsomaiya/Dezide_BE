const express = require('express');
const fs = require('fs');
const path = require('path');
const { connectToDatabase } = require('./connect2.js');

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

// Route to handle FM retrieval and fetch relevant event names
router.get('/', async (req, res) => {
    const { fm } = req.query;

    if (!fm) {
        return res.status(400).json({ error: 'FM parameter is required' });
    }

    try {
        // Extract the range from the FM parameter (e.g., FM201-250)
        const rangeMatch = fm.match(/FM(\d+)-(\d+)/);
        if (!rangeMatch) {
            return res.status(400).json({ error: 'Invalid FM format. Use FM<number>-<number>' });
        }

        const [_, startRange, endRange] = rangeMatch.map(Number);

        // Connect to the database
        const dbConnection = await connectToDatabase();

        // Query the database for events within the specified range
        const query = `
            SELECT [EventName]
            FROM Tbl_Events_Main
            WHERE
                -- Extract numeric part of the EventName after 'FM'
                CAST(SUBSTRING([EventName], 3, PATINDEX('%[^0-9]%', SUBSTRING([EventName], 3, LEN([EventName]))) - 1) AS INT)
                BETWEEN ? AND ?
                AND parentid = 0
        `;
        
        // Execute the query with the range values as parameters
        const result = await dbConnection.query(query, [startRange, endRange]);

        // Close the database connection
        await dbConnection.close();

        // Extract event names
        const eventNames = result.map((row) => row.EventName);

        // Define the JSON file path
        const filePath = path.join(__dirname, 'fm_retrieved_on_backend.json');

        // Write the FM parameter and event names to a JSON file
        const dataToWrite = { fm, eventNames };
        fs.writeFileSync(filePath, JSON.stringify(dataToWrite, null, 2));

        console.log(`FM parameter "${fm}" and events written to file: ${filePath}`);

        // Send the event names back to the client
        res.json(eventNames);
    } catch (error) {
        console.error('Error fetching events for FM:', error);
        res.status(500).json({ error: 'Failed to fetch events for FM' });
    }
});

// Export the router
module.exports = router;
