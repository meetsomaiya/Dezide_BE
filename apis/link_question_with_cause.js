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

// Path to the JSON file
const MAPPING_FILE_PATH = path.join(__dirname, 'question_mapping_with_cause.json');

// Function to log queries with parameters
function logQuery(query, params) {
  console.log('Executing query:', query);
  console.log('With parameters:', params);
}

// Modified function to find EventID by hierarchy
async function findEventIdInHierarchy(connection, parentId, targetEventName) {
  try {
    // First, get all child events of the current parentId
    const query = `
      SELECT EventID, ParentID, EventName 
      FROM Tbl_Events_Main 
      WHERE ParentID = ?
    `;
    logQuery(query, [parentId]);
    const results = await connection.query(query, [parentId]);
    
    // Check if any of these directly match our target event name
    const directMatch = results.find(event => event.EventName === targetEventName);
    if (directMatch) {
      return directMatch.EventID;
    }
    
    // If no direct match, recursively search through all children
    for (const event of results) {
      const foundId = await findEventIdInHierarchy(connection, event.EventID, targetEventName);
      if (foundId) {
        return foundId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding event in hierarchy:', error);
    throw error;
  }
}

// Function to update SubEventID in both Tbl_Question_Answer and Tbl_Questions
async function updateSubEventIds(connection, eventId, questionAnswer, updatingEventId) {
  try {
    let questionId = null;
    
    // First update Tbl_Question_Answer and get QuestionID
    const getQaQuery = `
      SELECT SubEventID, QuestionID 
      FROM Tbl_Question_Answer 
      WHERE EventID = ? AND QuestionAnswer = ?
    `;
    logQuery(getQaQuery, [eventId, questionAnswer]);
    const currentQa = await connection.query(getQaQuery, [eventId, questionAnswer]);
    
    if (currentQa.length > 0) {
      // Update Tbl_Question_Answer
      let newQaSubEventIds = [];
      const currentQaSubEventIds = currentQa[0].SubEventID ? currentQa[0].SubEventID.split(',').map(id => id.trim()) : [];

      if (currentQaSubEventIds.includes(eventId.toString())) {
        newQaSubEventIds = currentQaSubEventIds.map(id => 
          id === eventId.toString() ? updatingEventId.toString() : id
        );
      } else {
        newQaSubEventIds = [...currentQaSubEventIds];
        if (!newQaSubEventIds.includes(updatingEventId.toString())) {
          newQaSubEventIds.push(updatingEventId.toString());
        }
      }

      const updateQaQuery = `
        UPDATE Tbl_Question_Answer 
        SET SubEventID = ? 
        WHERE EventID = ? AND QuestionAnswer = ?
      `;
      logQuery(updateQaQuery, [newQaSubEventIds.join(','), eventId, questionAnswer]);
      await connection.query(updateQaQuery, [newQaSubEventIds.join(','), eventId, questionAnswer]);
      
      // Store the QuestionID for updating Tbl_Questions
      questionId = currentQa[0].QuestionID;
    }

    // Update Tbl_Questions using both EventID and QuestionID
    if (questionId) {
      const getQuestionsQuery = `
        SELECT SubEventID 
        FROM Tbl_Questions 
        WHERE EventID = ? AND QuestionID = ?
      `;
      logQuery(getQuestionsQuery, [eventId, questionId]);
      const currentQuestions = await connection.query(getQuestionsQuery, [eventId, questionId]);
      
      if (currentQuestions.length > 0) {
        let newQuestionsSubEventIds = [];
        const currentQuestionsSubEventIds = currentQuestions[0].SubEventID ? 
          currentQuestions[0].SubEventID.split(',').map(id => id.trim()) : [];

        if (currentQuestionsSubEventIds.includes(eventId.toString())) {
          newQuestionsSubEventIds = currentQuestionsSubEventIds.map(id => 
            id === eventId.toString() ? updatingEventId.toString() : id
          );
        } else {
          newQuestionsSubEventIds = [...currentQuestionsSubEventIds];
          if (!newQuestionsSubEventIds.includes(updatingEventId.toString())) {
            newQuestionsSubEventIds.push(updatingEventId.toString());
          }
        }

        const updateQuestionsQuery = `
          UPDATE Tbl_Questions 
          SET SubEventID = ? 
          WHERE EventID = ? AND QuestionID = ?
        `;
        logQuery(updateQuestionsQuery, [newQuestionsSubEventIds.join(','), eventId, questionId]);
        await connection.query(updateQuestionsQuery, [newQuestionsSubEventIds.join(','), eventId, questionId]);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating SubEventIDs:', error);
    throw error;
  }
}

// Endpoint to handle question-cause mapping
router.post('/', async (req, res) => {
  let connection;
  try {
    const { causeName, actionType, questionAnswer, modalName } = req.body;
    
    console.log('\n=== NEW REQUEST RECEIVED ===');
    console.log('Received data:', { causeName, actionType, questionAnswer, modalName });
    
    // Connect to database
    console.log('\n[1] Connecting to database...');
    connection = await connectToDatabase();
    console.log('Database connection established');
    
    // Step 1: Find the initial EventID for modalName
    console.log('\n[2] Finding initial event for modal:', modalName);
    const initialEventQuery = `
      SELECT EventID 
      FROM Tbl_Events_Main 
      WHERE EventName = ?
    `;
    logQuery(initialEventQuery, [modalName]);
    const initialEventResult = await connection.query(initialEventQuery, [modalName]);
    
    if (initialEventResult.length === 0) {
      throw new Error(`No event found with name: ${modalName}`);
    }
    const initialEventId = initialEventResult[0].EventID;
    console.log(`Found initial EventID: ${initialEventId}`);
    
    // Step 2: Traverse the hierarchy to find the EventID for causeName
    console.log('\n[3] Traversing hierarchy to find cause:', causeName);
    const updatingEventId = await findEventIdInHierarchy(connection, initialEventId, causeName);
    
    if (!updatingEventId) {
      throw new Error(`Could not find event for cause: ${causeName} in hierarchy`);
    }
    console.log(`\n[4] Found updating EventID: ${updatingEventId}`);
    
    // Step 3: If actionType is 'identify', update the question answer
    if (actionType === 'identify') {
      console.log('\n[5] Action type is "identify", updating question mappings...');
      const updateSuccess = await updateSubEventIds(
        connection, 
        initialEventId, 
        questionAnswer, 
        updatingEventId
      );
      
      if (!updateSuccess) {
        throw new Error('Failed to update question answer mapping');
      }
      console.log('Successfully updated question mappings');
    }
    
    // Create the mapping object with timestamp
    const mappingEntry = {
      timestamp: moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
      modalName: modalName || 'default',
      causeName,
      actionType,
      questionAnswer,
      initialEventId,
      updatingEventId
    };
    
    // Read existing data or create new array if file doesn't exist
    console.log('\n[6] Updating mapping file...');
    let existingData = [];
    try {
      const fileContent = await fs.readFile(MAPPING_FILE_PATH, 'utf8');
      existingData = JSON.parse(fileContent);
      if (!Array.isArray(existingData)) {
        existingData = [];
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading mapping file:', error);
      }
    }
    
    // Add new entry
    existingData.push(mappingEntry);
    
    // Write back to file
    await fs.writeFile(
      MAPPING_FILE_PATH,
      JSON.stringify(existingData, null, 2),
      'utf8'
    );
    
    console.log('\n[7] Successfully saved mapping:', mappingEntry);
    
    res.status(200).json({
      success: true,
      message: 'Mapping saved successfully',
      data: mappingEntry
    });
    
  } catch (error) {
    console.error('\n[ERROR] in link_question_with_cause:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save mapping',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        console.log('\n[8] Closing database connection...');
        await connection.close();
        console.log('Database connection closed');
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
    console.log('\n=== REQUEST PROCESSING COMPLETE ===\n');
  }
});

// Export the router
module.exports = router;