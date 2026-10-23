# TrekkEZ API handoff — backend-only development

## Baseline và giới hạn

- Baseline: `main` commit `f0be2994c9d23818e22bfff234a6a01023146ff5` (snapshot nhận ngày 2026-10-23).
- Tạo nhánh phụ từ `main` cho từng lượt backend work; không push trực tiếp `main` khi phát triển.
- Mọi thay đổi source, tests và tài liệu trong lượt này phải nằm dưới `api/`.
- Không sửa `app/`, `components/`, `assets/`, UI/UX, layout, navigation, package files hoặc schema Supabase.
- `api/` là Supabase client SDK/adapters; Supabase cloud vẫn thực thi dữ liệu, auth và RLS.

## Backend contracts hiện có

- Auth/session, Home/Community, follow, Team, Plan, Route, Profile và read-only Activity summary được gọi từ app.
- Các adapter được xuất qua `api/index.ts`; ưu tiên cập nhật contract/API trong `api/`, giữ tương thích với các màn hình hiện có.
- Route save là chuỗi ghi Route + waypoints; lỗi giữa chừng có cleanup best-effort, không có transaction nguyên tử.
- Không diễn giải test mock thành xác nhận Supabase thật. Cần staging để xác minh schema, RLS, RPC và Storage.

## Kiểm tra trước commit

```powershell
npx tsc --noEmit
node api/tests/test-mappers.cjs
node api/tests/test-gateway.cjs
node api/tests/test-route-write.cjs
node api/tests/test-route-detail-read.cjs
node api/tests/test-follow-route-fix.cjs
node api/tests/test-manage-plan.cjs
node api/tests/test-core-pagination.cjs
node api/tests/test-account-profile-write.cjs
node api/tests/test-scope-check.cjs
git diff --check
node api/scripts/check-scope.cjs
git status --short
```

`check-scope.cjs` so sánh với `origin/main`; chạy `git fetch origin main` trước khi dùng.

## Git workflow

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/backend-<ten-ngan>
# sửa và kiểm thử api/
git add api/
git diff --cached --check
node api/scripts/check-scope.cjs
git commit -m "feat(api): <mo-ta-ngan>"
git push -u origin feat/backend-<ten-ngan>
```

Tạo PR từ nhánh phụ sang `main` sau khi review. Không commit `.env`, credentials, service role key hoặc dữ liệu người dùng.
