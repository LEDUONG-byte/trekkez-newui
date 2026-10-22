# TrekkEZ Backend (scoped to New UI) — backend only

## Quy tắc dự án

- `trekkez-newui-main.zip` là chuẩn duy nhất về chức năng và màn hình.
- ZIP này **chỉ** có `backend/`. Không có, không chỉnh sửa và không đổi tên bất kỳ file/frontend hiện tại nào.
- Chỉ giữ Auth, Home/Post/Community/Follow, Plan/Route/Equipment catalog (trong wizard), Team/Join/Invite, Profile và **chỉ đọc** thống kê Activity cho Profile.
- Không có Watch/Zepp/Amazfit, Shop, Safety, Notification riêng, ghi GPS/background, SQLite offline tracking, quản lý Activity chuyên biệt hay điều hướng GPS đang chạy.
- Backend ở đây là TypeScript client-side services/SDK giao tiếp Supabase, **không phải** backend server có thể tự chạy. Supabase Auth/DB/RPC/Storage vẫn nằm trên cloud.
- Frontend mới hiện đang dùng mock, chưa gọi các service này. Việc chỉ copy backend không làm app kết nối dữ liệu thật. Phải được phép tích hợp ở giai đoạn khác.

## Cài đặt

Giải nén đặt `backend/` cạnh `app/`, `components/` của New UI. Không ghi đè bất kỳ file gốc nào.
Các import của backend dùng đường dẫn tương đối. Backend kế thừa dependencies đã có trong New UI (`@supabase/supabase-js`, AsyncStorage, `react-native-url-polyfill`); không yêu cầu thêm package mới.

## Biến môi trường (chỉ khi chạy tích hợp)

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
EXPO_PUBLIC_MAPBOX_KEY=<optional-public-mapbox-token>
```

KHÔNG chia sẻ `service_role`, DB password hoặc tokens cá nhân; `EXPO_PUBLIC_*` luôn hiển thị công khai trong bản build client.

## Giới hạn chưa được xác minh

- Chưa có SQL migration/schema/RLS/RPC hiện tại của project Supabase nên không thể xác nhận contract và phân quyền server.
- Chưa chạy TypeScript với node_modules thật của project, chưa kết nối Supabase, chưa chạy Android/iOS.
- New UI không có email/password form và Google OAuth chưa được tích hợp; auth SDK có hàm nhưng nút login mới chỉ điều hướng.
- Module Profile Activity chỉ đọc `activity_sessions`; **không** ghi và **không** truy vấn `activity_track_points`.
- Route được tạo ở New UI cần thiết kế lưu cloud sau; backend cũ không cung cấp Route cloud CRUD hoàn chỉnh.
- Không phải bản production-ready; không công bố 'đã merge hoàn tất'.

Xem `SCOPE_MATRIX.md` và `INTEGRATION_MAP.md` để biết lý do giữ/bỏ từng nhóm.
