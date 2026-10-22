# Đối chiếu New UI → backend (giữ/bỏ)

| New UI đang có | Backend giữ lại | Giới hạn |
|---|---|---|
| `app/login.tsx` | `auth/`, `core/` | Form & OAuth chưa nối; chỉ là SDK |
| `app/(tabs)/index.tsx`, `app/post.tsx` | `community/`, `social/` | Feed, posts, comment, follow; UI đang mock |
| `app/(tabs)/plan.tsx`, `app/makeaplan.tsx` | `plan-team-supabase`, `plan-item-catalog`, `trip-time` | Plan/team/wizard; route cloud chưa được xác minh |
| `app/makearoute.tsx` | `mapbox-directions`, `types/route` | Lấy tuyến cơ bản, chưa có backend cloud save Route |
| `app/(tabs)/team.tsx`, team cards, invitation users trong wizard | `team/`, `team-invitation`, `team-join-request` | Cần ghép form và map model |
| `app/(tabs)/profile.tsx` | `account/`, `social/`, `activity/activity-profile.ts` | Chỉ đọc số liệu Activity, không ghi GPS; chưa định nghĩa streak |

## Bỏ vì New UI không có tính năng tương ứng

- Watch/Zepp/Amazfit/Health metrics và `zepp-watch/`, Zepp bridge.
- Shop/product catalog (khác danh mục trang bị trong kế hoạch).
- Safety center/emergency contacts.
- Notifications page/inbox (và `notification-supabase.ts`).
- Activity GPS recorder, background location, Activity track upload, track points, SQLite/offline maps, Trip live tracking.
- `route-navigation.ts` vì chưa có chức năng điều hướng live/progress được thể hiện trong New UI.

## Kiểm chứng

Chỉ so sánh các file có trong hai ZIP. Chưa test thiết bị, chưa xác nhận schema Supabase.
