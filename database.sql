CREATE DATABASE IF NOT EXISTS leaveflow_db;
USE leaveflow_db;

CREATE TABLE IF NOT EXISTS employees (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  department VARCHAR(50),
  designation VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  role ENUM('employee','manager','admin') NOT NULL DEFAULT 'employee',
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_types (
  leave_type_id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(50) NOT NULL UNIQUE,
  max_days INT NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS leave_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  manager_comment TEXT,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id),
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by) REFERENCES employees(employee_id) ON DELETE SET NULL
);

INSERT IGNORE INTO leave_types (type_name, max_days, description) VALUES
('Casual Leave', 12, 'For personal work and occasional needs.'),
('Sick Leave', 10, 'For illness, recovery and medical appointments.'),
('Earned Leave', 15, 'Planned time off earned through service.'),
('Maternity Leave', 90, 'Leave for maternity-related needs.'),
('Paternity Leave', 7, 'Leave for new fathers.'),
('Unpaid Leave', 30, 'Leave beyond paid leave entitlement.');
