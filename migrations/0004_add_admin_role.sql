-- Add admin role column to users table
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- Create index for faster admin lookups
CREATE INDEX idx_is_admin ON users(is_admin);

-- Set the bootstrap admin (carl@craftthefuture.xyz) as admin
UPDATE users SET is_admin = 1 WHERE email LIKE 'carl@craftthefuture.xyz%';
