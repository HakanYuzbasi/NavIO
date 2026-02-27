import bcrypt from 'bcryptjs';
import pool from './src/db/pool';

async function seed() {
    try {
        // Create org
        const orgRes = await pool.query(
            "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
            ["NaviO", "navio-" + Date.now()]
        );
        const orgId = orgRes.rows[0].id;

        // Create user: We use admin@navio.com as email since login form requires email format
        const passwordHash = await bcrypt.hash('NavioAdmin!2026', 12);
        await pool.query(
            `INSERT INTO users (org_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'owner')`,
            [orgId, 'admin@navio.com', passwordHash, 'admin']
        );
        console.log("Admin user created successfully: email admin@navio.com, password NavioAdmin!2026");
        process.exit(0);
    } catch (err) {
        console.error("Error seeding:", err);
        process.exit(1);
    }
}

seed();
