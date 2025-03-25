const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { connectToDatabase } = require('./connect2.js');

// CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// Parse JSON bodies
router.use(express.json());

// Handle OPTIONS preflight
router.options('/', (req, res) => res.status(200).end());

// POST endpoint with database operations
router.post('/', async (req, res) => {
  let connection;
  try {
    console.log('Raw request:', req.body);

    // Extract all fields
    const { oldAnswer, newAnswer, questionName, eventID, modalName } = req.body;
    
    // Validate required fields
    if (!oldAnswer || !newAnswer || !questionName || eventID === undefined || !modalName) {
      throw new Error('Missing required fields');
    }

    // Connect to database
    connection = await connectToDatabase();

    // 1. Get EventID from modalName
    const eventQuery = `SELECT [EventID] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE EventName = '${modalName}'`;
    const eventResults = await connection.query(eventQuery);
    
    if (eventResults.length === 0) {
      throw new Error(`No event found with name: ${modalName}`);
    }
    const actualEventID = eventResults[0].EventID;

    // 2. Get QuestionID from questionName and EventID
    const questionQuery = `
      SELECT [QuestionID] 
      FROM [Dezide_UAT].[dbo].[Tbl_Questions] 
      WHERE EventID = '${actualEventID}' AND QuestionName = '${questionName}'
    `;
    const questionResults = await connection.query(questionQuery);
    
    if (questionResults.length === 0) {
      throw new Error(`No question found with name: ${questionName} for event ID: ${actualEventID}`);
    }
    const questionID = questionResults[0].QuestionID;

    // 3. Update the answer in Tbl_Question_Answer
    const updateQuery = `
      UPDATE [Dezide_UAT].[dbo].[Tbl_Question_Answer] 
      SET [QuestionAnswer] = '${newAnswer}', 
          [UpdatedOn] = GETDATE()
      WHERE QuestionID = '${questionID}' 
        AND EventID = '${actualEventID}' 
        AND QuestionAnswer = '${oldAnswer}'
    `;
    const updateResult = await connection.query(updateQuery);

    // Create complete record
    const record = {
      timestamp: new Date().toISOString(),
      metadata: {
        modalName: modalName.toString(),
        source: 'answer-edit-endpoint',
        actualEventID,
        questionID
      },
      updateDetails: {
        oldAnswer: oldAnswer.toString(),
        newAnswer: newAnswer.toString(),
        questionName: questionName.toString(),
        requestedEventID: Number(eventID),
        rowsAffected: updateResult.count
      }
    };

    // Write to file
    const filePath = path.join(__dirname, 'answer_retrieved_for_updation.json');
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
    
    console.log('Update recorded:', record);
    
    res.status(200).json({
      success: true,
      message: 'Answer updated successfully',
      data: record
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      received: req.body
    });
  } finally {
    // Close connection if it was opened
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

module.exports = router;