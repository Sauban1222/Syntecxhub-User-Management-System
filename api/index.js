import serverlessHttp from 'serverless-http';
import app from '../server.js';
import { connectDB } from '../config/db.js';

const expressHandler = serverlessHttp(app);

export default async function handler(request, response) {
  await connectDB();
  return expressHandler(request, response);
}
