# Lịch của tôi

Web app tiếng Việt quản lý lịch, chi tiêu và thu nhập từ 2026 tới 2033. Không cần tài khoản, API key hoặc cơ sở dữ liệu.

## Chạy ứng dụng

Yêu cầu Node.js 22 trở lên. Không có dependency cần cài đặt.

```sh
cd /workspace/webapp-calendar
npm run dev
```

Server nghe trên cổng 5173; có thể đổi bằng biến `PORT`. Chạy `npm test` để kiểm tra lịch, tính tổng, dữ liệu sao lưu; `npm run build` tạo bản tĩnh trong `dist/` có thể triển khai lên static hosting. Dùng `npm start` để chạy mã nguồn bằng server Node.

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

- Chọn năm, tháng, ngày. Các tháng hiển thị tổng tiền cần chi.
- Thêm dòng vào bảng chi tiêu của ngày, nhập nội dung và số tiền VNĐ. Tổng tiền tự cập nhật theo ngày, tháng và năm. Xóa dòng bằng nút thùng rác.
- Ghi chú theo ngày và ghi lương, thưởng, ghi chú thu nhập cho từng tháng.
- Mở **Tổng kết năm** để xem lương, thưởng, chi tiêu, số dư dự kiến và nội dung mọi khoản chi; nhấn tháng hoặc ngày để mở lại lịch.
- Dữ liệu tự lưu trong localStorage của trình duyệt. **Xuất dữ liệu** tải bản sao lưu JSON; nút nhập bên cạnh khôi phục bản sao lưu sau xác nhận thay thế dữ liệu hiện tại.

Chi tiêu là số tiền dự kiến (không có trạng thái đã thanh toán). Số dư dự kiến = lương + thưởng − chi tiêu. Dữ liệu không đồng bộ giữa thiết bị; xóa dữ liệu trình duyệt sẽ xóa kế hoạch, nên xuất bản sao lưu định kỳ. Không có dữ liệu tài chính giả được thêm sẵn.
