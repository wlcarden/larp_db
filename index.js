//Main entry point for the web server.

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({
  secret: 'your-secret-key', //TODO: Change this to a more secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

const dbUser = 'appAdmin';
const dbPassword = 'adminPassword';
const dbHost = 'larpdb.jhapp.mongodb.net';
const dbName = 'LarpDB';

const uri = `mongodb+srv://${dbUser}:${dbPassword}@${dbHost}?retryWrites=true&w=majority`;

let db;

// Connect to MongoDB
console.log("Attempting to connect to MongoDB...");
MongoClient.connect(uri)
  .then(client => {
    db = client.db(dbName);
    app.locals.db = db;
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err);
    console.error("Connection URI:", uri);
  });

// Middleware to check MongoDB connection
function checkDbConnection(req, res, next) {
  if (!db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  next();
}

// Apply checkDbConnection middleware globally
app.use(checkDbConnection);

// Middleware to inject CSS loading script
function injectCSS(req, res, next) {
  const theme = req.cookies.theme || 'default';
  const cssLink = `<link rel="stylesheet" type="text/css" href="/themes/${theme}.css">`;
  res.locals.cssLink = cssLink;
  next();
}

// Apply injectCSS middleware globally
app.use(injectCSS);

// Function to inject CSS into HTML content
function injectCSSIntoHTML(html, cssLink) {
  return html.replace('</head>', `${cssLink}</head>`);
}

// Serve collections page with injected CSS
app.get('/collections', async (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'collections.html'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading collections page.');
    }
    const htmlWithCSS = injectCSSIntoHTML(data, res.locals.cssLink);
    res.send(htmlWithCSS);
  });
});

// API endpoint to fetch collections
app.get('/api/collections', async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    res.json(collections);
  } catch (err) {
    console.error("Error fetching collections:", err);
    res.status(500).send("Error fetching collections.");
  }
});

// Import and use routes
const authRouter = require('./routes/auth');
const gameViewRouter = require('./routes/gameView');
const eventsViewRouter = require('./routes/eventsView');
const modulesViewRouter = require('./routes/modulesView');
const modulePropertiesViewRouter = require('./routes/modulePropertiesView');
const modulePropertiesEditRouter = require('./routes/modulePropertiesEdit');
const createModuleRouter = require('./routes/createModule');
const editEventRouter = require('./routes/editEvent');
app.use(authRouter);
app.use(gameViewRouter);
app.use(eventsViewRouter);
app.use(modulesViewRouter);
app.use(modulePropertiesViewRouter);
app.use(modulePropertiesEditRouter);
app.use(createModuleRouter);
app.use(editEventRouter);

// Root route
app.get('/', (req, res) => {
  res.redirect('/game-view');
});

// Route to change theme
app.get('/set-theme/:theme', (req, res) => {
  const { theme } = req.params;
  res.cookie('theme', theme, { httpOnly: true });
  res.redirect('back');
});

app.listen(3000, () => {
  console.log('Webserver running on http://0.0.0.0:3000');
});
