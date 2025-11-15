const express = require('express');
const path = require('path');
// Node 18+ provides a global fetch. Use it directly (Node 20 image).
const fetch = global.fetch || (url => Promise.reject(new Error('global fetch not available')));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// A server-side proxy example (optional) to demonstrate connectivity to backend
app.get('/api/hello-proxy', async (req, res) => {
  try {
    const resp = await fetch('http://backend:8000/api/hello');
    const json = await resp.json();
    res.json({ from: 'frontend-proxy', backend: json });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(port, () => {
  console.log(`Frontend listening on port ${port}`);
});
