/**
 * Auth Routes
 * Registration, login, and user management
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { AuthRequest, requireAuth, signToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Create a new organization + owner account
 */
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, orgName } = req.body;

    if (!email || !password || !name || !orgName) {
      res.status(400).json({ error: 'email, password, name, and orgName are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Check if email exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email.toLowerCase()]
    );
    if (existing.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Create organization
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { rows: orgRows } = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *`,
      [orgName, slug + '-' + Date.now().toString(36)]
    );
    const org = orgRows[0];

    // Create owner user
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows: userRows } = await pool.query(
      `INSERT INTO users (org_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'owner') RETURNING id, org_id, email, name, role, created_at`,
      [org.id, email.toLowerCase(), passwordHash, name]
    );
    const user = userRows[0];

    const token = signToken({
      userId: user.id,
      orgId: user.org_id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate and get JWT token
 */
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT u.*, o.name as org_name, o.slug as org_slug
       FROM users u JOIN organizations o ON u.org_id = o.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({
      userId: user.id,
      orgId: user.org_id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.org_id,
        name: user.org_name,
        slug: user.org_slug,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.created_at,
              o.id as org_id, o.name as org_name, o.slug as org_slug
       FROM users u JOIN organizations o ON u.org_id = o.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const u = rows[0];
    res.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.created_at,
      },
      organization: {
        id: u.org_id,
        name: u.org_name,
        slug: u.org_slug,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /api/auth/invite
 * Invite a staff member to the organization (owner/admin only)
 */
router.post('/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only owners and admins can invite users' });
      return;
    }

    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'email, password, and name are required' });
      return;
    }

    const assignRole = role === 'admin' && req.user!.role === 'owner' ? 'admin' : 'staff';

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email.toLowerCase()]
    );
    if (existing.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (org_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, created_at`,
      [req.user!.orgId, email.toLowerCase(), passwordHash, name, assignRole]
    );

    res.status(201).json({ user: rows[0] });
  } catch (error: any) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

export default router;
