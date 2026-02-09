require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost', // External access to container?
    // Wait, postgres container is exposing 5432?
    // check docker-compose.
    // postgres doesn't have ports mapped in docker-compose!
    // It only exposes to internal network.
    // I cannot connect from host unless I map ports.
    // docker-compose.yml:
    //   postgres: ... ports is MISSING.
});

// Since I cannot connect to DB from host (no ports mapped), 
// I cannot verifying DB easily without docker exec.
// But valid approach:
// I can try to use `docker exec` to run psql.

/**
 * Alternative:
 * Since I cannot run node script to connect to DB (no port),
 * I will use `run_command` to execute psql inside the container.
 * 
 * Command: docker exec evolution_postgres psql -U evolution -d evolution -c "SELECT * FROM personal_notes ORDER BY created_at DESC LIMIT 5;"
 */
console.log("Use docker exec to verify.");
