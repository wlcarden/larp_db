const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { getUserRole, isAdmin, toLocalHTMLDatetime, parseLocalDateTime } = require('../utils/helpers');

const checkDbConnection = (req, res, next) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  next();
};

router.get('/add-event/:gameId', checkDbConnection, async (req, res) => {
  const { gameId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    const game = await db.collection('Games').findOne({ _id: new ObjectId(gameId) });
    if (!game) {
      return res.status(404).send('Game not found.');
    }
    const userId = req.session.userId;
    const userRole = await getUserRole(db, userId);
    const userIsAdmin = isAdmin(game, userId, userRole);

    if (!userIsAdmin) {
      return res.status(403).send('Forbidden');
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Add New Event</title>
        ${res.locals.cssLink}
      </head>
      <body>
        <h1>Add New Event</h1>
        <form action="/add-event/${gameId}" method="post">
          <input type="hidden" name="gameId" value="${gameId}">
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><th>Event Name</th><td><input type="text" name="name" required></td></tr>
            <tr><th>Start Time</th><td><input type="datetime-local" name="startTime" required></td></tr>
            <tr><th>End Time</th><td><input type="datetime-local" name="endTime" required></td></tr>
            <tr><th>Description</th><td><textarea name="description"></textarea></td></tr>
          </table>
          <button type="submit">Create Event</button>
        </form>
        <br/><a href="/events-view/${gameId}">Back to Events</a>
      </body>
      </html>`;
    res.send(html);
  } catch (err) {
    console.error("Error loading add event page:", err);
    res.send("Error loading add event page.");
  }
});

router.post('/add-event/:gameId', checkDbConnection, async (req, res) => {
  const { gameId } = req.params;
  const { name, startTime, endTime, description } = req.body;
  try {
    const db = req.app.locals.db;
    const userId = req.session.userId;
    const userRole = await getUserRole(db, userId);
    const userIsAdmin = isAdmin({ gameId }, userId, userRole);

    if (!userIsAdmin) {
      return res.status(403).send('Forbidden');
    }

    const newEvent = {
      gameId: new ObjectId(gameId),
      name,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      description,
      createdBy: userId
    };

    await db.collection('Events').insertOne(newEvent);
    res.redirect(`/events-view/${gameId}`);
  } catch (err) {
    console.error("Error creating event:", err);
    res.send("Error creating event.");
  }
});

module.exports = router;
