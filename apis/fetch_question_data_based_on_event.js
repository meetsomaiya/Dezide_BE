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

// GET route to fetch EventID and related ActionName
router.get('/', async (req, res) => {
    const eventName = req.query.event;

    if (!eventName) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    try {
        // Connect to the database
        const dbConnection = await connectToDatabase();

        // Fetch the EventID for the provided event name
        const eventQuery = `
            SELECT [EventID]
            FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
            WHERE [EventName] = ?
        `;
        const eventResult = await dbConnection.query(eventQuery, [eventName]);

        if (eventResult.length === 0) {
            await dbConnection.close();
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventId = eventResult[0].EventID;

        // Fetch the first ActionName and ActionID using EventID as RootID
        const actionQuery = `
            SELECT TOP 1 [ActionID], [ActionName]
            FROM [Dezide_UAT].[dbo].[Tbl_MovingProbability]
            WHERE [RootID] = ?
        `;
        const actionResult = await dbConnection.query(actionQuery, [eventId]);

        if (actionResult.length === 0) {
            await dbConnection.close();
            return res.status(404).json({ error: 'No actions found for the given event' });
        }

        const actionData = {
            actionId: actionResult[0].ActionID,
            actionName: actionResult[0].ActionName,
        };

        // Define the path to the JSON file
        const filePath = path.join(__dirname, 'response_for_initial_question_sent-back.json');

        // Write the response data to the JSON file
        fs.writeFile(filePath, JSON.stringify(actionData, null, 2), (err) => {
            if (err) {
                console.error('Error writing to file:', err);
                return res.status(500).json({ error: 'Failed to save response data to file' });
            }
            console.log('Response data saved to response_for_initial_question_sent-back.json');
        });

        // Close the database connection
        await dbConnection.close();

        // Send the response data to the client
        res.status(200).json(actionData);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

// Export the router
module.exports = router;
