const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root,p), 'utf8');
const login=read('app/login.tsx');
assert.match(login, /newUiAuth\.signInWithEmail\(/);
assert.match(login, /submitEmailLogin/);
assert.doesNotMatch(login, /const handleGoogleLogin = \(\) => \{\s*router\.replace/);
const tabs=read('app/(tabs)/_layout.tsx');
assert.match(tabs, /getAuthSession\(/);
assert.match(tabs, /if \(!authReady \|\| !authorized\) return null/);
const rootLayout=read('app/_layout.tsx');
assert.match(rootLayout, /useRootNavigationState/);
assert.match(rootLayout, /if \(pathname === '\/'\)\s*\{\s*router\.replace\('\/onboarding'\)/);
for(const [f,pattern] of [
  ['app/(tabs)/team.tsx',/loadTeamCards\(/],
  ['app/(tabs)/plan.tsx',/loadPlanCards\(/],
  ['app/(tabs)/index.tsx',/loadExploreFeed\(/],
  ['app/(tabs)/profile.tsx',/loadProfileOverview\(/],
  ['app/create-post.tsx',/uploadCommunityPost\(/],
  ['app/makeaplan.tsx',/await createRemotePlan\(/],
]) assert.match(read(f),pattern);
const createPost=read('app/create-post.tsx');
assert.match(createPost,/getRemoteCommunityPosts\(profile\.id\)/);
assert.match(createPost,/Followers-only posts are not supported/);
const createTeam=read('app/create-team.tsx');
assert.match(createTeam,/router\.replace\('\/\(tabs\)\/team'\)/);
assert.doesNotMatch(createTeam,/router\.replace\(\{\s*pathname:\s*'\/manage-team'/);
assert.match(read('app/(tabs)/index.tsx'), /useState<FeedItem\[]>\(\[\]\)/);
assert.match(read('app/(tabs)/plan.tsx'), /useState<PlanItem\[]>\(\[\]\)/);
console.log('PASS: Integration wiring structural smoke tests (no remote network)');
