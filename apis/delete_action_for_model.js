const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');

const router = express.Router();

// Middleware setup
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

router.use(express.json());

router.post('/', async (req, res) => {
  let connection;
  try {
    const { action, model } = req.body;
    
    if (!action || !model) {
      return res.status(400).json({ error: 'Both action and model parameters are required' });
    }

    // Create the data object to be saved
    const deletionData = {
      timestamp: moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
      action,
      model,
      deleted: false,
      deletedFromChild: false
    };

    // Connect to database
    connection = await connectToDatabase();

    // 1. First fetch EventID from Tbl_Events_Main
    const eventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?`;
    const eventResults = await connection.query(eventQuery, [model]);
    
    if (eventResults.length === 0) {
      return res.status(404).json({ error: `Event not found for model: ${model}` });
    }

    const eventId = eventResults[0].EventID;
    deletionData.eventId = eventId; // Add to our log data

    // 2. Delete from Tbl_Actions
    const deleteQuery = `DELETE FROM Tbl_Actions WHERE ActionName = ? AND EventID = ?`;
    let deleteResult = await connection.query(deleteQuery, [action, eventId]);

    // Check if initial delete affected 0 rows
    if (deleteResult.count === 0) {
      // Fetch child events where ParentID = our original eventId
      const childEventsQuery = `SELECT EventID, EventName FROM Tbl_Events_Main WHERE ParentID = ?`;
      const childEvents = await connection.query(childEventsQuery, [eventId]);
      
      // Try to delete from each child event
      for (const childEvent of childEvents) {
        deleteResult = await connection.query(deleteQuery, [action, childEvent.EventID]);
        
        if (deleteResult.count > 0) {
          deletionData.deleted = true;
          deletionData.deletedFromChild = true;
          deletionData.childEventId = childEvent.EventID;
          deletionData.childEventName = childEvent.EventName;
          deletionData.rowsAffected = deleteResult.count;
          break; // Stop after first successful deletion
        }
      }
    } else {
      deletionData.deleted = true;
      deletionData.rowsAffected = deleteResult.count;
    }

    // Log the operation to file
    const filePath = path.join(__dirname, 'action_retrieved_for_deletion.json');
    fs.readFile(filePath, (err, data) => {
      let json = [];
      if (!err && data.length > 0) {
        try {
          json = JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing existing JSON:', parseError);
        }
      }
      
      json.push(deletionData);
      
      fs.writeFile(filePath, JSON.stringify(json, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error writing to file:', writeErr);
        }
      });
    });

    if (!deletionData.deleted) {
      console.log('Action not found in parent or child events:', deletionData);
      return res.status(404).json({ 
        success: false,
        message: 'Action not found in parent or child events',
        data: deletionData
      });
    }

    console.log('Action deleted successfully:', deletionData);
    res.json({ 
      success: true,
      message: deletionData.deletedFromChild ? 
        'Action deleted from child event successfully' : 
        'Action deleted from parent event successfully',
      data: deletionData
    });

  } catch (error) {
    console.error('Error in delete_action_for_model:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  } finally {
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