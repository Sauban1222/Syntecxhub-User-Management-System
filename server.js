import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { connectDB } from './config/db.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const port = Number(process.env.PORT || 5000);
const projectDirectory = process.cwd();
const viewDirectoryCandidates = [
  path.join(projectDirectory, 'views'),
  path.join(process.cwd(), 'views'),
  '/var/task/views',
  '/var/task/netlify/functions/views',
  process.env.LAMBDA_TASK_ROOT
    ? path.join(process.env.LAMBDA_TASK_ROOT, 'views')
    : null,
];
const viewDirectory = viewDirectoryCandidates.find((candidate) =>
  candidate && existsSync(candidate)
) || viewDirectoryCandidates[0];
const staticDirectoryCandidates = [
  path.join(projectDirectory, 'public'),
  path.join(process.cwd(), 'public'),
  '/var/task/public',
  '/var/task/netlify/functions/public',
  process.env.LAMBDA_TASK_ROOT
    ? path.join(process.env.LAMBDA_TASK_ROOT, 'public')
    : null,
];
const staticDirectory = staticDirectoryCandidates.find((candidate) =>
  candidate && existsSync(candidate)
) || staticDirectoryCandidates[0];

app.set('view engine', 'ejs');
app.set('views', viewDirectory);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(staticDirectory));
app.use('/api/users', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database unavailable for API request', {
      name: error?.name || 'UnknownError',
      code: error?.code,
    });
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable',
    });
  }
});
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'User Management API is running',
    status: 'healthy',
  });
});

app.get('/', (_req, res) => {
  res.redirect(302, '/register');
});

app.get('/register', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.render('register');
});

app.get('/login', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.render('login');
});

app.get('/dashboard', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.render('dashboard');
});

app.get('/profile', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.render('profile');
});

app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled request error', {
      name: error?.name || 'UnknownError',
      code: error?.code,
      status: error?.statusCode || error?.status,
      method: req?.method,
      path: req?.path,
    });
  }

  const requestedStatus = Number(error.statusCode || error.status);
  const statusCode = requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
});

export async function startServer() {
  try {
    await connectDB();
    return app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
    throw error;
  }
}

const isMainModule =
  process.argv[1] &&
  path.basename(path.resolve(process.argv[1])) === 'server.js';

if (isMainModule) {
  startServer();
}

export default app;
