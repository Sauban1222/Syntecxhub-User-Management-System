import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.js';
import User from '../models/User.js';
import { handler as netlifyHandler, normalizeEvent } from '../netlify/functions/api.js';

process.env.JWT_SECRET = 'test-only-jwt-secret-at-least-32-bytes';
process.env.JWT_EXPIRES_IN = '1h';

let mongoServer;
let httpServer;
let baseUrl;
let token;
let userId;
let email;
let secondEmail;

const password = 'Test-Password-2026!';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function jsonRequest(method, body, authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'syntecxhub_test',
      launchTimeout: 60000,
    },
  });
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  await new Promise((resolve) => {
    httpServer = app.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await User.deleteMany({});
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

test('health endpoint is available', async () => {
  const { response, body } = await apiRequest('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'healthy');
});

test('homepage redirects unauthenticated visitors to registration', async () => {
  const response = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/register');
});

test('registration and login pages render successfully', async () => {
  const register = await apiRequest('/register');
  const login = await apiRequest('/login');
  assert.equal(register.response.status, 200);
  assert.equal(register.response.headers.get('content-type')?.includes('text/html'), true);
  assert.equal(login.response.status, 200);
  assert.equal(login.response.headers.get('content-type')?.includes('text/html'), true);
});

test('Netlify function preserves API paths and serves the health endpoint', async () => {
  assert.equal(normalizeEvent({
    path: '/.netlify/functions/api/api/health',
    rawUrl: 'http://localhost/.netlify/functions/api/api/health',
  }).path, '/api/health');

  const result = await netlifyHandler({
    httpMethod: 'GET',
    headers: {},
    path: '/api/health',
    rawUrl: 'http://localhost/api/health',
    rawQuery: '',
    queryStringParameters: null,
    body: null,
    isBase64Encoded: false,
  }, {});

  assert.equal(result.statusCode, 200);
  const body = JSON.parse(result.body);
  assert.equal(body.status, 'healthy');
});

test('registration validates invalid input', async () => {
  const { response, body } = await apiRequest(
    '/api/users/register',
    jsonRequest('POST', { fullName: 'A', email: 'invalid', password: 'short' })
  );
  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});

test('registration creates a user and hashes the password', async () => {
  email = `test-${Date.now()}@example.com`;
  const { response, body } = await apiRequest(
    '/api/users/register',
    jsonRequest('POST', {
      fullName: 'Test User',
      email,
      password,
    })
  );

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(JSON.stringify(body).includes(password), false);
  assert.equal(JSON.stringify(body).includes('$2'), false);

  userId = body.data.id;
  const storedUser = await User.findById(userId).select('+password');
  assert.ok(storedUser);
  assert.notEqual(storedUser.password, password);
  assert.match(storedUser.password, /^\$2[aby]\$/);
  assert.equal(await bcrypt.compare(password, storedUser.password), true);
});

test('duplicate email registration returns 409', async () => {
  const { response, body } = await apiRequest(
    '/api/users/register',
    jsonRequest('POST', {
      fullName: 'Duplicate User',
      email,
      password,
    })
  );
  assert.equal(response.status, 409);
  assert.equal(body.success, false);
});

test('login rejects incorrect credentials', async () => {
  const { response } = await apiRequest(
    '/api/users/login',
    jsonRequest('POST', { email, password: 'Wrong-Password-2026!' })
  );
  assert.equal(response.status, 401);
});

test('login succeeds and returns a signed JWT without password data', async () => {
  const { response, body } = await apiRequest(
    '/api/users/login',
    jsonRequest('POST', { email, password })
  );

  assert.equal(response.status, 200);
  assert.equal(typeof body.data.token, 'string');
  assert.equal(JSON.stringify(body).includes('$2'), false);
  assert.equal(JSON.stringify(body).includes(password), false);

  token = body.data.token;
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
  assert.equal(payload.sub, userId);
});

test('invalid and expired JWTs are rejected', async () => {
  const invalid = await apiRequest(
    '/api/users/profile',
    jsonRequest('GET', undefined, 'invalid.jwt.token')
  );
  assert.equal(invalid.response.status, 401);

  const expiredToken = jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '-1s' }
  );
  const expired = await apiRequest(
    '/api/users/profile',
    jsonRequest('GET', undefined, expiredToken)
  );
  assert.equal(expired.response.status, 401);
});

test('profile retrieval requires JWT and returns safe user data', async () => {
  const unauthorized = await apiRequest(
    '/api/users/profile',
    jsonRequest('GET')
  );
  assert.equal(unauthorized.response.status, 401);

  const authorized = await apiRequest(
    '/api/users/profile',
    jsonRequest('GET', undefined, token)
  );
  assert.equal(authorized.response.status, 200);
  assert.equal(authorized.body.data.id, userId);
  assert.equal('password' in authorized.body.data, false);
  assert.equal(JSON.stringify(authorized.body).includes('$2'), false);
});

test('profile rejects invalid updates', async () => {
  const emptyName = await apiRequest(
    '/api/users/profile',
    jsonRequest('PUT', { fullName: '' }, token)
  );
  assert.equal(emptyName.response.status, 400);

  const invalidEmail = await apiRequest(
    '/api/users/profile',
    jsonRequest('PUT', { email: 'not-an-email' }, token)
  );
  assert.equal(invalidEmail.response.status, 400);

  const passwordUpdate = await apiRequest(
    '/api/users/profile',
    jsonRequest('PUT', { password: 'Forbidden-Password-2026!' }, token)
  );
  assert.equal(passwordUpdate.response.status, 400);
});

test('profile update succeeds and duplicate email conflicts return 409', async () => {
  secondEmail = `second-${Date.now()}@example.com`;
  await apiRequest(
    '/api/users/register',
    jsonRequest('POST', {
      fullName: 'Second Test User',
      email: secondEmail,
      password,
    })
  );

  const updated = await apiRequest(
    '/api/users/profile',
    jsonRequest('PUT', {
      fullName: 'Updated Test User',
      email,
    }, token)
  );
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.fullName, 'Updated Test User');
  assert.equal(JSON.stringify(updated.body).includes('$2'), false);

  const duplicate = await apiRequest(
    '/api/users/profile',
    jsonRequest('PUT', { email: secondEmail }, token)
  );
  assert.equal(duplicate.response.status, 409);
});

test('account deletion removes the account and old JWT no longer works', async () => {
  const deleted = await apiRequest(
    '/api/users/profile',
    jsonRequest('DELETE', undefined, token)
  );
  assert.equal(deleted.response.status, 200);
  assert.equal(await User.exists({ _id: userId }), null);

  const oldToken = await apiRequest(
    '/api/users/profile',
    jsonRequest('GET', undefined, token)
  );
  assert.equal(oldToken.response.status, 404);
});

test('account deletion rejects missing and invalid JWTs', async () => {
  const missing = await apiRequest(
    '/api/users/profile',
    jsonRequest('DELETE')
  );
  assert.equal(missing.response.status, 401);

  const invalid = await apiRequest(
    '/api/users/profile',
    jsonRequest('DELETE', undefined, 'invalid.jwt.token')
  );
  assert.equal(invalid.response.status, 401);
});
