const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Import the connection function
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

// API endpoint to fetch preview data via GET
router.get('/', async (req, res) => {
  const { modalname } = req.query; // Retrieve the modalname from query params

  try {
    if (!modalname) {
      return res.status(400).json({ message: 'modalname is required in the query parameters.' });
    }

    const dbConnection = await connectToDatabase();

    // Step 1: Fetch main_event_id
    const mainEventQuery = `
      SELECT [EventID]
      FROM [Tbl_Events_Main]
      WHERE EventName = ?`;
    const mainEventResult = await dbConnection.query(mainEventQuery, [modalname]);

    if (!mainEventResult.length) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const main_event_id = mainEventResult[0].EventID;

    // Step 2: Fetch causes and actions, ordered by MaxProbability DESC
    const actionsQuery = `
      SELECT DISTINCT [ActionCost], [ActionTime], [MaxProbability], [MaxRatio], [EventName], [ActionName]
      FROM [Tbl_MovingProbability]
      WHERE RootID = ? AND ActionName != 'Other problem' AND EventName != 'Other problem'
      ORDER BY [MaxRatio] DESC`; // Added ORDER BY
    const actionsResult = await dbConnection.query(actionsQuery, [main_event_id]);

    const causes = actionsResult.map(item => ({
      EventName: item.EventName,
      MaxProbability: item.MaxProbability,
    }));

    const actions = actionsResult.map(item => ({
      ActionName: item.ActionName,
      ActionCost: item.ActionCost,
      ActionTime: item.ActionTime,
      MaxProbability: item.MaxProbability,
      MaxRatio: item.MaxRatio,
    }));

    // Step 3: Fetch questions
    const questionsQuery = `
      SELECT DISTINCT [QuestionID], [QuestionTime], [QuestionCost], [QuestionName]
      FROM [Tbl_Questions]
      WHERE EventID = ?`;
    const questionsResult = await dbConnection.query(questionsQuery, [main_event_id]);

    const questions = questionsResult.map(item => ({
      QuestionID: item.QuestionID,
      QuestionTime: item.QuestionTime,
      QuestionCost: item.QuestionCost,
      QuestionName: item.QuestionName,
    }));

    // Step 4: Fetch question_answers
    const questionAnswersQuery = `
      SELECT DISTINCT [AnswerID], [QuestionID], [EventID], [SubEventID], [QuestionAnswer]
      FROM [Tbl_Question_Answer]
      WHERE EventID = ?`;
    const questionAnswersResult = await dbConnection.query(questionAnswersQuery, [main_event_id]);

    const question_answers = questionAnswersResult.map(item => ({
      AnswerID: item.AnswerID,
      QuestionID: item.QuestionID,
      EventID: item.EventID,
      SubEventID: item.SubEventID,
      QuestionAnswer: item.QuestionAnswer,
    }));

    // Send the response
    const resultData = {
      causes,
      actions,
      questions,
      question_answers,
    };

    res.status(200).json({ message: 'Data fetched successfully.', data: resultData });

    // Close the database connection
    await dbConnection.close();
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ message: 'An error occurred.', error: error.message });
  }
});

// Export the router
module.exports = router;
