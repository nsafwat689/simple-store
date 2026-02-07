// API endpoint for managing data (users, products, orders)
import { put, head, list } from '@vercel/blob';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type } = req.query;
  const blobName = `data/${type}.json`;

  try {
    if (req.method === 'GET') {
      // Get data from blob
      try {
        const { blobs } = await list({
          prefix: blobName,
          limit: 1,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        
        if (blobs.length > 0) {
          const response = await fetch(blobs[0].url);
          const data = await response.json();
          return res.status(200).json(data);
        }
        return res.status(200).json([]);
      } catch (error) {
        return res.status(200).json([]);
      }
    }

    if (req.method === 'POST') {
      // Set/Update data
      const newData = req.body;
      const jsonString = JSON.stringify(newData);
      
      await put(blobName, jsonString, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'application/json',
      });
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
