# API Merge-Ready changes

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
