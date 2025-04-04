const express = require('express');
const fs = require('fs');
const { connectToDatabase } = require('./connect4.js');
const path = require('path');

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

// Define the route to handle the API request
router.get('/', async (req, res) => {
  const { modalName } = req.query;

  if (!modalName) {
    return res.status(400).json({ error: "modalName is required" });
  }

  let connection;
  try {
    connection = await connectToDatabase();

    // Step 1: Fetch the EventID from Tbl_Events_Main
    const eventQuery = `
      SELECT EventID
      FROM Tbl_Events_Main
      WHERE EventName = ?
    `;
    const eventResult = await connection.query(eventQuery, [modalName]);

    if (eventResult.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventID = eventResult[0].EventID;

    // Step 2: Fetch questions including QuestionID
    const questionQuery = `
      SELECT QuestionID, QuestionTime, QuestionCost, QuestionName
      FROM Tbl_Questions
      WHERE EventID = ?
    `;
    const questionResult = await connection.query(questionQuery, [eventID]);

    if (questionResult.length === 0) {
      return res.status(404).json({ error: "No questions found for the event" });
    }

    // Step 3: Check for answers in Tbl_Question_Answer for each question
    const questionsWithAnswerFlags = [];
    
    for (const row of questionResult) {
      const answerCheckQuery = `
        SELECT TOP 1 1 AS hasAnswer 
        FROM Tbl_Question_Answer 
        WHERE QuestionID = ?
      `;
      const answerResult = await connection.query(answerCheckQuery, [row.QuestionID]);
      
      const questionData = {
        questionName: row.QuestionName,
        questionTime: row.QuestionTime,
        questionCost: row.QuestionCost,
        hasAnswer: answerResult.length > 0 // Explicitly set true/false
      };

      questionsWithAnswerFlags.push(questionData);
    }

    // Step 4: Create the response object
    const responseData = {
      modalName: modalName,
      eventID: eventID,
      questions: questionsWithAnswerFlags,
    };

    // Write the response data to a JSON file
    fs.writeFileSync(
      'response_question-for_event-sent_back.json',
      JSON.stringify(responseData, null, 2)
    );

    // Send the response back to the client
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing the request.',
      details: error.message 
    });
  } finally {
    // Ensure connection is always closed
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
});

module.exports = router;