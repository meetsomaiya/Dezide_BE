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
        const eventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?`;
        const eventResult = await dbConnection.query(eventQuery, [cause]);

        if (eventResult.length === 0) {
            return res.status(404).json({ error: "Event not found for the provided cause" });
        }

        const eventId = eventResult[0].EventID;

        // Step 2: Get ActionName from Tbl_Actions where EventID matches
        const actionQuery = `SELECT ActionName FROM Tbl_Actions WHERE EventID = ?`;
        const actionResult = await dbConnection.query(actionQuery, [eventId]);

        const actions = actionResult.map(action => action.ActionName);

        // Step 3: Get QuestionNames from Tbl_Questions where SubEventID contains EventID
        const questionQuery = `SELECT SubEventID, QuestionName FROM Tbl_Questions`;
        const questionResult = await dbConnection.query(questionQuery);

        const questions = [];
        questionResult.forEach(question => {
            const subEventIds = question.SubEventID.split(',');
            if (subEventIds.includes(eventId.toString())) {
                questions.push(question.QuestionName);
            }
        });

        // Step 4: Get QuestionAnswers from Tbl_Question_Answer where SubEventID contains EventID
        const answerQuery = `SELECT SubEventID, QuestionAnswer FROM Tbl_Question_Answer`;
        const answerResult = await dbConnection.query(answerQuery);

        const questionAnswers = [];
        answerResult.forEach(answer => {
            const subEventIds = answer.SubEventID.split(',');
            if (subEventIds.includes(eventId.toString())) {
                questionAnswers.push(answer.QuestionAnswer);
            }
        });

        // Construct the final object
        const responseData = {
            cause: cause,
            eventId: eventId,
            actions: actions,
            questions: questions,
            questionAnswers: questionAnswers,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        // Step 5: Save the response data into hovering_topcause.json
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
