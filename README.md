# LeaveFlow — Employee Leave Management System

A royal-blue and pink employee leave portal built with HTML, CSS, JavaScript, Node.js, Express and MySQL.

## Features
- Employee signup (new accounts wait for administrator approval)
- Secure login with hashed passwords and server-side sessions
- Employee dashboard, leave application and leave history
- Manager/admin leave approval and rejection
- Admin employee directory, account approval and role management
- MySQL schema for employees, leave_types and leave_requests

## Requirements
- Node.js 18+
- MySQL 8+
- npm

## Setup
1. Extract this ZIP and open the folder in VS Code.
2. Create the database: open MySQL Workbench, run all statements in `database.sql`.
3. Copy `.env.example` to `.env` and enter your MySQL username/password.
4. Open a terminal in this project folder and run:
   ```bash
   npm install
   npm run seed
   npm start
   ```
5. Open http://localhost:3000

## First admin login
- Email: `admin@leaveflow.com`
- Password: `Admin@123`

Change the admin password after the first login. The seed script creates or promotes this account as an approved administrator.

## Important role setup
- Employees can sign up themselves; their account status is `pending`.
- Admin approves/rejects signups in **People & access**.
- To create a manager, an admin changes an approved employee's role to `manager`.
- Managers and admins can review leave requests.

## Database tables
- `employees`: employee profile, login credentials, role and signup approval status
- `leave_types`: available leave categories and maximum days
- `leave_requests`: leave dates, reason, status and reviewer information

## Notes
- This is a student-project starter. For production deployment, configure HTTPS, a persistent session store, CSRF protection, stronger password policy, audit logs and secure secret values.
