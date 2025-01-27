const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Database connection function

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

// Ensure express parses incoming JSON data in the request body
router.use(express.json()); // This middleware is required for parsing JSON requests

// API to handle database queries and updates
router.post('/', async (req, res) => {
  const { modalName, previousActionname, actionname, time, money } = req.body;

  console.log('Received data:', req.body);

  try {
    const dbConnection = await connectToDatabase();

    // Query to get EventID
    const queryEventID = `
      SELECT [ModelID], [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = '0' AND EventName = ?`;
    console.log('Executing query:', queryEventID, [modalName]);

    const eventResults = await dbConnection.query(queryEventID, [modalName]);

    if (eventResults.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const { EventID } = eventResults[0];
    console.log('Fetched EventID:', EventID);

    // Query to fetch actions based on previousActionname
    let actionResults;
    if (previousActionname) {
      const queryActions = `
        SELECT [ActionID], [EventID], [ActionTime], [ActionCost], [ActionName]
        FROM [Dezide_UAT].[dbo].[Tbl_Actions]
        WHERE EventID = ? AND ActionName = ?`;
      console.log('Executing query:', queryActions, [EventID, previousActionname]);

      actionResults = await dbConnection.query(queryActions, [EventID, previousActionname]);
    } else {
      const queryActions = `
        SELECT [ActionID], [EventID], [ActionTime], [ActionCost], [ActionName]
        FROM [Dezide_UAT].[dbo].[Tbl_Actions]
        WHERE EventID = ? AND ActionName = ?`;
      console.log('Executing query:', queryActions, [EventID, actionname]);
    
      actionResults = await dbConnection.query(queryActions, [EventID, actionname]);
    }
    

    if (actionResults.length === 0) {
      return res.status(404).json({ message: 'Actions not found for the given criteria' });
    }

    const { ActionID } = actionResults[0];
    console.log('Fetched ActionID:', ActionID);

    // Validate and format inputs
    const formattedTime = time === 'N/A' || !time ? '00:00:00' : time; // Default to '00:00:00' if invalid
    const formattedMoney = isNaN(parseFloat(money)) ? 0 : parseFloat(money); // Default to 0 if invalid

    // Update query for ActionName, ActionTime, and ActionCost
    const updateQuery = `
      UPDATE [Dezide_UAT].[dbo].[Tbl_Actions]
      SET ActionName = ?, ActionTime = ?, ActionCost = ?
      WHERE ActionID = ?`;
    console.log('Executing update:', updateQuery, [actionname, formattedTime, formattedMoney, ActionID]);

    await dbConnection.query(updateQuery, [actionname, formattedTime, formattedMoney, ActionID]);

    res.status(200).json({
      message: 'Action updated successfully',
      updatedData: { actionname, time: formattedTime, money: formattedMoney },
    });

    await dbConnection.close();
  } catch (err) {
    console.error('Error handling request:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});


// Export the router
module.exports = router;
