# Mapping New UI ↔ Backend, KHÔNG SỬA FRONTEND

Đây là tài liệu cho giai đoạn tích hợp **sau này**, không phải các thay đổi đã áp dụng.

| File frontend New UI (giữ nguyên) | API backend liên quan |
|---|---|
| `app/login.tsx` | `auth` |
| `app/(tabs)/index.tsx`, `app/post.tsx` | `community`, `posts`, `social` |
| `app/(tabs)/plan.tsx`, `app/makeaplan.tsx` | `plans`, `planCatalog`, `planTime`, `teams`, `teamInvitations` |
| `app/makearoute.tsx` | `directions` |
| `app/(tabs)/team.tsx` | `teams`, `joinRequests` |
| `app/(tabs)/profile.tsx` | `account`, `social`, `activityProfile` |

Hiện các màn hình vẫn dùng MOCK/INITIAL data; không được phép chỉnh sửa frontend, vì vậy chưa có màn hình nào thực sự gọi backend. Muốn hoạt động thật, frontend owner cần nối dữ liệu và actions sau này mà không thay đổi layout/styles/tên file.
