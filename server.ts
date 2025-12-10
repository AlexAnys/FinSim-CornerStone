import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import chatRoutes from './server/routes/chat.js';

dotenv.config();

admin.initializeApp();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error('Auth verification failed', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
});

app.use('/api', chatRoutes);

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(path.resolve(), 'dist');
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
