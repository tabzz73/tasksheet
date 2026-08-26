# Release Notes - TaskSheet 1.0.0-rc.4

RC4 preserves the RC3 production-first data behavior and fixes a presentation stacking defect:

- Welcome/Overview and Dashboard cards can no longer paint over the top horizontal application bar while scrolling.
- The application now uses a viewport-bounded layout with one isolated content scroller.
- Navbar and setup/demo banners have explicit higher stacking layers outside the scrolling content.
- A Chromium regression scrolls the Welcome page and verifies that the header owns the top visual layer.

Verification: 98/98 unit/integration tests, zero TypeScript errors, production build PASS, focused browser regression PASS.
