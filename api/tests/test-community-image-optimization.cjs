const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const servicePath = path.join(__dirname, '../services/community/community-supabase.ts');
const source = fs.readFileSync(servicePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);

function loadService(dimensions, imageManipulatorUnavailable = false) {
  const uploads = [];
  const manipulations = [];
  const service = {};
  const imageManipulator = {
    SaveFormat: { JPEG: 'jpeg' },
    ImageManipulator: {
      manipulate(sourceImage) {
        const context = {
          crop(rect) {
            manipulations.push(rect);
            return context;
          },
          resize(size) {
            manipulations.push(size);
            return context;
          },
          async renderAsync() {
            if (typeof sourceImage === 'string') return { ...dimensions, sourceImage };
            return {
              async saveAsync(options) {
                manipulations.push(options);
                return { uri: 'file://optimized.jpg' };
              },
            };
          },
        };
        return context;
      },
    },
  };
  new Function('exports', 'require', compiled.outputText)(service, (name) => {
    if (name === '../auth/auth-session') {
      return { getAuthSession: async () => ({ userId: 'user-1', accessToken: 'token' }) };
    }
    if (name === 'expo-image-manipulator') {
      if (imageManipulatorUnavailable) throw new Error("Cannot find native module 'ExpoImageManipulator'");
      return imageManipulator;
    }
    if (name === '../core/supabase-client') {
      return {
        getAllSupabaseRows: async () => [],
        supabaseRequest: async () => [],
        uploadSupabaseStorageFile: async (upload) => {
          uploads.push(upload);
          return 'https://test.invalid/post.jpg';
        },
      };
    }
    throw new Error(`Unexpected import: ${name}`);
  });
  return { uploadCommunityImage: service.uploadCommunityImage, uploads, manipulations };
}

(async () => {
  const landscape = loadService({ width: 4000, height: 3000 });
  await landscape.uploadCommunityImage('file://source.png', 'image/png', 'post-1', 'user-1');
  assert.deepEqual(landscape.manipulations[0], { originX: 500, originY: 0, width: 3000, height: 3000 });
  assert.deepEqual(landscape.manipulations[1], { width: 1080, height: 1080 });
  assert.deepEqual(landscape.manipulations[2], { compress: 0.78, format: 'jpeg' });
  assert.equal(landscape.uploads[0].fileUri, 'file://optimized.jpg');
  assert.equal(landscape.uploads[0].contentType, 'image/jpeg');
  assert.equal(landscape.uploads[0].objectPath, 'user-1/post-post-1.jpg');

  const portrait = loadService({ width: 900, height: 1600 });
  await portrait.uploadCommunityImage('file://portrait.jpg', 'image/jpeg', 'post-2', 'user-1');
  assert.deepEqual(portrait.manipulations[0], { originX: 0, originY: 350, width: 900, height: 900 });
  assert.deepEqual(portrait.manipulations[1], { compress: 0.78, format: 'jpeg' });

  const small = loadService({ width: 600, height: 400 });
  await small.uploadCommunityImage('file://small.jpg', 'image/jpeg', 'post-3', 'user-1');
  assert.deepEqual(small.manipulations[0], { originX: 100, originY: 0, width: 400, height: 400 });
  assert.deepEqual(small.manipulations[1], { compress: 0.78, format: 'jpeg' });

  const missingNativeModule = loadService({ width: 600, height: 400 }, true);
  await assert.rejects(
    missingNativeModule.uploadCommunityImage('file://small.jpg', 'image/jpeg', 'post-4', 'user-1'),
    /rebuild và cài lại Expo development build/,
  );
  console.log('PASS: Square image optimization and actionable missing-native-module error.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
