import express from 'express';
import cors from 'cors';
import { loadSecrets, config } from './config/env';
import apiRouter from './modules';

const app = express();

app.use(cors());
app.use(express.json());

// Mount all API routes
app.use('/api', apiRouter);

// Basic healthcheck
app.get('/health', (req, res) => res.send('OK'));

async function startServer() {
  try {
    console.log('[Server] Initializing...');
    
    // 1. Wait for AWS Secrets Manager to resolve critical keys
    await loadSecrets();
    
    // 2. Start Express
    app.listen(config.port, () => {
      console.log(`[Server] Listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('[Server] Fatal Error during startup:', error);
    process.exit(1);
  }
}

startServer();
