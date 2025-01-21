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

    // Build the edit form HTML
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
      <title>Edit Module</title>
      ${res.locals.cssLink}
      <style>
        body { margin:0; padding:1em; box-sizing:border-box; font-family:Arial,sans-serif; }
        .container { max-width:600px; margin:auto; }
        form div { margin-bottom:0.5em; }
        label { display:inline-block; width:130px; }
        input[type=text],
        textarea,
        input[type=datetime-local],
        input[type=number] {
          width:100%;
          padding:0.5em;
          box-sizing:border-box;
        }
        textarea {
          height:100px;
        }
        button { margin-top:1em; }
      </style>
      </head>
      <body>
      <div class="container">
      <h1>Edit Module</h1>
      <h2>${module.name}</h2>
      <form method="POST" action="/edit-module/${moduleId}">
        <div>
          <label>Name:</label>
          <input type="text" name="name" value="${module.name}" required />
        </div>
        <div>
          <label>Start Time:</label>
          <input type="datetime-local" name="startTime"
            value="${new Date(module.startTime).toISOString().slice(0, 16)}"
            required />
        </div>
        <div>
          <label>Duration (h):</label>
          <input type="number" step="0.1" name="duration" value="${module.duration}" />
        </div>
        <div>
          <label>Summary:</label>
          <textarea name="summary">${module.summary || ''}</textarea>
        </div>
        <h3>Properties</h3>
        <table border="1" cellpadding="5" cellspacing="0">
        ${Object.entries(module.properties).map(([key, value]) => {
          let inputType = 'text';
          let inputElement = `<input type="${inputType}" name="properties[${key}]" value="${value}">`;
          if (typeof value === 'number') {
            inputType = 'number';
            inputElement = `<input type="${inputType}" name="properties[${key}]" value="${value}">`;
          } else if (typeof value === 'boolean') {
            inputType = 'checkbox';
            inputElement = `<input type="${inputType}" name="properties[${key}]" ${value ? 'checked' : ''}>`;
          } else if (new Date(value) !== "Invalid Date" && !isNaN(new Date(value))) {
            inputType = 'datetime-local';
            value = new Date(value).toISOString().slice(0, 16);
            inputElement = `<input type="${inputType}" name="properties[${key}]" value="${value}">`;
          } else if (typeof value === 'string' && value.length > 50) {
            inputElement = `<textarea name="properties[${key}]">${value}</textarea>`;
          }
          return `<tr>
          <td>${key}</td>
          <td>${inputElement}</td>
          </tr>`;
        }).join('')}
        </table>
        <br/>
        <input type="submit" value="Save Changes">
      </form>
      <form method="POST" action="/delete-module/${moduleId}" style="margin-top:1em;">
        <button type="submit" style="background-color:red;color:white;">Delete Module</button>
      </form>
      <br/><a href="/modules-view/${module.eventId}">Back to Modules</a>
      </div>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error("Error fetching module properties edit data:", err);
    res.send("Error fetching module properties edit data.");
  }
});

router.post('/edit-module/:moduleId', checkDbConnection, async (req, res) => {
  const { moduleId } = req.params;
  const { name, startTime, duration, summary, properties } = req.body;
  try {
    const db = req.app.locals.db;
    const updatedProperties = {};
    for (const key in properties) {
      updatedProperties[`properties.${key}`] = properties[key];
    }
    const result = await db.collection('Modules').updateOne(
      { _id: new ObjectId(moduleId) },
      {
        $set: {
          name,
          startTime: new Date(startTime),
          duration: parseFloat(duration),
          summary,
          ...updatedProperties
        }
      }
    );
    if (result.modifiedCount === 1) {
      res.redirect(`/module-properties-view/${moduleId}`);
    } else {
      throw new Error('Failed to update module');
    }
  } catch (err) {
    console.error("Error updating module:", err);
    res.status(500).send("Error updating module.");
  }
});

// Handle delete module
router.post('/delete-module/:moduleId', checkDbConnection, async (req, res) => {
  const { moduleId } = req.params;
  try {
    const db = req.app.locals.db;
    const module = await db.collection('Modules').findOne({ _id: new ObjectId(moduleId) });
    if (!module) {
      return res.status(404).send('Module not found.');
    }
    await db.collection('Modules').deleteOne({ _id: new ObjectId(moduleId) });
    res.redirect(`/modules-view/${module.eventId}`);
  } catch (err) {
    console.error("Error deleting module:", err);
    res.status(500).send("Error deleting module.");
  }
});

module.exports = router;
