require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1122',
  database: process.env.DB_NAME || 'leaveflow_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'leaveflow-development-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Please log in first.' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}
const publicUser = row => ({
  employee_id: row.employee_id, name: row.name, email: row.email,
  department: row.department, designation: row.designation, role: row.role,
  approval_status: row.approval_status
});

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ success: true, database: 'connected' }); }
  catch (e) { res.status(500).json({ success: false, database: 'disconnected', message: 'Check your MySQL settings.' }); }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, department, designation, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must contain at least 6 characters.' });
    const [existing] = await pool.query('SELECT employee_id FROM employees WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO employees (name,email,department,designation,password,role,approval_status) VALUES (?,?,?,?,?,"employee","pending")',
      [name.trim(), email.trim().toLowerCase(), department || '', designation || '', hash]
    );
    res.status(201).json({ success: true, message: 'Account created. Please wait for admin approval before logging in.' });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Could not create account. Please try again.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM employees WHERE email = ?', [(email || '').trim().toLowerCase()]);
    if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const user = rows[0];
    if (user.approval_status !== 'approved') {
      return res.status(403).json({ success: false, message: user.approval_status === 'pending' ? 'Your account is awaiting admin approval.' : 'Your account has not been approved. Contact the administrator.' });
    }
    req.session.user = publicUser(user);
    res.json({ success: true, user: req.session.user });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Login failed.' }); }
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ success: true })));
app.get('/api/auth/me', (req, res) => res.json({ success: true, user: req.session.user || null }));

app.get('/api/leave-types', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM leave_types ORDER BY type_name');
  res.json({ success: true, leaveTypes: rows });
});

app.post('/api/leave-requests', requireAuth, requireRole('employee'), async (req, res) => {
  try {
    const { leave_type_id, from_date, to_date, reason } = req.body;
    if (!leave_type_id || !from_date || !to_date || !reason) return res.status(400).json({ success: false, message: 'Please complete all fields.' });
    if (to_date < from_date) return res.status(400).json({ success: false, message: 'End date cannot be before start date.' });
    const [types] = await pool.query('SELECT leave_type_id FROM leave_types WHERE leave_type_id = ?', [leave_type_id]);
    if (!types.length) return res.status(400).json({ success: false, message: 'Please select a valid leave type.' });
    await pool.query(
      'INSERT INTO leave_requests (employee_id,leave_type_id,from_date,to_date,reason) VALUES (?,?,?,?,?)',
      [req.session.user.employee_id, leave_type_id, from_date, to_date, reason.trim()]
    );
    res.status(201).json({ success: true, message: 'Leave request submitted successfully.' });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Could not submit leave request.' }); }
});

app.get('/api/leave-requests/mine', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT lr.*, lt.type_name FROM leave_requests lr
     JOIN leave_types lt ON lt.leave_type_id=lr.leave_type_id
     WHERE lr.employee_id=? ORDER BY lr.created_at DESC`,
    [req.session.user.employee_id]
  );
  res.json({ success: true, requests: rows });
});

app.get('/api/manager/requests', requireAuth, requireRole('manager','admin'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT lr.*, lt.type_name, e.name AS employee_name, e.email, e.department
     FROM leave_requests lr JOIN leave_types lt ON lt.leave_type_id=lr.leave_type_id
     JOIN employees e ON e.employee_id=lr.employee_id ORDER BY
     CASE WHEN lr.status='pending' THEN 0 ELSE 1 END, lr.created_at DESC`
  );
  res.json({ success: true, requests: rows });
});

app.patch('/api/manager/requests/:id', requireAuth, requireRole('manager','admin'), async (req, res) => {
  const { status, manager_comment } = req.body;
  if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
  const [result] = await pool.query(
    'UPDATE leave_requests SET status=?, manager_comment=?, reviewed_by=? WHERE request_id=?',
    [status, manager_comment || '', req.session.user.employee_id, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Leave request not found.' });
  res.json({ success: true, message: `Request ${status}.` });
});

app.get('/api/admin/employees', requireAuth, requireRole('admin'), async (req, res) => {
  const [rows] = await pool.query('SELECT employee_id,name,email,department,designation,role,approval_status,created_at FROM employees ORDER BY created_at DESC');
  res.json({ success: true, employees: rows });
});

app.patch('/api/admin/employees/:id/approval', requireAuth, requireRole('admin'), async (req, res) => {
  const { approval_status } = req.body;
  if (!['approved','rejected','pending'].includes(approval_status)) return res.status(400).json({ success: false, message: 'Invalid approval status.' });
  const [result] = await pool.query('UPDATE employees SET approval_status=? WHERE employee_id=?', [approval_status, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Employee not found.' });
  res.json({ success: true, message: `Employee ${approval_status}.` });
});

app.patch('/api/admin/employees/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['employee','manager','admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
  await pool.query('UPDATE employees SET role=? WHERE employee_id=?', [role, req.params.id]);
  res.json({ success: true, message: 'Role updated.' });
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  const user = req.session.user;
  if (user.role === 'employee') {
    const [[counts]] = await pool.query(
      `SELECT COUNT(*) total, SUM(status='pending') pending, SUM(status='approved') approved, SUM(status='rejected') rejected
       FROM leave_requests WHERE employee_id=?`, [user.employee_id]
    );
    return res.json({ success: true, stats: counts });
  }
  const [[counts]] = await pool.query(
    `SELECT COUNT(*) total, SUM(status='pending') pending, SUM(status='approved') approved, SUM(status='rejected') rejected FROM leave_requests`
  );
  res.json({ success: true, stats: counts });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`LeaveFlow running at http://localhost:${PORT}`));
