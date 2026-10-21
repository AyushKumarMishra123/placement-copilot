# Test Suites

- **Backend Integration Tests**: Located in `server/tests/` (Executed with `npm --prefix server test`)
  - `auth.test.js` - User registration, duplicate checks, login, JWT validation, health check
  - `profile.test.js` - Profile reading, updating, tenant isolation, cascade deletion
  - `upload.test.js` - Document MIME, extension, size limits, and filename sanitization
- **E2E & Frontend Component Tests**: To be added in future stages.
