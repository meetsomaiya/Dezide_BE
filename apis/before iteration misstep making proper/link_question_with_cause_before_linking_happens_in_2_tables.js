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

// Function to recursively find EventID by traversing ParentID hierarchy
async function findEventIdByHierarchy(connection, parentId, eventName) {
  try {
    const query = `
      SELECT EventID, ParentID, EventName 
      FROM Tbl_Events_Main 
      WHERE ParentID = ? AND EventName = ?
    `;
    const result = await connection.query(query, [parentId, eventName]);
    
    if (result.length > 0) {
      return result[0].EventID;
    }
    return null;
  } catch (error) {
    console.error('Error finding event in hierarchy:', error);
    throw error;
  }
}

// Function to update SubEventID in Tbl_Question_Answer
// Function to update SubEventID in Tbl_Question_Answer
async function updateSubEventId(connection, eventId, questionAnswer, updatingEventId) {
  try {
    // First get the current SubEventID
    const getQuery = `
      SELECT SubEventID 
      FROM Tbl_Question_Answer 
      WHERE EventID = ? AND QuestionAnswer = ?
    `;
    const current = await connection.query(getQuery, [eventId, questionAnswer]);
    
    if (current.length === 0) {
      console.log('No matching question answer found');
      return false;
    }

    let newSubEventIds = [];
    const currentSubEventIds = current[0].SubEventID ? current[0].SubEventID.split(',').map(id => id.trim()) : [];

    if (currentSubEventIds.includes(eventId.toString())) {
      // Replace the original EventID with updatingEventId
      newSubEventIds = currentSubEventIds.map(id => 
        id === eventId.toString() ? updatingEventId.toString() : id
      );
    } else {
      // Add the updatingEventId to the existing ones, but only if it's not already present
      newSubEventIds = [...currentSubEventIds];
      if (!newSubEventIds.includes(updatingEventId.toString())) {
        newSubEventIds.push(updatingEventId.toString());
      }
    }

    // Update the record
    const updateQuery = `
      UPDATE Tbl_Question_Answer 
      SET SubEventID = ? 
      WHERE EventID = ? AND QuestionAnswer = ?
    `;
    await connection.query(updateQuery, [newSubEventIds.join(','), eventId, questionAnswer]);
    
    return true;
  } catch (error) {
    console.error('Error updating SubEventID:', error);
    throw error;
  }
}

// Endpoint to handle question-cause mapping
router.post('/', async (req, res) => {
  let connection;
  try {
    const { causeName, actionType, questionAnswer, modalName } = req.body;
    
    // Log the received data
    console.log('Received data:', { causeName, actionType, questionAnswer, modalName });
    
    // Connect to database
    connection = await connectToDatabase();
    
    // Step 1: Find the initial EventID for modalName
    const initialEventQuery = `
      SELECT EventID 
      FROM Tbl_Events_Main 
      WHERE EventName = ?
    `;
    const initialEventResult = await connection.query(initialEventQuery, [modalName]);
    
    if (initialEventResult.length === 0) {
      throw new Error(`No event found with name: ${modalName}`);
    }
    const initialEventId = initialEventResult[0].EventID;
    
    // Step 2: Traverse the hierarchy to find the EventID for causeName
    let currentParentId = initialEventId;
    let updatingEventId = null;
    let hierarchyTraversed = false;
    
    // First try to find in existing hierarchy
    updatingEventId = await findEventIdByHierarchy(connection, currentParentId, causeName);
    
    // If not found, keep traversing up the hierarchy
    while (!updatingEventId && !hierarchyTraversed) {
      const parentQuery = `
        SELECT ParentID 
        FROM Tbl_Events_Main 
        WHERE EventID = ?
      `;
      const parentResult = await connection.query(parentQuery, [currentParentId]);
      
      if (parentResult.length === 0 || !parentResult[0].ParentID) {
        hierarchyTraversed = true;
      } else {
        currentParentId = parentResult[0].ParentID;
        updatingEventId = await findEventIdByHierarchy(connection, currentParentId, causeName);
      }
    }
    
    // If still not found, create new entry (implementation depends on your requirements)
    if (!updatingEventId) {
      throw new Error(`Could not find event for cause: ${causeName} in hierarchy`);
    }
    
    // Step 3: If actionType is 'identify', update the question answer
    if (actionType === 'identify') {
      const updateSuccess = await updateSubEventId(
        connection, 
        initialEventId, 
        questionAnswer, 
        updatingEventId
      );
      
      if (!updateSuccess) {
        throw new Error('Failed to update question answer mapping');
      }
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
    
    console.log('Successfully saved mapping:', mappingEntry);
    
    res.status(200).json({
      success: true,
      message: 'Mapping saved successfully',
      data: mappingEntry
    });
    
  } catch (error) {
    console.error('Error in link_question_with_cause:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save mapping',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Export the router
module.exports = router;