# Phạm vi backend TrekkEZ New UI

| Luồng New UI | API được giữ | Giới hạn hiện tại |
|---|---|---|
| Login/session | Auth session + Supabase Auth | Email/password đã nối; Google OAuth cần provider/callback. |
| Home/Post/Comment/Following | Community + social | Following xác minh attribution trước khi lọc bài. |
| Plan wizard/list/manage | Plan, checklist, mapper | RLS/schema và ghi thực cần test ở staging. |
| Route builder/list/detail | Mapbox directions + route read/write | Save gồm nhiều request, chưa atomic; cần schema/RLS chính xác. |
| Team/create/join/manage/invite | Team, join request, invitation | Kiểm thử quyền owner/member bằng nhiều tài khoản. |
| Profile/follows/avatar | Account + social | Upload yêu cầu bucket/policy phù hợp. |
| Profile activity totals | Activity profile | Chỉ đọc `activity_sessions`; không ghi GPS hay track points. |

## Ngoài phạm vi

- Watch/Zepp/Amazfit/health metrics.
- Shop/product catalog ngoài equipment catalog của Plan.
- Safety center, emergency contacts và notifications riêng.
- Background GPS, track upload, SQLite/offline maps và live navigation.

## Quy tắc thay đổi

- Backend-only branch: thay đổi source và tests nằm dưới `api/`.
- Không thay đổi `app/`, `components/`, `assets/`, layout/styles/navigation hoặc package/dependency.
- Không tự sửa schema, migration, RLS hay dữ liệu production.
