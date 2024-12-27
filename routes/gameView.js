const express = require('express');
const { ObjectId } = require('mongodb');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

router.get('/game-view', requireLogin, async (req, res) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    const gamesCollection = db.collection('Games');
    const systemsCollection = db.collection('Systems');
    const usersCollection = db.collection('Users');

    const games = await gamesCollection.find({}).toArray();
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Games View</title>
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
        <h1>Games View</h1>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>Name</th><th>System</th><th>Administrators</th><th>Writers</th><th># Module Properties</th></tr>`;
    
    for (const game of games) {
      console.log(`Processing game: ${game.name}`);
      const system = await systemsCollection.findOne({ _id: new ObjectId(game.system) });
      console.log(`System: ${system ? system.name : 'N/A'}`);
      
      const administrators = await usersCollection.find({ _id: { $in: (game.administrators || []).map(id => new ObjectId(id)) } }).toArray();
      console.log(`Administrators: ${administrators.map(admin => admin.username).join(', ')}`);
      
      const writers = await usersCollection.find({ _id: { $in: (game.writers || []).map(id => new ObjectId(id)) } }).toArray();
      console.log(`Writers: ${writers.map(writer => writer.username).join(', ')}`);

      html += `<tr data-href="/events-view/${game._id}">
        <td>${game.name || ''}</td>
        <td>${system ? system.name : ''}</td>
        <td>${administrators.map(admin => admin.username).join('<br>') || ''}</td>
        <td>${writers.map(writer => writer.username).join('<br>') || ''}</td>
        <td>${(game.moduleProperties || []).length}</td>
      </tr>`;
    }

    html += `</table>
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
    console.error("Error fetching game view data:", err);
    res.send("Error fetching game view data.");
  }
});

module.exports = router;