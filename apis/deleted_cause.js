const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js'); // Database connection function

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

router.post('/', async (req, res) => {
  const { modalName, parentCauseName, subCauseName, deletionFlag } = req.body;

  // Validate the required input fields
  if (!modalName || !subCauseName || deletionFlag === undefined) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const connection = await connectToDatabase();

    // Step 1: Fetch EventID for the given modalName
    const modalQuery = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = '0' AND EventName = ?
    `;
    const modalResult = await connection.query(modalQuery, [modalName]);
    if (modalResult.length === 0) {
      return res.status(404).json({ error: 'Modal name not found' });
    }
    const modalEventID = modalResult[0].EventID;

    // Step 2: Fetch EventID for the given parentCauseName
    const parentQuery = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = ? AND EventName = ?
    `;
    const parentResult = await connection.query(parentQuery, [modalEventID, parentCauseName]);
    if (parentResult.length === 0) {
      return res.status(404).json({ error: 'Parent cause name not found' });
    }
    const parentEventID = parentResult[0].EventID;

    // Step 3: Recursive deletion of sub-causes
    const deleteSubCauses = async (eventID) => {
      // Fetch all child events
      const childQuery = `
        SELECT [EventID], [EventName]
        FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
        WHERE ParentID = ?
      `;
      const childResults = await connection.query(childQuery, [eventID]);

      for (const child of childResults) {
        // Recursively delete child events
        await deleteSubCauses(child.EventID);

        // Log deletion
        const deletionData = {
          timestamp: moment().tz('UTC').format(),
          modalName,
          parentCauseName,
          subCauseName: child.EventName,
          deletionFlag,
        };
        logDeletionToFile(deletionData);
      }

      // Delete the current event
      const deleteQuery = `
        DELETE FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
        WHERE EventID = ?
      `;
      await connection.query(deleteQuery, [eventID]);
    };

    // Start deletion with the subCauseName event
    const subCauseQuery = `
      SELECT [EventID], [EventName]
      FROM [Dezide_UAT].[dbo].[Tbl_Events_Main]
      WHERE ParentID = ? AND EventName = ?
    `;
    const subCauseResult = await connection.query(subCauseQuery, [parentEventID, subCauseName]);
    if (subCauseResult.length > 0) {
      await deleteSubCauses(subCauseResult[0].EventID);
    }

    res.status(200).json({ message: 'Sub-cause and its dependencies deleted successfully' });
  } catch (error) {
    console.error('Error processing deletion:', error);
    res.status(500).json({ error: 'An error occurred while processing the deletion' });
  }
});

// Function to log deletion to a JSON file
function logDeletionToFile(deletionData) {
  const filePath = path.join(__dirname, 'causes_data_deletion.json');
  if (fs.existsSync(filePath)) {
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    existingData.push(deletionData);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
  } else {
    fs.writeFileSync(filePath, JSON.stringify([deletionData], null, 2), 'utf8');
  }
}

// Export the router
module.exports = router;
