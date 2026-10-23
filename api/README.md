# TrekkEZ API services

## Phạm vi

`api/` chứa TypeScript client services/adapters gọi Supabase Auth, PostgREST và Storage. Đây không phải server backend độc lập; dữ liệu và chính sách truy cập vẫn được thực thi trên Supabase.

Các luồng đang được gọi từ ứng dụng ở snapshot `main` `f0be299` gồm:

- Auth: email/password, khôi phục phiên, kiểm tra phiên và đăng xuất.
- Home/Community: tải feed, Following, like, save, bình luận và bài đăng.
- Team: danh sách/chi tiết, tạo nhóm, thành viên, yêu cầu tham gia và lời mời.
- Plan/Route: đọc dữ liệu, tạo Plan, tạo/đọc Route và waypoint.
- Profile: đọc/cập nhật hồ sơ, avatar, kết nối follow và chỉ đọc tổng hợp Activity.

Khi làm backend, chỉ sửa `api/`; không đổi `app/`, `components/`, bố cục, style, điều hướng, dependency hay schema Supabase nếu chưa được yêu cầu riêng.

## Cấu hình

Tạo `.env` cục bộ từ mẫu cấu hình của dự án, dùng URL Supabase và anon/publishable key:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
EXPO_PUBLIC_MAPBOX_KEY=<optional-public-mapbox-token>
```

Không commit `.env`, service role key, database password, access token hoặc secret. Mọi biến `EXPO_PUBLIC_*` được đóng gói vào client và không phải bí mật.

## Kiểm thử

Từ thư mục gốc:

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
node api/tests/test-team-write.cjs
node api/tests/test-scope-check.cjs
node api/scripts/check-scope.cjs
```

Các test `*.cjs` mock Supabase; chúng không xác nhận cấu hình RLS, SQL schema, Storage bucket, OAuth allowlist hoặc kết nối cloud thực tế.

## Giới hạn cần xác minh trên staging

- RLS và schema thực tế của `profiles`, `routes`, `waypoints`, Team/Plan và các RPC.
- Ghi dữ liệu cần kiểm tra bằng hai tài khoản test khác nhau để xác nhận quyền sở hữu.
- Google OAuth cần callback URL và cấu hình provider hợp lệ.
- Route save gồm nhiều request, chưa phải transaction nguyên tử; cleanup khi lỗi là best effort.
- Activity chỉ đọc `activity_sessions` để tổng hợp Profile; không ghi GPS hoặc track points.
- Mapbox/native runtime cần test trên build thiết bị; unit test không thay thế kiểm thử đó.
