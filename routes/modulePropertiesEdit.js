const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

const checkDbConnection = (req, res, next) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  next();
};

const { getUserRole, isAdmin } = require('../utils/helpers');

router.get('/module-properties-edit/:gameId', checkDbConnection, async (req, res) => {
  const { gameId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    console.log('Fetching game with ID:', gameId);
    const game = await db.collection('Games').findOne({ _id: new ObjectId(gameId) });
    if (!game) {
      console.error('Game not found for ID:', gameId);
      return res.status(404).send('Game not found.');
    }
    const userId = req.session.userId;
    const userRole = await getUserRole(db, userId);
    const moduleProperties = game.moduleProperties;

    const userIsAdmin = isAdmin(game, userId, userRole);

    if (!userIsAdmin) {
      return res.status(403).send('Forbidden');
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Edit Module Properties</title>
        ${res.locals.cssLink}
        <link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js"></script>
      </head>
      <body>
        <h1>Edit Module Properties</h1>
        <h2>${game.name}</h2>
        <form method="POST" action="/module-properties-edit/${gameId}">
          <h3>Properties</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><th>Property Name</th><th>Type</th><th>Action</th></tr>
            ${moduleProperties.map(prop => {
              return `<tr data-key="${prop.key}">
                <td><input type="text" name="properties[${prop.key}][label]" value="${prop.label}" placeholder="Property Name"></td>
                <td>
                  <select name="properties[${prop.key}][type]">
                    <option value="string" ${prop.type === 'string' ? 'selected' : ''}>String</option>
                    <option value="number" ${prop.type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="datetime" ${prop.type === 'datetime' ? 'selected' : ''}>Datetime</option>
                  </select>
                </td>
                <td><button type="button" onclick="removeProperty('${prop.key}')">Remove</button></td>
              </tr>`;
            }).join('')}
          </table>
          <button type="button" id="add-property-button">Add Property</button> //TODO: Implement functionality of Add Property button
          <br/>
          <input type="submit" value="Save Changes">
        </form>
        <br/><a href="/game-view">Back to Game View</a>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error("Error fetching module properties edit data:", err);
    res.status(500).send(`Error fetching module properties edit data: ${err.message}`);
  }
});

module.exports = router;