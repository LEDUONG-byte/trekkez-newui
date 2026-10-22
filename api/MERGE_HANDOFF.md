# TREKKEZ — Backend merge / test handoff (New UI)

## Mục tiêu và ranh giới

- **Frontend New UI là nguồn chuẩn.** Không thay đổi `app/`, `assets/`, `components/`, navigation, layout, styles, tên file hay `package.json`.
- Gói này là **client SDK TypeScript** và adapter cho New UI; Supabase self-hosted vẫn là backend thực.
- Chỉ có những chức năng hiện diện trong New UI: Login, Home/Community, Team, Plan, Route (đọc/dựng đường), Profile/Activity summary.
- Không có Watch/Amazfit, Shop, Safety, Notification screen, background GPS tracker.
- Không tự thực hiện bất kỳ migration/DDL hoặc dữ liệu ghi/xóa nào khi giải nén.

## API được chuẩn bị cho màn hình

Import từ `api/index.ts` (đường dẫn tương đối được chủ frontend quyết định):

```typescript
import { newUi } from '../api';

// Login: chỉ gọi sau khi có email/password hợp lệ từ UI
await newUi.newUiAuth.signInWithEmail(email, password);

// app/(tabs)/team.tsx: TeamItem[] (mapping theo UI)
const teamCards = await newUi.loadTeamCards();

// app/(tabs)/plan.tsx
const planCards = await newUi.loadPlanCards();
const routeCards = await newUi.loadRouteCards();

// app/makeaplan.tsx
const options = await newUi.loadPlanWizardOptions();

// app/(tabs)/index.tsx
const explore = await newUi.loadExploreFeed();
const following = await newUi.loadFollowingPosts();

// app/(tabs)/profile.tsx
const profile = await newUi.loadProfileOverview();
```

Các hàm **chỉ trả data / xử lý API**, không tự thêm `useEffect`, không thao tác state React, không điều hướng và không thay mock UI. Để app hiển thị dữ liệu thật, chủ frontend phải chủ động nối `useEffect`, loading/error, `setState`, callback buttons tới SDK. Việc này cần sửa logic file màn hình, dù có thể giữ nguyên giao diện.

### Mapping kiểu dữ liệu

- `loadTeamCards()` → `{id,name,isOwnedByYou,color,membersCount,description,createdAt}` tương ứng `TeamItem`.
- `loadPlanCards()` / `loadRouteCards()` → `{id,title,isOwnedByYou,color,details,startDate,createdAt}` tương ứng `PlanItem`.
- `loadExploreFeed()` → `POST | TEAM` với những trường props card hiện có. Danh sách thứ tự là **posts trước, teams sau** (chưa thiết lập xếp hạng theo feed thời gian).
- `loadFollowingPosts()` → **chỉ bài đăng từ tài khoản đang follow**. Chưa có giao thức follow team; không tự giả định team được follow.
- `loadProfileOverview()` → hồ sơ, thống kê Activity thực; `currentStreak` / `completedRoutes` trả `null`, không gán số liệu giả.

### Những điểm chưa được phép kết luận hoàn tất

1. **Frontend chưa được nối**: Login UI mới vẫn chuyển màn hình mà không xác thực; các screen dùng MOCK/INITIAL. Chỉ đưa `api/` vào chưa phải app hoạt động end-to-end.
2. **Cloud Route save chưa hoàn thiện**: adapter Route chỉ đọc các tuyến do người dùng tạo (tránh đọc tuyến riêng tư của tài khoản khác). Không thêm ghi/sửa geometry khi chưa xác minh schema và UI chưa có Save Route.
3. **Ghi dữ liệu chưa có kết quả end-to-end**: Create Team, Join, Invite, Create Plan, Like/Comment/Save, upload ảnh, Mapbox và OAuth cần test riêng trên thiết bị/bằng tài khoản test.
4. **Auth Google**: SDK nhận ID token, nhưng frontend chưa có quy trình OAuth lấy ID token. Không coi nút Google trên UI là đăng nhập thật.
5. **Team RPC**: tests báo `get_team_members_with_profiles`, `get_team_invitations_with_profiles`, `get_team_join_requests_with_profiles` PASS 200 riêng; cần test âm tính tài khoản không phải owner.
6. **RLS**: `routes`, `waypoints`, `team_members` đang có SELECT rộng theo policy được người dùng cung cấp. Adapter route lọc theo `creator_id`, nhưng **đây không thay thế RLS server**. Nên audit chính sách quyền riêng tư trước phát hành.
7. **Dependency audit**: cây Expo cũ báo high/moderate. Không dùng `npm audit fix --force` trong nhánh backend khi chưa thống nhất với frontend owner.
8. **Version trên GitHub**: ZIP frontend được gửi trước đó có thể cũ hơn `main` của nhóm. Dùng `git diff` kiểm tra chỉ sửa `api/`, không ghi đè frontend từ ZIP cũ.

## Kết quả kiểm tra hiện có

**Người dùng chạy trên Supabase thực tế (đầu vào do người dùng cung cấp):**
- Auth login, refresh, session identity, local logout: PASS.
- 20 bảng `public`: REST truy vấn read-only HTTP 200, bật RLS.
- Team RPC: 3 hàm đọc PASS 200 khi kiểm tra riêng bằng tài khoản phù hợp.
- Feature contract: **34 PASS, 0 FAIL, 2 WARN**, WARN ở Cloud Route Save và Expo runtime.

**Kiểm tra mới trong quá trình tạo gói:**
- Mapping/model gateway chạy với mock dependencies: PASS.
- TypeScript kiểm tra nghiêm ngặt (standalone with dependency stubs): PASS.
- 52/52 file frontend trong ZIP New UI gốc: SHA-256 không thay đổi.

Chưa chạy trực tiếp trên điện thoại hoặc kiểm thử Supabase từ gói SDK mới sau khi bổ sung adapter.

## Quy trình để bạn test và đưa code lên GitHub

Trong `E:\\Study\\StudyFromSchool\\ThucHanh\\trekkez-newui`, nhánh `feat/backend-uyen`:

1. Sao lưu `api/` ra ngoài repository nếu muốn hoàn nguyên.
2. Giải nén **Patch ZIP** từ thư mục gốc (chỉ ghi đè/tạo file dưới `api/`). Hoặc dùng **Full API ZIP** nếu muốn thư mục đầy đủ.
3. Chạy:

```powershell
npx tsc --noEmit
node api/tests/test-mappers.cjs
node api/tests/test-gateway.cjs
node api/scripts/check-scope.cjs
git status --short
git add api/
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(api): prepare New UI integration adapters"
```

4. Khi tài khoản `Cuddlebug2004` được cấp quyền collaborator:

```powershell
git push -u origin feat/backend-uyen
```

5. Tạo Pull Request `feat/backend-uyen → main`. Đây là **PR bàn giao SDK thử nghiệm**. Nếu nhóm trưởng muốn test sau merge thì có thể merge khi review xong. Khi chưa nối màn hình, app có thể vẫn hiển thị mock như trước.

**Không commit `.env`, service_role, API secret, access token, mật khẩu hoặc dữ liệu production.**

## Checklist cho bạn phụ trách frontend

- [ ] Nối Login email/password thật; Google OAuth nếu cần.
- [ ] Nối `loadTeamCards`, `loadPlanCards`, `loadRouteCards` vào state UI.
- [ ] Nối Explore/Following feed, các callback like/save/follow, cùng xử lý loading/error.
- [ ] Nối dữ liệu Profile và Activity tổng hợp, phân biệt giá trị chưa hỗ trợ.
- [ ] Nối thao tác tạo Plan, Team và lời mời qua các hàm hiện có trong `api/services/`.
- [ ] Quyết định luồng Save Route trước khi triển khai cloud route CRUD.
- [ ] Test trên Android thật / môi trường staging; test 2 tài khoản để xác minh quyền.
- [ ] Xác nhận không đổi bố cục, styles, navigation hoặc tên file frontend.
