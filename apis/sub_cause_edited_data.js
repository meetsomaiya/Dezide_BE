const express = require('express');
const moment = require('moment-timezone'); // For working with IST timezone
const { connectToDatabase } = require('./connect2.js'); // Using the existing database connection function

const router = express.Router();

// POST endpoint to handle edited sub-cause data
router.post('/', async (req, res) => {
    const { parentCauseName, currentValue } = req.body;

    // Validate the incoming data
    if (!parentCauseName || !currentValue) {
        return res.status(400).json({ error: 'Missing required fields in the request.' });
    }

    try {
        // Step 1: Fetch eventId for the parentCauseName
        const connection = await connectToDatabase();
        
        // Query to get the EventID of the parent cause based on parentCauseName
        const getEventIdQuery = `
            SELECT EventID
            FROM Tbl_Events_Main
            WHERE EventName = ? AND IsActive = 1
        `;
        const eventIdResult = await connection.query(getEventIdQuery, [parentCauseName]);

        if (eventIdResult.length === 0) {
            return res.status(404).json({ error: 'Parent cause not found in the database.' });
        }

        // Extract the EventID of the parent cause
        const parentEventId = eventIdResult[0].EventID;

        // Step 2: Check if an event exists with the given parentCauseName and eventName
        const checkExistingEventQuery = `
            SELECT EventID, EventName
            FROM Tbl_Events_Main
            WHERE EventName = ?
        `;
        const existingEventResult = await connection.query(checkExistingEventQuery, [currentValue]);

        const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        if (existingEventResult.length > 0) {
            // If event exists, update the eventName with the currentValue
            const updateEventQuery = `
                UPDATE Tbl_Events_Main
                SET EventName = ?, UpdatedOn = ?, UpdatedBy = 40139
                WHERE EventID = ?
            `;
            await connection.query(updateEventQuery, [currentValue, currentTime, existingEventResult[0].EventID]);
            console.log('Event updated successfully.');
        } else {
            // If event doesn't exist, insert a new record
            const insertEventQuery = `
                INSERT INTO Tbl_Events_Main (ModelID, EventName, ParentID, IsParent, CreatedOn, CreatedBy, UpdatedOn, UpdatedBy, IsActive, ProbabilityPercentage)
                VALUES (1, ?, ?, 0, ?, 40139, ?, 40139, 1, 0.00)
            `;
            await connection.query(insertEventQuery, [currentValue, parentEventId, currentTime, currentTime]);
            console.log('New event inserted successfully.');
        }

        // Step 3: Update the parent event's IsParent flag if necessary
        const updateParentQuery = `
            UPDATE Tbl_Events_Main
            SET IsParent = 1
            WHERE EventID = ?
            AND IsParent = 0
        `;
        await connection.query(updateParentQuery, [parentEventId]);
        console.log('Parent event updated successfully.');

        // Close the database connection
        await connection.close();

        // Step 4: Send a success response
        res.status(200).json({ message: 'Sub-cause data processed successfully.' });

    } catch (err) {
        console.error('Error processing sub-cause data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export the router
module.exports = router;
