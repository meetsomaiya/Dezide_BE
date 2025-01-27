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

// Handle GET request to fetch question details and write to JSON
router.get('/', async (req, res) => {
  const { questionName } = req.query;  // Get the questionName from the query parameter

  if (!questionName) {
    return res.status(400).json({ error: 'Question name is required' });
  }

  try {
    // Step 1: Connect to the database
    const dbConnection = await connectToDatabase();

    // Step 2: Fetch QuestionID and EventID from Tbl_Questions
    const query1 = `SELECT QuestionID, EventID FROM Tbl_Questions WHERE QuestionName = ?`;
    const questionsResult = await dbConnection.query(query1, [questionName]);

    if (questionsResult.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const { QuestionID, EventID } = questionsResult[0];

    // Step 3: Fetch all QuestionAnswers from Tbl_Question_Answer
    const query2 = `SELECT QuestionAnswer FROM Tbl_Question_Answer WHERE QuestionID = ? AND EventID = ?`;
    const answerResult = await dbConnection.query(query2, [QuestionID, EventID]);

    if (answerResult.length === 0) {
      return res.status(404).json({ error: 'No answers found for the specified QuestionID and EventID' });
    }

    // Step 4: Prepare the data to write to the JSON file
    const dataToWrite = {
      questionName,
      questionID: QuestionID,
      eventID: EventID,
      questionAnswers: answerResult.map(row => row.QuestionAnswer)  // Iterate and fetch all answers
    };

    // Step 5: Write data to subquestion_retrieved.json
    fs.writeFile(path.join(__dirname, 'subquestion_retrieved.json'), JSON.stringify(dataToWrite, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        return res.status(500).json({ error: 'Failed to write to file' });
      }

      // Respond with success
      res.status(200).json({
        message: 'Data written to file successfully',
        data: dataToWrite
      });
    });

  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
