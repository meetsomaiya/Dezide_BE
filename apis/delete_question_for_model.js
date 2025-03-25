const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');
const router = express.Router();

// Constants
const DELETION_LOG_FILE = path.join(__dirname, 'question_retreived_for_deletion.json');
const TIMEZONE = 'America/New_York';

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// JSON parsing
router.use(express.json());

// Helper function to log deletion records
async function logDeletionRecord(record) {
  try {
    await fs.access(DELETION_LOG_FILE);
    const currentData = JSON.parse(await fs.readFile(DELETION_LOG_FILE));
    currentData.push(record);
    await fs.writeFile(DELETION_LOG_FILE, JSON.stringify(currentData, null, 2));
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(DELETION_LOG_FILE, JSON.stringify([record], null, 2));
    } else {
      throw error;
    }
  }
}

// Main deletion endpoint
router.post('/', async (req, res) => {
  let connection;
  try {
    const { questionName, modelName } = req.body;
    
    // Validate input
    if (typeof questionName !== 'string' || typeof modelName !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Both questionName and modelName must be valid strings' 
      });
    }

    // Connect to database
    connection = await connectToDatabase();
    
    // 1. Get EventID from Tbl_Events_Main
    const eventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?`;
    const eventResult = await connection.query(eventQuery, [modelName.trim()]);
    
    if (eventResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }
    
    const eventId = eventResult[0].EventID;

    // 2. Get QuestionID from Tbl_Questions
    const questionQuery = `SELECT QuestionID FROM Tbl_Questions WHERE QuestionName = ? AND EventID = ?`;
    const questionResult = await connection.query(questionQuery, [questionName.trim(), eventId]);
    
    if (questionResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found for this model'
      });
    }
    
    const questionId = questionResult[0].QuestionID;

    // 3. Delete from Tbl_Question_Answer first (foreign key constraint)
    const deleteAnswersQuery = `DELETE FROM Tbl_Question_Answer WHERE EventID = ? AND QuestionID = ?`;
    await connection.query(deleteAnswersQuery, [eventId, questionId]);
    
    // 4. Delete from Tbl_Questions
    const deleteQuestionQuery = `DELETE FROM Tbl_Questions WHERE QuestionID = ? AND EventID = ?`;
    await connection.query(deleteQuestionQuery, [questionId, eventId]);

    // Create deletion record with timestamp
    const deletionRecord = {
      questionName: questionName.trim(),
      modelName: modelName.trim(),
      eventId,
      questionId,
      deletedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
      status: 'deleted',
      ipAddress: req.ip
    };

    // Log the deletion
    await logDeletionRecord(deletionRecord);
    
    console.log('Successfully deleted:', deletionRecord);
    
    res.json({ 
      success: true, 
      message: 'Question and all related answers deleted successfully',
      data: deletionRecord
    });
    
  } catch (error) {
    console.error('Error during deletion process:', error);
    
    // Log failed attempt if we have the data
    if (req.body.questionName && req.body.modelName) {
      const failedRecord = {
        questionName: req.body.questionName.trim(),
        modelName: req.body.modelName.trim(),
        deletedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
        status: 'failed',
        error: error.message,
        ipAddress: req.ip
      };
      await logDeletionRecord(failedRecord);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete question',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Close connection if it was opened
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
});

module.exports = router;