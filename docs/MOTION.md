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
