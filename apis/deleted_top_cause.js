const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js'); // Import the connection function

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

// Ensure express parses incoming JSON data in the request body
router.use(express.json());

// Handle the "deleted_top_cause" API endpoint
router.post('/', async (req, res) => {
  const { modalName, causeName, deletionFlag } = req.body;

  if (!modalName || !causeName || deletionFlag === undefined) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const connection = await connectToDatabase();

    // Step 1: Get the root EventID for the given modalName
    const modalQuery = `
      SELECT [ModelID], [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = '0' AND EventName = ?`;
    const modalResult = await connection.query(modalQuery, [modalName]);

    if (modalResult.length === 0) {
      return res.status(404).json({ error: 'Modal name not found' });
    }

    const rootEvent = modalResult[0];
    console.log('Root event details:', rootEvent);

    // Step 2: Fetch and delete the first-level causeName
    const causeQuery = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = ? AND EventName = ?`;
    const causeResult = await connection.query(causeQuery, [rootEvent.EventID, causeName]);

    if (causeResult.length === 0) {
      return res.status(404).json({ error: 'Cause name not found under the given modal name' });
    }

    const causeEvent = causeResult[0];
    console.log('First-level cause details:', causeEvent);

    // Recursive function to delete records bottom-up
    async function deleteTree(parentId) {
      // Fetch children for the current parentId
      const childQuery = `
        SELECT [EventID], [EventName]
        FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
        WHERE ParentID = ?`;
      const childResult = await connection.query(childQuery, [parentId]);

      // Delete children recursively
      for (const child of childResult) {
        console.log(`Processing child:`, child);
        await deleteTree(child.EventID); // Recursive deletion
      }

      // Delete the current node
      const deleteQuery = `
        DELETE FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
        WHERE EventID = ?`;
      await connection.query(deleteQuery, [parentId]);
      console.log(`Deleted event:`, parentId);
    }

    // Step 3: Delete all second-level and deeper nodes
    await deleteTree(causeEvent.EventID);

    // Step 4: Delete only the first-level causeName (do not delete the root modal)
    const causeDeleteQuery = `
      DELETE FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE EventID = ?`;
    await connection.query(causeDeleteQuery, [causeEvent.EventID]);
    console.log('Deleted first-level cause:', causeEvent);

    res.status(200).json({ message: 'Hierarchy deleted successfully, root modal retained' });

    await connection.close();
  } catch (error) {
    console.error('Error during deletion:', error);
    res.status(500).json({ error: 'An error occurred during deletion' });
  }
});



// Export the router
module.exports = router;
