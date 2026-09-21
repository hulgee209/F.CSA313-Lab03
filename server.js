const express = require('express');

const app = express();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.post('/cart/add', (req, res) => res.json({ ok: true, items: 1 }));

app.get('/report', async (req, res) => {
  await sleep(200 + Math.random() * 200);
  res.json({ rows: 20000 });
});

app.post('/pay', (req, res) => {
  if (Math.random() < 0.05) {
    return res.status(500).json({ error: 'gateway timeout' });
  }

  return res.json({ paid: true });
});

app.listen(3000, () => console.log('API: http://localhost:3000'));
