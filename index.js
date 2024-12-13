const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Replace with your actual credentials and IP
const uri = 'mongodb://admin:secure_password@172.245.9.50:27017/larp_management?authSource=admin';

let db;

// Connect to MongoDB
MongoClient.connect(uri, { useUnifiedTopology: true })
  .then(client => {
    db = client.db('larp_management');
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err);
  });

// Simple in-memory credentials for the web interface
const webUsers = {
  'webadmin': 'webpassword'
};

// Middleware to check login
function requireLogin(req, res, next) {
  if (req.headers.cookie && req.headers.cookie.includes('loggedin=true')) {
    return next();
  }
  res.redirect('/login');
}

// Login form
app.get('/login', (req, res) => {
  res.send(`
    <h1>Login</h1>
    <form method="POST" action="/login">
      <label>Username: <input name="username" type="text" /></label><br/>
      <label>Password: <input name="password" type="password" /></label><br/>
      <button type="submit">Login</button>
    </form>
  `);
});

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (webUsers[username] && webUsers[username] === password) {
    res.setHeader('Set-Cookie', 'loggedin=true; Path=/; HttpOnly');
    return res.redirect('/collections');
  }
  res.send('Invalid credentials. <a href="/login">Try again</a>.');
});

// Logout route
app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'loggedin=false; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login');
});

// List collections
app.get('/collections', requireLogin, async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    let html = '<h1>Collections</h1><ul>';
    collections.forEach(c => {
      html += `<li><a href="/collections/${c.name}">${c.name}</a></li>`;
    });
    html += '</ul><a href="/logout">Logout</a>';
    res.send(html);
  } catch (err) {
    console.error("Error fetching collections:", err);
    res.send("Error fetching collections.");
  }
});

// View documents in a collection
app.get('/collections/:name', requireLogin, async (req, res) => {
  const { name } = req.params;
  try {
    const collection = db.collection(name);
    const docs = await collection.find({}).toArray();
    let html = `<h1>Collection: ${name}</h1>`;
    html += `<a href="/collections/${name}/insert">Insert New Document</a><br/><br/>`;
    html += '<table border="1" cellpadding="5" cellspacing="0"><tr><th>ID</th><th>Data</th><th>Actions</th></tr>';
    docs.forEach(d => {
      html += `<tr>
        <td>${d._id}</td>
        <td><pre>${JSON.stringify(d, null, 2)}</pre></td>
        <td><a href="/collections/${name}/delete/${d._id}">Delete</a></td>
      </tr>`;
    });
    html += '</table><br/><a href="/collections">Back to Collections</a><br/><a href="/logout">Logout</a>';
    res.send(html);
  } catch (err) {
    console.error("Error fetching documents:", err);
    res.send("Error fetching documents.");
  }
});

// Insert form
app.get('/collections/:name/insert', requireLogin, (req, res) => {
  const { name } = req.params;
  // This simple form asks the user to enter a JSON object
  res.send(`
    <h1>Insert Document into ${name}</h1>
    <form method="POST" action="/collections/${name}/insert">
      <textarea name="json" rows="10" cols="50">{ "example": "data" }</textarea><br/>
      <button type="submit">Insert</button>
    </form>
    <br/><a href="/collections/${name}">Back to ${name}</a>
    <br/><a href="/collections">Back to Collections</a>
  `);
});

// Handle insert
app.post('/collections/:name/insert', requireLogin, async (req, res) => {
  const { name } = req.params;
  const { json } = req.body;

  try {
    const doc = JSON.parse(json);
    const collection = db.collection(name);
    await collection.insertOne(doc);
    res.redirect(`/collections/${name}`);
  } catch (err) {
    console.error("Error inserting document:", err);
    res.send(`Error inserting document. Make sure the JSON is valid.<br/><a href="/collections/${name}/insert">Try again</a>`);
  }
});

// Delete a document by ID
app.get('/collections/:name/delete/:id', requireLogin, async (req, res) => {
  const { name, id } = req.params;
  try {
    const collection = db.collection(name);
    await collection.deleteOne({ _id: ObjectId(id) });
    res.redirect(`/collections/${name}`);
  } catch (err) {
    console.error("Error deleting document:", err);
    res.send("Error deleting document.");
  }
});

app.listen(3000, () => {
  console.log('Webserver running on http://0.0.0.0:3000');
});

