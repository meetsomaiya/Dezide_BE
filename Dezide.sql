-- create a new admins table with domain_id as the primary key and id as varchar(255)
CREATE TABLE [admins] (
  [id] VARCHAR(MAX) NULL,
  [domain_id] varchar(MAX) NULL,
  [name] VARCHAR(MAX) NULL,
  [email] VARCHAR(MAX) NULL,
  [access] VARCHAR(MAX) NULL,
  [admin_type] VARCHAR(MAX) NULL,
  [last_login_time] DATETIME NULL
);

-- insert the sample data into the new table
INSERT INTO [admins] ([domain_id], [name], [email], [access], [admin_type], [last_login_time])
VALUES
('40139', 'Meet Somaiya', 'meet.somaiya@suzlon.com', 'admin', 'admin', NULL);