const express = require('express');
const { connectToDatabase } = require('./connect2.js');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones

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

// Define the GET endpoint
router.get('/', async (req, res) => {
    const eventName = req.query.eventName; // Extract eventName from query parameters

    if (!eventName) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    let dbConnection;
    try {
        // Connect to the database
        dbConnection = await connectToDatabase();

        // Query to fetch the main event data
        const mainEventQuery = `
            SELECT 
                [EventID],
                [ModelID],
                [ParentID],
                [IsParent],
                [CreatedOn],
                [UpdatedOn],
                [IsActive],
                [EventName],
                [CreatedBy],
                [UpdatedBy]
            FROM Tbl_Events_Main
            WHERE EventName = ?
        `;
        const mainEventParams = [eventName];
        const mainEventResults = await dbConnection.query(mainEventQuery, mainEventParams);

        if (mainEventResults.length === 0) {
            return res.status(404).json({ message: 'No data found for the given event name.' });
        }

        // Extract the single result into mainData
        const mainData = {
            EventID: mainEventResults[0].EventID,
            ModelID: mainEventResults[0].ModelID,
            ParentID: mainEventResults[0].ParentID,
            IsParent: mainEventResults[0].IsParent,
            CreatedOn: mainEventResults[0].CreatedOn,
            UpdatedOn: mainEventResults[0].UpdatedOn,
            IsActive: mainEventResults[0].IsActive,
            EventName: mainEventResults[0].EventName,
            CreatedBy: mainEventResults[0].CreatedBy,
            UpdatedBy: mainEventResults[0].UpdatedBy,
        };

        // Query to fetch top causes using ParentID
        const topCausesQuery = `
            SELECT 
                [EventID],
                [ModelID],
                [ParentID],
                [IsParent],
                [CreatedOn],
                [UpdatedOn],
                [IsActive],
                [ProbabilityPercentage],
                [EventName],
                [CreatedBy],
                [UpdatedBy]
            FROM Tbl_Events_Main
            WHERE ParentID = ?
        `;
        const topCausesParams = [mainData.EventID];
        const topCausesResults = await dbConnection.query(topCausesQuery, topCausesParams);

        const tblTopCauseData = topCausesResults.map(cause => ({
            EventID: cause.EventID,
            ModelID: cause.ModelID,
            ParentID: cause.ParentID,
            IsParent: cause.IsParent,
            CreatedOn: cause.CreatedOn,
            UpdatedOn: cause.UpdatedOn,
            IsActive: cause.IsActive,
            TopCauseName: cause.EventName,
            ProbabilityPercentage: cause.ProbabilityPercentage,
            CreatedBy: cause.CreatedBy,
            UpdatedBy: cause.UpdatedBy,
        }));

        // Combine all EventIDs from mainData and tblTopCauseData
        const allEventIDs = [
            mainData.EventID,
            ...tblTopCauseData.map(cause => cause.EventID),
        ];

        // Fetch Tbl_Actions data for all EventIDs
        const actionsQuery = `
            SELECT 
                [ActionID],
                [EventID],
                [ActionTime],
                [ActionCost],
                [CreatedOn],
                [UpdatedOn],
                [IsActive],
                [CreatedBy],
                [UpdatedBy],
                [ActionName]
            FROM Tbl_Actions
            WHERE EventID IN (${allEventIDs.map(() => '?').join(',')})
        `;
        const actionsParams = allEventIDs;
        const actionsResults = await dbConnection.query(actionsQuery, actionsParams);

        const eventObject = actionsResults.map(action => ({
            ActionID: action.ActionID,
            EventID: action.EventID,
            ActionTime: action.ActionTime,
            ActionCost: action.ActionCost,
            CreatedOn: action.CreatedOn,
            UpdatedOn: action.UpdatedOn,
            IsActive: action.IsActive,
            ActionName: action.ActionName,
            CreatedBy: action.CreatedBy,
            UpdatedBy: action.UpdatedBy,
        }));

        // Prepare the response data
        const dataToWrite = {
            eventName,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            mainData,
            tblTopCauseData,
            eventObject,
        };

        // Write the data to a JSON file
        const filePath = './events_data_sent_back.json';
        fs.writeFile(filePath, JSON.stringify(dataToWrite, null, 2), (err) => {
            if (err) {
                console.error('Failed to write to JSON file:', err);
                return res.status(500).json({ error: 'Failed to write data to file' });
            }

            console.log('Event data saved to JSON file:', dataToWrite);
        });

        // Send the data back in the response
        res.status(200).json({
            message: 'Data retrieved successfully',
            mainData,
            tblTopCauseData,
            eventObject,
        });

    } catch (error) {
        console.error('Error while querying the database:', error);
        res.status(500).json({
            error: 'An error occurred while fetching data from the database.',
            details: error.message,
        });
    } finally {
        if (dbConnection) {
            await dbConnection.close();
        }
    }
});

// Export the router
module.exports = router;
