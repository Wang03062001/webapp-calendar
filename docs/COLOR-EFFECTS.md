# Hiệu ứng màu tương tác

- Nút chính và tab khu vực/tháng được chọn dùng gradient tím hai đầu đủ tương phản với chữ trắng. Nút disabled và thao tác danger giữ cơ chế/phân biệt hiện có.
- Thẻ ví có lớp màu rất nhẹ ở góc. Hover/focus-within có viền và bóng màu; không dùng script theo con trỏ hoặc animation chạy liên tục.
- Navigation/năm/ngày đang chọn có màu nhấn; giữ nguyên aria-pressed, focus ring và thông tin chữ. Không thay màu vai trò tiền: thu nhập, ngân hàng, tiền mặt, thanh toán, thẻ và tiết kiệm vẫn lấy từ các token tiền gốc.
- Trường nhập focus có viền rõ và bóng nhẹ; required/user-invalid có viền lỗi cùng thông báo kiểm tra native/cơ chế đã có. Không tự tô lỗi cho mọi ô trống lúc mở form. Selector focus/error phải đủ ưu tiên so với CSS input giao diện tối.
- Hai theme có bộ `--fx-*` riêng. Chuyển màu khi tương tác chỉ hữu hạn; prefers-reduced-motion vẫn bỏ transition/motion, giữ trạng thái màu tĩnh đọc được.
- Forced Colors bỏ gradient trang trí và dùng ButtonFace/ButtonText/Highlight, có border/outline thay cho shadow. Không dùng forced-color-adjust:none để ép giữ màu trang trí.

## Hướng dẫn đã tham khảo

UI/UX Pro Max: `dark mode state contrast` (ux), đối chiếu readability, color contrast và focus appearance; không đồng nhất mọi mục tiền thành một màu thương hiệu.

Modern Web Guidance `color`: “Don't use color alone to indicate the presence of a user interface component or its state” — giữ nhãn, native validity/tooltip, trạng thái chọn và outline. “Maintain 4.5:1 for normal text” — kiểm tra chữ trắng trên cả hai đầu gradient. “Define system color fallbacks for color tokens” — thêm đường lui Forced Colors bằng màu hệ thống.

## Kiểm chứng

`scripts/check-color-effects-browser.mjs`: API giả lập chỉ đọc; kiểm tra hai theme, gradient/hover, màu tiền không đổi, tương phản nút >=4.5 và focus >=3, focus bàn phím, required validation, không tràn ngang điện thoại, reduced motion và Forced Colors. Cùng các kiểm tra layout/motion/biểu đồ/ví và npm test/build. Không sửa dữ liệu tài chính hay chạy test trên tài khoản thật.
