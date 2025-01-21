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

router.get('/create-module/:eventId', checkDbConnection, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.session.userId;
  try {
    const db = req.app.locals.db;
    const event = await db.collection('Events').findOne({ _id: new ObjectId(eventId) });
    const game = await db.collection('Games').findOne({ _id: new ObjectId(event.gameId) });
    const moduleProperties = game.moduleProperties;

    const newModule = {
      eventId: new ObjectId(eventId),
      writerId: userId, // Use the user ID of the logged-in account
      name: '',
      summary: '',
      duration: 0,
      startTime: new Date(),
      properties: {}
    };

    // Initialize empty properties for each module property defined by the game
    for (const property of moduleProperties) {
      newModule.properties[property.key] = property.type === 'number' ? 0 : '';
    }

    const result = await db.collection('Modules').insertOne(newModule);

    if (result.acknowledged) {
      const newModuleId = result.insertedId;
      res.redirect(`/edit-module/${newModuleId}`);
    } else {
      console.error("No response from MongoDB on create-module.");
    }
  } catch (err) {
    console.error("Error creating new module:", err);
    res.status(500).send("Error creating new module.");
  }
});

module.exports = router;