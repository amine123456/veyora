import { query } from "./db.js";

// Load all site knowledge into memory at startup.
export async function loadAll() {
  const { rows } = await query(
    `SELECT site, waf, best_rung, best_pool, best_country, solver_needed,
            success_count, fail_count, avg_ms, last_success_at, last_fail_at
     FROM site_knowledge ORDER BY updated_at DESC LIMIT 50000`
  );
  return new Map(rows.map((r) => [r.site, {
    waf: r.waf,
    bestRung: r.best_rung,
    bestPool: r.best_pool,
    bestCountry: r.best_country,
    solverNeeded: r.solver_needed,
    successCount: r.success_count,
    failCount: r.fail_count,
    avgMs: r.avg_ms,
    lastSuccessAt: r.last_success_at,
    lastFailAt: r.last_fail_at,
  }]));
}

// Upsert one site's knowledge after a request completes.
export async function record({ site, waf, rung, pool, country, solverUsed, success, ms }) {
  const msInt = Math.round(ms) || 0;
  await query(
    `INSERT INTO site_knowledge (site, waf, best_rung, best_pool, best_country, solver_needed,
                                  success_count, fail_count, avg_ms,
                                  last_success_at, last_fail_at, updated_at)
     VALUES ($1, $2, $3::int, $4, $5, $6::bool,
             CASE WHEN $7::bool THEN 1 ELSE 0 END,
             CASE WHEN $7::bool THEN 0 ELSE 1 END,
             CASE WHEN $7::bool THEN $8::int ELSE NULL END,
             CASE WHEN $7::bool THEN NOW() ELSE NULL END,
             CASE WHEN $7::bool THEN NULL ELSE NOW() END,
             NOW())
     ON CONFLICT (site) DO UPDATE SET
       waf             = COALESCE($2, site_knowledge.waf),
       best_rung       = CASE WHEN $7::bool THEN $3::int ELSE site_knowledge.best_rung END,
       best_pool       = CASE WHEN $7::bool THEN $4 ELSE site_knowledge.best_pool END,
       best_country    = CASE WHEN $7::bool AND $5 IS NOT NULL THEN $5 ELSE site_knowledge.best_country END,
       solver_needed   = site_knowledge.solver_needed OR $6::bool,
       success_count   = site_knowledge.success_count + CASE WHEN $7::bool THEN 1 ELSE 0 END,
       fail_count      = site_knowledge.fail_count + CASE WHEN $7::bool THEN 0 ELSE 1 END,
       avg_ms          = CASE WHEN $7::bool THEN COALESCE(
                           (site_knowledge.avg_ms * LEAST(site_knowledge.success_count, 100) + $8::int)
                           / (LEAST(site_knowledge.success_count, 100) + 1),
                           $8::int) ELSE site_knowledge.avg_ms END,
       last_success_at = CASE WHEN $7::bool THEN NOW() ELSE site_knowledge.last_success_at END,
       last_fail_at    = CASE WHEN $7::bool THEN site_knowledge.last_fail_at ELSE NOW() END,
       updated_at      = NOW()`,
    [site, waf, rung, pool, country, solverUsed, success, msInt]
  );
}

// Get one site's knowledge (for admin/diagnostics).
export async function get(site) {
  const { rows } = await query(`SELECT * FROM site_knowledge WHERE site = $1`, [site]);
  return rows[0] ?? null;
}

// List top sites by request count.
export async function list({ limit = 50, sort = "recent" } = {}) {
  const orderBy = sort === "failures" ? "fail_count DESC" : sort === "successes" ? "success_count DESC" : "updated_at DESC";
  const { rows } = await query(
    `SELECT site, waf, best_rung, best_pool, best_country, solver_needed,
            success_count, fail_count, avg_ms, last_success_at, last_fail_at, updated_at
     FROM site_knowledge ORDER BY ${orderBy} LIMIT $1`,
    [limit]
  );
  return rows;
}
