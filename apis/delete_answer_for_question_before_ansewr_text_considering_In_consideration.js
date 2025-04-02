const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');

const router = express.Router();

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

// New endpoint for the deletion process
router.post('/', async (req, res) => {
    try {
        const { modelName, questionName } = req.body;
        
        if (!modelName || !questionName) {
            return res.status(400).json({ error: 'Both modelName and questionName are required' });
        }

        // Connect to the database
        const connection = await connectToDatabase();
        
        try {
            // Step 1: Get EventID from Tbl_Events_Main
            const eventQuery = `SELECT [EventID] FROM [Tbl_Events_Main] WHERE EventName = ?`;
            const eventResult = await connection.query(eventQuery, [modelName]);
            
            if (eventResult.length === 0) {
                return res.status(404).json({ error: 'Event not found for the given modelName' });
            }
            
            const eventId = eventResult[0].EventID;
            
            // Step 2: Get QuestionID from Tbl_Questions
            const questionQuery = `SELECT [QuestionID], [EventID], [QuestionName] FROM [Tbl_Questions] WHERE EventID = ? AND QuestionName = ?`;
            const questionResult = await connection.query(questionQuery, [eventId, questionName]);
            
            if (questionResult.length === 0) {
                return res.status(404).json({ error: 'Question not found for the given event and questionName' });
            }
            
            const questionId = questionResult[0].QuestionID;
            
            // Step 3: Delete records from Tbl_Question_Answer
            const deleteQuery = `DELETE FROM [Tbl_Question_Answer] WHERE EventID = ? AND QuestionID = ?`;
            const deleteResult = await connection.query(deleteQuery, [eventId, questionId]);
            
            // Close the connection
            await connection.close();
            
            return res.json({
                success: true,
                message: `Deleted ${deleteResult.count} record(s) from Tbl_Question_Answer`,
                details: {
                    modelName,
                    questionName,
                    eventId,
                    questionId
                }
            });
            
        } catch (dbError) {
            // Ensure connection is closed even if there's an error
            if (connection) {
                await connection.close().catch(closeErr => console.error('Error closing connection:', closeErr));
            }
            throw dbError;
        }
    } catch (error) {
        console.error('Error in /delete-answers:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

module.exports = router;