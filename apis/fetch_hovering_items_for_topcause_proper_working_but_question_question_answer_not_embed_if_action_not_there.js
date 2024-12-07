const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js');
const odbc = require('odbc');

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

// GET route to handle the data sent from the frontend
router.get('/', async (req, res) => {
    const { cause } = req.query;  // Extract the cause sent from the frontend (through query parameters)

    if (!cause) {
        return res.status(400).json({ error: "Cause name is required" });
    }

    try {
        // Connect to the database
        const dbConnection = await connectToDatabase();

        // Step 1: Get EventID from Tbl_Events_Main where EventName matches the cause
        const eventQuery = `
            SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?;
        `;
        const eventResult = await dbConnection.query(eventQuery, [cause]);

        if (eventResult.length === 0) {
            return res.status(404).json({ error: "Event not found for the provided cause" });
        }

        const eventId = eventResult[0].EventID;

        // Step 2: Get ActionName from Tbl_Actions where EventID is part of a comma-separated list
        const actionQuery = `
            SELECT ActionName FROM Tbl_Actions 
            WHERE CHARINDEX(',' + CAST(? AS VARCHAR) + ',', ',' + CAST(EventID AS VARCHAR) + ',') > 0;
        `;
        const actionResult = await dbConnection.query(actionQuery, [eventId]);

        let actions = actionResult.map(action => action.ActionName);

        // Step 3: Check Tbl_Actions and Tbl_SubActions if EventID is not present
        if (actionResult.length === 0) {
            const subActionQuery = `
                SELECT SubActionName FROM Tbl_SubActions
                WHERE CHARINDEX(',' + CAST(? AS VARCHAR) + ',', ',' + CAST(EventID AS VARCHAR) + ',') > 0;
            `;
            const subActionResult = await dbConnection.query(subActionQuery, [eventId]);

            actions = subActionResult.map(subAction => subAction.SubActionName);
        }

// Step 4: Get QuestionNames from Tbl_Questions where SubEventID contains EventID
const questionQuery = `
    SELECT SubEventID, QuestionName
    FROM Tbl_Questions
    WHERE CHARINDEX(?, CAST(SubEventID AS VARCHAR)) > 0
    AND (
        CHARINDEX(?, CAST(SubEventID AS VARCHAR)) = 1 
        OR CHARINDEX(?, CAST(SubEventID AS VARCHAR)) > 1
        OR CHARINDEX(?, CAST(SubEventID AS VARCHAR)) = LEN(CAST(SubEventID AS VARCHAR)) - LEN(REVERSE(CAST(SubEventID AS VARCHAR))) + 1
    );
`;

const questionResult = await dbConnection.query(questionQuery, [eventId, eventId, eventId, eventId]);

// Extract QuestionNames
const questions = questionResult.map(question => question.QuestionName);

// Log the results for debugging
console.log('Fetched Questions:', questions);

        // Step 5: Get QuestionAnswers from Tbl_Question_Answer where SubEventID contains EventID
// Step 5: Get QuestionAnswers from Tbl_Question_Answer where SubEventID contains EventID
const answerQuery = `
    SELECT SubEventID, QuestionAnswer
    FROM Tbl_Question_Answer
    WHERE CHARINDEX(?, CAST(SubEventID AS VARCHAR)) > 0
    AND (
        CHARINDEX(?, CAST(SubEventID AS VARCHAR)) = 1 
        OR CHARINDEX(?, CAST(SubEventID AS VARCHAR)) > 1
        OR CHARINDEX(?, CAST(SubEventID AS VARCHAR)) = LEN(CAST(SubEventID AS VARCHAR)) - LEN(REVERSE(CAST(SubEventID AS VARCHAR))) + 1
    );
`;

const answerResult = await dbConnection.query(answerQuery, [eventId, eventId, eventId, eventId]);

// Ensure we map through all rows in the result
const questionAnswers = answerResult.map(answer => answer.QuestionAnswer);

// Debugging: Log the result to check if all rows are returned
console.log('Fetched QuestionAnswers:', questionAnswers);



        // Construct the final object
        const responseData = {
            cause: cause,
            eventId: eventId,
            actions: actions,
            questions: questions,
            questionAnswers: questionAnswers,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        // Step 6: Save the response data into hovering_topcause.json
        fs.writeFile('hovering_topcause.json', JSON.stringify(responseData, null, 2), (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ error: 'Error writing to the file' });
            }

            // Send a success response
            res.status(200).json({ message: 'Data saved successfully', data: responseData });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

// Export the router
module.exports = router;
