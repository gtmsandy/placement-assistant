# Fixes Applied

The project was inspected as a complete React + FastAPI codebase.

## Root cause of the blank frontend

`src/services/api.js` was missing these exports:

- `getStoredUser`
- `logoutUser`
- `getAccessToken`

But the project imports them from:

- `src/context/StudentContext.jsx`
- `src/pages/student/StudentDashboard.jsx`

Because these are ES module imports, the missing exports prevent the module graph from loading. React therefore never reaches the first render and the browser can show a completely blank page.

## Additional corrections

1. Restored the missing authentication helper exports in `src/services/api.js`.
2. Added an `auth-changed` event after login/logout so student and placement state can refresh without a manual page reload.
3. Made `PlacementContext` wait for authentication before calling the protected drives endpoint and refresh when authentication changes.
4. Made `ApplicationContext` use the central applications API service and show only the logged-in student's applications when the user is a student.
5. Moved the `ApplicationsManagement` data-loading function before its `useEffect` call.
6. Disabled the Vite PWA service worker during development to prevent stale development caches from causing confusing blank-page behavior.

## Validation performed

- Python backend files compile successfully.
- Frontend relative named-import analysis reports no missing local exports.
- The uploaded SQLite database and uploaded runtime files were preserved.

## Important

After replacing the project, remove any old development service worker once in the browser:

Chrome/Brave DevTools -> Application -> Service Workers -> Unregister

Then clear site data for `localhost:5173` and restart the frontend.
