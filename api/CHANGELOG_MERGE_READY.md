# API Merge-Ready changes

## Backend hardening on main baseline `f0be299` (2026-10-23)

- `services/core/supabase-client.ts`: validate PostgREST page sizes, replace existing `limit`/`offset` parameters safely, and fail on non-array paginated responses instead of silently returning incomplete data.
- `services/account/account-supabase.ts`: allowlist editable profile fields and confirm every requested change by reading the profile back after PATCH.
- `scripts/check-scope.cjs`: include untracked files so a new UI file cannot bypass the API-only branch guard.
- `tests/test-core-pagination.cjs`, `tests/test-account-profile-write.cjs`, and `tests/test-scope-check.cjs`: add regression coverage for pagination, profile-write confirmation/security, and untracked-file scope enforcement.
- Refresh `README.md`, `INTEGRATION_MAP.md`, `SCOPE_MATRIX.md`, and `MERGE_HANDOFF.md` to describe the currently integrated backend and feature-branch workflow.
- No frontend, package/dependency, Supabase schema, RLS, or data changes.

- `integration/newui-mappers.ts`: ánh xạ dữ liệu Team, Plan, Route, Home Post/Team sang props đang dùng trong New UI.
- `integration/newui-gateway.ts`: API một cửa cho dữ liệu đọc các tab Home, Team, Plan, Route, Profile; chỉ hàm dữ liệu, không sửa màn hình.
- `services/plan/plan-team-supabase.ts`: thêm `getRemotePlans`, tải checklist status của chính user trong một request, thay cho không có API liệt kê.
- `services/route/route-read.ts`: liệt kê Route **chỉ của chủ tài khoản**, mapping defensive trên các cột mô tả chưa được kiểm chứng. Không tự mở quyền RLS hay thêm save chưa rõ schema.
- `services/core/supabase-base.ts`: khai báo URL/key đã kiểm tra tồn tại dưới dạng `string` để không gây lỗi strict TypeScript.
- `index.ts`: xuất `routes`, `newUi`, UI mappers.
- `tests/*`: kiểm thử mock cho mapper/gateway bằng TypeScript hiện đã có trong project; không dùng Supabase thật.
- `scripts/check-scope.cjs`: kiểm tra tracked diff so với origin/main không chứa file ngoài `api/`.
- `MERGE_HANDOFF.md`: bàn giao điểm tích hợp và giới hạn chưa test.

**Không thay đổi bất kỳ file frontend nào; không đụng Supabase schema; không cài dependency.**
