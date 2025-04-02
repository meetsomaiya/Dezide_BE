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
    const eventName = req.query.eventName;

    if (!eventName) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    let dbConnection;
    try {
        dbConnection = await connectToDatabase();

        // Fetch the main event data
        const mainEventQuery = `
            SELECT 
                [EventID],
                [ModelID],
                [ParentID],
                [IsParent],
                [CreatedOn],
                [UpdatedOn],
                [IsActive],
                [CreatedBy],
                [UpdatedBy],
                [EventName]
            FROM Tbl_Events_Main
            WHERE EventName = ?
        `;
        const mainEventParams = [eventName];
        const mainEventResults = await dbConnection.query(mainEventQuery, mainEventParams);

        if (mainEventResults.length === 0) {
            return res.status(404).json({ message: 'No data found for the given event name.' });
        }

        const mainData = mainEventResults[0];

        // Fetch top causes using ParentID
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
                [CreatedBy],
                [UpdatedBy],
                [EventName]
            FROM Tbl_Events_Main
            WHERE ParentID = ?
        `;
        const topCausesParams = [mainData.EventID];
        const topCausesResults = await dbConnection.query(topCausesQuery, topCausesParams);

        // Process top causes sequentially
        const tblTopCauseData = [];
        for (const cause of topCausesResults) {
            const internalCheckQuery = `
                SELECT COUNT(1) AS InternalCount
                FROM Tbl_Events_Main
                WHERE ParentID = ?
            `;
            const internalCheckParams = [cause.EventID];
            const internalCheckResults = await dbConnection.query(internalCheckQuery, internalCheckParams);

            const hasInternalData = internalCheckResults[0].InternalCount > 0;

            tblTopCauseData.push({
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
                internalCause: hasInternalData, // Add internalCause property
            });
        }

        // Fetch event hierarchy using stored procedure
        const eventHierarchyQuery = `EXEC Usp_GetEventHierarchy ?`;
        const eventHierarchyParams = [mainData.EventID];
        const eventHierarchyResults = await dbConnection.query(eventHierarchyQuery, eventHierarchyParams);

        const eventObject = eventHierarchyResults
            .filter(item => item.ActionName !== null)
            .map(item => ({
                EventID: item.EventID,
                RootID: item.RootID,
                EventName: item.EventName,
                ProbabilityPercentage: item.ProbabilityPercentage,
                IsParent: item.IsParent,
                ParentID: item.ParentID,
                ActionID: item.ActionID,
                ActionName: item.ActionName,
                ActionTime: item.ActionTime,
                ActionCost: item.ActionCost,
                Level: item.Level,
            }));

        // Prepare the response data
        const dataToWrite = {
            eventName,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            mainData,
            tblTopCauseData,
            eventObject,
        };

        const filePath = './events_data_sent_back.json';
        await fs.promises.writeFile(filePath, JSON.stringify(dataToWrite, null, 2));

        console.log('Event data saved to JSON file:', dataToWrite);

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
