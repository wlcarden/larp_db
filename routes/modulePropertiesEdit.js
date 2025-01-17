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

const { formatDate, getUserRole, isAdmin, isAuthor } = require('../utils/helpers');

router.get('/module-properties-edit/:moduleId', checkDbConnection, async (req, res) => {
  const { moduleId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    const module = await db.collection('Modules').findOne({ _id: new ObjectId(moduleId) });
    if (!module) {
      return res.status(404).send('Module not found.');
    }
    const userId = req.session.userId;
    const event = await db.collection('Events').findOne({ _id: new ObjectId(module.eventId) });
    const game = await db.collection('Games').findOne({ _id: new ObjectId(event.gameId) });
    const author = await db.collection('Users').findOne({ _id: new ObjectId(module.writerId) });
    const userRole = await getUserRole(db, userId);
    const authorName = author ? author.name : 'Unknown User';
    const moduleProperties = game.moduleProperties;

    const userIsAdmin = isAdmin(game, userId, userRole);
    const userIsAuthor = isAuthor(module, userId);

    if (!userIsAdmin && !userIsAuthor) {
      return res.status(403).send('Forbidden');
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Edit \
        ${module.name}</title>
        ${res.locals.cssLink}
      </head>
      <body>
        <h1>Edit Module Properties</h1>
        <h2>${module.name} (${authorName})</h2>
        <h3>${game.name} - ${event.name}</h3>
        <form method="POST" action="/module-properties-edit/${moduleId}">
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><th>Start Time</th><td><input type="datetime-local" name="startTime" value="${new Date(module.startTime).toISOString().slice(0, 16)}"></td></tr>
            <tr><th>Duration (h)</th><td><input type="number" name="duration" value="${module.duration}"></td></tr>
          </table>
          <hr>
          <h3>Summary</h3>
          <textarea name="summary" rows="4" cols="50">${module.summary}</textarea>
          <hr>
          <h3>Properties</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            ${Object.entries(module.properties).map(([key, value]) => {
              const property = moduleProperties.find(prop => prop.key === key);
              const label = property ? property.label : key;
              return `<tr><th>${label}</th><td><input type="text" name="properties[${key}]" value="${value}"></td></tr>`;
            }).join('')}
          </table>
          <br/>
          <input type="submit" value="Save Changes">
        </form>
        <br/><a href="/module-properties-view/${moduleId}">Back to Module View</a>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error("Error fetching module properties edit data:", err);
    res.send("Error fetching module properties edit data.");
  }
});

module.exports = router;