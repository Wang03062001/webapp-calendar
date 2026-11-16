# Ví tiền độc lập

## Cách dùng

1. Lưu hết bản nháp. Trong từng khu vực, bấm **Tách quỹ thành ví riêng**. Có thể tải JSON đầy đủ trước khi đổi.
2. Kiểm tra ngân hàng, tiền mặt, tiết kiệm, từng quỹ và tổng trước/sau. Đánh dấu xác nhận rồi lưu. Chỉ phản ánh sau khi máy chủ chấp nhận; lỗi/xung đột giữ nguyên dữ liệu.
3. Tạo quỹ mục tiêu hoặc dự phòng: quỹ mới bắt đầu ở 0. Bấm **Chuyển tiền giữa các ví** để lấy tiền từ ngân hàng, tiền mặt, tiết kiệm hay một quỹ khác. Ngày chuyển là ngày thực tế, không nhập trước ngày có số dư.
4. Ngân hàng thiếu tiền: chuyển từ tiết kiệm hoặc quỹ về ngân hàng, sau đó ghi chi tiêu ngân hàng. Hoặc chọn thẳng ví quỹ khi nhập khoản chi. Mỗi khoản chi chỉ ghi một lần.
5. Xem số dư hiện tại ở khung bên phải và danh sách ví. Lịch sử chuyển có sửa và hủy với xác nhận. Hủy giữ dấu vết; không được hủy/sửa nếu làm thiếu tiền cho giao dịch sau. Quỹ có lịch sử phải chuyển hết tiền rồi đóng; không xóa lịch sử tài chính.

Ví dụ: ngân hàng đang có 100.000 JPY, trong đó quỹ máy tính đã dành 20.000, tiết kiệm riêng 50.000. Sau khi tách: ngân hàng 80.000, quỹ 20.000, tiết kiệm 50.000; tổng vẫn 150.000. Chuyển 10.000 từ tiết kiệm vào quỹ: ngân hàng 80.000, tiết kiệm 40.000, quỹ 30.000; tổng vẫn 150.000. Chi 5.000 từ quỹ: quỹ còn 25.000, tổng còn 145.000; ngân hàng không giảm lần nữa.

Các ví là nơi giữ tiền trong sổ quản lý. Nếu nhiều ví cùng ở một tài khoản ngân hàng thực tế, tổng các ví thuộc tài khoản đó phải khớp sao kê. Số dư “Ngân hàng” trên ứng dụng chỉ là phần chưa chuyển sang các ví khác. Khi thiết lập/đối chiếu mới ở chế độ ví riêng, nhập phần ngân hàng/tiền mặt/tiết kiệm không chứa tiền quỹ, theo đúng thời điểm đầu ngày/cuối ngày. Không nhập số gộp của tài khoản thực tế vào ô ngân hàng rồi cộng thêm các quỹ.

## Tính tiền và dữ liệu cũ

- Cờ `wallets` là metadata từng sổ JSON phiên bản 2; không cần SQL. Sổ chưa bật vẫn tính như trước. Không tự bật, reset hoặc sửa dữ liệu thật khi tải trang.
- Giữ toàn bộ dòng cũ: tài khoản, phân bổ/giải phóng quỹ, chi gắn quỹ, nguồn, ghi chú, ID và đối chiếu. Nguồn gốc của quỹ là mốc tương thích để đọc lịch sử; không phải một khoản tiền cộng thêm. Tiền quỹ được trừ khỏi nguồn gốc rồi cộng một lần vào ví quỹ.
- Chuyển mới ghi hai đầu ví trong `wallets.transfers`. Hủy đánh dấu `voided` và `voidedOn`; không xóa bản ghi. Kiểm tra tham chiếu, ngày, tiền chính xác và số dư ở mọi ngày bị ảnh hưởng.
- Mốc mới có `walletMode:true` lưu số dư đã tách. Mốc cũ giữ nghĩa số gộp. Lịch sử phân bổ trước ngày mốc vẫn xác định số tiền quỹ mang sang. Chỉnh chuyển cũ không âm thầm sửa số dư ngân hàng đã được đối chiếu.
- Thu nhập và tiền nhận ngoài hệ thống tăng ví nhận. Chi thực tế giảm ví chi. Tổng tiền đang giữ = ngân hàng + tiền mặt + tiết kiệm thực + tất cả quỹ. Báo cáo ở chế độ này tính dòng tiền bên ngoài trên tất cả ví: cuối kỳ = đầu kỳ + tiền vào − tiền ra + điều chỉnh. Chuyển nội bộ không nằm trong tiền vào/ra.
- Giao dịch tín dụng vẫn chỉ theo dõi riêng, không trừ tiền đang giữ. Phân quyền admin và các liên kết trả nợ/phải trả cũ giữ nguyên. Không quy đổi JPY/VND hoặc cộng hai khu vực.
- Mục tiêu và lịch sử tiết kiệm tháng/năm là phần đã có, có thể dùng đồng tiền khác; không tự cộng/trừ khi chuyển ví.
- Dự báo 30 ngày giữ mỗi ví độc lập, không tự rút tiền quỹ để bù ngân hàng. Đặt lại Nền tảng an toàn chỉ xóa kế hoạch, giữ các ví và lịch sử chi tiền; reset tài chính toàn bộ vẫn là thao tác riêng có xác nhận.
- Excel có thêm **Ví độc lập**, **Chuyển ví**, nguồn chi theo tên quỹ và nhãn mốc **Ví riêng**. Giữ JSON để khôi phục; Excel chỉ là báo cáo. Chỉ xuất dữ liệu được xác nhận và theo quyền hiện tại.

## Kiểm chứng

`npm test`, `npm run build`; test/wallets.test.js kiểm tra chuyển mọi cặp ví, chi quỹ, bảo toàn tổng, tiền lương, tiền vay nhận ngoài, tiết kiệm, tín dụng, số dư thiếu, hủy/sửa, mốc net, dự báo, hai khu vực, cleanup, JSON và Excel. scripts/check-wallets-browser.mjs chạy toàn bộ luồng trên API mô phỏng, gồm lưu lỗi/chờ/xung đột, backup, popup, quyền, tài khoản/khu vực, máy tính và điện thoại sáng/tối. Không dùng tài khoản hoặc dữ liệu tài chính thật.

Các browser script cũ check-opening-browser.mjs và check-expenses-browser.mjs hiện chờ menu Thẻ & sao kê đã bị gỡ ở phiên bản trước và còn giả định nhập mới số tiền lẻ JPY; chúng không phù hợp UI hiện hành. Luồng mốc số dư vẫn được kiểm tra bởi unit opening/reconciliation và luồng sửa chi/quỹ/ACK được kiểm tra bằng check-wallets-browser cùng các script tiết kiệm, tín dụng/phân quyền và đồng bộ hiện hành. Không khôi phục giao diện PayPay cũ để làm các script lỗi thời chạy qua.
