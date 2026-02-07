// API endpoint for managing data (users, products, orders)
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type, action } = req.query;

  try {
    if (req.method === 'GET') {
      // Get data
      const data = await kv.get(`store:${type}`) || [];
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // Set/Update data
      const newData = req.body;
      await kv.set(`store:${type}`, newData);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
