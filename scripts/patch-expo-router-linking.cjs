const fs = require('node:fs');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const packagePath = path.join(projectDir, 'node_modules', 'expo-router', 'package.json');
const targetPath = path.join(projectDir, 'node_modules', 'expo-router', 'build', 'fork', 'useLinking.native.js');

if (!fs.existsSync(packagePath) || !fs.existsSync(targetPath)) {
  console.log('[TrekkEZ] expo-router patch skipped: package is not installed.');
  process.exit(0);
}

const installed = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
if (!installed || !installed.startsWith('57.')) {
  console.log(`[TrekkEZ] expo-router ${installed || 'unknown'} detected; SDK 57 patch skipped.`);
  process.exit(0);
}

let source = fs.readFileSync(targetPath, 'utf8');
if (source.includes('pendingUnhandledLinkRef')) {
  console.log('[TrekkEZ] expo-router initial-link race patch already applied.');
  process.exit(0);
}

const hookAnchor = '    const independent = (0, native_1.useNavigationIndependentTree)();';
const initialUrlAnchor = `                        if (typeof url === 'string') {
                            // If the link were handled, it gets cleared in NavigationContainer
                            onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
                        }`;

if (!source.includes(hookAnchor) || !source.includes(initialUrlAnchor)) {
  console.error('[TrekkEZ] expo-router 57 file layout changed; initial-link patch was not applied.');
  process.exit(1);
}

source = source.replace(hookAnchor, `${hookAnchor}
    const isLinkingMountedRef = (0, react_1.useRef)(false);
    const pendingUnhandledLinkRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        isLinkingMountedRef.current = true;
        if (pendingUnhandledLinkRef.current !== null) {
            const pendingPath = pendingUnhandledLinkRef.current;
            pendingUnhandledLinkRef.current = null;
            onUnhandledLinking(pendingPath);
        }
        return () => { isLinkingMountedRef.current = false; };
    }, [onUnhandledLinking]);`);

source = source.replace(initialUrlAnchor, `                        if (typeof url === 'string') {
                            // Defer this state update until NavigationContainer has committed.
                            const path = (0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url);
                            if (isLinkingMountedRef.current) {
                                onUnhandledLinking(path);
                            }
                            else {
                                pendingUnhandledLinkRef.current = path;
                            }
                        }`);

fs.writeFileSync(targetPath, source, 'utf8');
console.log(`[TrekkEZ] Patched expo-router ${installed} initial-link mount race.`);
