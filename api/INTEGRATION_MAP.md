# New UI ↔ API map (backend reference)

Tài liệu phản ánh các luồng đã nối trong snapshot `main` `f0be299`. Backend-only changes phải giữ nguyên toàn bộ UI/UX và chỉ sửa trong `api/`.

| Luồng ứng dụng | API services | Ghi chú |
|---|---|---|
| Login, session guard, logout | `auth/`, `core/` | Email/password được nối; Google OAuth còn phụ thuộc callback/provider config. |
| Home, post, comments, Following | `community/`, `social/`, `newui-gateway.ts` | Theo dõi tác giả; bài có owner/author không xác minh được không đưa vào Following. |
| Team, create/join/manage/invite | `team/`, `manage-plan-adapter.ts` | Quyền owner/member và RLS cần kiểm tra bằng tài khoản staging. |
| Plan list, create, checklist | `plan/`, `manage-plan-adapter.ts`, `newui-gateway.ts` | Lưu Plan phụ thuộc bảng/columns và quyền Supabase. |
| Route list, detail, save | `route/`, `newui-gateway.ts` | Route save ghi `routes` và `waypoints`; schema/RLS phải khớp trước khi ghi. |
| Profile, avatar, follow counts | `account/`, `social/` | Cập nhật Profile cần đọc lại để xác nhận giá trị được lưu. |
| Activity totals trên Profile | `activity/activity-profile.ts` | Read-only `activity_sessions`; không ghi GPS, không đọc track points. |

## Không thuộc phạm vi hiện tại

Watch/Zepp/Amazfit, shop, safety center, notifications riêng, ghi GPS nền, offline tracking và live navigation. Không thêm lại các dịch vụ này chỉ vì chúng tồn tại ở dự án cũ.

## Giới hạn kiểm thử

Các test trong `api/tests/` dùng mock hoặc kiểm tra cấu trúc; không thay thế kiểm thử RLS/schema/RPC/Storage trên Supabase staging.
