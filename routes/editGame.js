const express = require('express');
const { ObjectId } = require('mongodb');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

router.get('/edit-game/:id', requireLogin, async (req, res) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  const gameId = req.params.id;
  try {
    const db = req.app.locals.db;
    const gamesCollection = db.collection('Games');
    const systemsCollection = db.collection('Systems');
    const usersCollection = db.collection('Users');

    const game = await gamesCollection.findOne({ _id: new ObjectId(gameId) });
    const systems = await systemsCollection.find({}).toArray();
    const users = await usersCollection.find({}).toArray();

    if (!game) {
      return res.status(404).send('Game not found.');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Edit Game</title>
        ${res.locals.cssLink}
        <link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js"></script>
      </head>
      <body>
        <h1>Edit Game</h1>
        <form action="/edit-game/${gameId}" method="post">
          <label for="name">Name:</label><input type="text" name="name" value="${game.name}" required><br>
          <label for="system">System:</label><select name="system" id="system">
            ${systems.map(system => `<option value="${system._id}" ${system._id.equals(game.system) ? 'selected' : ''}>${system.name}</option>`).join('')}
          </select><br>
          <label for="administrator">Administrator:</label><select name="administrator" id="administrator">
            ${users.map(user => `<option value="${user._id}" ${game.administrators.includes(user._id.toString()) ? 'selected' : ''}>${user.username}</option>`).join('')}
          </select><br>
          <label for="writers">Writers:</label><select name="writers" id="writers" multiple>
            ${users.map(user => `<option value="${user._id}" ${game.writers.includes(user._id.toString()) ? 'selected' : ''}>${user.username}</option>`).join('')}
          </select><br>
          <button type="submit">Save Changes</button>
          <button type="button" onclick="window.location.href='/game-view'">Cancel</button>
        </form>
        <script>
          $(document).ready(function() {
            $('#writers').select2();
          });
        </script>
      </body>
      </html>`;
    res.send(html);
  } catch (err) {
    console.error('Error fetching game data:', err);
    res.status(500).send('Error fetching game data.');
  }
});

router.post('/edit-game/:id', requireLogin, async (req, res) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  const gameId = req.params.id;
  const { name, system, administrator } = req.body;
  try {
    const db = req.app.locals.db;
    const gamesCollection = db.collection('Games');

    const updatedGame = {
      name: name || '',
      system: system || '',
      administrators: [administrator] || [],
      writers: req.body.writers || []
    };

    await gamesCollection.updateOne({ _id: new ObjectId(gameId) }, { $set: updatedGame });
    res.redirect('/game-view');
  } catch (err) {
    console.error('Error updating game:', err);
    res.status(500).send('Error updating game.');
  }
});

module.exports = router;