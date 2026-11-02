# Triển khai hồ sơ và xác nhận đổi email

Đây là phần cài đặt một lần trên Supabase. Chỉ public key trong repository không đủ quyền triển khai. Mã giao diện, SQL, Edge Function và bundle Dashboard đã có sẵn; chưa có cấu hình gửi thư hay migration thật nào được thực hiện chỉ bằng việc đẩy GitHub.

## 1. Cơ sở dữ liệu

Trong **SQL Editor**, chạy toàn bộ [account-settings.sql](account-settings.sql), sau `setup.sql` và `admin-setup.sql`. Script có thể chạy lại. Không thay đổi dữ liệu thu chi hiện có.

Script tạo bảng trạng thái mã xác nhận chỉ service role được truy cập, RPC kiểm tra quyền/chuỗi bước và trigger trên `auth.users.email`. Trigger chặn đổi email trực tiếp bằng Auth API hoặc đường admin cũ khi chưa đủ hai mã. Bảng OTP không cấp quyền đọc/ghi cho `anon` hay `authenticated`.

## 2. Gửi mã email — Gmail, không cần tên miền riêng

Bạn có thể dùng Gmail cá nhân làm hộp thư gửi mã. Website vẫn ở GitHub Pages; không cần mua tên miền. Thư đến địa chỉ email cũ/mới của người dùng, không bắt buộc người nhận dùng Gmail.

1. Đăng nhập Gmail muốn dùng để gửi thư. Mở https://myaccount.google.com/security và bật **Xác minh 2 bước / 2-Step Verification**.
2. Mở https://myaccount.google.com/apppasswords, tạo mật khẩu ứng dụng, đặt tên `Calendar Supabase`. Google hiển thị một mật khẩu ứng dụng 16 ký tự.
3. Trong Supabase chọn **Edge Functions → Secrets → Add secret**, thêm:

   | Tên | Giá trị |
   |---|---|
   | `SMTP_USER` | Địa chỉ Gmail gửi thư, ví dụ `yourname@gmail.com` |
   | `SMTP_PASS` | Mật khẩu ứng dụng 16 ký tự vừa tạo, không phải mật khẩu đăng nhập Gmail |

4. Lưu secrets rồi deploy lại **account-settings** bằng bản code mới ở bước 3. Mặc định gửi qua `smtp.gmail.com:465` có TLS. Người gửi mặc định chính là `SMTP_USER`; không cần thêm `EMAIL_FROM`. Nếu trước đó đã thêm `EMAIL_FROM` cho Resend, hãy đổi nó thành cùng địa chỉ Gmail hoặc xóa secret này.
5. Không cần `RESEND_API_KEY` khi đã cấu hình SMTP. Nếu có cả hai, function ưu tiên SMTP. Mã không thử gửi qua nhà cung cấp khác khi SMTP lỗi.

Nếu Google không hiển thị mục mật khẩu ứng dụng, kiểm tra Xác minh 2 bước đã bật và tài khoản có bị giới hạn bởi Google Workspace/Advanced Protection hay chính sách quản trị không. Chức năng này cần tài khoản cho phép tạo mật khẩu ứng dụng; không nhập mật khẩu Gmail thông thường để thay thế.

Tùy chọn dùng SMTP khác: thêm `SMTP_HOST`, `SMTP_PORT` (465 dùng TLS trực tiếp hoặc 587 bắt buộc STARTTLS) và `EMAIL_FROM` theo nhà cung cấp. Chứng chỉ TLS luôn được kiểm tra. Tài khoản Gmail có hạn mức gửi; cách này phù hợp ứng dụng cá nhân.

**Nếu đã có Resend và tên miền riêng:** có thể giữ cách cũ bằng `RESEND_API_KEY` và `EMAIL_FROM` đã xác minh, đồng thời không cấu hình cặp `SMTP_USER`/`SMTP_PASS`.

Không đặt mật khẩu/khóa trong frontend, GitHub hay chat. Đây là cấu hình riêng của Edge Function gửi mã đổi email; thư đăng ký/khôi phục mật khẩu Supabase Auth vẫn dùng cấu hình Auth hiện có. Máy chủ chỉ gửi tới email hiện tại lấy từ Auth, hoặc email mới nhập sau khi xác minh email hiện tại.

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
