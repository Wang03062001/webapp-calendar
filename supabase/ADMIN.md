# Thiết lập tài khoản và quản trị

Ứng dụng hỗ trợ tên đăng nhập, email khôi phục, mã email để đặt lại mật khẩu và quản trị tài khoản. Chủ project cần thực hiện các bước dưới đây một lần. Public key không có quyền cài SQL hoặc triển khai Edge Functions.

## 1. Cài bảng và quyền

Trong SQL Editor, chạy toàn bộ [admin-setup.sql](admin-setup.sql) sau khi đã chạy `setup.sql`.

Script tạo hồ sơ tên đăng nhập, danh sách admin được bảo vệ và kiểm tra khóa tài khoản. Người dùng không tự cấp quyền bằng `user_metadata`, tên `admin` hay mã frontend. Khi chạy lại `setup.sql` trong tương lai, chạy lại `admin-setup.sql` sau đó để giữ kiểm tra khóa tài khoản.

Tài khoản cũ được cấp tên tự động `user_...`; có thể tiếp tục đăng nhập bằng email. Admin có thể sửa tên đăng nhập cho những tài khoản này. Tên đăng nhập mới cần 3–30 ký tự, bắt đầu bằng chữ thường, chỉ gồm chữ thường, số và `_`.

## 2. Khởi tạo admin đầu tiên

1. Vào **Authentication → Users → Add user → Create new user** (không dùng Invite).
2. Điền email kỹ thuật `admin@calendar.invalid`. Đây không phải hộp thư thật; người dùng chỉ nhập `admin` khi đăng nhập.
3. Tự đặt mật khẩu riêng từ 8 ký tự trở lên, bật **Auto Confirm User**, rồi tạo user. Không gửi mật khẩu vào chat và không ghi vào repository.
4. Chạy toàn bộ [bootstrap-admin.sql](bootstrap-admin.sql) trong SQL Editor. Script gán tên đăng nhập `admin` và quyền admin cho đúng user vừa tạo; không chứa mật khẩu.

Email kỹ thuật không nhận được thư khôi phục. Nếu quên mật khẩu tài khoản này, chủ project có thể tạo/đăng ký một tài khoản khác rồi cấp quyền qua SQL, ví dụ (thay email mẫu bằng email của tài khoản đã tồn tại):

```sql
insert into public.calendar_admins(user_id)
select id from auth.users where lower(email) = lower('email-cua-ban@example.com')
on conflict do nothing;
```

Sau khi đăng nhập tài khoản admin mới, có thể đổi email kỹ thuật của admin cũ sang email thực để dùng chức năng khôi phục. Không xóa tài khoản để khôi phục mật khẩu vì dữ liệu thuộc tài khoản đó có thể bị xóa theo.

## 3. Triển khai hai Edge Functions

Trên Supabase Dashboard, mở **Edge Functions → Deploy a new function → Via Editor**:

- Tên `admin-accounts`: sao chép toàn bộ [dashboard/admin-accounts.ts](dashboard/admin-accounts.ts) vào editor và Deploy.
- Tên `account-login`: sao chép toàn bộ [dashboard/account-login.ts](dashboard/account-login.ts) vào editor và Deploy.

Trong phần cấu hình của mỗi function, tắt **Verify JWT / Verify JWT with legacy secret**. `admin-accounts` tự xác minh access token qua Supabase Auth, kiểm tra tài khoản có bị khóa không và kiểm tra bảng admin ở mọi yêu cầu; `account-login` xác minh mật khẩu qua Supabase Auth. Đây không phải bỏ xác thực quyền admin.

Supabase cung cấp sẵn `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ở môi trường Edge Function. Khóa quản trị chỉ được đọc phía server, không đưa vào frontend, GitHub hay chat.

Nếu dùng CLI thay Dashboard:

```sh
supabase functions deploy admin-accounts --project-ref mjgxzzxmfifhoymvdaoe --no-verify-jwt
supabase functions deploy account-login --project-ref mjgxzzxmfifhoymvdaoe --no-verify-jwt
```

Nguồn duy trì ở `functions/_shared/` và các file `index.ts`; bản Dashboard là file độc lập được tạo bằng `node scripts/build-edge-functions.mjs`. Chạy lại lệnh này khi sửa nguồn functions trước khi triển khai lại. Functions mặc định chỉ nhận yêu cầu trình duyệt từ `https://wang03062001.github.io`; thử bằng Dashboard không có Origin hoặc chỉnh danh sách Origin trong nguồn nếu cần môi trường khác.

## 4. Cấu hình email mã khôi phục

Trong **Authentication → Email Templates → Reset Password**, thay nội dung bằng [templates/recovery.html](templates/recovery.html). Mẫu cần có `{{ .Token }}` để người dùng nhận mã nhập vào website. Cấu hình gửi email/SMTP, hạn mức gửi và thời gian hết hạn mã theo project. Giữ Site URL/Redirect URLs là `https://wang03062001.github.io/webapp-calendar/`.

Để đổi mật khẩu trực tiếp trong phiên đăng nhập mà không yêu cầu OTP như yêu cầu của chủ ứng dụng, giữ tùy chọn **Secure password change** tắt trong cài đặt Auth. Việc đổi mật khẩu vẫn yêu cầu access token của tài khoản đang đăng nhập; tài khoản chưa đăng nhập phải xác minh mã khôi phục.

## 5. Sử dụng

- Tải lại website bằng Ctrl+F5, bấm Đăng nhập, nhập `admin` và mật khẩu riêng đã đặt ở bước 2.
- Mở **Tài khoản → Quản lý tài khoản** để sửa tên đăng nhập/tên hiển thị, đổi email, khóa/mở, gửi email đặt lại mật khẩu và cấp/thu hồi admin. Mỗi thao tác được kiểm tra lại ở server; không thể tự khóa hoặc tự thu hồi admin của tài khoản đang dùng.
- Người dùng thường đăng ký tên tài khoản + email + mật khẩu. Nếu có xác nhận email, cần xác nhận trước khi đăng nhập.
- **Quên mật khẩu**: nhập email đã đăng ký → Gửi mã → nhập mã trong email → Xác nhận → tạo mật khẩu mới.
- **Tài khoản → Đổi mật khẩu**: nhập và xác nhận mật khẩu mới, không cần mã email khi phiên đăng nhập còn hợp lệ.
- Quyền quản trị tài khoản không mở quyền xem bảng dữ liệu chi tiêu cá nhân của tài khoản khác. Khóa tài khoản chặn đăng nhập và chặn đọc/ghi dữ liệu lịch dù access token cũ chưa hết hạn.

Kiểm thử trong repository dùng mô phỏng API; kiểm thử SQL thực hiện trên PostgreSQL thử nghiệm. Triển khai thật và các cài đặt email cần được kiểm tra trong project của chủ ứng dụng.
