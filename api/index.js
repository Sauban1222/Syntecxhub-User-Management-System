import serverlessHttp from 'serverless-http';
import app from '../server.js';
import { connectDB } from '../config/db.js';

const expressHandler = serverlessHttp(app);

export default async function handler(request, response) {
  const method = (request.method || 'GET').toUpperCase();
  const requestPath = request.url || '/';
  const requiresDatabase =
    requestPath.startsWith('/api/') ||
    (method !== 'GET' && method !== 'HEAD');

  if (requiresDatabase) {
    await connectDB();
  }

  return expressHandler(request, response);
}
