const express = require('express');
const fs = require('fs');
const { connectToDatabase } = require('./connect2.js');
const path = require('path');

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

// Define the route to handle the API request
router.get('/', async (req, res) => {
  const { modalName } = req.query; // Retrieve the modalName from the query parameter

  if (!modalName) {
    return res.status(400).json({ error: "modalName is required" });
  }

  try {
    // Connect to the database
    const connection = await connectToDatabase();

    // Step 1: Fetch the EventID from Tbl_Events_Main where EventName matches modalName
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

    // Step 2: Fetch the QuestionName, QuestionTime, and QuestionCost from Tbl_Questions where EventID matches
    const questionQuery = `
      SELECT QuestionTime, QuestionCost, QuestionName
      FROM Tbl_Questions
      WHERE EventID = ?
    `;
    const questionResult = await connection.query(questionQuery, [eventID]);

    if (questionResult.length === 0) {
      return res.status(404).json({ error: "No questions found for the event" });
    }

    // Step 3: Create the response object
    const responseData = {
      modalName: modalName,
      eventID: eventID,
      questions: questionResult.map((row) => ({
        questionName: row.QuestionName,
        questionTime: row.QuestionTime,
        questionCost: row.QuestionCost,
      })),
    };

    // Write the response data to a JSON file for verification purposes
    fs.writeFileSync(
      'response_question-for_event-sent_back.json',
      JSON.stringify(responseData, null, 2)
    );

    // Send the response back to the client
    res.status(200).json(responseData);

    // Close the database connection
    await connection.close();
  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

module.exports = router;
