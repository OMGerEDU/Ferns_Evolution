# Task: Closed-Loop Bug Fixing & QA Verification

You are in **Autopilot Mode**. Your objective is to reach a state where all tests in `scripts/test_local.js` pass (Green).

## The Loop
1. **Run Tests**: Execute `run_tests.bat`.
2. **Analyze**: If tests fail, diagnose the failure:
   - **404**: Check Caddy routing or Express route mounting.
   - **400**: Check Evolution API v2.2.2 payload requirements (instance naming, integration type).
   - **SSL/Expired**: Ensure Caddy and Tests are communicating via the same protocol/host (use `localhost` in Caddyfile).
3. **Fix**: Apply code changes to `src/`, `docker-compose.yml`, or `Caddyfile`.
4. **Restart**: Run `docker compose restart [service]` if configuration changed.
5. **Verify**: Repeat from step 1.

## Rules
- **No Manual Confirmation**: If you are confident in a fix, apply it and run the tests.
- **Log Inspection**: If a test fails with an ambiguous error (like 400 or 500), check `docker logs [container]`.
- **Validation**: Ensure `instanceName` follows v2.2.2 rules (alphanumeric, no special chars, min length).

## Target
All 5 tests in `scripts/test_local.js` must return ✅ PASS.
- Backend public health
- Evolution API direct health
- Backend detailed health
- Create Instance
- Delete Instance
