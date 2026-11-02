# Triển khai hồ sơ và xác nhận đổi email

Đây là phần cài đặt một lần trên Supabase. Chỉ public key trong repository không đủ quyền triển khai. Mã giao diện, SQL, Edge Function và bundle Dashboard đã có sẵn; chưa có cấu hình gửi thư hay migration thật nào được thực hiện chỉ bằng việc đẩy GitHub.

## 1. Cơ sở dữ liệu

Trong **SQL Editor**, chạy toàn bộ [account-settings.sql](account-settings.sql), sau `setup.sql` và `admin-setup.sql`. Script có thể chạy lại. Không thay đổi dữ liệu thu chi hiện có.

Script tạo bảng trạng thái mã xác nhận chỉ service role được truy cập, RPC kiểm tra quyền/chuỗi bước và trigger trên `auth.users.email`. Trigger chặn đổi email trực tiếp bằng Auth API hoặc đường admin cũ khi chưa đủ hai mã. Bảng OTP không cấp quyền đọc/ghi cho `anon` hay `authenticated`.

## 2. Gửi mã email

Tạo dịch vụ gửi email tại **Resend**, xác minh tên miền gửi thư. Trong **Edge Functions → Secrets** thêm:

- `RESEND_API_KEY`: API key của dịch vụ, chỉ lưu phía server.
- `EMAIL_FROM`: địa chỉ gửi đã được Resend xác minh, ví dụ `Calendar <account@your-verified-domain.example>`.

Không đặt các giá trị bí mật trong frontend, GitHub hay chat. Đây là cấu hình riêng cho mã đổi email; thư đăng ký và khôi phục mật khẩu Supabase vẫn dùng cấu hình Auth hiện có. Máy chủ chỉ gửi mã tới email hiện tại lấy từ Auth, hoặc email mới do người dùng nhập sau khi xác minh email hiện tại.

## 3. Edge Functions

Trong Dashboard triển khai:

- **account-settings**: dán toàn bộ [dashboard/account-settings.ts](dashboard/account-settings.ts).
- Cập nhật **admin-accounts** bằng [dashboard/admin-accounts.ts](dashboard/admin-accounts.ts) để bỏ API đổi email trực tiếp trước đây.

Tắt **Verify JWT with legacy secret** cho các function: chúng tự xác thực token qua Auth, kiểm tra tài khoản hoạt động và quyền admin ở server. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` do môi trường Supabase cung cấp; service role không được trả về trình duyệt.

Hoặc dùng CLI đã đăng nhập:

```sh
supabase functions deploy account-settings --project-ref mjgxzzxmfifhoymvdaoe --no-verify-jwt
supabase functions deploy admin-accounts --project-ref mjgxzzxmfifhoymvdaoe --no-verify-jwt
```

CORS mặc định cho `https://wang03062001.github.io`. Nếu chuyển domain, đặt `ALLOWED_ORIGINS` thành danh sách origin cách nhau dấu phẩy, không dùng `*`.

## 4. Kiểm tra sau triển khai

1. Tài khoản thường đổi username/tên hiển thị của chính mình. Tên tài khoản phải duy nhất, 3–30 ký tự chữ thường, số hoặc `_`, bắt đầu bằng chữ. Tài khoản thường không được sửa người khác.
2. Bấm **Đổi email → Gửi mã đến email cũ**. Nhập mã 6 số từ hộp thư cũ. Email Auth vẫn giữ nguyên và chưa xuất hiện ô nhập email mới trước khi mã cũ đúng.
3. Nhập email mới, gửi mã. Nhập sai mã mới phải giữ email cũ. Chỉ khi mã mới đúng thì Auth cập nhật email và xác nhận địa chỉ mới. Đăng nhập bằng username vẫn trỏ tới cùng user ID/dữ liệu.
4. Admin thực hiện cùng quy trình cho tài khoản khác; không bỏ qua quyền sở hữu hai hộp thư.
5. Mã hết hạn sau 10 phút, tối đa 5 lần sai. Gửi lại cách ít nhất 60 giây. Dùng **Bắt đầu lại / gửi lại mã** để bắt đầu lại từ email cũ. Mất quyền admin/bị khóa phải bị từ chối cả ở yêu cầu tiếp theo và khi cập nhật email.

Không trả OTP/hash về client, không ghi mã hay khóa vào log. Gửi thư thất bại không đổi email. Nếu mất kết nối khi bước cuối đã được chấp nhận, có thể thử lại cùng mã để đối chiếu Auth và hoàn tất; challenge đã hoàn thành không được dùng lại. Challenge đang cập nhật khóa yêu cầu mới đến khi hoàn tất hoặc hết hạn. Có thể dọn các bản ghi `done`/`failed` đã cũ bằng tác vụ quản trị riêng.

## Email cũ không thể truy cập

Địa chỉ kỹ thuật `admin@calendar.invalid` không phải hộp thư nhận mã. Luồng ứng dụng không được bỏ qua xác minh cũ cho địa chỉ này. Chủ project phải xử lý việc khôi phục tài khoản trực tiếp trong Supabase sau khi xác minh danh tính; có thể tạo tài khoản bằng email thật và cấp quyền admin qua SQL. Không xóa tài khoản cũ để tránh mất dữ liệu. Trigger đổi email là chủ ý bảo vệ: thao tác khôi phục đặc biệt ngoài ứng dụng phải được chủ project kiểm soát, không thêm nút bỏ qua OTP vào frontend.

## Kiểm thử trong repository

`node test/account.test.js` kiểm tra xác thực/quyền, chuỗi bước, mã sai, cấu hình thiếu và không cập nhật Auth sớm bằng API mô phỏng. `test/account-settings.sql` kiểm tra quyền RPC/bảng, thứ tự, hết hạn, giới hạn lần thử, chống lặp và trigger trên PostgreSQL cô lập. Các bài kiểm tra này không thay thế kiểm tra nhận email thật trong project sau khi deploy.
