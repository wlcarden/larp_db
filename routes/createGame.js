const express = require('express');
const { ObjectId } = require('mongodb');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

router.get('/create-game', requireLogin, async (req, res) => {
  const db = req.app.locals.db;
  const systemsCollection = db.collection('Systems');
  const usersCollection = db.collection('Users');
  const systems = await systemsCollection.find({}).toArray();
  const users = await usersCollection.find({}).toArray();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Create New Game</title>
      ${res.locals.cssLink}
    </head>
    <body>
      <h1>Create New Game</h1>
      <form action="/create-game" method="post">
        <label for="name">Name:</label><input type="text" name="name" required><br>
        <label for="system">System:</label><select name="system" id="system">
          ${systems.map(system => `<option value="${system._id}">${system.name}</option>`).join('')}
        </select><br>
        <label for="administrator">Administrator:</label><select name="administrator" id="administrator">
          ${users.map(user => `<option value="${user._id}">${user.username}</option>`).join('')}
        </select><br>
        <button type="submit">Create Game</button>
        <button type="button" onclick="window.location.href='/game-view'">Cancel</button>
      </form>
    </body>
    </html>`;
  res.send(html);
});

router.post('/create-game', requireLogin, async (req, res) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  const { name, system, administrators, writers } = req.body;
  try {
    const db = req.app.locals.db;
    const gamesCollection = db.collection('Games');
    const newGame = {
      name: name || '',
      system: system || '',
      administrators: administrators || [],
      writers: writers || [],
      moduleProperties: [] // Empty module properties
    };
    const result = await gamesCollection.insertOne(newGame);
    res.redirect('/game-view');
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).send('Error creating game.');
  }
});

module.exports = router;