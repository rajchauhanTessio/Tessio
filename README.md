# OmniAuth Record Management System

This is a full-stack application built with React, Express, and PostgreSQL (Cloud SQL).

## 🚀 Local Setup Instructions

### 1. Prerequisites
- **Node.js**: Version **20.0.0** or higher (Vite 6 requires modern Node.js).
- **npm**: Version 9 or higher.
- **PostgreSQL**: A running instance or Cloud SQL connection.

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and define the following variables:
```env
JWT_SECRET=your_secret_key_here
SQL_HOST=your_db_host
SQL_USER=your_db_user
SQL_PASSWORD=your_db_password
SQL_DB_NAME=your_db_name
SQL_ADMIN_USER=your_db_admin_user
SQL_ADMIN_PASSWORD=your_db_admin_password
```

### 4. Running the App
The application uses a unified server that handles both the API and the frontend.

#### Development Mode
Runs the server with tsx:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Mode
Builds the frontend and bundles the server in production mode:
```bash
npm run build
npm start
```

## 🛠️ Troubleshooting

### Login Issues
The default admin credentials are:
- **Username**: `admin`
- **PIN**: `123456`

