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

const getUserRole = async (db, userId) => {
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) });
  return user ? user.role : 'user';
};

const isAdmin = (game, userId, userRole) => {
  return game.administrators.includes(userId) || userRole === 'admin';
};

const isAuthor = (module, userId) => {
  return module.writerId.toString() === userId;
};

const formatDate = (date) => {
  const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true };
  return new Date(date).toLocaleString('en-US', options);
};

router.get('/module-properties-view/:moduleId', checkDbConnection, async (req, res) => {
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
    const authorName = author ? author.displayName : 'Unknown User';
    const moduleProperties = game.moduleProperties;

    const userIsAdmin = isAdmin(game, userId, userRole);
    const userIsAuthor = isAuthor(module, userId);

    console.log(`User ID: ${userId}`);
    console.log(`Is Admin: ${userIsAdmin}`);
    console.log(`Is Author: ${userIsAuthor}`);
    console.log(`Module Name: ${module.name}`);
    console.log(`Module Start Time: ${module.startTime}`);
    console.log(`Module Duration: ${module.duration}`);
    console.log(`Module Summary: ${module.summary}`);
    console.log(`Module Properties: ${JSON.stringify(module.properties)}`);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${module.name}</title>
        ${res.locals.cssLink}
        <style>
          .edit-mode {
            display: none;
          }
        </style>
      </head>
      <body>
        <h1>${module.name} (${authorName})</h1>
        <h2>${game.name} - ${event.name}</h2>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>Start Time</th><td><span class="display-mode">${formatDate(module.startTime)}</span></td></tr>
          <tr><th>Duration (h)</th><td><span class="display-mode">${module.duration}</span></td></tr>
        </table>
        <hr>
        <h3>Summary</h3>
        <p><span class="display-mode">${module.summary}</span></p>`;

    for (const [key, value] of Object.entries(module.properties)) {
      const property = moduleProperties.find(prop => prop.key === key);
      const label = property ? property.label : key;
      html += `<h3>${label}</h3>
        <p><span class="display-mode">${value}</span></p>`;
    }

    if (userIsAdmin || userIsAuthor) {
      html += `<a href="/module-properties-edit/${moduleId}"><button id="edit-button">Edit</button></a>`;
    }

    html += `<br/><a href="/modules-view/${module.eventId}">Back to Modules</a>
      </body>
      </html>`;
    res.send(html);
  } catch (err) {
    console.error("Error fetching module properties view data:", err);
    res.send("Error fetching module properties view data.");
  }
});

module.exports = router;