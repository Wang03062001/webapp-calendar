# Motion cho giao diện tài chính

Hiệu ứng nhẹ, hữu hạn, giữ nguyên bố cục gọn, thông tin tiền và nghiệp vụ:

- Nút: phản hồi bấm khoảng 140ms; hover chỉ dùng trên thiết bị có chuột chính xác. Focus ring và trạng thái disabled giữ nguyên.
- Popup: mở bằng fade và dịch 8px/scale rất nhẹ trong 220ms; backdrop fade 180ms. Đóng, Esc và xóa dialog vẫn dùng cơ chế hiện có, không chờ animation. Không thêm display/overlay exit transition hoặc trì hoãn đóng; trình duyệt không hỗ trợ animation vẫn dùng dialog bình thường.
- Đổi trang/tháng/năm/khu vực/tài khoản: tối đa hai điểm nhấn (tiêu đề và nhóm tổng kết), 220–260ms. Không chụp hay giữ snapshot trang tài chính của tài khoản trước.
- Thu/mở: native details vẫn đổi trạng thái ngay; nội dung chỉ có fade/dịch nhẹ khi mở. Không animate chiều cao bảng/form, không chặn bàn phím.
- Nhập liệu, polling, đồng bộ và đổi theme không chạy lại hiệu ứng trang. Số tiền không chạy count-up và luôn lấy từ cùng dữ liệu đã xác nhận như trước.
- Không thêm thư viện/dependency hoặc mã từ CDN; module chỉ biết DOM/key hiển thị, không truy cập model tài chính, lưu trữ hay gửi request.
- prefers-reduced-motion: các hiệu ứng mới chỉ bật khi no-preference. Khi thiết bị chuyển sang reduce, hủy WAAPI đang chạy và tắt animation CSS, kể cả pseudo-element backdrop. Trạng thái cuối luôn đọc được. Trước khi in cũng hủy WAAPI.

## Skill đã áp dụng

UI/UX Pro Max: tra cứu `micro interaction reduced motion timing` trong domain ux; ưu tiên phản hồi ngắn theo ngữ cảnh, không animate toàn bộ các thẻ hoặc chạy liên tục, tôn trọng sở thích chuyển động.

Modern Web Guidance:

- `motion`: “Prefer to animate `opacity` and `transform`”; chỉ dùng hai thuộc tính cho các hiệu ứng xuất hiện. “Keep the final state”: fill:none, không giữ inline opacity=0 và không chờ animationend để thao tác tài chính hoàn tất.
- `natural-interactions`: “Use `:focus-visible` so keyboard users always see a clear focus ring”; giữ focus ring hiện có và dùng press/hover như phần bổ sung, không ẩn thao tác khỏi thiết bị cảm ứng. “This example animates the opening only”: popup có entry motion; cơ chế đóng gốc vẫn tức thì.

Đã tham khảo `animate-to-from-top-layer` về giới hạn hỗ trợ overlay/display transitions; không dùng các exit transitions đó vì code hiện tại đóng và bỏ DOM ngay để giữ các kiểm tra quyền, stale context và ACK. Không thêm polyfill hoặc trì hoãn đóng chỉ để có exit animation.

## Kiểm chứng

`scripts/check-motion-browser.mjs` dùng API mô phỏng, cấm ghi backend. Kiểm tra đổi trang, thu/mở, không replay khi nhập, Esc/close, beforeprint, đổi reduced-motion trong lúc đang animate, mobile/dark và fallback không có Element.animate. Các browser script compact-layout/wallets/savings/conflict/connection vẫn kiểm tra luồng thật trên dữ liệu mô phỏng. Không test bằng giao dịch tài chính production.

## Hiệu ứng mở rộng

- Tiến/lùi tháng hoặc năm: tiêu đề và nhóm tổng kết trượt theo hướng tương ứng, 6–12px. Chỉ so sánh kỳ trong cùng tài khoản/khu vực/trang; chuyển tài khoản/khu vực/trang dùng hiệu ứng trung tính. Không dùng View Transition snapshot và không giữ hình ảnh dữ liệu cũ.
- Mở phần phân tích: nền thanh biểu đồ đứng yên, phần màu được vẽ bằng scaleX/opacity. Chỉ animate thanh có giá trị khác 0, tối đa 24 thanh mỗi lần mở, thời gian hữu hạn; delay tối đa 120ms. Nhãn, tổng, trạng thái N/A và giá trị vẫn hiển thị đúng ngay. Đóng nhanh hủy tất cả hiệu ứng của phần đó.
- Khi nhập liệu hoặc nhận ACK: biểu đồ thay dữ liệu theo cơ chế cũ, không tự phát lại animation. Các details được đăng ký lại sau refresh để lần mở tiếp theo vẫn có motion.
- Thông báo hiện có thêm entry motion ngắn; không đổi thời gian chờ, nội dung thành công/thất bại hoặc tự tạo thông báo. Trường đang focus có viền bóng nhẹ bổ sung cho outline; thẻ chọn tháng phản hồi hover trên thiết bị có chuột.

Hướng dẫn mới đã tham khảo: `directional-navigation-transitions` — “Determine if the user is moving \"forward\" or \"backward\" in the application flow.” Áp dụng nhận biết hướng trên DOM mới bằng WAAPI; không dùng API snapshot vì không cần chuyển hình ảnh dữ liệu tài chính giữa các tài khoản. Giữ đường lui tĩnh khi thiếu WAAPI/reduced-motion. `motion` — “Prefer to animate `opacity` and `transform`”: nền và chiều rộng tính toán giữ nguyên, chỉ scale phần trang trí, hủy giữa chừng vẫn về trạng thái cuối đọc được.

Browser test kiểm tra cả hai hướng, cách ly khu vực, số thanh bị giới hạn/loại trừ số 0, đóng nhanh, chiều rộng cuối khớp đúng tỷ lệ, reduced-motion, giữ bản nháp, bàn phím và fallback.
