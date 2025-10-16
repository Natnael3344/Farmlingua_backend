/*
  # Create Users Table for Authentication

  ## Overview
  This migration creates the users table to support a complete authentication system
  with email/password, social login, and password recovery features.

  ## New Tables

  ### `users`
  - `id` (uuid, primary key) - Unique user identifier, auto-generated
  - `name` (varchar(255), not null) - User's full name
  - `email` (varchar(255), not null, unique) - User's email address
  - `password_hash` (varchar(60), not null) - Bcrypt-hashed password (60 chars for bcrypt)
  - `created_at` (timestamptz, default now()) - Account creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp

  ## Security
  - Enable Row Level Security (RLS) on `users` table
  - Add policy for authenticated users to read their own profile data
  - Add policy for authenticated users to update their own profile data

  ## Indexes
  - Unique index on email for fast lookups and constraint enforcement

  ## Important Notes
  1. Password hashes use bcrypt with minimum 10 salt rounds
  2. Email addresses are case-sensitive (consider lowercasing at app level)
  3. RLS ensures users can only access their own data
  4. Created_at and updated_at use timestamptz for timezone awareness
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(60) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
