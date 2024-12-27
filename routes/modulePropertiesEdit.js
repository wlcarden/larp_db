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
        <title>Edit "${module.name}"</title>
        ${res.locals.cssLink}
        <style>
          .edit-mode {
            display: block;
          }
        </style>
      </head>
      <body>
        <h1>Edit ${module.name} (${authorName})</h1>
        <h2>${game.name} - ${event.name}</h2>
        <form id="edit-form" action="/module-properties-edit/${moduleId}" method="post">
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><th>Name</th><td><input class="edit-mode" type="text" name="name" value="${module.name}"></td></tr>
            <tr><th>Start Time</th><td><input class="edit-mode" type="datetime-local" name="startTime" value="${new Date(module.startTime).toISOString().slice(0, 16)}"></td></tr>
            <tr><th>Duration (h)</th><td><input class="edit-mode" type="number" step="0.1" name="duration" value="${module.duration}"></td></tr>
          </table>
          <hr>
          <h3>Summary</h3>
          <p><textarea class="edit-mode" name="summary">${module.summary}</textarea></p>`;

    for (const [key, value] of Object.entries(module.properties)) {
      const property = moduleProperties.find(prop => prop.key === key);
      const label = property ? property.label : key;
      let inputField;
      if (property.type === 'number') {
        inputField = `<input class="edit-mode" type="number" name="${key}" value="${value}">`;
      } else {
        inputField = `<input class="edit-mode" type="text" name="${key}" value="${value}">`;
      }
      html += `<h3>${label}</h3>
        <p>${inputField}</p>`;
    }

    html += `<button type="submit" class="edit-mode">Save Changes</button>
        </form>
        <br/><a href="/module-properties-view/${moduleId}">Back to View</a>
      </body>
      </html>`;
    res.send(html);
  } catch (err) {
    console.error("Error fetching module properties edit data:", err);
    res.send("Error fetching module properties edit data.");
  }
});

router.post('/module-properties-edit/:moduleId', checkDbConnection, async (req, res) => {
  const { moduleId } = req.params;
  const userId = req.session.userId;
  try {
    const db = req.app.locals.db;
    const module = await db.collection('Modules').findOne({ _id: new ObjectId(moduleId) });
    if (!module) {
      return res.status(404).send('Module not found.');
    }
    const event = await db.collection('Events').findOne({ _id: new ObjectId(module.eventId) });
    const game = await db.collection('Games').findOne({ _id: new ObjectId(event.gameId) });

    const userRole = await getUserRole(db, userId);
    const userIsAdmin = isAdmin(game, userId, userRole);
    const userIsAuthor = isAuthor(module, userId);

    if (!userIsAdmin && !userIsAuthor) {
      return res.status(403).send('Forbidden');
    }

    const updatedProperties = {};
    for (const key of Object.keys(module.properties)) {
      if (req.body[key] !== undefined) {
        updatedProperties[key] = req.body[key];
      }
    }

    const result = await db.collection('Modules').updateOne(
      { _id: new ObjectId(moduleId) },
      { $set: {
        properties: updatedProperties,
        name: req.body.name,
        summary: req.body.summary,
        duration: parseFloat(req.body.duration),
        startTime: new Date(req.body.startTime)
      } }
    );
    console.log('Update Result:', result);

    res.redirect(`/module-properties-view/${moduleId}`);
  } catch (err) {
    console.error("Error updating module properties:", err);
    res.send("Error updating module properties.");
  }
});

module.exports = router;