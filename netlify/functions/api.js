import serverlessHttp from 'serverless-http';
import app from '../../server.js';
import { connectDB } from '../../config/db.js';

const expressHandler = serverlessHttp(app);

function normalizeEvent(event) {
  const rawPath =
    typeof event.rawUrl === 'string'
      ? new URL(event.rawUrl, 'http://localhost').pathname
      : event.path || '/';
  const functionPrefix = '/.netlify/functions/api';
  let normalizedPath = rawPath;

  if (normalizedPath === functionPrefix) {
    normalizedPath = '/';
  } else if (normalizedPath.startsWith(`${functionPrefix}/`)) {
    normalizedPath = normalizedPath.slice(functionPrefix.length);
  }

  if (!normalizedPath || !normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath || ''}`;
  }

  return {
    ...event,
    path: normalizedPath,
  };
}

export async function handler(event, context) {
  await connectDB();
  return expressHandler(normalizeEvent(event), context);
}

export { normalizeEvent };
