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
- Mục **Tổng kết năm** nằm cuối menu, hiển thị tổng năm và cho bấm vào từng tháng để xem riêng tháng đó. Tiết kiệm dùng VNĐ, được theo dõi riêng với lương/thưởng/chi tiêu dùng JPY. Không cộng hoặc trừ trực tiếp hai loại tiền khác nhau. Dữ liệu và bản sao lưu phiên bản cũ vẫn được đọc bình thường.
- Mở **Tổng kết năm** để xem lương, thưởng, chi tiêu, số dư dự kiến và nội dung mọi khoản chi; nhấn tháng hoặc ngày để mở lại lịch.
- Khi chưa đăng nhập, các ô nhập và nhập/xuất bản sao lưu bị khóa; dữ liệu tài chính cũ không hiển thị. Khi đã đăng nhập, thay đổi được giữ trong bản nháp riêng của tài khoản. Nhấn **Enter** trong ô nhập hoặc nút **Lưu thay đổi** để gửi lên Supabase. Trong ghi chú, **Shift+Enter** để xuống dòng. **Xuất dữ liệu** tải bản sao lưu JSON; nút nhập bên cạnh khôi phục bản sao lưu sau xác nhận thay thế dữ liệu hiện tại.

Khoản chi mới mặc định Dự kiến; chỉ khoản Đã chi được trừ khỏi chênh lệch thu − chi. Chênh lệch = lương + thưởng − đã chi, không phải số dư ví. Tiền tệ được chọn theo hai nhóm liên kết, mặc định thu chi JPY và tiết kiệm VNĐ. Các số đã nhập được giữ nguyên; ứng dụng không tự quy đổi tỷ giá. Mục tiêu tiết kiệm năm dùng để theo dõi, không tự trừ tiền hoặc tự phân bổ sang các tháng. Xóa dữ liệu trình duyệt sẽ xóa dữ liệu chưa đồng bộ và bản nháp trên máy; dữ liệu đã đồng bộ có thể tải lại sau khi đăng nhập. Nên xuất bản sao lưu định kỳ. Không có dữ liệu tài chính giả được thêm sẵn.

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

Trang tháng đặt ô nhập chi tiêu và lịch lên trước, có bộ chọn ngày để nhập nhanh trên điện thoại. Header và nút **Lưu thay đổi** được ghim khi cuộn. Banner chào mừng đã được thay bằng tiêu đề kỳ và nút thao tác gọn; biểu đồ nằm trong vùng có thể thu gọn. Thu nhập và tiết kiệm có khung nhập riêng, không lặp lại số tiết kiệm ở nhiều thẻ/biểu đồ. Chữ dùng bộ cỡ chung 12–32 px và màu tương phản cao hơn trên nền pastel.

Mỗi khoản chi có **danh mục** và trạng thái **Dự kiến / Đã chi**. Khoản mới mặc định Dự kiến; chỉ khoản Đã chi mới được trừ khỏi thu nhập. Dữ liệu cũ chưa có trạng thái được hiểu là Đã chi để giữ nguyên tổng tiền. Các thẻ phân biệt Thu nhập, Đã chi, Dự kiến chi và Chênh lệch thu − chi. Chênh lệch là thu nhập trừ số đã chi trong kỳ, chưa phải số dư ví vì chưa tính tiền đầu kỳ; VNĐ tiết kiệm vẫn theo dõi riêng với JPY.

Trang Tổng kết năm chỉ hiển thị số liệu tổng năm; chọn một tháng để xem riêng tổng tháng. Vùng **Tìm kiếm khoản chi trong tháng** hỗ trợ tìm tiếng Việt có/không dấu và kết hợp lọc danh mục, trạng thái. Nhấn kết quả để mở đúng ngày nhập. Biểu đồ thu/chi/dự kiến và phân bổ đã chi theo danh mục chỉ dùng dữ liệu của kỳ đang chọn.

Số tiền hiển thị theo dạng `1,000,000`, tự thêm dấu phẩy ngay khi gõ và không thêm đuôi `.000`. Phần lẻ thực sự được giữ, ví dụ `1,234.5` hoặc `1,234.005`; không làm tròn mất dữ liệu cũ. Giá trị JSON/Supabase vẫn là số, hỗ trợ tối đa 3 chữ số thập phân. Enter hoặc nút Lưu gửi bản thay đổi; chọn danh mục/trạng thái cũng có thể nhấn Enter để lưu. Thao tác tìm kiếm và chọn ngày không tự gửi bản nháp tài chính.

Mục **Nợ phải trả** hỗ trợ nhiều khoản và loại nợ (có thể nhập loại riêng), nợ gốc, số đã trả, còn lại, ngày đến hạn và lịch sử. Bộ lọc gồm Tất cả, Quá hạn, Đến hạn trong 7 ngày và Đã trả hết; đây là nhắc hạn trong ứng dụng, không tự gửi email. Có thể sửa tên, loại, nợ gốc và ngày đến hạn; nợ gốc không được nhỏ hơn tổng các lần trả còn hiệu lực. Chỉ khoản chưa có lịch sử mới được xóa sau xác nhận.

Nhấn ô tick để xác nhận trả hết hoặc trả một phần, chọn ngày và số tiền. Lần trả và khoản chi JPY liên kết được lưu cùng một bản dữ liệu; khoản chi luôn là Đã chi và thuộc danh mục Trả nợ. Không nhập thêm khoản chi thủ công cho cùng lần trả. Trả một phần hiện dư nợ, trả hết hiện chúc mừng và dấu tick hoàn tất.

Trong lịch sử, **Hủy lần trả** mở xác nhận trước khi thực hiện. Thao tác này gỡ đúng khoản chi liên kết, tăng lại dư nợ và đánh dấu lần trả Đã hủy để đối chiếu. Khoản đã hủy không tính vào số đã trả, không thể hủy lần hai. Các khoản chi khác và ghi chú cùng ngày được giữ nguyên. Khoản nợ trả hết sẽ mở lại nếu hủy một lần trả; lịch sử đã hủy vẫn tồn tại khi tải lại, đồng bộ và xuất/nhập bản sao lưu. Sửa tên khoản nợ cũng cập nhật tên các khoản chi liên kết còn hiệu lực.

Các trường mới là phần mở rộng của JSON phiên bản 2, dùng Supabase/RLS và kiểm tra revision sẵn có, không cần chạy thêm SQL hoặc triển khai lại Edge Functions. Bản sao lưu cũ vẫn nhập được; bản mới giữ trạng thái, danh mục, ngày đến hạn, lịch sử đã hủy và liên kết chi tiêu. Sổ nợ không đặt lại khi chuyển năm.


## Kỳ lương, thẻ tín dụng và sao kê

Trang **Thu chi & kỳ lương** tách chi tiêu phát sinh khỏi dòng tiền qua ngân hàng. Nhập lương ở tháng thực nhận, ghi thêm tháng làm việc và ngày nhận (mặc định ngày 15, lương của tháng trước). Khung dòng tiền hiển thị tiền cần dự phòng cho sao kê và thu nhập sau chi tiền mặt/thanh toán thẻ/dự phòng; không phải số dư ví. Số dư có số đầu ngày được hiển thị riêng trong khung Số dư theo nguồn tiền. Tiết kiệm VNĐ tiếp tục theo dõi riêng.

Trong ô chi tiêu, chọn **Thẻ tín dụng** rồi chọn **Một lần tháng sau · 1回** hoặc **Bổ sung vào リボ**. Kỳ trả mặc định là tháng kế tiếp của ngày mua, có thể sửa theo sao kê/độ trễ ghi nhận của ngân hàng. Các giao dịch tiền mặt cũ giữ nguyên cách tính; dữ liệu cũ không tự được chuyển thành giao dịch thẻ.

Trang **Thẻ & sao kê** dành cho một thẻ, có tên thẻ và lịch thanh toán tùy chỉnh. Ngày 27 và lùi về thứ Sáu khi trùng cuối tuần là cấu hình dự kiến theo yêu cầu người dùng, không phải khẳng định quy định chung của tổ chức phát hành. Có thể chọn lùi trước, chuyển ngày làm việc sau, hoặc giữ nguyên; ngày thực tế trên từng sao kê luôn được ưu tiên và sửa thủ công được khi có ngày nghỉ. Không tự suy đoán ngày chốt giao dịch là ngày 12; ngày xác nhận số tiền được nhập rõ từ sao kê.

Nhập riêng **trả một lần, dư nợ リボ đầu kỳ, bổ sung リボ, gốc trả kỳ này, phí/lãi**, ngày xác nhận và ngày thanh toán. Tổng phải trả = trả một lần + gốc + phí; dư nợ chuyển kỳ sau = đầu kỳ + bổ sung − gốc. Bản dự kiến từ giao dịch chỉ gợi ý số đã ghi; gốc và phí phải xác nhận theo sao kê, không cố định 25,000 JPY và không tự tính APR. Màn hình có tổng giao dịch chi tiết và chênh lệch với sao kê để hỗ trợ đối chiếu.

Trạng thái gồm **Dự kiến → Đã chốt → Đã thanh toán kỳ này**. Chỉ phí/lãi của sao kê đã chốt tạo một khoản chi phí liên kết vào ngày xác nhận; sửa phí cập nhật đúng khoản liên kết, không tạo trùng. Tiền mua hàng vẫn ghi vào ngày mua, gốc cũ không được tạo lại thành chi tiêu. Nếu chỉ nhập tổng sao kê mà chưa có giao dịch mua hàng, ứng dụng không tự tạo chi tiêu tổng để tránh ghi trùng; cần ghi/đối chiếu các giao dịch tương ứng trong lịch.

**Xác nhận đã thanh toán** ghi ngày thực trả, nguồn ngân hàng/tiền mặt và tạo đúng một dòng thanh toán liên kết trong danh sách chi tiêu. Dòng này là tiền ra, không phải chi phí mua hàng lần hai. Nợ リボ chỉ được giảm phần gốc khi xác nhận đã trả. Có thể hủy xác nhận để sửa nhầm; sao kê đã trả bị khóa sửa cho đến khi hủy xác nhận. Trả đủ sao kê không đồng nghĩa hết nợ リボ. Lịch sử năm chỉ hiển thị các sao kê đã nhập; các số dự kiến chưa chốt được ghi rõ là ước tính.

Dữ liệu thẻ được lưu chung JSON phiên bản 2 trong tài khoản Supabase, dùng kiểm tra revision sẵn có. Không cần SQL/Edge Function mới. Không có dữ liệu sao kê cá nhân được đặt sẵn trong mã nguồn hoặc tự ghi vào tài khoản. Chạy thêm `node test/card.test.js` để kiểm tra kỳ trả, gốc/phí, dòng tiền, đối chiếu và bản sao lưu.


Mục **Thẻ & sao kê** và các nút dẫn tới mục này chỉ hiển thị sau khi xác minh tài khoản là admin qua RPC `calendar_is_admin`. Người dùng thường và khách không có menu/khung tổng quan sao kê; nhập thu chi thông thường vẫn hoạt động. Ứng dụng kiểm tra lại quyền khi mở mục, mở biểu mẫu và trước khi lưu biểu mẫu, khi quay lại trang và định kỳ; mất quyền hoặc xác minh lỗi sẽ đóng biểu mẫu và ẩn mục thẻ. Không dùng email/tên đăng nhập hoặc `user_metadata` để suy ra admin. Dữ liệu sao kê có sẵn được giữ nguyên khi tài khoản thường lưu các thay đổi khác. Đây là giới hạn giao diện và thao tác của module; chính sách dữ liệu tài khoản Supabase hiện có được giữ nguyên, không cần chạy SQL mới.


## Giao diện, tiền tệ và ngôn ngữ

- Nút ☀ / ☾ đổi sáng tối; **Cài đặt** chọn tiếng Việt, English, 日本語, 한국어 hoặc 繁體中文（台灣）. Ngôn ngữ và giao diện được nhớ trên trình duyệt; không sửa tên, email hay dữ liệu người dùng nhập.
- Sidebar hiển thị tên tài khoản từ hồ sơ và email hiện tại. Không hiện dòng “Đã đồng bộ”; thông báo bản nháp, lỗi và xung đột vẫn được giữ.
- Tài khoản chưa có dữ liệu được mời chọn tiền tệ sau đăng nhập lần đầu. Hai nhóm: `currencies.cash` (lương, thưởng, chi tiêu, khoản vay, sao kê) và `currencies.savings` (tiết kiệm tháng, mục tiêu năm). Hỗ trợ JPY, VND, USD, EUR, KRW, TWD, CNY. Không thể chọn khác tiền tệ trong cùng nhóm.
- Cài đặt tiền tệ được lưu theo tài khoản và trong bản sao lưu. Dữ liệu cũ chưa có `currencies` giữ mặc định JPY/VND. Đổi đơn vị khi nhóm đã có tiền yêu cầu xác nhận rõ: giữ nguyên số tiền, áp dụng toàn bộ năm, không tự quy đổi tỷ giá. Thay đổi ngôn ngữ/giao diện riêng không gửi bản nháp tài chính.
- **Tài khoản → Thông tin tài khoản** sửa username/tên hiển thị của chính mình. Admin quản lý mọi tài khoản trong **Quản lý tài khoản**. Đổi email luôn theo thứ tự: mã email cũ → email mới → mã email mới; email cũ chỉ thay sau bước cuối. Không còn API admin đổi email trực tiếp.

Chức năng hồ sơ/đổi email mới cần triển khai máy chủ riêng: xem [ACCOUNT-SETTINGS.md](supabase/ACCOUNT-SETTINGS.md). GitHub Pages không tự triển khai SQL/Edge Functions. Có kiểm thử API mô phỏng, giao diện Chromium và PostgreSQL thử nghiệm; gửi/nhận thư thật chỉ kiểm tra được sau khi cấu hình dịch vụ gửi email.


Có thể gửi mã đổi email bằng **Gmail SMTP, không cần tên miền riêng**: bật Xác minh 2 bước của Google, tạo mật khẩu ứng dụng rồi đặt `SMTP_USER` và `SMTP_PASS` trong Edge Functions Secrets. Deploy lại `account-settings` từ bundle mới. Xem các bước cụ thể trong [ACCOUNT-SETTINGS.md](supabase/ACCOUNT-SETTINGS.md). Gmail SMTP và Resend là hai lựa chọn; SMTP được ưu tiên khi cấu hình đủ. Mật khẩu chỉ lưu phía server.


Admin có nút **Xóa tài khoản** trong **Quản lý tài khoản** để xóa tài khoản khác, gồm tài khoản admin khác. Tài khoản đang đăng nhập bị vô hiệu hóa nút xóa và server cũng từ chối tự xóa. Hộp xác nhận hiển thị email/ID chính xác và thông báo xóa vĩnh viễn tài khoản cùng dữ liệu trên máy chủ. API kiểm tra lại quyền admin và email/ID xác nhận trước khi gọi Auth DELETE; dữ liệu liên kết được xóa qua khóa ngoại CASCADE đã có. Bản sao lưu đã xuất và dữ liệu lưu trên thiết bị khác không thể bị xóa từ xa bởi thao tác này. Không có tài khoản thật nào bị xóa khi kiểm thử. Để kích hoạt, cập nhật **Edge Functions → admin-accounts → Code** bằng [bundle mới](supabase/dashboard/admin-accounts.ts), rồi Deploy; không cần SQL mới.


Khi chọn ngôn ngữ trong **Cài đặt**, cả hai ô tiền tệ tự chọn theo ngôn ngữ: Việt → VND, Anh → USD, Nhật → JPY, Hàn → KRW, Trung Đài Loan → TWD. Có thể chọn lại tiền tệ cho từng nhóm bằng tay trước khi lưu; việc chọn tiền tệ không tự đổi ngôn ngữ. Tài khoản mới chưa có dữ liệu được gợi ý tiền tệ theo ngôn ngữ đang dùng. Mở lại cài đặt hoặc tải lại trang giữ các tiền tệ đã lưu, kể cả lựa chọn thủ công. Dữ liệu cũ không tự bị đổi đơn vị khi chỉ tải trang. Nhóm có tiền vẫn phải xác nhận rõ việc đổi đơn vị giữ nguyên con số, không quy đổi tỷ giá, trước khi lưu; hủy cài đặt không áp dụng thay đổi nào.


## Nguồn tiền và thanh toán sao kê liên kết

Mỗi khoản chi có **Mục đích chi tiêu** (nội dung), danh mục và **Nguồn tiền**: tài khoản ngân hàng, tiền mặt, hoặc PayPay/thẻ tín dụng. Khoản mới mặc định ngân hàng, Dự kiến; chuyển sang Đã chi khi phát sinh. Khoản cũ chưa có nguồn vẫn giữ cách tính tiền mặt; có thể sửa nguồn của khoản thường sau khi đối chiếu. Thu nhập có Nơi nhận (ngân hàng/tiền mặt); dữ liệu cũ mặc định vào ngân hàng, ngày nhận dùng ngày đã nhập hoặc 15 của tháng.

**Số dư theo nguồn tiền → Thiết lập số dư** nhập ngày bắt đầu và số dư đầu ngày ngân hàng/tiền mặt. Admin nhập thêm dư nợ toàn bộ PayPay đầu ngày và hạn mức tín dụng (có thể để trống hạn mức nếu chưa biết). Các giao dịch Đã chi/thu nhập có ngày từ ngày bắt đầu đến ngày đang xem được cộng/trừ; giao dịch Dự kiến và giao dịch ngoài khoảng không ảnh hưởng. Dư nợ đầu ngày phải gồm toàn bộ nợ thẻ chưa trả trước ngày bắt đầu: nợ cũ, mua hàng và phí. Không nhập số dư cuối ngày vào số đầu ngày, tránh tính lại giao dịch cùng ngày. Số dư này là sổ do người dùng nhập, không tự lấy từ ngân hàng.

Ngân hàng/tiền mặt = đầu ngày + thu nhập vào nguồn + chuyển vào − chi trực tiếp − trả thẻ − chuyển ra. Dư nợ thẻ = đầu ngày + chi bằng thẻ/phí ghi sau mốc − toàn bộ tiền trả thẻ. Hạn mức khả dụng = hạn mức − dư nợ ghi sổ; đây không phải tiền gửi. Nếu chưa nhập hạn mức hoặc tiền đã trả vượt dư nợ ghi sổ, app yêu cầu nhập/đối chiếu thay vì đoán hạn mức. Số âm không bị tự đưa về 0. **Chuyển ngân hàng ↔ tiền mặt** di chuyển số dư giữa hai nguồn, không tăng thu nhập hay chi phí; có lịch sử và xác nhận xóa để hoàn lại ảnh hưởng. Tiết kiệm/mục tiêu là nhóm riêng, không tự trừ khỏi ngân hàng bằng tỷ giá ngầm.

Đặt ngày đến hạn không tự tạo giao dịch. Khi xác nhận sao kê đã trả, chọn ngày và nguồn ngân hàng/tiền mặt. App tạo một dòng `card-payment-YYYY-MM`, mục đích Thanh toán tên thẻ/kỳ, số tiền tổng sao kê; lưu ngày/nguồn vào sao kê. Dòng liên kết hiển thị trong lịch/ngày/tìm kiếm nhưng bị khóa sửa/xóa trực tiếp. Hủy xác nhận trong Thẻ & sao kê sẽ kiểm tra và gỡ đúng dòng liên kết, hoàn ảnh hưởng số dư. Xác nhận lặp bị từ chối; đổi ngày/nguồn cần hủy rồi xác nhận lại. Bản sao lưu lưu đầy đủ accounts, chuyển tiền, nguồn chi/thu, nguồn trả sao kê và liên kết.

**Chi phí phát sinh** và biểu đồ phân loại vẫn chỉ tính mua hàng/phí (cùng các khoản chi thường); dòng thanh toán không cộng vào chi phí lần hai. **Tiền ra ngân hàng / tiền mặt** trong ngày/tháng tính chi trực tiếp + trả sao kê. Số dư nguồn và tổng tiền ra dùng khoản thanh toán một lần, không cộng cả dòng liên kết lẫn sao kê. Trả khoản vay khác cũng chọn ngân hàng/tiền mặt và vẫn giữ một khoản chi liên kết như trước.

Sao kê đã trả trong dữ liệu cũ chưa có nguồn sẽ được nâng cấp thành nguồn ngân hàng và thêm một dòng liên kết đúng ngày, không đổi tổng chi phí cũ. Nếu từng tự nhập thanh toán thẻ thành khoản chi thường, cần tự đối chiếu và gỡ khoản nhập tay trùng; ứng dụng không xóa dữ liệu nhập tay dựa vào tên/số tiền. Việc thiết lập số dư và dòng liên kết dùng JSON hiện có, không cần SQL/Edge Function mới. Chạy `node test/ledger.test.js` cùng các bộ kiểm tra hiện có.
