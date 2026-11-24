# Syntecxhub User Management System

A secure, responsive full-stack user management application built with Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, and EJS.

**Live application:** https://syntecxhub-user-management-system.netlify.app/

**GitHub repository:** https://github.com/Sauban1222/Syntecxhub-User-Management-System.git

**Developer portfolio:** https://sauban-professional-developer.netlify.app/

## Overview

Syntecxhub provides account registration, authentication, protected profile access, profile updates, and account deletion. The backend exposes a REST API, while the EJS frontend provides a complete registration, login, dashboard, and profile experience.

## Features

- Server-validated user registration
- Secure bcrypt password hashing
- Duplicate email protection
- JWT login and authentication
- Protected profile retrieval
- Authenticated profile updates
- Account deletion
- Invalid, missing, and expired JWT rejection
- Deleted-account token protection
- Password hash and sensitive-data protection
- Responsive EJS interface
- Centralized 404 and server error handling
- Automated isolated API tests

## Technologies

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- EJS
- bcryptjs
- JSON Web Tokens
- express-validator
- dotenv
- CORS
- MongoDB Memory Server
- Node.js built-in test runner
- HTML5 and CSS3

## Project Structure

```text
Syntecxhub_User_Management/
├── config/
│   └── db.js
├── controllers/
│   └── userController.js
├── middleware/
│   └── authMiddleware.js
├── models/
│   └── User.js
├── routes/
│   └── userRoutes.js
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── images/
│       └── brand-mark.svg
├── views/
│   ├── register.ejs
│   ├── login.ejs
│   ├── dashboard.ejs
│   └── profile.ejs
├── test/
│   └── userApi.test.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Sauban1222/Syntecxhub-User-Management-System.git
cd Syntecxhub-User-Management-System
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file from the provided example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set the following values in `.env`:

| Variable | Description |
|---|---|
| `PORT` | Port used by the Express server |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secure random secret of at least 32 bytes |
| `JWT_EXPIRES_IN` | JWT lifetime, such as `1d` |

Never commit `.env` or publish its credentials.

### 4. Start the application

Development mode:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

The server starts listening only after MongoDB connects successfully.

## MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a dedicated database user.
3. Add the application network address to Network Access.
4. Copy the database connection string.
5. Set `MONGO_URI` in `.env`.
6. Keep the database credentials private.

## Frontend Pages

| Method | Route | Description |
|---|---|---|
| GET | `/register` | Registration page |
| GET | `/login` | Login page |
| GET | `/dashboard` | Authenticated dashboard |
| GET | `/profile` | Authenticated profile management |

Dashboard and profile pages require a valid frontend session token and redirect unauthenticated users to login.

## API Endpoints

### Health

```http
GET /api/health
```

### Registration

```http
POST /api/users/register
Content-Type: application/json
```

```json
{
  "fullName": "Example User",
  "email": "user@example.com",
  "password": "A-secure-password"
}
```

### Login

```http
POST /api/users/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "A-secure-password"
}
```

Successful login returns a JWT and safe user information.

### Protected Profile

Send the login token as a bearer token:

```http
Authorization: Bearer <jwt>
```

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/profile` | Retrieve the authenticated profile |
| PUT | `/api/users/profile` | Update full name or email |
| DELETE | `/api/users/profile` | Delete the authenticated account |

Profile update example:

```json
{
  "fullName": "Updated Name",
  "email": "updated@example.com"
}
```

## Response Status Codes

| Status | Meaning |
|---|---|
| 200 | Request succeeded |
| 201 | User registered successfully |
| 400 | Invalid or malformed request |
| 401 | Missing, invalid, or expired authentication |
| 404 | Resource or unknown route not found |
| 409 | Duplicate email address |
| 500 | Unexpected server error |
| 503 | Authentication configuration unavailable |

## Automated Testing

Run the complete API test suite:

```bash
npm test
```

The suite uses MongoDB Memory Server and real Express/Mongoose routes. It uses an isolated in-memory database, never production MongoDB Atlas, and cleans up test data automatically.

The automated suite covers:

- Registration and duplicate email handling
- Registration validation
- Password hashing and password protection
- Valid and invalid login
- JWT signing and verification
- Invalid and expired tokens
- Protected profile access
- Profile retrieval and updates
- Invalid update input
- Duplicate email updates
- Account deletion
- Old-token rejection after deletion

## Security

- Passwords are hashed with bcrypt before storage.
- Password fields are excluded from normal queries and API serialization.
- Protected routes require a bearer JWT.
- JWT configuration is environment-based.
- Profile operations use the JWT-derived user ID.
- Request bodies cannot change a user's ID or password through profile routes.
- `.env` and `node_modules` are excluded by Git.

## Developer

**Sauban Ali**

- GitHub: https://github.com/Sauban1222
- Portfolio: https://sauban-professional-developer.netlify.app/
- Live project: https://syntecxhub-user-management-system.netlify.app/

## License

Educational and portfolio use.
