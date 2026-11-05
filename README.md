> **Cách tính hiện hành:** Dashboard, lịch và Excel quản lý theo **dòng tiền thực tế và tài sản tiền**. Giao dịch mua thẻ được hiển thị riêng, chỉ ghi tiền ra khi thực trả. Kỳ lương chỉ còn là kế hoạch bổ sung. Xem [quy tắc, dữ liệu, kiểm thử và hướng dẫn kiểm tra](docs/CASH_BASIS.md). Các phần mô tả KPI cũ phía dưới không còn áp dụng cho Dashboard mới.

> **Bắt đầu từ 01/11/2026:** Trong **Cài đặt → Bắt đầu theo dõi mới**, kiểm tra tài khoản và phạm vi **cả hai khu vực**, có thể tải sao lưu JSON, rồi nhập `RESET` để xóa toàn bộ dữ liệu tài chính cũ. Chỉ xóa sau khi máy chủ xác nhận; lỗi/xung đột giữ dữ liệu và bản nháp. Sau đó chọn **Nhập số dư đầu kỳ**, nhập ngân hàng, tiền mặt, tiết kiệm **đầu ngày 01/11/2026**. Tài sản chi tiêu = ngân hàng + tiền mặt; tiết kiệm theo dõi riêng, tiền có sẵn không phải thu nhập. Nếu chỉ biết số dư ngày khác, chọn đúng ngày số dư, không lấy tiền hôm nay làm số dư ngày 1. Cập nhật mã nguồn không tự xóa dữ liệu thật.

> **Tín dụng:** Đã bỏ giao diện PayPay, số dư khả dụng, リボ, phí và sao kê. Vẫn nhập giao dịch ngày với nguồn **Thẻ tín dụng**. Ô **Phát sinh tín dụng** mở danh sách/tổng giao dịch tín dụng; các khoản này không vào tổng chi tiền tháng, không trừ tài sản và không tự tạo dư nợ/hóa đơn. Khoản thực trả thẻ nhập như chi ngân hàng/tiền mặt bình thường. Excel có giao dịch tín dụng riêng; sổ mới không có bảng PayPay. Dữ liệu cũ không bị âm thầm xóa khi mở phiên bản mới; chỉ reset theo thao tác của chủ tài khoản.

# Lịch của tôi

Web app tiếng Việt quản lý lịch, chi tiêu và thu nhập với các năm và khả năng thêm/xóa năm. Cần đăng nhập để nhập và lưu dữ liệu. Dữ liệu đồng bộ qua Supabase giữa các thiết bị.

Trong **Quỹ tiết kiệm của bạn**, mục **Tổng đã tiết kiệm đến hiện tại** cộng lịch sử tiết kiệm theo tháng đã lưu đến tháng hiện tại, gồm các năm trước và năm đã ẩn khỏi danh sách. Đổi tháng/năm xem không đổi tổng này; tháng tương lai và mục tiêu năm không được cộng. Mỗi khu vực dùng riêng tiền tệ tiết kiệm của sổ. Đây là tổng lịch sử đã ghi, không tự tăng tài sản hoặc thay số dư nguồn tiết kiệm. Excel có trang **Tổng tiết kiệm** theo ngày xem báo cáo.

Khung bên phải tách **Tài sản chi tiêu** (ngân hàng + tiền mặt) và **Tiết kiệm riêng**. Khi dùng tiết kiệm, chọn **Tiền vào khác → Rút tiết kiệm**, nhập ngày/số tiền và nơi nhận **ngân hàng hoặc tiền mặt**; nút **Rút tiết kiệm** bên khung tiết kiệm mở sẵn loại này. Lưu thành công sẽ trừ tiết kiệm và cộng nguồn nhận một lần, không tạo thu nhập mới hoặc chi phí. Sửa/xóa khoản rút cập nhật ngược cả hai nguồn. Tiền dành cho quỹ phải được giải phóng trước khi rút nếu không còn đủ tiền tự do; hệ thống không tự giải phóng. Chuyển vào tiết kiệm vẫn qua **Phân bổ / chuyển nguồn tiền**, được ghi riêng với chi tiêu. Khoản rút dùng số dư nguồn tiết kiệm thực, cùng đồng tiền của khu vực; không trừ lịch sử tích lũy tháng hoặc tự đổi JPY/VND.

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
- Khi chưa đăng nhập, các ô nhập và nhập/xuất bản sao lưu bị khóa; dữ liệu tài chính cũ không hiển thị. Khi đã đăng nhập, thay đổi được giữ trong bản nháp riêng của tài khoản. Nhấn **Enter** trong ô nhập hoặc nút **Lưu thay đổi** để gửi lên Supabase. Trong ghi chú, **Shift+Enter** để xuống dòng. **Xuất Excel** mở hộp tải báo cáo `.xlsx`; **Sao lưu và khôi phục → Sao lưu JSON** tải bản sao lưu đầy đủ; nút nhập bên cạnh khôi phục bản sao lưu sau xác nhận thay thế dữ liệu hiện tại.

Khoản chi mới mặc định Dự kiến; chỉ khoản Đã chi được trừ khỏi chênh lệch thu − chi. Chênh lệch trên ô thống kê = thu nhập − chi phí phát sinh − sao kê đã thanh toán trong kỳ (phần thẻ chỉ hiển thị theo quyền admin), không phải số dư ví. Tiền tệ được chọn theo hai nhóm liên kết, mặc định thu chi JPY và tiết kiệm VNĐ. Các số đã nhập được giữ nguyên; ứng dụng không tự quy đổi tỷ giá. Mục tiêu tiết kiệm năm dùng để theo dõi, không tự trừ tiền hoặc tự phân bổ sang các tháng. Xóa dữ liệu trình duyệt sẽ xóa dữ liệu chưa đồng bộ và bản nháp trên máy; dữ liệu đã đồng bộ có thể tải lại sau khi đăng nhập. Nên xuất bản sao lưu định kỳ. Không có dữ liệu tài chính giả được thêm sẵn.

## Thiết lập Supabase (chủ project thực hiện một lần)

1. Mở project Supabase → **SQL Editor → New query**. Sao chép toàn bộ file [`supabase/setup.sql`](supabase/setup.sql) rồi bấm **Run**. Script chỉ tạo bảng `calendar_documents`, chính sách đọc theo tài khoản và hàm ghi dữ liệu của ứng dụng. Có thể chạy lại; không xóa dữ liệu đã có.
2. Trong **Authentication → Providers / Sign In**, bật **Email** và đăng ký bằng email nếu muốn người dùng tự tạo tài khoản. Có thể giữ xác nhận email. Nếu tắt đăng ký công khai, tạo người dùng trong Dashboard rồi đăng nhập trên website.
3. Trong **Authentication → URL Configuration**, đặt **Site URL** là `https://wang03062001.github.io/webapp-calendar/` và thêm cùng URL vào **Redirect URLs** để link xác nhận email quay về đúng website. Khi thử ở máy phát triển, thêm URL máy phát triển của bạn vào danh sách riêng.
4. `src/config.js` chứa Project URL và publishable key công khai do chủ project cung cấp. Public key không phải khóa quản trị; quyền dữ liệu được kiểm soát bằng RLS và đăng nhập. Không đưa secret key, service_role hoặc mật khẩu database vào mã nguồn.

### Đăng nhập và đồng bộ

- Bấm **Đăng nhập → Tạo tài khoản**, xác nhận email nếu được yêu cầu, rồi đăng nhập. Ở máy khác, đăng nhập cùng email để thấy cùng dữ liệu.
- Dữ liệu của tài khoản được tải từ Supabase sau khi đăng nhập; bản nháp chưa lưu vẫn được giữ riêng theo tài khoản. Giao diện không hiển thị thanh thông tin tài khoản hoặc nút chuyển dữ liệu cũ. Nếu muốn khôi phục từ file sao lưu, hãy xuất bản hiện tại trước khi nhập file khác thay thế.
- Chỉ trạng thái **Đã đồng bộ** mới xác nhận lưu đám mây thành công. **Chưa lưu thay đổi** là bản nháp chưa được gửi: cần nhấn Enter hoặc **Lưu thay đổi**. **Chưa đồng bộ** là lần gửi bị lỗi; bản đã yêu cầu lưu vẫn được giữ trên máy để thử lại. Khi có mạng trở lại, bấm **Thử đồng bộ lại**. Khi đăng xuất, bản nháp chưa gửi vẫn được giữ riêng theo tài khoản để tiếp tục sau khi đăng nhập lại.
- Dữ liệu được kiểm tra lại mỗi 30 giây khi trang đang mở, khi quay về tab. Các thao tác này không tự gửi nội dung chưa nhấn Enter/Lưu thay đổi. Bản đã yêu cầu lưu nhưng lỗi mạng có thể được gửi lại; nội dung gõ thêm sau đó vẫn là bản nháp. Nếu hai thiết bị cùng sửa trên một phiên bản cũ, ứng dụng giữ bản nháp và báo xung đột. Hãy **Sao lưu bản nháp JSON** trước khi **Tải bản đám mây**; không tự gộp hoặc ghi đè âm thầm.
- Các tab dùng cùng tài khoản cũng có thể gặp xung đột; nên sửa trong một tab tại một thời điểm. Trên máy dùng chung, đăng xuất và tránh lưu dữ liệu riêng ở chế độ chưa đăng nhập.

Khi có lỗi kết nối, **Sao lưu bản nháp JSON** luôn có ngay trên cảnh báo của tài khoản đang đăng nhập. **Thử đồng bộ lại** gửi lại đúng ảnh đã nhấn Lưu trước đó nếu đang chờ gửi; nếu chỉ có nội dung mới chưa gửi, nút này đọc lại phiên bản trên máy chủ để kiểm tra kết nối, không tải bản nháp lên. Cùng phiên bản thì giữ nội dung nhập và trạng thái Chưa lưu; khác phiên bản thì báo xung đột, giữ nguyên dữ liệu hai khu vực. Việc tự kiểm tra khi quay lại tab không được làm mất cảnh báo lỗi khi chưa thực sự liên lạc được với máy chủ. Phản hồi kiểm tra cũ không được ghi đè nội dung mới, kết quả lưu vừa xác nhận hay tài khoản khác.

Thông báo **Không kết nối được Supabase** xuất phát từ yêu cầu mạng không hoàn tất, bao gồm quá thời gian chờ 15 giây; riêng ảnh thông báo chưa đủ phân biệt DNS, CORS, mạng của thiết bị hay dịch vụ gián đoạn. Kiểm tra URL triển khai và `/auth/v1/health` chỉ xác nhận khả năng truy cập dịch vụ, không thay thế kiểm tra đăng nhập/RLS/RPC bằng quyền hợp lệ. Không xóa bộ nhớ trình duyệt để thử sửa lỗi khi còn bản nháp. Có thể kiểm thử hoàn toàn giả lập bằng `scripts/check-connection-browser.mjs`.

### Khi log có `40001 — Document changed on another device`

Hàm `save_calendar_document` cũ dùng SQLSTATE `40001` cho xung đột phiên bản ứng dụng. Đây thực ra là `serialization_failure`: PostgREST/Hasql cũ có thể thử lại giao dịch bên trong cùng một yêu cầu HTTP. Vì vậy lỗi có thể tiếp tục tăng mỗi giây sau khi trình duyệt hết thời gian chờ hoặc đã đóng tab; chỉ sửa JavaScript chưa dừng được yêu cầu đang lặp trên máy chủ. Đã tái hiện bằng PostgREST 12.2.12 + PostgreSQL 17 trong môi trường thử riêng.

**Sửa project đang có dữ liệu:** mở Supabase → SQL Editor → New query, chạy toàn bộ [`supabase/fix-document-conflict.sql`](supabase/fix-document-conflict.sql). Script chỉ đổi nhánh báo xung đột của hàm đang tồn tại từ `40001` sang `PT409` (HTTP 409), giữ nguyên mọi điều kiện kiểm tra, chủ sở hữu hàm, quyền execute, RLS và dữ liệu hai khu vực. Nếu hàm không khớp mẫu mong đợi, script dừng và không sửa. Chạy lại được; không tạo bảng migration hoặc thay thế tài liệu tài chính. Kết quả kiểm tra metadata cuối script phải có `conflict_returns_http_409 = true`. Git push không tự chạy SQL này trên Supabase. Cài mới dùng `setup.sql` đã phát `PT409` sẵn.

Web nhận cả `PT409` mới và `40001` cũ, cùng đưa về trạng thái xung đột có chặn ghi. Việc lệch revision vẫn cần đối chiếu bản nháp và bản đã lưu, có thể do tab/thiết bị khác hoặc lần lưu trước mất phản hồi. Không bỏ điều kiện revision hoặc tăng revision trên máy để ép ghi đè. Sau khi chạy SQL, xem các dòng log **mới phát sinh sau thời điểm chạy**; các dòng cũ vẫn nằm trong lịch sử. Lỗi ứng dụng mới có thể là `PT409`, nhưng một yêu cầu không được lặp nội bộ thành hàng loạt `40001`.

Kiểm thử thật nhưng cách ly: `node scripts/check-conflict-postgres.mjs` dùng Docker local, hai image chính thức đã cố định digest và dữ liệu mô phỏng. Bài kiểm tra tạo một request đang lặp `40001`, áp dụng đúng script sửa, xác nhận request kết thúc bằng HTTP 409/PT409 và dữ liệu/owner/ACL/search_path/SECURITY DEFINER không đổi; kiểm tra chạy lại, RLS theo chủ tài khoản, chặn tài khoản bị khóa, từ chối anonymous, lưu đúng revision và cài mới. Không kết nối project Supabase thật. Xem cơ chế mã HTTP tùy chỉnh trong [tài liệu PostgREST](https://docs.postgrest.org/en/v12/references/errors.html#raise-errors-with-http-status-codes).

Web lưu cờ xung đột riêng theo tài khoản, giữ toàn bộ bản nháp/hàng đợi/nội dung nhập và chặn các đường ghi, kể cả tải lại hoặc đăng nhập lại. Hàng đợi phục hồi từ cache cũ và lần ghi bị lỗi được đọc đối chiếu trước khi gửi lại. Chỉ xác nhận một lần ghi mất phản hồi nếu toàn bộ tài liệu hai khu vực khớp chính xác với ảnh đã gửi và revision máy chủ đúng bằng revision cũ + 1; thứ tự khóa JSON không ảnh hưởng phép so sánh. Khi khác nội dung hoặc đã có nhiều revision mới, giữ bản nháp và báo xung đột, không tự gộp. Chỉ **Tải bản đám mây** thành công sau xác nhận của người dùng mới bỏ chặn; đọc thất bại vẫn giữ bản nháp/cờ chặn. Phản hồi phục hồi cũ không được áp dụng cho tài khoản khác.

Để xử lý bản nháp đang xung đột: **Sao lưu bản nháp JSON** trước, đóng các tab web cũ sau khi đã sao lưu nội dung cần giữ, tải lại bản mới bằng Ctrl+F5, rồi xem và xác nhận **Tải bản đám mây** nếu muốn thay bản nháp bằng dữ liệu hiện có trên máy chủ. Đối chiếu bản sao lưu để nhập lại phần còn thiếu; không tự nhập toàn bộ bản cũ đè lên bản mới. Cập nhật mã không tự xử lý thay chủ tài khoản hoặc thay đổi dữ liệu thật. Kiểm thử bằng `test/conflict-recovery.test.js` và script giả lập `scripts/check-conflict-browser.mjs`.

Lỗi `42P01 relation "supabase_migrations.schema_migrations" does not exist` liên quan đến bảng theo dõi migration của công cụ Supabase. Web này không truy vấn bảng đó và có thể được cài bằng SQL Editor thủ công. Không dùng lỗi này để kết luận bảng tài chính `calendar_documents` bị mất hoặc reset dữ liệu; kiểm tra riêng nguồn truy vấn/lịch sử migration khi cần.

Database lưu trên project Supabase của bạn, trong bảng `public.calendar_documents`; mỗi tài khoản có một dòng JSON chứa lịch, thu nhập, tiết kiệm và mục tiêu. Frontend không có quyền đọc dữ liệu tài khoản khác hoặc ghi trực tiếp vào bảng; chỉ ghi qua hàm có kiểm tra người dùng và phiên bản dữ liệu. Thiết lập này chưa tự tạo chính sách sao lưu phía Supabase.

## Tên đăng nhập, khôi phục mật khẩu và admin

Xem [hướng dẫn thiết lập quản trị](supabase/ADMIN.md). Cần chạy thêm `admin-setup.sql`, tạo admin trong Auth và triển khai hai Edge Functions trước khi dùng đăng nhập bằng tên tài khoản và quản trị. Đăng nhập bằng email và đồng bộ cũ vẫn hoạt động khi chưa triển khai phần mở rộng. Tài khoản admin mặc định có tên `admin` nhưng mật khẩu do chủ project tự đặt trong Dashboard; không có mật khẩu mặc định trong mã nguồn.

Thay đổi chưa lưu được giữ khi chuyển ngày/tháng và khi mở lại đúng tài khoản trên thiết bị đó. Đóng hoặc tải lại tab khi còn thay đổi sẽ có cảnh báo của trình duyệt. Đăng xuất luôn xóa dữ liệu khỏi màn hình; đăng nhập lại mới tải bản nháp riêng. Dữ liệu của chế độ khách cũ vẫn được giữ nguyên trong trình duyệt.

Trang tháng đặt ô nhập chi tiêu và lịch lên trước, có bộ chọn ngày để nhập nhanh trên điện thoại. Header và nút **Lưu thay đổi** được ghim khi cuộn. Banner chào mừng đã được thay bằng tiêu đề kỳ và nút thao tác gọn; biểu đồ nằm trong vùng có thể thu gọn. Thu nhập và tiết kiệm có khung nhập riêng, không lặp lại số tiết kiệm ở nhiều thẻ/biểu đồ. Chữ dùng bộ cỡ chung 12–32 px và màu tương phản cao hơn trên nền pastel.

**Chi tiêu trong ngày** chỉ nhập khoản mới. Nhấn Enter hoặc **Lưu thay đổi** để gửi; chỉ khoản được máy chủ xác nhận mới rời ô nhập. Giao dịch vẫn có trong **Khoản chi trong tháng**, lịch, biểu đồ và các phép tính. Lỗi/xung đột giữ bản nháp; nội dung nhập tiếp trong lúc lưu cũng được giữ để lưu lần sau.

Để sửa khoản đã lưu, mở **Khoản chi trong tháng** và bấm **Sửa nội dung**. Popup cho sửa nội dung, số tiền, danh mục, trạng thái, nguồn/quỹ và thông tin thẻ theo quyền hiện có. Enter hoặc **Lưu** xác nhận gửi, **Hủy** bỏ chỉnh sửa. **Xóa khoản chi** yêu cầu xác nhận trước khi gửi. Bấm ngày hoặc nội dung chỉ xem ngày. Khoản liên kết trả nợ, sao kê, phí thẻ và lịch phải trả vẫn sửa/hủy ở chức năng gốc; đổi tài khoản/khu vực hoặc thu hồi quyền admin sẽ chặn popup cũ ghi dữ liệu.

Mỗi khoản chi có **danh mục** và trạng thái **Dự kiến / Đã chi**. Khoản mới mặc định Dự kiến; chỉ khoản Đã chi mới được trừ khỏi thu nhập. Dữ liệu cũ chưa có trạng thái được hiểu là Đã chi để giữ nguyên tổng tiền. Các ô thống kê phân biệt Thu nhập, Chi tiêu & trả thẻ, Dự kiến chi và Chênh lệch thu − chi. Chênh lệch trừ cả chi phí phát sinh và tiền sao kê đã trả trong kỳ, chưa tính tiền đầu kỳ; VNĐ tiết kiệm vẫn theo dõi riêng với JPY.

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

Trạng thái gồm **Dự kiến → Đã chốt → Đã thanh toán kỳ này**. Phí/lãi của sao kê đã chốt có liên kết nội bộ vào ngày xác nhận để tính dư nợ, nhưng không hiển thị thành khoản chi hoặc cộng vào tổng chi tiêu; sửa phí cập nhật đúng liên kết, không tạo trùng. Tiền mua hàng vẫn ghi vào ngày mua, gốc cũ không được tạo lại thành chi tiêu. Nếu chỉ nhập tổng sao kê mà chưa có giao dịch mua hàng, ứng dụng không tự tạo chi tiêu tổng để tránh ghi trùng; cần ghi/đối chiếu các giao dịch tương ứng trong lịch.

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

**Chi phí phát sinh** và biểu đồ phân loại chỉ tính mua hàng (cùng các khoản chi thường), không tính phí/lãi sao kê; dòng thanh toán không cộng vào chi phí lần hai. **Tiền ra ngân hàng / tiền mặt** trong ngày/tháng tính chi trực tiếp + trả sao kê. Số dư nguồn và tổng tiền ra dùng khoản thanh toán một lần, không cộng cả dòng liên kết lẫn sao kê. Trả khoản vay khác cũng chọn ngân hàng/tiền mặt và vẫn giữ một khoản chi liên kết như trước.

Sao kê đã trả trong dữ liệu cũ chưa có nguồn sẽ được nâng cấp thành nguồn ngân hàng và thêm một dòng liên kết đúng ngày, không đổi tổng chi phí cũ. Nếu từng tự nhập thanh toán thẻ thành khoản chi thường, cần tự đối chiếu và gỡ khoản nhập tay trùng; ứng dụng không xóa dữ liệu nhập tay dựa vào tên/số tiền. Việc thiết lập số dư và dòng liên kết dùng JSON hiện có, không cần SQL/Edge Function mới. Chạy `node test/ledger.test.js` cùng các bộ kiểm tra hiện có.


## Rút/nạp tiền và đối chiếu cuối tháng

Trong danh sách chi tiêu hằng ngày, **Loại giao dịch** có **Chi tiêu**, **Rút tiền mặt**, **Nạp tiền vào ngân hàng**. Chọn rút/nạp sẽ chọn nguồn và hướng nhận tương ứng, mặc định trạng thái Đã chi; nhập số tiền sẽ cập nhật số dư bản nháp. Rút tiền trừ ngân hàng/cộng tiền mặt, nạp tiền làm ngược lại. Những giao dịch này xuất hiện trong lịch sử chi tiêu và tìm kiếm nhưng là chuyển tiền nội bộ, không tăng chi phí hoặc tổng tiền ra bên ngoài. Chuyển tiền đã nhập từ nút chuyển tiền cũ cũng xuất hiện trong danh sách ngày/tìm kiếm, được tính một lần. **Tài sản còn lại = ngân hàng + tiền mặt**, không cộng hạn mức thẻ tín dụng và không tự trừ dư nợ PayPay.

Chọn **ngày cuối cùng của tháng** trong lịch để thấy **Đối chiếu cuối tháng**. Sau khi thiết lập số đầu ngày, nhập ngân hàng thực tế và tiền mặt thực tế sau mọi giao dịch cuối ngày, nhấn **Kiểm tra chênh lệch**. Popup hiển thị số sổ, số thực tế, chênh lệch mỗi nguồn và tổng (thực tế − số sổ). Bấm **Xác nhận số dư thực tế** để lưu. Không được xác nhận trước ngày cuối tháng; tháng đã qua vẫn có thể đối chiếu.

Số dư thực tế được dùng làm số chốt cuối ngày và đầu tháng mới. Giao dịch sau ngày chốt tiếp tục cộng/trừ bình thường. App không sửa/xóa các khoản chi, không tạo khoản chi/thu nhập giả bằng chênh lệch. Một ghi chú chứa ngày, đơn vị tiền tệ, số sổ, số thực tế và các chênh lệch được nối vào ghi chú ngày cuối tháng, giữ nội dung đã có. **Lịch sử đối chiếu** giữ bản ghi có cấu trúc và ghi chú riêng; nếu xác nhận lại cùng tháng sẽ thêm phiên bản mới, dùng bản cuối cùng, không cộng chồng các lần điều chỉnh. Ghi chú từng lần phản ánh thông tin lúc xác nhận. Sửa khoản chi cũ sau khi chốt không thay đổi số thực tế đã chốt cho tháng sau; muốn cập nhật số chốt thì đối chiếu lại. Sửa mốc mở sổ không được làm mất các lần đối chiếu đã lưu.

Dư nợ/hạn mức PayPay vẫn tính theo sổ thẻ riêng, không bị đặt lại khi đếm ngân hàng/tiền mặt. Khi xuất/nhập hoặc đồng bộ, trường movement và accounts.reconciliations được giữ nguyên, bao gồm lịch sử và chênh lệch; tải lại không cộng điều chỉnh lần nữa. Không cần SQL/Edge Functions mới. Kiểm tra: `node test/reconciliation.test.js` cùng các bộ test hiện có.

## Phí thẻ, màu nguồn tiền và cập nhật số dư

Phí/lãi chỉ hiển thị trong sao kê, không xuất hiện trong danh sách chi tiêu, danh mục, lịch, biểu đồ hoặc tổng chi phí. Liên kết phí cũ vẫn được giữ nội bộ để tính dư nợ đúng. Tổng thanh toán gồm phí và chỉ trừ nguồn tiền một lần. Màu dùng thống nhất ở giao dịch và biểu đồ: thanh toán thẻ đỏ, lương/thưởng xanh lá, ngân hàng xanh dương, tiền mặt cam, mua bằng thẻ tím; tổng gộp nhiều nguồn giữ màu trung tính.

Nút **Thiết lập số dư** ngày thường mở thông báo chưa khả dụng và nút **Yêu cầu thêm**. Sau lần thiết lập đầu tiên, yêu cầu cập nhật nhập số thực tế cuối ngày, xem chênh lệch rồi xác nhận. Mỗi tài khoản có tối đa 3 cập nhật lưu thành công trong tháng xác nhận (không phải tháng của ngày lịch đang xem). Hủy, lưu lỗi và đối chiếu ngày cuối tháng không dùng lượt. Cập nhật ngày thường cần đồng bộ thành công; lỗi/xung đột không áp dụng số dư mới. Lịch sử và ghi chú chênh lệch lưu cùng tài khoản, giữ qua tải lại/đồng bộ; dư nợ và hạn mức thẻ không bị đặt lại. Các khoản chi cũ được giữ nguyên. Không xác nhận số dư cho ngày tương lai.

## Phạm vi thẻ theo quyền tài khoản

Chỉ tài khoản được `calendar_is_admin` xác nhận là admin mới thấy và dùng **Thẻ & sao kê**, nguồn chi thẻ, sao kê/thanh toán, dư nợ/hạn mức, màu và biểu đồ thẻ. Tài khoản thường chỉ có ngân hàng/tiền mặt: tổng ngày/tháng/năm, tìm kiếm, biểu đồ, số dư và đối chiếu dùng cùng bộ phép tính nhưng loại dữ liệu thẻ. Khi thu hồi quyền hoặc kiểm tra quyền lỗi, module và hộp thoại thẻ được đóng/ẩn. Dữ liệu thẻ đã có trong tài khoản được bảo toàn khi lưu các thay đổi thường; không chuyển giao dịch thẻ thành chi tiền mặt. Bản sao lưu vẫn giữ đầy đủ dữ liệu của chủ tài khoản để tránh mất lịch sử.

Đây là giới hạn chức năng ứng dụng theo quyền admin xác minh từ máy chủ; chính sách RLS tài liệu JSON theo chủ tài khoản vẫn giữ nguyên. Không triển khai thay đổi SQL hoặc sửa dữ liệu thật cho thay đổi giao diện này.

Admin có nút **Nhập / cập nhật hạn mức** ngay trong ô **Hạn mức khả dụng PayPay**. Nhập số còn có thể dùng theo PayPay vào cuối ngày đang chọn, không phải tổng hạn mức tín dụng. Có thể cập nhật không giới hạn số lần, kể cả chưa thiết lập số dư ngân hàng/tiền mặt hoặc đã hết 3 lượt cập nhật số dư. Mốc nhập được lưu theo tài khoản, giữ qua đồng bộ/sao lưu/tải lại; mốc mới nhất đến ngày xem được ưu tiên, giao dịch thẻ sau ngày mốc tiếp tục điều chỉnh hạn mức. Thao tác không sửa dư nợ, tổng hạn mức, tiền ngân hàng/tiền mặt hay lịch sử đối chiếu. Khi chưa có mốc nhập riêng, ứng dụng vẫn dùng tổng hạn mức trừ dư nợ như trước.

## Hai khu vực tài chính (A–E)

Một đăng nhập có nút chuyển **Nước ngoài / Việt Nam**. Chọn Nhật (JPY), Anh (GBP), Hàn (KRW) hoặc Trung Quốc (CNY) trong **Chọn quốc gia & chức năng** khi sổ nước ngoài còn trống. Sổ Việt Nam dùng VND, mặc định tắt Lương. Mỗi sổ có lịch, nguồn tiền, tiết kiệm, khoản vay, tiền vào khác, khoản phải thu và báo cáo riêng. Có thể bật/tắt từng mục; thao tác này không xóa lịch sử và không loại tiền đã ghi khỏi tổng hợp. Quốc gia/tiền tệ của sổ có dữ liệu không được đổi nhãn sang quốc gia khác. Ngôn ngữ giao diện không đổi quốc gia hoặc tiền tệ.

Dữ liệu cũ giữ tại sổ gốc/nước ngoài; không chuyển giao dịch sang Việt Nam và không tự quy đổi. Nếu sổ cũ dùng VND, nút sổ gốc ghi **Sổ cũ (Việt Nam)** để phân biệt với sổ Việt Nam mới. Lịch sử tiết kiệm tháng/mục tiêu cũ giữ nguyên tiền tệ riêng (ví dụ VND), không dùng các con số đó để tự tạo số dư tiết kiệm JPY. Sao lưu JSON xuất/nhập toàn bộ hai sổ cùng nhau. Các thiết bị dùng chung một phiên bản dữ liệu và kiểm tra revision, tránh ghi đè sổ không đang xem. Nên xuất sao lưu trước khi bắt đầu nhập các nguồn mới.

### Nguồn tiết kiệm thực

**Tài sản khu vực = ngân hàng chưa phân bổ + tiền mặt + nguồn tiết kiệm**, cùng đơn vị thu chi của khu vực. Nếu tiết kiệm nằm trong ngân hàng, không nhập lại vào cả ngân hàng chưa phân bổ lẫn tiết kiệm. Khi thiết lập số đầu ngày, nhập ba phần riêng biệt. Với sổ cũ chưa có nguồn tiết kiệm, dùng **Thiết lập nguồn tiết kiệm**: nếu tiền đã nằm trong ngân hàng đang ghi, nhập 0 rồi dùng **Phân bổ / chuyển nguồn tiền** để chuyển nội bộ. Phân bổ giữa nguồn không tạo chi phí hoặc thay đổi tổng tài sản. Số theo dõi tiết kiệm tháng là lịch sử tích lũy, không tự sinh thêm tiền trong nguồn.

Khoản **Đã chi** có nguồn Tiết kiệm giảm tiết kiệm và tài sản một lần, đồng thời tăng chi phí; khoản Dự kiến chưa trừ. Sửa/xóa phải điều chỉnh đúng ảnh hưởng; chặn số dư tiết kiệm âm và giao dịch trước ngày mở nguồn. Đối chiếu cuối tháng/ngày thường có thêm số tiết kiệm thực tế khi đã mở nguồn. Giới hạn 3 xác nhận cập nhật số dư thành công/tháng được áp dụng riêng từng sổ; đối chiếu cuối tháng không tính lượt. Hạn mức PayPay vẫn được nhập không giới hạn, độc lập với số dư ba nguồn.

### Nhập tiền vào và khoản phải thu

**Tiền vào khác** có ngày, nguồn nhận, loại, số tiền, ghi chú; có sửa và xóa. Tiền được cho, làm thêm, tiền lãi tăng Thu nhập khác, không tăng Lương. **Tiền của bản thân gửi về** và **Thu hồi nợ gốc** tăng số dư nhưng không tính thu nhập mới. Trước khi thu hồi gốc, ghi khoản người khác đang nợ trong **Khoản phải thu**; không tự trừ tiền lần nữa vì đây là số gốc đã cho vay trước đó. Thu hồi giảm số phải thu; không được vượt gốc còn lại. Sửa/xóa tiền thu hồi cập nhật lại số dư và số gốc; không xóa khoản phải thu còn lịch sử thu hồi. Tiền lãi luôn ghi riêng với gốc.

Không có chức năng chuyển tiền liên khu vực hay lấy tỷ giá. Bạn tự ghi chi 100.000 JPY từ Tiết kiệm tại Nhật, sau đó tự ghi số VND thực nhận ở sổ Việt Nam, chọn loại Tiền của bản thân gửi về và nguồn nhận. Phí có thể ghi thành một khoản chi riêng. Không liên kết hoặc tự tạo giao dịch ở sổ còn lại, không cộng JPY và VND thành một tổng.

### Thẻ theo khu vực và quyền

Chỉ admin được máy chủ xác nhận mới dùng chức năng thẻ. Nhật giữ module PayPay chi tiết và hạn mức khả dụng. Việt Nam và các quốc gia khác dùng sao kê đơn giản: kỳ, số cần trả, ngày đến hạn, trạng thái; khi trả chọn ngày thực trả và nguồn (ngân hàng/tiền mặt/tiết kiệm). Thanh toán không cộng lại chi phí mua hàng. Nếu chỉ nhập sao kê mà chưa có giao dịch mua, app không suy diễn chi phí/danh mục từ tổng thanh toán. Sổ cũ chưa chọn quốc gia giữ chế độ thẻ cũ. Tài khoản thường không được cấp quyền thẻ qua việc bật mục trong cài đặt.

### Kiểm tra thay đổi A–E

`node --test --test-isolation=none` chạy từng kiểm thử và thống kê đầy đủ; `npm test` chạy các tệp test; `npm run build` tạo bản tĩnh. Kiểm tra trình duyệt tùy chọn dùng Chromium và playwright-core ngoài dependency dự án:

```sh
npm install --prefix /tmp/calendar-browser --no-package-lock playwright-core
# Chạy npm run dev trong một terminal khác.
PLAYWRIGHT_MODULE=/tmp/calendar-browser/node_modules/playwright-core/index.mjs \
  CALENDAR_URL=http://127.0.0.1:5173/ node scripts/check-regions-browser.mjs
```

Kịch bản chỉ sử dụng dữ liệu mô phỏng và chặn tất cả yêu cầu HTTPS thật; có kiểm tra nguồn tiết kiệm, hai sổ, loại tiền vào, sao kê đơn giản, bảo toàn sổ cũ, tải lại, bật/tắt mục, thu hồi admin, khởi tạo GBP và màn hình điện thoại. Không cần SQL/Edge Function mới: tài liệu vẫn có version 2 ở cấp gốc và dùng RPC/kiểm tra revision hiện có. Push Git không chứng minh trang hosting đã triển khai bản mới.

## F — Nền tảng an toàn

Mục **Nền tảng an toàn** hoạt động độc lập trong từng sổ nước ngoài/Việt Nam, dùng tiền tệ thu chi của sổ. Có thể bật/tắt trong **Quốc gia & chức năng**. Chọn **Ngày đánh giá** để xem số liệu, ngân sách tháng tương ứng và 30 ngày tiếp theo. Tắt mục không xóa các quỹ, lịch hoặc điều kiện đã lưu. Phần đầu tư/tài sản ròng thuộc nhóm G chưa được triển khai.

**Đặt lại Nền tảng an toàn** nằm cạnh Ngày đánh giá: xem tài khoản/khu vực và số mục, có thể tải sao lưu JSON, nhập `RESET` rồi xác nhận. Chỉ đặt lại kế hoạch trong **khu vực đang chọn**, gồm quỹ, ngân sách mọi tháng, lịch liên kết, dự phòng và giả thiết trả nợ thông thường. Không thay đổi số dư, khoản đã chi, thu nhập, khoản vay, ghi chú, dữ liệu tín dụng cũ hoặc sổ còn lại. Mặc định xóa cả khoản dự kiến chưa chi liên kết khỏi lịch; bỏ chọn để giữ khoản dự kiến (vẫn được dự báo). Các khoản dự kiến không liên kết và khoản vay vẫn lấy từ sổ gốc. Đây là thao tác riêng, khác với reset toàn bộ tài chính trong Cài đặt; cập nhật mã không tự xóa dữ liệu thật.

Có nút **Xóa quỹ**, **Xóa lịch phải trả**, **Xóa khoản dự kiến** và **Xóa điều kiện trả nợ** ở từng mục, đều cần xác nhận. Xóa quỹ chỉ bỏ earmark/liên kết, không chuyển tiền; xóa lịch của khoản đã chi giữ nguyên giao dịch thực. Bản ghi gốc của các thao tác này (cả lịch sử xác nhận/hủy và ghi chú) nằm trong `safety.cleanupHistory` của sao lưu JSON, không tham gia tính số dư. Lịch sử chứa liên kết tín dụng chỉ hiển thị cho admin. Chỉ áp dụng sau ACK; lỗi/xung đột giữ nguyên dữ liệu và popup. Popup đã đóng, đổi tài khoản/khu vực hoặc bị thu hồi quyền cần thiết không được ghi. Kiểm thử bằng `node --test test/safety-cleanup.test.js` và script giả lập `scripts/check-safety-cleanup-browser.mjs` cùng các bộ hồi quy.

### F1–F3: Quỹ mục tiêu và quỹ dự phòng

Tạo nhiều quỹ, mỗi quỹ có tên, nguồn thực (ngân hàng/tiền mặt/tiết kiệm), loại mục tiêu hoặc dự phòng, mục tiêu và lịch sử. **Dành thêm tiền** chỉ đánh dấu một phần tiền đang nằm trong nguồn; không tạo chuyển khoản, thu nhập, chi phí hoặc tài sản mới. **Giải phóng tiền** bỏ đánh dấu. Ví dụ nguồn tiết kiệm có 500, dành 200 cho dự phòng thì nguồn và tài sản vẫn giữ 500; quỹ có 200 và phần chưa dành là 300.

Khi nhập chi tiêu có thể chọn **Quỹ chi**; nguồn tự theo quỹ. Khoản Đã chi giảm nguồn và phần tiền dành cho quỹ một lần; khoản Dự kiến chưa trừ nhưng được xét trong dự báo. Sửa/hủy giao dịch cập nhật lại phần quỹ theo chính giao dịch đó. Chặn phân bổ vượt nguồn, chi vượt quỹ, lệch nguồn hoặc dùng phần đã dành cho quỹ như tiền chưa phân bổ. Kiểm tra các mốc lịch sử để sửa ngày/số tiền không làm âm quỹ ở quá khứ. Trước khi trả khoản vay/thẻ từ tiền đã dành, giải phóng khoản cần dùng khỏi quỹ rồi chọn nguồn thanh toán. Không đổi nguồn của quỹ đã có lịch sử; chỉ đóng khi tiền quỹ đã về 0. Nhật ký phân bổ/giải phóng và giao dịch chi được giữ để đối chiếu.

Nhập chi phí thiết yếu mỗi tháng và số tháng dự phòng mong muốn. **Mục tiêu dự phòng = chi phí thiết yếu × số tháng**, **số tháng được bảo vệ = tổng các quỹ dự phòng ÷ chi phí thiết yếu**. Chi phí thiết yếu do bạn xác nhận, không tự suy đoán từ lịch sử. Chưa nhập hoặc bằng 0 thì không hiển thị một số tháng giả. Các quỹ JPY và VND không cộng chung, không tự dùng lịch sử tiết kiệm VND cũ làm tiền dự phòng JPY.

### F4: Ngân sách danh mục

Nhập giới hạn theo tháng và danh mục. Bảng hiển thị Đã chi, Dự kiến, Còn và số vượt; cảnh báo cũng xuất hiện ở trang Thu chi. Đã chi chỉ tính chi phí trong đúng tháng, gồm chi từ quỹ nhưng không gồm việc dành tiền cho quỹ, chuyển nguồn, phí sao kê hay thanh toán thẻ lặp lại. Lãi/phí vay đã ghi cùng lần trả nợ được tính một lần trong khoản chi liên kết. Đã chi vượt ngân sách là cảnh báo thực tế; Đã chi + Dự kiến vượt là cảnh báo kế hoạch. Ngân sách là giới hạn tự đặt, không tự chặn chi và không sửa số dư. Sửa/xóa ngân sách không xóa giao dịch.

### F5: Lịch phải trả

Lịch gom khoản dự kiến, khoản vay đến hạn và sao kê theo đúng phạm vi quyền. **Thêm khoản phải trả** tạo đúng một dòng dự kiến liên kết. Nếu khoản đã có trong chi tiêu, chọn **Theo dõi khoản dự kiến** để liên kết dòng hiện có, không tạo thêm. Có thể gắn quỹ khi tạo/sửa lịch. Xác nhận đã trả nhập ngày thực trả, chuyển dòng liên kết sang ngày đó và đổi thành Đã chi; nguồn và quỹ giảm một lần. Hủy xác nhận đưa về Dự kiến ở ngày đến hạn ban đầu, hoàn ảnh hưởng và giữ lịch sử xác nhận/hủy. Dòng liên kết không được sửa/xóa trực tiếp ở danh sách chi tiêu. Khi xóa lịch qua chức năng gốc, lịch sử được giữ trong bản ghi xóa; khoản thực chi luôn giữ nguyên, còn khoản chưa chi được xóa hoặc giữ theo lựa chọn trong popup.

Với khoản vay, nhập mức phải trả, nguồn và ngày phải trả tiếp theo trong **Điều kiện trả nợ**. Các khoản trả gốc + lãi/phí đã ghi kể từ đầu tháng của ngày đến hạn làm giảm số tối thiểu còn phải trả cho lần đó. Cập nhật ngày tiếp theo khi lịch thực tế thay đổi; không tự tạo khoản trả hàng tháng. Số chưa biết có thể để trống và được báo thiếu, không mặc định là 0. Sao kê dùng tổng đã nhập và nguồn dự báo được chọn trong Ngân sách trả nợ; sao kê Dự kiến được đánh dấu ước tính. Phần khoản vay/thẻ có nút dẫn đến chức năng xác nhận hiện có, không tạo thêm chi phí thứ hai.

### F6: Dự báo tiền 30 ngày

Bắt đầu từ số dư cuối Ngày đánh giá rồi áp dụng mỗi dòng tiền tương lai đúng một lần: lương/tiền nhận có ngày đã nhập, khoản chi thực tế có ngày tương lai, khoản dự kiến, chuyển nguồn, khoản vay phải trả và sao kê. Mua bằng thẻ không tự trừ nguồn tiền ngay và không tự suy ra ngày/số tiền trả khi chưa có sao kê. Khoản quá hạn được giả định trả ngày kế tiếp để làm rõ nhu cầu tiền. Khoản vay đã có trả nợ tương lai không bị dự báo thêm cùng mức tối thiểu; gốc và lãi/phí đã ghi đều được xét.

Bảng tách ngân hàng, tiền mặt, tiết kiệm, phần chưa dành cho quỹ và các sự kiện. Cảnh báo khi một nguồn thiếu tiền, tiền chưa phân bổ bị âm hoặc quỹ dự kiến không đủ, kể cả tổng tài sản vẫn dương. Không cộng quỹ lần nữa vào số dư. Khoản thiếu số phải trả hoặc nguồn được liệt kê là chưa tính được; lương chưa nhập, khoản phải thu chưa có tiền nhận và khoản chi chưa có lịch không được tự dự đoán. Dự báo không tạo giao dịch và không bảo đảm số thực tế tương lai.

### F7: So sánh kế hoạch trả nợ

Nhập ngân sách trả nợ tháng, APR, mức tối thiểu từng khoản. So sánh **ưu tiên lãi cao** và **ưu tiên dư nợ nhỏ**; cả hai trả các mức tối thiểu trước rồi phân bổ phần còn lại theo chiến lược. Mô phỏng tính lãi hàng tháng bằng dư nợ × APR / 12, làm tròn đến ba chữ số thập phân, tái sử dụng ngân sách khi một khoản đã hết nợ. Hiển thị số tháng dự kiến, tổng lãi, tổng trả và lịch từng tháng. Không giả định lãi suất chưa biết bằng 0; báo thiếu dữ liệu, ngân sách thấp hơn tối thiểu, không giảm được nợ hoặc chưa hết trong 600 tháng. Phí mới, thay đổi lãi suất và quy tắc tính lãi hàng ngày của ngân hàng không nằm trong mô phỏng.

Admin có thể nhập riêng dư nợ, APR và mức tối thiểu thẻ cho kế hoạch, kèm ngày số liệu. Đây không phải thao tác sửa dư nợ thực. Chỉ dùng số liệu thẻ đúng Ngày đánh giá; số liệu cũ được yêu cầu cập nhật. Tài khoản thường không thấy hoặc sửa phần thẻ, điều kiện của khoản nợ loại thẻ hay nguồn dự báo sao kê.

Khi **ghi trả nợ thực tế**, nhập **Gốc trả kỳ này** và **Lãi/phí thực trả**. Nguồn tiền giảm bằng tổng hai khoản; chỉ gốc giảm dư nợ. App tạo một khoản chi liên kết tổng thanh toán, không nhập lãi/phí lại thành khoản chi thứ hai. Có thể ghi lần chỉ trả lãi/phí với gốc 0. Hủy lần trả kiểm tra liên kết rồi hoàn đúng tổng tiền, khôi phục gốc và giữ lịch sử. Dữ liệu cũ không có trường lãi/phí giữ nguyên cách tính cũ.

### F8 và kiểm tra

Khoản phải thu/thu hồi gốc/lãi riêng đã có trong A–E; nhóm F bổ sung đường dẫn đến phần đó và không tạo sổ phải thu thứ hai. Toàn bộ cấu hình `safety` lưu trong từng sổ, đi cùng đồng bộ/sao lưu và kiểm tra revision. Các hộp thoại kiểm tra người dùng, khu vực và snapshot trước khi xác nhận. Không cần migration SQL hay triển khai Edge Function mới.

Kiểm thử: `node --test --test-isolation=none`, `npm test`, `npm run build`. Với Chromium/playwright-core chuẩn bị như phần A–E, có thể chạy:

```sh
PLAYWRIGHT_MODULE=/tmp/calendar-browser/node_modules/playwright-core/index.mjs \
  CALENDAR_URL=http://127.0.0.1:5173/ node scripts/check-safety-browser.mjs
```

Kịch bản dùng API mô phỏng, kiểm tra quỹ, dự phòng, ngân sách, xác nhận/hủy, ngày trả thực, chi từ quỹ, khoản không đủ tiền, dự báo, kế hoạch trả nợ, gốc/lãi thực trả, hai sổ, tải lại, phân quyền và màn hình điện thoại. Không sửa dữ liệu tài chính thật.

Kiểm thử luồng nhập/sửa khoản chi (API và tài khoản mô phỏng hoàn toàn):

```sh
node test/expense-entry.test.js
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/check-expenses-browser.mjs
```

Script trình duyệt dùng Chromium tại `/usr/bin/chromium`, mặc định truy cập `http://127.0.0.1:5173` (có thể đặt `CALENDAR_URL`). Kiểm tra lưu chậm/nhập tiếp, lỗi/xung đột, popup sửa/hủy/xóa, số dư/quỹ, hai khu vực, đổi tài khoản, thu hồi quyền và giao diện máy tính/điện thoại. Ảnh mô phỏng được ghi vào `/tmp`, không đưa vào repository.

## Số dư đầu kỳ và tiền tháng trước

Bấm **Thiết lập số dư** trong khu vực **Tài sản hiện tại** (hoặc mở **Thiết lập / đối chiếu nguồn tiền theo ngày lịch → Thiết lập số dư**), có ba lựa chọn:

- **Nhập tiền còn lại cuối tháng trước**: nhập ngân hàng, tiền mặt và tiết kiệm thực có sau mọi giao dịch cuối tháng. Tiền chuyển sang tháng sau, không tạo thu nhập và không trừ lại giao dịch trong ngày chốt.
- **Sửa ngày bắt đầu / số dư đầu kỳ**: chọn mốc sớm hơn để theo dõi cả tháng trước, hoặc sửa số tiền đầu kỳ. Số đầu ngày được tính trước mọi giao dịch của ngày đó.
- **Nhập thu nhập tháng trước**: mở đúng tháng và ô lương; nhập ngày thực nhận và nguồn nhận như bình thường. Nếu đã chốt số dư cuối tháng, thu nhập trước mốc chốt không được cộng lại vào tiền mang sang. Sổ tắt Lương & thưởng cần bật chức năng này trước.

Mọi thay đổi nguồn tiền có **Xem trước số dư**, rồi **Xác nhận lưu mốc số dư**. Số mới chỉ áp dụng sau khi máy chủ lưu thành công. Hủy/lỗi/xung đột giữ nguyên số đã lưu; có thể sửa lại các ô trước khi xác nhận. Mốc mới không được nằm sau một lần đối chiếu cũ vì phải giữ lịch sử đó. Các lần đối chiếu sau mốc mới vẫn được ưu tiên.

Điều chỉnh đầu kỳ lưu thêm `accounts.openingHistory`, giữ các lần trước và các giao dịch/ghi chú. Mốc ngân hàng/tiền mặt/tiết kiệm được tách khỏi ngày bắt đầu dư nợ thẻ cũ; không đặt lại dư nợ, hạn mức hoặc sao kê để sửa tiền có sẵn. Trước mốc thẻ, dư nợ ghi sổ hiển thị chưa có số liệu thay vì đoán là 0. Sổ khu vực còn lại được giữ nguyên.

Điều chỉnh mốc đầu kỳ dùng chung giới hạn 3 cập nhật thành công/tháng với sửa số dư ngày thường, tính riêng từng sổ. Chốt cuối tháng đã có mốc theo dõi dùng cơ chế đối chiếu hiện có và không tính lượt. Nếu tháng trước chưa được theo dõi, nhập số cuối tháng sẽ tạo mốc nguồn tiền mới và dùng một lượt khi lưu thành công.

Kiểm tra: `node test/opening.test.js`, `npm test`, `npm run build` và `PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/check-opening-browser.mjs` (API/tài khoản mô phỏng, mặc định cổng 5174; đặt `CALENDAR_URL` nếu dùng cổng khác).

## Xuất dữ liệu Excel

Bấm **Xuất Excel → Tải Excel (.xlsx)**. File mở trực tiếp bằng Excel, gồm các trang tổng hợp tháng, giao dịch, thu nhập, tiền vào khác, số dư, mốc đầu kỳ/đối chiếu, chuyển nguồn, tiết kiệm/mục tiêu cũ, khoản vay/trả nợ, quỹ, ngân sách, lịch phải trả và lịch sử. Số dư dùng ngày đang chọn; các trang chi tiết và tổng hợp chứa toàn bộ kỳ có dữ liệu, kể cả năm đã ẩn và cả hai sổ khu vực. Mỗi dòng ghi riêng khu vực và tiền tệ, không tự quy đổi/cộng JPY với VND.

Ô số tiền là số, giữ tối đa 3 chữ số thập phân; tên/ID/ghi chú là văn bản, giữ tiếng Việt và số 0 đầu ID. Có lọc cột và ghim hàng tiêu đề. Phí sao kê không xuất thành chi phí lần nữa; chuyển nội bộ/thanh toán sao kê có chi phí bằng 0. Tổng hợp dùng cùng phép tính với ứng dụng. File ghi rõ nếu chứa bản nháp chưa được máy chủ xác nhận; xuất không tự lưu hoặc sửa dữ liệu.

Excel tuân theo quyền xem hiện tại: xác minh admin với máy chủ trước khi tạo file, tài khoản thường không có dữ liệu thẻ/sao kê/khoản vay tín dụng. Đổi tài khoản/khu vực khi đang xuất sẽ chặn kết quả cũ. File tạo ngay trong trình duyệt, không gửi dữ liệu đến dịch vụ chuyển đổi bên ngoài.

Excel là báo cáo để xem/tính toán; chức năng nhập lại dữ liệu vẫn dùng JSON. Trong hộp xuất, mở **Sao lưu và khôi phục → Sao lưu JSON** để giữ bản sao lưu đầy đủ của tài khoản, gồm dữ liệu ẩn theo quyền như cơ chế sao lưu trước đây. Khi xung đột, **Sao lưu bản nháp JSON** giữ nguyên đường khôi phục đầy đủ trước khi tải lại bản đám mây.

Kiểm thử: `node test/excel.test.js`, `npm test`, `npm run build`; tùy chọn `PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/check-excel-browser.mjs` với máy chủ ở cổng 5175 (hoặc đặt `CALENDAR_URL`). Chỉ dùng dữ liệu giả lập; file/ảnh kiểm thử nằm ở `/tmp`. Bộ ghi OOXML/ZIP không cần cài thêm thư viện hay gọi CDN khi xuất.

## Popup thống kê và thanh toán thẻ (cách hiển thị cũ, xem Cash Basis ở trên)

Bấm icon trên từng ô thống kê (có cả trên điện thoại):

- **Thu nhập**: danh sách lương, thưởng và thu nhập khác, tổng từng nhóm và tổng cuối. Tiền của bản thân chuyển về và thu hồi gốc không tính thêm thu nhập.
- **Chi tiêu & trả thẻ**: chi phí phát sinh (gồm mua bằng thẻ) cộng sao kê thực sự đã thanh toán trong tháng/năm đang xem. Popup tách hai nhóm, hiển thị mua một lần/gốc リボ/phí trong sao kê Nhật, tổng cuối và phần tiền ra thực tế. Sổ dùng sao kê đơn giản chỉ hiện tổng sao kê.
- **Dự kiến chi**: khoản dự kiến đã nhập và sao kê đã xác nhận nhưng chưa thanh toán, theo hạn phải trả trong kỳ. Khoản phải trả có liên kết chỉ tính một giao dịch. Sao kê bản nháp nằm riêng, chưa giả định là 0 hoặc cộng vào tổng đã biết.
- **Chênh lệch thu − chi**: biểu đồ thu nhập, chi phí phát sinh, thanh toán sao kê và số còn lại; có số chi tiết kèm theo. Công thức = thu nhập − chi phát sinh − sao kê đã trả. Trang năm và sổ không dùng lương giữ kỳ dương lịch; sổ có lương trên trang Thu chi hiển thị **Chênh lệch kỳ lương** với kỳ/ngày chốt riêng như dưới đây.

Trả sao kê của tháng trước vẫn tính vào kỳ **ngày thanh toán thực tế**, gồm tiền một lần, phí và gốc リボ; không lấy kỳ sao kê làm ngày chi tiền. Đây là tổng chi và trả thẻ để theo dõi ngân sách. Phần **tiền ra thực tế** = chi trực tiếp từ ngân hàng/tiền mặt/tiết kiệm + trả sao kê. Số dư các nguồn tiếp tục trừ tiền một lần theo sổ; chi phí gốc, lịch, danh mục, ngân sách và lịch sử không bị sửa để tạo thống kê này.

Popup chỉ xem, không tự lưu hay sửa giao dịch. Xác minh quyền admin lại trước khi mở; tài khoản thường không thấy số liệu thẻ. Đổi tài khoản/khu vực/kỳ hoặc nhận dữ liệu mới sẽ đóng popup cũ. Tổng hợp Excel có cột riêng cho chi phí, tiền trả sao kê, tổng chi & trả thẻ, chênh lệch theo từng cách và tổng dự kiến, khớp các ô thống kê.

Kiểm tra: `node test/stats.test.js`, `npm test`, `npm run build`; tùy chọn `PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/check-stats-browser.mjs` với máy chủ ở cổng 5176 hoặc đặt `CALENDAR_URL`. Chỉ dùng tài khoản/dữ liệu mô phỏng.

## Tài sản hiện tại và ngày nhận lương

**Tài sản hiện tại** nằm ở cột riêng bên phải trên máy tính và khối riêng phía trên nội dung trên điện thoại. Bấm tiêu đề để thu gọn/mở chi tiết. Khu vực này luôn tính đến **hôm nay theo ngày tại thiết bị**, độc lập với tháng, năm, ngày lịch hoặc trang đang xem. Khi qua ngày mới, ứng dụng cập nhật số hiển thị mà không tự tạo giao dịch hay gửi lần lưu mới.

Tài sản gồm **ngân hàng chưa phân bổ + tiền mặt + nguồn tiết kiệm** của khu vực đang chọn. Tiền còn lại tháng trước tiếp tục được mang sang. Lương và thưởng đã nhập cộng vào nguồn nhận (mặc định ngân hàng) đúng ngày thực nhận, mặc định ngày **15 hằng tháng**; không cộng trước ngày đó hoặc cộng lần thứ hai sau khi tải lại. Có thể sửa ngày thực nhận nếu nhận sớm/muộn. App không tự suy ra số lương tháng mới khi bạn chưa nhập. Tiền vào khác cũng tăng đúng nguồn nhận theo ngày đã ghi. Mốc số dư thực tế đã chốt được ưu tiên để không cộng lại lương trước mốc.

**Chênh lệch thu − chi** vẫn là kết quả trong kỳ, không phải số dư tài sản. Trước ngày nhận lương, số này có thể âm trong khi ngân hàng/tiền mặt còn tiền từ tháng trước. **PayPay còn khả dụng** hiển thị riêng cho admin được máy chủ xác minh, không cộng hạn mức vào tài sản; không hiển thị ở sổ dùng thẻ đơn giản. Các sổ và tiền tệ tiếp tục độc lập; lịch sử tiết kiệm/mục tiêu cũ không tự cộng vào nguồn tiền khác đơn vị.

**Thiết lập số dư** và **Cập nhật PayPay hôm nay** thao tác theo hôm nay. **Đối chiếu theo ngày lịch** mở lại các công cụ theo ngày lịch đang chọn, gồm số dư lịch sử, chuyển nguồn và đối chiếu. Bản nháp vẫn cần Enter hoặc **Lưu thay đổi**; số dư hiện tại chỉ dùng dữ liệu được máy chủ xác nhận, bản nháp chưa tính có nhãn riêng. Xuất Excel tiếp tục ghi rõ số dư tại ngày lịch được chọn trong file.

Kiểm tra: `node test/current-wallet.test.js`, `npm test`, `npm run build` và `PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CALENDAR_URL=http://127.0.0.1:5173 node scripts/check-current-wallet-browser.mjs`. Kịch bản dùng dữ liệu mô phỏng, đóng băng đồng hồ trước/sau ngày 15, kiểm tra đổi ngày/kỳ/trang, hai khu vực, số dư PayPay, thu hồi quyền, đổi tài khoản và bố cục máy tính/điện thoại; không gửi dữ liệu đến tài khoản thật.

## Chênh lệch theo kỳ lương ngày 15 (cũ, hiện chỉ dùng kế hoạch bổ sung)

Ở sổ bật Lương & thưởng hoặc đã có số lương/thưởng, ô thứ tư trên trang Thu chi là **Chênh lệch kỳ lương**, tính từ **ngày 15 đến hết ngày 14 tháng sau**, theo ngày lịch đang chọn. Ô ghi rõ ngày đầu/cuối kỳ và ngày đang tính đến. Ba ô Thu nhập, Chi tiêu và Dự kiến chi cùng danh sách, lịch, ngân sách và biểu đồ phân tích vẫn tổng hợp theo tháng; trang tổng kết năm giữ số cả năm. Sổ không dùng lương vẫn hiển thị chênh lệch tháng.

Ví dụ chọn ngày 04/11 thì kỳ là **15/10–14/11**, tính các khoản từ 15/10 đến 04/11. Lương đã nhận 15/10 được dùng cùng các khoản chi cuối tháng 10 và đầu tháng 11; sang ngày 01/11 không bắt đầu lại từ 0. Chọn ngày 15/11 sẽ mở kỳ **15/11–14/12**. Tiền tài sản vẫn được mang sang theo sổ nguồn tiền, không bị đặt lại khi sang kỳ mới.

Thu nhập trong kỳ dùng **ngày thực nhận** (`receivedOn`, mặc định ngày 15), không dùng tháng làm việc hay chỉ dựa trên khóa tháng của bản ghi. Lương chưa đến ngày nhận không được cộng; không có bản ghi thì hiện **Chưa có lương đã nhận được ghi trong kỳ này**, không tự suy ra lương. Nếu nhận muộn hoặc thực sự chi vượt thu, chênh lệch có thể âm. Tiền vào khác thuộc thu nhập được tính theo ngày nhận; chuyển nội bộ, tiền bản thân gửi về và thu hồi gốc không tạo thu nhập mới.

Công thức kỳ lương giữ **thu nhập đã nhận − chi phí phát sinh − sao kê thực đã trả**. Popup icon mở biểu đồ, tổng theo cùng kỳ và danh sách giao dịch để kiểm tra; vẫn tách thêm tiền ra thực tế. Mua bằng thẻ và trả sao kê tiếp tục theo cách hiển thị đã chọn, không sửa sổ số dư hay cộng phí/thanh toán thêm lần nữa vào chi phí gốc.

Xuất Excel có trang riêng **Chênh lệch kỳ lương**, ghi ngày đầu/cuối kỳ, ngày tính đến và các thành phần số tiền theo từng sổ/tiền tệ/quyền xem. Trang **Tổng hợp tháng** giữ số dương lịch. Kỳ lương là phép xem dữ liệu, không tự lưu hoặc sửa ngày giao dịch/thu nhập.

Kiểm tra: `node test/salary-cycle.test.js`, `npm test`, `npm run build` và kịch bản `scripts/check-stats-browser.mjs` bằng API/tài khoản mô phỏng như trên. Bao gồm đổi tháng, ngày 14/15, nhận sớm/muộn, thiếu lương, ngày thực nhận khác khóa tháng, giao năm/năm ẩn, sao kê, quyền admin, hai sổ, popup cũ và giao diện điện thoại/máy tính.
