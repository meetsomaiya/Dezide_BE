const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
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

// Define the API endpoint for fetching event data
router.get('/', async (req, res) => {
    const causeName = req.query.CauseName; // Retrieve the CauseName from query parameters

    if (!causeName) {
        return res.status(400).json({ error: 'CauseName is required' }); // Handle missing parameter
    }

    console.log(`Received CauseName: ${causeName}`); // Log the received CauseName

    let dbConnection;

    try {
        // Connect to the database
        dbConnection = await connectToDatabase();

        // Query to fetch the EventID based on EventName
        const eventQuery = `
            SELECT [EventID]
            FROM [Tbl_Events_Main]
            WHERE [EventName] = ? AND [IsActive] = 1
        `;
        const eventResult = await dbConnection.query(eventQuery, [causeName]);

        if (eventResult.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventID = eventResult[0].EventID;
        console.log(`Retrieved EventID: ${eventID}`);

        // Query to fetch rows from Tbl_Events_Main based on ParentID (EventID)
        const childEventQuery = `
            SELECT 
                [EventID], 
                [ModelID], 
                [ParentID], 
                [IsParent], 
                [CreatedOn], 
                [UpdatedOn], 
                [IsActive], 
                [ProbabilityPercentage],
                [EventName],
                [CreatedBy],
                [UpdatedBy]
            FROM [Tbl_Events_Main]
            WHERE [ParentID] = ? AND [IsActive] = 1
        `;
        let childEventResult = await dbConnection.query(childEventQuery, [eventID]);

        console.log('Fetched Child Event Data:', childEventResult);

        // Get all unique EventIDs from the child events
        const eventIds = childEventResult.map(event => event.EventID);
        
        if (eventIds.length > 0) {
            // Query Tbl_Question_Answer to find which events have associated Q&A
            const qaQuery = `
                SELECT [SubEventID]
                FROM [Tbl_Question_Answer]
                WHERE [IsActive] = 1
            `;
            const qaResults = await dbConnection.query(qaQuery);
            
            // Create a Set of all EventIDs that have Q&A
            const eventsWithQA = new Set();
            
            qaResults.forEach(qa => {
                if (qa.SubEventID) {
                    // Split comma-separated SubEventIDs and add each to the Set
                    qa.SubEventID.split(',').forEach(id => {
                        const trimmedId = id.trim();
                        if (trimmedId) {
                            eventsWithQA.add(trimmedId);
                        }
                    });
                }
            });
            
            // Add hasQuestionAnswer flag to each event
            childEventResult = childEventResult.map(event => ({
                ...event,
                hasQuestionAnswer: eventsWithQA.has(event.EventID.toString())
            }));
        } else {
            // If no child events, ensure each has the flag set to false
            childEventResult = childEventResult.map(event => ({
                ...event,
                hasQuestionAnswer: false
            }));
        }

        // Prepare the data to save to a JSON file
        const filePath = './event_data_sent_back.json';
        fs.writeFileSync(filePath, JSON.stringify(childEventResult, null, 2), (err) => {
            if (err) {
                console.error('Error writing to file:', err);
                throw new Error('Failed to write to file');
            }
        });

        console.log('Data successfully saved to event_data_sent_back.json');

        // Respond with the fetched data
        res.json({
            success: true,
            message: 'Child event data fetched successfully',
            data: childEventResult,
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'An error occurred while fetching event data' });
    } finally {
        // Close the database connection
        if (dbConnection) {
            await dbConnection.close();
            console.log('Database connection closed.');
        }
    }
});

// Export the router
module.exports = router;