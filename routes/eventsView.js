const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

router.get('/events-view/:gameId', async (req, res) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  const { gameId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    const eventsCollection = db.collection('Events');
    const events = await eventsCollection.find({ gameId: new ObjectId(gameId) }).toArray();
    const game = await db.collection('Games').findOne({ _id: new ObjectId(gameId) });
    const gameName = game ? game.name : 'Unknown Game';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${gameName} - Events</title>
        ${res.locals.cssLink}
        <style>
          tr[data-href] {
            cursor: pointer;
          }
          tr[data-href]:hover {
            background-color: #f0f0f0;
          }
        </style>
      </head>
      <body>
        <h1>${gameName} - Events</h1>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>Name</th><th>Starts</th><th>Ends</th><th>Description</th><th>Modules</th></tr>`;
    
    for (const event of events) {
      const moduleCount = await db.collection('Modules').countDocuments({ eventId: event._id });
      const formatDate = (date) => {
        const options = { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true };
        return new Date(date).toLocaleString('en-US', options);
      };

      html += `<tr data-href="/modules-view/${event._id}">
        <td>${event.name || ''}</td>
        <td>${event.startTime ? formatDate(event.startTime) : ''}</td>
        <td>${event.endTime ? formatDate(event.endTime) : ''}</td>
        <td>${event.description || ''}</td>
        <td>${moduleCount}</td>
      </tr>`;
    }

    html += `</table><br/><a href="/game-view">Back to Games</a>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const rows = document.querySelectorAll('tr[data-href]');
          rows.forEach(row => {
            row.addEventListener('click', () => {
              window.location.href = row.dataset.href;
            });
          });
        });
      </script>
      </body>
      </html>`;
    res.send(html);
  } catch (err) {
    console.error("Error fetching events view data:", err);
    res.send("Error fetching events view data.");
  }
});

module.exports = router;