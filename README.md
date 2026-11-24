# Syntecxhub User Management System

A Node.js and Express application with an EJS frontend and a MongoDB-backed API for user registration, JWT login, profile management, and account deletion.

## Features

- User registration with server-side input validation and duplicate-email handling
- Password hashing with bcryptjs before storage
- Login with password verification and HS256 JWTs
- Protected profile retrieval, update, and account deletion
- Responsive EJS registration, login, dashboard, and profile pages
- Frontend session handling, client-side validation, and logout
- Safe user responses that exclude password hashes
- Centralized handling for unexpected server errors

## Technologies

- Node.js with ES modules
- Express and EJS
- MongoDB Atlas and Mongoose
- bcryptjs and jsonwebtoken
- express-validator
- dotenv and cors
- Custom responsive CSS and browser JavaScript

## Project structure

```text
Syntecxhub_User_Management/
|-- config/
|   `-- db.js
|-- controllers/
|   `-- userController.js
|-- middleware/
|   `-- authMiddleware.js
|-- models/
|   `-- User.js
|-- public/
|   |-- css/
|   |   `-- style.css
|   |-- images/
|   |   `-- brand-mark.svg
|   `-- js/
|       `-- app.js
|-- routes/
|   `-- userRoutes.js
|-- views/
|   |-- dashboard.ejs
|   |-- login.ejs
|   |-- profile.ejs
|   `-- register.ejs
|-- .env.example
|-- .gitignore
|-- package.json
|-- package-lock.json
|-- README.md
`-- server.js
```

## Installation

Install the declared dependencies:

```bash
npm install
```

Create a local environment file from the template:

```powershell
Copy-Item .env.example .env
```

Set the environment variables in `.env`. Do not commit or share that file.

## Environment configuration

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port. Defaults to `5000` when unset. |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | HS256 signing and verification secret; use a random value of at least 32 bytes. |
| `JWT_EXPIRES_IN` | JWT lifetime in a format accepted by jsonwebtoken, for example `1d`. |

The server connects to MongoDB before listening. Login also requires `JWT_EXPIRES_IN`. The browser stores its JWT in `sessionStorage` and clears it on logout or account deletion. Browser scripts can access session storage, so keep the frontend free of untrusted scripts and protect against cross-site scripting.

### MongoDB Atlas

1. Create a database and a dedicated database user in MongoDB Atlas.
2. Allow the application host's IP address in Atlas Network Access.
3. Set the Atlas connection string as `MONGO_URI` in `.env`.
4. Ensure the URI selects the intended database and URL-encode special characters in credentials.
5. Keep the connection string private and use a dedicated database user rather than an Atlas administrator account.

## Run locally

Start in development mode with automatic restart:

```bash
npm run dev
```

Or use the standard start script:

```bash
npm start
```

The default server address is `http://localhost:5000`. The server starts listening only after its MongoDB connection succeeds.

## Automated tests

Run the complete API test suite:

```bash
npm test
```

The tests use `mongodb-memory-server`, an isolated in-memory MongoDB process. They do not connect to or modify the MongoDB Atlas database configured through `.env`. Test users and data are deleted automatically after the run.

## Frontend pages

| Method | Route | Description |
|---|---|---|
| GET | `/register` | Account registration form. |
| GET | `/login` | Login form. |
| GET | `/dashboard` | Dashboard populated from the authenticated profile API. |
| GET | `/profile` | View, update, or delete the signed-in user's account. |

Dashboard and profile pages redirect browsers without a session token to login. They are rendered as empty page shells; profile data is fetched only through the protected API. The API remains responsible for authorization.

## API endpoints

JSON endpoints expect `Content-Type: application/json`.

### Health

`GET /api/health` requires no authentication.

```json
{
  "success": true,
  "message": "User Management API is running",
  "status": "healthy"
}
```

### Register

`POST /api/users/register` requires no authentication.

Request body:

```json
{
  "fullName": "Example User",
  "email": "user@example.com",
  "password": "choose-a-password"
}
```

Full name must be 2-100 characters. Email must be valid. Password must be at least 8 characters and no more than 72 UTF-8 bytes.

Success response (`201`):

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "<user-id>",
    "fullName": "Example User",
    "email": "user@example.com",
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  }
}
```

### Login

`POST /api/users/login` requires no authentication.

Request body:

```json
{
  "email": "user@example.com",
  "password": "choose-a-password"
}
```

Success response (`200`):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "<user-id>",
      "fullName": "Example User",
      "email": "user@example.com",
      "createdAt": "<timestamp>",
      "updatedAt": "<timestamp>"
    }
  }
}
```

### Get profile

`GET /api/users/profile` requires a valid JWT.

Success response (`200`) includes `id`, `fullName`, `email`, and `createdAt` in `data`.

### Update profile

`PUT /api/users/profile` requires a valid JWT. At least one of `fullName` or `email` must be supplied. No other fields are accepted.

Request body example:

```json
{
  "fullName": "Updated Example User",
  "email": "updated@example.com"
}
```

Success response (`200`) includes `id`, `fullName`, `email`, and `updatedAt` in `data`.

### Delete account

`DELETE /api/users/profile` requires a valid JWT. The account identified by the verified token is deleted; IDs in the request body or query string do not select the account.

Success response (`200`):

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### Authentication

Send the token returned by login in the `Authorization` header for protected API requests:

```http
Authorization: Bearer <jwt>
```

Protected API responses contain only safe user fields and never include the stored password hash.

## Error status codes

| Status | Meaning |
|---|---|
| `400` | Request validation failed. |
| `401` | Missing, invalid, or expired token, or invalid login credentials. |
| `404` | Unknown route or authenticated user's account not found. |
| `409` | Registration or profile update conflicts with an existing email. |
| `500` | Unexpected server error; internal error details are not returned. |
| `503` | Authentication service configuration is unavailable or too weak. |
