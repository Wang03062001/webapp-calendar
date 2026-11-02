# Lịch của tôi

Web app tiếng Việt quản lý lịch, chi tiêu và thu nhập với các năm mặc định 2026–2033 và khả năng thêm/xóa năm. Cần đăng nhập để nhập và lưu dữ liệu. Dữ liệu đồng bộ qua Supabase giữa các thiết bị.

## Chạy ứng dụng

Yêu cầu Node.js 22 trở lên. Không có dependency cần cài đặt.

```sh
cd /workspace/webapp-calendar
npm run dev
```

Server nghe trên cổng 5173; có thể đổi bằng biến `PORT`. Chạy `npm test` để kiểm tra model và đồng bộ, hoặc `node test/model.test.js` và `node test/sync.test.js` để xem từng kiểm thử. `npm run build` tạo bản tĩnh trong `dist/` có thể triển khai lên static hosting. Dùng `npm start` để chạy mã nguồn bằng server Node.

### Trên Windows

1. Cài Node.js bản LTS (22 trở lên).
2. Tải mã nguồn từ repository GitHub (Code → Download ZIP), giải nén; hoặc clone bằng Git.
3. Mở PowerShell/Terminal trong thư mục chứa `package.json`, chạy `npm run dev`.
4. Mở trình duyệt tại `http://localhost:5173`. Giữ Terminal chạy khi sử dụng.

Không cần chạy `npm install` vì ứng dụng không dùng dependency bên ngoài. Khi lấy phiên bản mã nguồn mới về máy, dừng server bằng Ctrl+C rồi chạy lại `npm run dev`. Việc cập nhật mã nguồn trên GitHub không tự cập nhật bản tải về Windows.

### Cập nhật qua ChatGPT

Quy trình đã lưu trong `AGENTS.md`: sau khi hoàn tất thay đổi được yêu cầu, agent kiểm tra, commit và push lên `main`. Cần phiên làm việc có quyền truy cập repository; đây không phải đồng bộ nền cho mọi cuộc trò chuyện ChatGPT. Mã nguồn trên GitHub và việc triển khai website là hai bước riêng biệt.

### Xem trực tiếp bằng GitHub Pages

Mã nguồn hỗ trợ chạy trực tiếp từ thư mục gốc trên GitHub Pages, không cần cài đặt trên Windows.

1. Mở repository trên GitHub → **Settings → Pages**.
2. Trong **Build and deployment**, chọn **Source: Deploy from a branch**.
3. Chọn nhánh **main**, thư mục **/ (root)** rồi **Save**.
4. Chờ GitHub triển khai thành công và mở đường dẫn được GitHub hiển thị trong trang Pages.

Sau khi bật Pages, mỗi lần push lên `main`, GitHub sẽ tự triển khai phiên bản mới. Nếu repository riêng tư, GitHub có thể yêu cầu gói hỗ trợ Pages; không thay đổi quyền riêng tư của repository chỉ để bật website. Không đưa bản sao lưu tài chính vào repository.

## Sử dụng

- Chọn năm, tháng, ngày. Nút **+** cạnh bộ chọn năm để thêm năm (1900–9999); nút thùng rác để xóa năm khỏi danh sách, giữ tối thiểu một năm. Dữ liệu năm đã xóa vẫn được giữ; thêm lại cùng năm để khôi phục. Nhấn **Lưu thay đổi** để đồng bộ danh sách năm. Các tháng hiển thị tổng tiền cần chi bằng JPY.
- Thêm dòng vào bảng chi tiêu của ngày, nhập nội dung và số tiền JPY. Tổng tiền tự cập nhật theo ngày, tháng và năm. Xóa dòng bằng nút thùng rác.
- Ghi chú theo ngày và ghi lương, thưởng, ghi chú thu nhập cho từng tháng.
- Nhập **Tiết kiệm tháng** và **Mục tiêu tiết kiệm năm** trong panel tiết kiệm phía trên lịch. Mỗi năm có mục tiêu riêng; thanh tiến độ cộng số tiền tiết kiệm từ 12 tháng và cho biết số tiền còn thiếu. Mục tiêu chưa đặt không có phần trăm; vượt mục tiêu vẫn hiển thị đúng tổng tiền.
- Mục **Tổng kết năm** có cột tiết kiệm theo từng tháng và tổng năm. Tiết kiệm dùng VNĐ, được theo dõi riêng với lương/thưởng/chi tiêu dùng JPY. Không cộng hoặc trừ trực tiếp hai loại tiền khác nhau. Dữ liệu và bản sao lưu phiên bản cũ vẫn được đọc bình thường.
- Mở **Tổng kết năm** để xem lương, thưởng, chi tiêu, số dư dự kiến và nội dung mọi khoản chi; nhấn tháng hoặc ngày để mở lại lịch.
- Khi chưa đăng nhập, các ô nhập và nhập/xuất bản sao lưu bị khóa; dữ liệu tài chính cũ không hiển thị. Khi đã đăng nhập, thay đổi được giữ trong bản nháp riêng của tài khoản. Nhấn **Enter** trong ô nhập hoặc nút **Lưu thay đổi** để gửi lên Supabase. Trong ghi chú, **Shift+Enter** để xuống dòng. **Xuất dữ liệu** tải bản sao lưu JSON; nút nhập bên cạnh khôi phục bản sao lưu sau xác nhận thay thế dữ liệu hiện tại.

Chi tiêu là số tiền dự kiến (không có trạng thái đã thanh toán). Số dư dự kiến (JPY) = lương + thưởng − chi tiêu. Tiết kiệm và mục tiêu tính bằng VNĐ. Các số đã nhập được giữ nguyên; ứng dụng không tự quy đổi tỷ giá. Mục tiêu tiết kiệm năm dùng để theo dõi, không tự trừ tiền hoặc tự phân bổ sang các tháng. Xóa dữ liệu trình duyệt sẽ xóa dữ liệu chưa đồng bộ và bản nháp trên máy; dữ liệu đã đồng bộ có thể tải lại sau khi đăng nhập. Nên xuất bản sao lưu định kỳ. Không có dữ liệu tài chính giả được thêm sẵn.

## Thiết lập Supabase (chủ project thực hiện một lần)

1. Mở project Supabase → **SQL Editor → New query**. Sao chép toàn bộ file [`supabase/setup.sql`](supabase/setup.sql) rồi bấm **Run**. Script chỉ tạo bảng `calendar_documents`, chính sách đọc theo tài khoản và hàm ghi dữ liệu của ứng dụng. Có thể chạy lại; không xóa dữ liệu đã có.
2. Trong **Authentication → Providers / Sign In**, bật **Email** và đăng ký bằng email nếu muốn người dùng tự tạo tài khoản. Có thể giữ xác nhận email. Nếu tắt đăng ký công khai, tạo người dùng trong Dashboard rồi đăng nhập trên website.
3. Trong **Authentication → URL Configuration**, đặt **Site URL** là `https://wang03062001.github.io/webapp-calendar/` và thêm cùng URL vào **Redirect URLs** để link xác nhận email quay về đúng website. Khi thử ở máy phát triển, thêm URL máy phát triển của bạn vào danh sách riêng.
4. `src/config.js` chứa Project URL và publishable key công khai do chủ project cung cấp. Public key không phải khóa quản trị; quyền dữ liệu được kiểm soát bằng RLS và đăng nhập. Không đưa secret key, service_role hoặc mật khẩu database vào mã nguồn.

### Đăng nhập và đồng bộ

- Bấm **Đăng nhập → Tạo tài khoản**, xác nhận email nếu được yêu cầu, rồi đăng nhập. Ở máy khác, đăng nhập cùng email để thấy cùng dữ liệu.
- Dữ liệu của tài khoản được tải từ Supabase sau khi đăng nhập; bản nháp chưa lưu vẫn được giữ riêng theo tài khoản. Giao diện không hiển thị thanh thông tin tài khoản hoặc nút chuyển dữ liệu cũ. Nếu muốn khôi phục từ file sao lưu, hãy xuất bản hiện tại trước khi nhập file khác thay thế.
- Chỉ trạng thái **Đã đồng bộ** mới xác nhận lưu đám mây thành công. **Chưa lưu thay đổi** là bản nháp chưa được gửi: cần nhấn Enter hoặc **Lưu thay đổi**. **Chưa đồng bộ** là lần gửi bị lỗi; bản đã yêu cầu lưu vẫn được giữ trên máy để thử lại. Khi có mạng trở lại, bấm **Thử đồng bộ lại**. Khi đăng xuất, bản nháp chưa gửi vẫn được giữ riêng theo tài khoản để tiếp tục sau khi đăng nhập lại.
- Dữ liệu được kiểm tra lại mỗi 30 giây khi trang đang mở, khi quay về tab. Các thao tác này không tự gửi nội dung chưa nhấn Enter/Lưu thay đổi. Bản đã yêu cầu lưu nhưng lỗi mạng có thể được gửi lại; nội dung gõ thêm sau đó vẫn là bản nháp. Nếu hai thiết bị cùng sửa trên một phiên bản cũ, ứng dụng giữ bản nháp và báo xung đột. Hãy **Xuất bản nháp** trước khi **Tải bản đám mây**; không tự gộp hoặc ghi đè âm thầm.
- Các tab dùng cùng tài khoản cũng có thể gặp xung đột; nên sửa trong một tab tại một thời điểm. Trên máy dùng chung, đăng xuất và tránh lưu dữ liệu riêng ở chế độ chưa đăng nhập.

Database lưu trên project Supabase của bạn, trong bảng `public.calendar_documents`; mỗi tài khoản có một dòng JSON chứa lịch, thu nhập, tiết kiệm và mục tiêu. Frontend không có quyền đọc dữ liệu tài khoản khác hoặc ghi trực tiếp vào bảng; chỉ ghi qua hàm có kiểm tra người dùng và phiên bản dữ liệu. Thiết lập này chưa tự tạo chính sách sao lưu phía Supabase.

## Tên đăng nhập, khôi phục mật khẩu và admin

Xem [hướng dẫn thiết lập quản trị](supabase/ADMIN.md). Cần chạy thêm `admin-setup.sql`, tạo admin trong Auth và triển khai hai Edge Functions trước khi dùng đăng nhập bằng tên tài khoản và quản trị. Đăng nhập bằng email và đồng bộ cũ vẫn hoạt động khi chưa triển khai phần mở rộng. Tài khoản admin mặc định có tên `admin` nhưng mật khẩu do chủ project tự đặt trong Dashboard; không có mật khẩu mặc định trong mã nguồn.

Thay đổi chưa lưu được giữ khi chuyển ngày/tháng và khi mở lại đúng tài khoản trên thiết bị đó. Đóng hoặc tải lại tab khi còn thay đổi sẽ có cảnh báo của trình duyệt. Đăng xuất luôn xóa dữ liệu khỏi màn hình; đăng nhập lại mới tải bản nháp riêng. Dữ liệu của chế độ khách cũ vẫn được giữ nguyên trong trình duyệt.

Dashboard sử dụng các thẻ tổng quan nhiều màu, biểu đồ thu nhập/chi tiêu JPY, tỷ lệ chi trên thu và tiến độ mục tiêu tiết kiệm VNĐ. Biểu đồ lấy số liệu thật trong năm đang chọn; nút thao tác nhanh mở ô nhập chi tiêu, thu nhập, tiết kiệm hoặc tổng kết năm.

Số tiền hiển thị theo dạng `1,000,000.000`: dấu phẩy ngăn hàng nghìn, dấu chấm thập phân và 3 chữ số sau dấu chấm. Ô nhập chấp nhận số có dấu phẩy hoặc số thường, tự định dạng khi rời ô hoặc lưu. Giá trị lưu trong JSON/Supabase vẫn là số, hỗ trợ tối đa 3 chữ số thập phân. Font chữ được tăng 60% và bố cục tự chuyển cột để phù hợp màn hình.
