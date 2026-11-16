# Skill phát triển giao diện và web

Cài cục bộ cho Codex trong repository, không cài global và không thêm dependency chạy website.

| Bộ hướng dẫn | Nguồn cài | Vị trí |
| --- | --- | --- |
| UI/UX Pro Max | npm `ui-ux-pro-max-cli@2.15.0` | `.agents/skills/ui-ux-pro-max/SKILL.md` |
| Modern Web Guidance | npm `modern-web-guidance@1.0.1`, nguồn `GoogleChrome/modern-web-guidance` | `.agents/skills/modern-web-guidance/SKILL.md` |

Modern Web Guidance được khóa nguồn/commit trong `skills-lock.json`. Các nội dung của nhà cung cấp được giữ nguyên; bản quyền/điều khoản áp dụng theo nguồn phát hành, không do repository này cấp lại. File cài không chứa tài khoản, token, cấu hình riêng hay dữ liệu tài chính.

## Dùng với Codex

Mở một phiên Codex mới trong repository để danh mục skill được nạp lại. AGENTS.md đã liên kết tới hai SKILL.md. Khi yêu cầu sửa UI, Codex đọc hướng dẫn liên quan rồi áp dụng vào đúng phạm vi yêu cầu. Cài skill không tự đổi giao diện, không tự phát hành hay tự sửa số dư. Các quy tắc tài chính/phân quyền và yêu cầu chủ tài khoản luôn được giữ.

UI/UX Pro Max có dữ liệu và công cụ tra cứu Python chạy tại chỗ. Modern Web Guidance có các guide Markdown tại chỗ và CLI npm để tìm kiếm/truy xuất. Nếu mạng hoặc CLI không dùng được, đọc guide đã cài liên quan thay vì bỏ dở phần việc có thể hoàn tất offline. Không bật tính năng thử nghiệm hay thu thập telemetry nếu không cần; ví dụ dưới tắt telemetry.

## Cài đặt đã thực hiện

```sh
npx ui-ux-pro-max-cli@2.15.0 init --ai codex
```

Trình cài này tự thêm sáu bộ mẫu phụ (design, brand, slides, banner-design, design-system, ui-styling). Chúng đã được bỏ khỏi lần cài mới để giữ đúng hai bộ được yêu cầu. Không dùng `--force` để ghi đè tài liệu dự án.

Lệnh `modern-web-guidance install` gọi công cụ `skills add` bên trong. Trong môi trường này trình gọi phụ báo `skills: not found`, nên đã hoàn tất bằng chính lệnh tương đương đó, khóa phiên bản công cụ:

```sh
npx skills@1.9.0 add GoogleChrome/modern-web-guidance --skill modern-web-guidance --agent codex --yes
```

Không sửa package.json hoặc build.mjs: build vẫn chỉ xuất index.html, favicon và src vào dist. Không thêm skill vào mã trình duyệt. CLI được tải bằng cache tạm ngoài repository; không commit node_modules hoặc cache.

## Kiểm tra sử dụng

```sh
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "responsive dashboard" --domain ux --max-results 2
DISABLE_TELEMETRY=1 npx modern-web-guidance@1.0.1 search "responsive data table"
npm test
npm run build
```

Hai tra cứu trên chỉ kiểm tra công cụ hoạt động, không phải yêu cầu thiết kế lại website. Không tự chạy scan/refactor toàn bộ mã hoặc thay đổi tài chính. Khi cần cập nhật skill, xem lại diff và nguồn phát hành trước khi thay phiên bản.
