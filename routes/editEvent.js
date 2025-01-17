const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { formatDate, getUserRole, isAdmin, isAuthor, toLocalHTMLDatetime, parseLocalDateTime } = require('../utils/helpers');

const checkDbConnection = (req, res, next) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  next();
};


router.get('/edit-event/:eventId', checkDbConnection, async (req, res) => {
  const { eventId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    const event = await db.collection('Events').findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).send('Event not found.');
    }
    const userId = req.session.userId;
    const userRole = await getUserRole(db, userId);
    const userIsAdmin = isAdmin(event, userId, userRole);

    if (!userIsAdmin) {
      return res.status(403).send('Forbidden');
    }

    const defaultStartTime = toLocalHTMLDatetime(event.startTime);
    const defaultEndTime = toLocalHTMLDatetime(event.endTime);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Edit Event</title>
        ${res.locals.cssLink}
      </head>
      <body>
        <h1>Edit Event</h1>
        <form action="/edit-event/${eventId}" method="post">
          <input type="hidden" name="gameId" value="${event.gameId}">
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><th>Event Name</th><td><input type="text" name="name" value="${event.name || ''}"></td></tr>
            <tr><th>Start Time</th><td><input type="datetime-local" name="startTime"
              value="${defaultStartTime}"></td></tr>
            <tr><th>End Time</th><td><input type="datetime-local" name="endTime"
              value="${defaultEndTime}"></td></tr>
            <tr><th>Description</th><td><textarea name="description">${event.description || ''}</textarea></td></tr>
          </table>
          <button type="submit">Save Changes</button>
        </form>
        <br/><a href="/events-view/${event.gameId}">Back to Events</a>
      </body>
      </html>`;
    res.send(html);
  } catch (err) {
    console.error("Error loading event edit page:", err);
    res.send("Error loading event edit page.");
  }
});

router.post('/edit-event/:eventId', checkDbConnection, async (req, res) => {
  const { eventId } = req.params;
  const { gameId, name, startTime, endTime, description } = req.body;
  try {
    const db = req.app.locals.db;
    const event = await db.collection('Events').findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).send('Event not found.');
    }
    const userId = req.session.userId;
    const userRole = await getUserRole(db, userId);
    const userIsAdmin = isAdmin(event, userId, userRole);

    if (!userIsAdmin) {
      return res.status(403).send('Forbidden');
    }

    await db.collection('Events').updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          name,
          description,
          startTime: startTime,
          endTime: endTime
        }
      }
    );
    res.redirect(`/events-view/${gameId}`);
  } catch (err) {
    console.error("Error updating event:", err);
    res.send("Error updating event.");
  }
});

module.exports = router;