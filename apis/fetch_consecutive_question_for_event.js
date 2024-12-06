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

// Handle GET request for /fetch_consecutive_question_for_event
router.get('/', async (req, res) => {
    const trackerCount = parseInt(req.query.trackerCount);  // Extract the tracker count
    const selectedItem = req.query.selectedItem;  // Extract the selected item

    const data = {
        trackerCount,
        selectedItem
    };

    console.log('Received data:', data);  // Log the received data for verification

    try {
        // Step 1: Connect to the database
        const dbConnection = await connectToDatabase();

        // Step 2: Fetch the EventID for the selectedItem (EventName)
        const eventResult = await dbConnection.query(
            `SELECT EventID FROM dbo.Tbl_Events_Main WHERE EventName = ?`, [selectedItem]
        );
        
        if (eventResult.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const eventId = eventResult[0].EventID;
        console.log('EventID:', eventId);

        // Step 3: Fetch ActionName for the fetched EventID, using it as the RootID
        const movingProbResult = await dbConnection.query(
            `SELECT ActionName FROM dbo.Tbl_MovingProbability WHERE RootID = ?`, [eventId]
        );

        if (movingProbResult.length === 0) {
            return res.status(404).json({ message: 'No moving probability data found for the event' });
        }

        // Step 4: Ensure there are enough action names based on trackerCount
        const actionNames = movingProbResult.map(item => item.ActionName);
        
        if (actionNames.length < trackerCount + 1) {
            return res.status(404).json({ message: 'Not enough consecutive action names for the tracker count' });
        }

        // Step 5: Select the correct ActionName based on trackerCount
        // trackerCount = 1 means return the second action (index 1), trackerCount = 2 means return the third action (index 2), etc.
        const actionNameToReturn = actionNames[trackerCount];

        console.log('Returning ActionName:', actionNameToReturn);

        // Respond with the selected action name
        res.status(200).json({
            message: 'Consecutive action name fetched successfully',
            actionName: actionNameToReturn
        });

        // Don't forget to close the DB connection
        await dbConnection.close();

    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error processing request', error: err.message });
    }
});

module.exports = router;
