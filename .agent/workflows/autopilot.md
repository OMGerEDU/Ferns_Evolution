---
description: Closed-loop bug fixing until all QA tests are GREEN
---

This workflow defines an autonomous loop to fix bugs until all QA tests pass locally.

# Core Philosophy
- **Research-First**: Always research API documentation for any external service or library used.
- **Iterative Problem Solving**: If an approach fails, pivot to a different strategy instead of repeating the same attempt.
- **No Repetition**: Do not repeat the same analysis or same failed fixes.
- **Think Outside the Box**: Consider non-obvious causes (environment, external dependencies) and don't get stuck in a tunnel vision.

# Closed Loop Methodology
1. **Analyze Previous Failure**: Look at the results of `node scripts/test_local.js`.
2. **Diagnose**: Analyze if the error is 404 (routing), 400 (validation/payload), or 500 (logic).
3. **Fix**: Apply code changes to `src/`, `docker-compose.yml`, or `Caddyfile`.
4. **Build & Restart**: Instruct the user to run `docker compose up --build -d`.
5. **Verify**: Instruct the user to run `node scripts/test_local.js`.
6. **Repeat**: If even one test is red, go back to step 1.

# Task Status
The task is not completed until all 5 tests are ✅ PASS.

// turbo-all
// autopilot-loop
1. Diagnose failing tests from the last run.
2. Apply fixes to the codebase.
3. Provide the user with the exact commands to build and test.
