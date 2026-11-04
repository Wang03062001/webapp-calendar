# Dòng tiền thực tế và an toàn dữ liệu

Đây là quy tắc hiện hành, thay cho KPI thu nhập trừ chi phát sinh / chênh lệch kỳ lương trước đây.

## Công thức và thời gian

- Tài sản tiền = ngân hàng + tiền mặt + nguồn tiết kiệm thực có trong cùng sổ/đồng tiền.
- Quỹ phân bổ trong `safety.funds` chỉ đánh dấu tiền trong nguồn; không cộng vào tài sản lần nữa. Lịch sử tiết kiệm/mục tiêu cũ có đơn vị riêng không tự trở thành nguồn tiền.
- Thu nhập mới có trạng thái **Dự kiến chưa nhận / Đã thực nhận**. Dự kiến không tự trở thành thực nhận khi đến ngày. Các bản ghi ngày nhận cũ giữ cách đọc tương thích, không tự sửa lịch sử.
- Tiền vào là tiền thực nhận theo ngày nhận: lương, thưởng, các khoản nhận khác. Tiền vay nhận về, tiền của bản thân, thu hồi gốc và hoàn tiền tăng tiền nhưng được tách khỏi thu nhập kinh tế.
- Tiền ra = chi trực tiếp + gốc/lãi thực trả nợ khác + từng lần thực trả thẻ. Mua thẻ, dự kiến, hủy, nháp và chuyển nội bộ không vào tiền thực chi.
- Cuối kỳ = đầu kỳ + tiền vào − tiền ra. Biến động = cuối kỳ − đầu kỳ. Nguồn có thể dùng = đầu kỳ + tiền vào. Tỷ lệ sử dụng = tiền ra / nguồn có thể dùng × 100; N/A khi thiếu mốc hoặc mẫu số không dương.
- Nếu có mốc khởi tạo/đối chiếu trong kỳ, chênh lệch được trình bày riêng dưới **Điều chỉnh / đối chiếu số dư**. Không tạo khoản thu/chi giả để ép khớp công thức.
- Báo cáo ngày/tháng/năm dùng ngày 1–cuối kỳ, theo Asia/Tokyo, chỉ tính đến ngày thực tế. Nhật và Việt Nam độc lập; không cộng hay đổi JPY với VND.
- Kỳ lương là kế hoạch bổ sung. Ngày 15 trùng cuối tuần được đề xuất lùi về ngày trong tuần trước đó: 15/11/2026 → 13/11, kỳ trước kết thúc 12/11. Thiếu lịch nghỉ lễ thì ghi rõ chưa xác minh; người dùng nhập ngày thực nhận, ứng dụng không tự biến ngày dự kiến thành tiền vào. `salaryDate()` nhận danh sách ngày nghỉ rõ ràng khi có dữ liệu đó.

## Thực thể và khả năng tương thích

Giữ nguyên phiên bản JSON 2 và cơ sở dữ liệu hiện tại. Không cần thay bảng, chạy SQL hoặc chỉnh dữ liệu tài chính thật. Tái sử dụng các nguồn `accounts.bank/cash/savings`, các giao dịch ngày, thu nhập, receipts, chuyển nguồn, quỹ và đối chiếu. Mỗi sổ hiện có ba loại nguồn tiền tổng hợp như giao diện trước; nâng cấp này không tự tạo nhiều tài khoản ngân hàng hay kết nối ngân hàng/PayPay.

Các trường bổ sung là tùy chọn:

- `cards.statements[].payments[]`: ID, ngày thực trả, nguồn, số tiền, phân bổ `oneOff/principal/fees`, ID giao dịch ngân hàng, mã tham chiếu và trạng thái hủy/audit.
- Trạng thái sao kê `partial` khi đã trả một phần. `paid` chỉ khi nghĩa vụ sau điều chỉnh đã được tất toán. Ngày đến hạn hoặc xác nhận không tự tạo thanh toán.
- `cards.adjustments[]`: hoàn về thẻ, hoàn tiền thực vào nguồn, điều chỉnh giảm sao kê; liên kết giao dịch mua và/hoặc kỳ sao kê, giải thích, ngày và cờ hủy.
- `statements[].adjustments[]`: bản ghi giảm thành phần hóa đơn, được kiểm tra khớp lịch sử điều chỉnh thẻ.
- `estimatedPrincipal/estimatedFees`: dự kiến ban đầu tùy chọn, tách khỏi gốc/phí chính thức và phần thực trả.
- Trạng thái giao dịch `cancelled`/`draft` được bảo toàn. `paid` trên giao dịch mua thẻ cũ nghĩa là **đã phát sinh**, không phải đã thanh toán thẻ; trạng thái thanh toán được suy ra từ sao kê và các lần trả.

Sao kê `paid` cũ tiếp tục đọc thành đúng một khoản thanh toán tại ngày/nguồn cũ, giữ nguyên ID liên kết. Không tự gán các giao dịch mua lịch sử là đã thanh toán, không tạo thêm khoản chi khi tải lại. Trước khi dùng thiết bị khác để sửa, tải phiên bản ứng dụng mới để các trường thanh toán/hoàn tiền được giữ đầy đủ.

Sao lưu JSON vẫn giữ toàn bộ hai sổ, lịch sử và trường thẻ của chủ tài khoản. Excel là báo cáo, không phải file khôi phục. Không chuyển đổi/ghi lại toàn bộ dữ liệu người dùng chỉ vì tải bản nâng cấp. Dữ liệu nhập hỏng, số tiền ngoài giới hạn, ID/link trùng hoặc tổng không khớp bị từ chối; không tự cắt số tiền về giới hạn hay xóa dòng để làm sạch. Các bản cache/backup gốc không bị xóa khi đọc lỗi.

## Chống đếm trùng và trả một phần

Một lần thực trả có một ID riêng và một dòng ngân hàng được bảo vệ. Phép tính nguồn tiền đọc từ lịch sử thanh toán, bỏ qua dòng liên kết khi duyệt chi trực tiếp. Tổng tiền thực chi chỉ cộng lần trả đó một lần.

Có thể **liên kết giao dịch ngân hàng đã nhập**: ngày, nguồn, số tiền và ID phải khớp; hệ thống dùng lại dòng đó. Mã tham chiếu ngân hàng đang dùng không được lặp. Hủy liên kết giữ lại giao dịch ngân hàng gốc; hủy dòng thanh toán do app tạo thì hoàn đúng ảnh hưởng của dòng đó. Lịch sử đã hủy vẫn được giữ, trả lại cần ID lần trả mới.

Ví dụ hóa đơn 33.000 = mua một lần 10.000 + gốc リボ 20.000 + phí 3.000. Trả 15.000 chỉ giảm nguồn 15.000, ghi chi 15.000 và còn 18.000; không đánh dấu tất toán. Mặc định phân bổ phí → mua một lần → gốc, có thể nhập lại ba thành phần trước khi xác nhận. Trả phần còn lại sang tháng sau được tính vào tháng thực trả.

Hoàn về thẻ giảm nghĩa vụ/ghi số dư có trên thẻ, không tăng tài sản ngân hàng. Hoàn thực nhận vào ngân hàng/tiền mặt mới tăng tài sản nguồn. Nếu ngân hàng đã xác nhận giảm hóa đơn, người dùng chọn liên kết điều chỉnh hóa đơn tương ứng. Tổng hoàn không vượt số mua. Giao dịch đã gắn sao kê/hoàn tiền không được xóa/chuyển nguồn/chuyển kỳ tùy ý; sửa qua chức năng điều chỉnh gốc. Giao dịch chưa vào hóa đơn có thể sửa, chuyển kỳ hoặc hủy qua popup.

Dư nợ リボ dùng số chính thức từ sao kê, gốc đã thực trả và phần リボ mới; không tự giảm theo hạn. Nếu sổ dư nợ ban đầu và sao kê không khớp, hiện cảnh báo để đối chiếu, không tự sửa ngân hàng hay lịch sử. Chưa đủ mốc thì hiển thị N/A.

## Số tiền và bản nháp

`money.js` cộng/trừ bằng số nguyên BigInt theo đơn vị 1/1.000, không cộng dồn số thực. JSON giữ định dạng số cũ để tương thích. JPY/VND mới phải là số nguyên; số lẻ lịch sử tối đa ba chữ số được giữ chính xác. Có thể tất toán đúng phần lẻ còn lại của hóa đơn cũ, không làm tròn hoặc sửa ngược lịch sử. Tổng vượt giới hạn biểu diễn an toàn bị từ chối.

`SyncController.confirmedData` là ảnh dữ liệu đã được máy chủ xác nhận. Dashboard, lịch tổng tiền, nguồn hiện tại và Excel dùng ảnh này. Nhập tiếp trong lúc lưu không được tính trước và không bị xóa khi lần trước nhận phản hồi. Lỗi hoặc xung đột giữ nguyên bản nháp; ảnh đã xác nhận không tiến lên. Cache sạch không nhân đôi ảnh; khi thiếu dung lượng, ưu tiên giữ bản nháp đầy đủ, không xóa dữ liệu của tài khoản khác. Khi không có ảnh xác nhận và đang ngoại tuyến, không dùng bản nháp để giả làm số dư thực tế.

Mỗi popup kiểm tra phiên, tài khoản, khu vực, phiên bản dữ liệu và quyền admin với máy chủ trước khi ghi. Epoch khu vực chặn cả popup đã đóng rồi đổi sang khu vực khác và quay lại. Mọi lần lưu dùng revision, giữ nguyên sổ không đang xem. Thẻ, sao kê, hoàn tiền và thông tin dư nợ chỉ dành cho admin được xác minh; lỗi kiểm tra quyền đóng/ẩn phần thẻ.

## Kiểm tra và chạy

```sh
npm test
npm run build
npm run dev
```

Không có linter/typechecker trong dự án; cú pháp JavaScript được kiểm tra bằng `node --check`. Chỉ cần Node >=22, không thêm dependency frontend.

Trình duyệt (API/tài khoản hoàn toàn giả lập):

```sh
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs \
  CALENDAR_URL=http://127.0.0.1:5173 node scripts/check-cash-browser.mjs
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs \
  CALENDAR_URL=http://127.0.0.1:5173 node scripts/check-excel-browser.mjs
```

Bộ kiểm thử `test/cash-basis.test.js` bao gồm A–G, trả một phần/nhiều lần/khác tháng, hủy/trả lại, liên kết ngân hàng, hoàn tiền hai hướng, nguồn tiết kiệm/quỹ, số tiền, đối chiếu và xác nhận máy chủ. Bộ cũ tiếp tục kiểm tra lịch sử, phân quyền, hai sổ, sao lưu, nguồn tiền và đồng bộ. Các entry `check-stats-browser.mjs`/`check-current-wallet-browser.mjs` chuyển sang bộ cash-basis vì KPI và chính sách bản nháp đã thay đổi. Ảnh và Excel kiểm thử nằm ở `/tmp`, không đưa vào git.

## Các file chính thay đổi

- Lõi mới: `money.js`, `finance-date.js`, `cash-model.js`, `card-ledger.js`, `finance-validation.js`.
- Tích hợp: `account-model.js`, `card-model.js`, `model.js`, `receipt-model.js`, `safety-model.js`, `sync.js`.
- Giao diện: `app.js`, `stats-ui.js`, `credit-ui.js`, `simple-card-ui.js`, `current-wallet.js`, `accounts-ui.js`, `opening-ui.js`, `debts.js`, `safety-ui.js`, `region-ui.js`, `style.css`, `translations.js`.
- Báo cáo: `excel-report.js`, `export-ui.js`; máy chủ tĩnh `server.mjs` phục vụ các module mới.
- Kiểm thử: `test/cash-basis.test.js`, `test/excel.test.js`, `test/model.test.js`, các script trình duyệt cash/Excel/stats/current-wallet; hướng dẫn tại README và AGENTS.

Giới hạn có chủ đích: không có kết nối ngân hàng/PayPay tự động, không có lịch nghỉ lễ Nhật được xác minh sẵn, không tự đoán số phải trả hoặc chuyển đổi tiền tệ. Dữ liệu lịch nghỉ lễ và ngày thực nhận phải do nguồn hợp lệ/người dùng xác nhận.
