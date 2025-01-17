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
          <button type="button" id="deleteEventButton" style="background-color:red;float:right;">Delete Event</button>
        </form>
        <br/><a href="/events-view/${event.gameId}">Back to Events</a>
      </body>
      <script>
        // Ensure the delete button is working
        console.log('Delete button script loaded.');
        document.getElementById('deleteEventButton').addEventListener('click', function() {
          if (confirm('Are you sure you want to delete this event?')) {
            fetch('/delete-event/${eventId}', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              }
            })
            .then(response => {
              if (response.ok) {
                window.location.href = '/events-view/${event.gameId}';
              } else {
                alert('Failed to delete event.');
              }
             })
            .catch(error => console.error('Error during delete request:', error));
            
          }
        });
      </script>`;
      res.send(html);
    } catch (err) {
      console.error('Error fetching event:', err);
      res.status(500).send('Error fetching event.');
    }
  });

router.delete('/delete-event/:eventId', checkDbConnection, async (req, res) => {
  const { eventId } = req.params;
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

    await db.collection('Events').deleteOne({ _id: new ObjectId(eventId) });
    res.status(200).send('Event deleted successfully.');
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).send('Error deleting event.');
  }
});

module.exports = router;