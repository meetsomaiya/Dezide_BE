const express = require('express');
const fs = require('fs');
const { connectToDatabase } = require('./connect2.js');
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

router.get('/', async (req, res) => {
  const { questionName } = req.query;

  if (!questionName) {
    return res.status(400).json({ error: 'Question name is required' });
  }

  try {
    const dbConnection = await connectToDatabase();

    // Fetch QuestionID and EventID
    const query1 = `SELECT QuestionID, EventID FROM Tbl_Questions WHERE QuestionName = ?`;
    const questionsResult = await dbConnection.query(query1, [questionName]);

    if (questionsResult.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const { QuestionID, EventID } = questionsResult[0];

    // Fetch QuestionAnswers
    const query2 = `SELECT QuestionAnswer FROM Tbl_Question_Answer WHERE QuestionID = ? AND EventID = ?`;
    const answerResult = await dbConnection.query(query2, [QuestionID, EventID]);

    // Prepare response data
    const dataToWrite = {
      questionName,
      questionID: QuestionID,
      eventID: EventID,
      questionAnswers: answerResult.length > 0 
        ? answerResult.map(row => row.QuestionAnswer)
        : ["No Answer Found"]  // Modified this line
    };

    // Write to file
    fs.writeFile(path.join(__dirname, 'subquestion_retrieved.json'), JSON.stringify(dataToWrite, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        return res.status(500).json({ error: 'Failed to write to file' });
      }

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