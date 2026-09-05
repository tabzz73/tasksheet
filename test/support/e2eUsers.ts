/** Shared E2E fixtures — not a Playwright test file, safe to import from both
 *  auth.setup.ts and any *.e2e.spec.ts file (Playwright refuses direct
 *  test-file-to-test-file imports). */
export const E2E_ADMIN = { displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' };
