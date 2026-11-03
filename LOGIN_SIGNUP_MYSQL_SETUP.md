# LeaveFlow – Login, Signup & MySQL Setup

The project already includes both **Sign in** and **Create account** screens. They are in
`public/index.html`; their browser-side handlers are in `public/app.js`; the actual
authentication endpoints are in `server.js`.

## 1. Create the MySQL database

1. Open **MySQL Workbench** and connect to your local MySQL Server.
2. Open `database.sql`.
3. Click the lightning-bolt **Execute** button.
4. Confirm that the schema `leaveflow_db` and these tables exist:
   - `employees` – login details, employee profile, role and approval status
   - `leave_types` – leave categories
   - `leave_requests` – leave applications and approval details

You can verify using:

```sql
USE leaveflow_db;
SHOW TABLES;
SELECT * FROM leave_types;
SELECT employee_id, name, email, role, approval_status FROM employees;
```

## 2. Configure the database connection

In the project folder, copy `.env.example` and rename the copy to `.env`.
Open `.env` and enter the same MySQL credentials you use in Workbench:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root1122
DB_NAME=leaveflow_db
SESSION_SECRET=replace_with_a_long_random_secret
```

If your MySQL root account has no password, leave `DB_PASSWORD=` blank.
Do not write the word `YOUR_MYSQL_PASSWORD`; replace it with your actual password.

## 3. Install and start the website

Open the project folder in VS Code. Choose **Terminal → New Terminal**, then run:

```bash
npm install
npm run seed
npm start
```

Keep the terminal running. Open this address in your browser:

`http://localhost:3000`

## 4. Admin login

The seed command creates the administrator account:

- Email: `admin@leaveflow.com`
- Password: `Admin@123`

Sign in with this account. Open **People & access** to approve employee signups
and change an approved employee's role to `manager` when needed.

## 5. Employee signup and login

1. On the website, click **Create account**.
2. Enter full name, email, department/designation (optional), and a password of at
   least 6 characters.
3. Click **Create account**. The account is stored in MySQL with
   `approval_status = 'pending'`.
4. Sign in as admin and approve the employee under **People & access**.
5. The employee can now sign in with the email and password used during signup.

Pending accounts cannot sign in until approved. This is intentional behaviour.

## 6. If login or signup still does not work

- **Website does not open:** make sure `npm start` is still running and visit
  `http://localhost:3000`.
- **Database connection error:** check MySQL Server is running and `.env` has the
  correct host, username, password and database name.
- **`Unknown database 'leaveflow_db'`:** execute `database.sql` in Workbench.
- **`Access denied for user`:** correct `DB_USER` / `DB_PASSWORD` in `.env`.
- **Admin login fails:** run `npm run seed` again after the database is created.
- **Signup succeeds but employee login is blocked:** approve that account using
  the admin account first.
- **Port 3000 is already in use:** close the other app using it, or change `PORT`
  in `.env` and restart the server.

## Authentication code locations

- `public/index.html` – login and signup forms and tabs
- `public/app.js` – form submission, API calls, and switching between login/signup
- `server.js` – `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- `database.sql` – MySQL schema and initial leave types
- `seed.js` – creates the initial admin account with a hashed password

Passwords are stored as bcrypt hashes, not plain text. This is a learning project;
before public deployment, add HTTPS, a persistent session store, CSRF protection,
rate limiting and a stronger secret.
