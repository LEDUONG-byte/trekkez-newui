# TrekkEZ NewUI — tích hợp kiểm thử từ snapshot có sẵn

## Đã nối với API Supabase
- Login bằng Email/Password thật, restore session, session guard tab, logout. Google OAuth **chưa** tích hợp nên hiện thông báo thay vì đăng nhập giả.
- Team: tải danh sách thật; Plan/Route: tải danh sách thật; Home: feed/following thật, like/save/follow tác giả từ server (cần quyền RLS).
- Profile: lấy dữ liệu thật, thống kê hoạt động thật, bài đăng của mình (có ảnh), lượt follow (nếu RPC có quyền).
- Make a plan: tải route/team/categories thật, lưu `createRemotePlan` ở nút Continue cuối. Nếu không có route thật thì chặn lưu.

## Chưa đủ để gọi hoàn chỉnh 100%
- Google OAuth thiếu cấu hình OAuth callback/ID token.
- Form tạo Route và tạo bài Community vẫn là UI placeholder, không có contract ghi Route đã xác minh.
- Tạo Team từ màn hình Team chưa có form, join/invite/comment cần thiết kế logic nghiệp vụ thêm.
- Mapbox/React Native Maps phải test trên native APK, web không thay thế được.
- Các tính năng thiếu không đánh dấu PASS chỉ vì UI mở được.

## Sử dụng
1. Trên NHÁNH MỚI Git, không ghi đè main. So sánh các file `app/` với nhánh của nhóm trưởng trước khi chép vì mã nguồn gốc là ZIP snapshot đã gửi trước đó; có thể khác origin/main hiện tại.
2. Sao lưu dự án. Overlay các file trong bản ZIP Patch vào thư mục dự án cùng đường dẫn; không xóa nội dung có sẵn.
3. Tạo `.env` từ `.env.example`, điền URL và anon key từ môi trường TrekkEZ của bạn; KHÔNG chia sẻ key trong chat.
4. `npm ci` rồi `npx tsc --noEmit`; thử `npx expo start --web -c`.
5. Test 1: login sai phải báo lỗi, login đúng phải vào tab, F5 vẫn còn session, signout phải quay Login.
6. Test 2: Home/Team/Plan/Profile hiện dữ liệu thật hoặc trạng thái rỗng, không còn bài/plan/người dùng mock.
7. Plan SAVE: phải có Route thật trong Supabase, lưu rồi xem lại Plan. Chỉ dùng tài khoản test được phép ghi.
8. Native Maps: cần build APK chứa native module; để sửa SDK missing, cấu hình `ANDROID_HOME` / `android/local.properties`.

**Bảo mật:** Expo `EXPO_PUBLIC` là biến công khai. Chỉ dùng anon/publishable key, không dùng service role hoặc secret.

**Kiểm thử:** Các assert chuỗi được chạy trên snapshot; chưa test kết nối Supabase của bạn hoặc runtime Android.
