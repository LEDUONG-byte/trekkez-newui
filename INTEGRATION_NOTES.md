# TrekkEZ integration notes

- Home uses the live Explore feed, followed-author IDs, and existing follow/like/save/comment/share services.
- Plan, Route, Team, Profile, and post creation use the existing Supabase-backed services and retain the updated screen layouts where available.
- Team creation uses the existing plan-linked team creation flow. Team details, join requests, invitations, and member management use existing Team APIs.
- The uploaded project has no team chat message service/table and no team coordinates. The chat entry explains that limitation; team discovery loads real public Teams and requests joining without inventing map pins.
- `postinstall` applies a guarded compatibility patch for the Expo Router 57 Android initial-link mount race. It adds no dependency and skips other Expo Router major versions.

Verification: TypeScript passes. 13 of 14 API tests pass. `api/tests/test-features-fix.cjs` retains an existing assertion for `setSelectedSearchId(item.id)` that does not match the current project implementation.
