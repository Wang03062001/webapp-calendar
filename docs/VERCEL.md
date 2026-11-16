# Triển khai dự án mới trên Vercel

## Trạng thái

Chủ tài khoản xác nhận website đã truy cập được tại **https://quanlychitieu03062001.vercel.app**. Tên `quanlychitieu.vercel.app` thuộc người khác: không dùng tên đó trong Site URL, Redirect URLs hoặc ALLOWED_ORIGINS. Việc truy cập được giao diện chưa xác nhận đăng nhập/Edge Functions đã được cấu hình xong.

Repository đã có cấu hình static build cho Vercel. Việc commit cấu hình không tạo dự án, giữ chỗ tên miền, kết nối tài khoản Vercel/GitHub hay cập nhật Supabase đang chạy. Cần đăng nhập đúng tài khoản để thực hiện các bước dưới đây. Không thay khóa hoặc tạo lại database.

## 1. Tạo dự án và kết nối GitHub

- Đăng nhập Vercel bằng tài khoản cá nhân được chủ repository chỉ định. Kiểm tra email tài khoản và personal scope trước khi tạo dự án.
- Vào https://vercel.com/new → Import Git Repository, kết nối tài khoản GitHub `Wang03062001`. Nếu cần cài Vercel GitHub App, chỉ cấp quyền repository `webapp-calendar` cần triển khai.
- Import `Wang03062001/webapp-calendar`, nhánh production `main`.
- Project Name: `quanlychitieu03062001`; Framework Preset: **Other**; Root Directory: thư mục gốc; Build Command: `npm run build`; Output Directory: `dist`. File `vercel.json` đã khai báo build và output.
- Với dự án đã tạo, kiểm tra Settings → Domains trỏ production tới `quanlychitieu03062001.vercel.app`; không cần tạo lại project.
- Giữ GitHub Pages cũ trong lúc kiểm chứng. Không thêm redirect tự động hoặc xóa dự án cũ. Các push sau lên main sẽ triển khai tự động khi Git integration được thiết lập thành công.

## 2. Giữ Supabase và cấu hình domain mới

App tiếp tục dùng project Supabase công khai đã cấu hình ở `src/config.js`, gồm Auth và cùng dữ liệu owner-scoped của hai khu vực. Không đưa service-role key vào Vercel frontend; không chạy setup/reset SQL.

Chỉ thêm origin mới sau khi đã xác nhận dự án/domain thuộc tài khoản của bạn:

1. Supabase → Authentication → URL Configuration: Site URL `https://quanlychitieu03062001.vercel.app/`. Thêm Redirect URLs `https://quanlychitieu03062001.vercel.app/` và giữ URL GitHub Pages cũ `https://wang03062001.github.io/webapp-calendar/` khi vẫn còn dùng. Không cho phép wildcard trên toàn bộ `*.vercel.app`.
2. Supabase → Edge Functions → Secrets: đặt `ALLOWED_ORIGINS` thành `https://wang03062001.github.io,https://quanlychitieu03062001.vercel.app` (origin không có dấu / cuối và không có path). Đặt `APP_SITE_URL` thành `https://quanlychitieu03062001.vercel.app/` để email khôi phục do admin gửi dẫn đến website mới. Giữ nguyên các secret Auth/SMTP hiện có.
3. Deploy lại `account-login`, `admin-accounts`, `account-settings` từ thư mục `supabase/functions`, hoặc dùng các bundle tương ứng trong `supabase/dashboard` theo hướng dẫn hiện có. `account-login` và entry `admin-accounts` đã bổ sung đọc origin từ secret; giữ mặc định website cũ khi chưa cấu hình. Cập nhật GitHub không tự deploy Edge Functions hoặc secrets.

## 3. Kiểm chứng trước khi chuyển sử dụng

- Kiểm tra Vercel deploy Ready và domain production đúng. Mở trang, tải CSS/JS và xác nhận không có lỗi CORS.
- Đăng nhập email và tên tài khoản; kiểm tra dữ liệu đã lưu của cả hai khu vực bằng thao tác chỉ đọc. Kiểm tra quyền admin thực từ máy chủ, không dựa vào tên/email.
- Kiểm tra các email xác nhận/khôi phục qua tài khoản thử nghiệm riêng khi có thể; không sửa tài chính thật để test deploy.
- Trước khi đổi website, lưu bản nháp ở trang cũ thành công hoặc tải sao lưu JSON. Bản nháp, phiên đăng nhập và tùy chọn trình duyệt được lưu theo origin nên không tự chuyển sang domain mới. Dữ liệu đã lưu trên Supabase dùng lại sau khi đăng nhập cùng tài khoản. Không nhập lại bản sao cũ lên cloud khi chưa đối chiếu revision.

Không thể xác minh tên miền hoặc live Supabase chỉ bằng build local. Cần quyền Vercel, kết nối mạng tới Vercel/Supabase và phiên đăng nhập hợp lệ để hoàn tất triển khai thực tế.
