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

const { getUserRole, isAdmin, isAuthor } = require('../utils/helpers');

router.get('/edit-module/:moduleId', checkDbConnection, async (req, res) => {
  const { moduleId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    const module = await db.collection('Modules').findOne({ _id: new ObjectId(moduleId) });
    if (!module) {
      return res.status(404).send('Module not found.');
    }
    const userId = req.session.userId;
    const userRole = await getUserRole(db, userId);

    const userIsAdmin = isAdmin(module, userId, userRole);
    const userIsAuthor = isAuthor(module, userId);

    if (!userIsAdmin && !userIsAuthor) {
      return res.status(403).send('Forbidden');
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Edit Module</title>
        ${res.locals.cssLink}
      </head>
      <body>
        <h1>Edit Module</h1>
        <h2>${module.name}</h2>
        <form method="POST" action="/edit-module/${moduleId}">
          <h3>Properties</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            ${Object.entries(module.properties).map(([key, value]) => {
              return `<tr>
                <td>${key}</td>
                <td><input type="text" name="properties[${key}]" value="${value}" placeholder="Value"></td>
              </tr>`;
            }).join('')}
          </table>
          <br/>
          <input type="submit" value="Save Changes">
        </form>
        <br/><a href="/modules-view/${module.eventId}">Back to Modules</a>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error("Error fetching module edit data:", err);
    res.send("Error fetching module edit data.");
  }
});

router.post('/edit-module/:moduleId', checkDbConnection, async (req, res) => {
  const { moduleId } = req.params;
  try {
    const db = req.app.locals.db;
    const modulesCollection = db.collection('Modules');
    const module = await modulesCollection.findOne({ _id: new ObjectId(moduleId) });
    if (!module) {
      return res.status(404).send('Module not found.');
    }

    const updatedProperties = req.body.properties || {};

    await modulesCollection.updateOne({ _id: new ObjectId(moduleId) }, { $set: { properties: updatedProperties } });
    res.redirect(`/modules-view/${module.eventId}`);
  } catch (err) {
    console.error('Error updating module:', err);
    res.status(500).send('Error updating module.');
  }
});

module.exports = router;
