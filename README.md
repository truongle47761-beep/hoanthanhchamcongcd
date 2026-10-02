# XÁC MINH HOÀN THÀNH CÔNG VIỆC

Bản đầu tiên là **web app/PWA chạy local**, tối ưu điện thoại và có thể triển khai thẳng lên GitHub Pages.

## Có sẵn

- Tổng quan: tổng ca / tổng giờ / thu nhập.
- Lịch tháng.
- Thêm, sửa toàn bộ, sao chép, xóa ca có xác nhận.
- Tên công việc.
- Vị trí: Phục vụ, Pha chế, Thu ngân, Bếp, Khác.
- Thêm vị trí, đổi tên vị trí; ca cũ tự cập nhật khi đổi tên.
- Giờ vào/ra theo phút, không làm tròn.
- Phát hiện ca trùng thời gian trước khi lưu.
- Lương/giờ.
- Nhiều khoản phí cộng thêm với tên tùy chỉnh.
- Ghi chú.
- Ảnh đầu ca/cuối ca lưu trên thiết bị.
- OFF.
- Thống kê ngày/tuần/tháng, theo công việc và vị trí.
- Sao lưu JSON và nhập lại JSON.
- Xuất báo cáo bằng chức năng in của trình duyệt → Save as PDF.
- Giao diện mobile Lavender + trắng + hồng nhẹ.
- Menu ba gạch.

## Chạy thử

Mở `index.html` trực tiếp để dùng bản cơ bản. Để PWA/service worker hoạt động đầy đủ, triển khai thư mục lên GitHub Pages hoặc một web server HTTPS.

## GitHub Pages

1. Tạo repository mới.
2. Upload toàn bộ file trong thư mục này.
3. Vào Settings → Pages.
4. Chọn Deploy from a branch → `main` → `/ (root)`.
5. Mở URL GitHub Pages.

## Lưu ý về tài khoản/cloud

Bản này **chưa kết nối cloud**. Mục tài khoản hiện chỉ là placeholder local để tránh giả tạo hệ thống bảo mật. Không dùng mật khẩu thật ở bản này.

Sau khi bạn xác nhận bản local chạy ổn, bước tiếp theo là thiết kế backend/cloud, đăng nhập thật và đồng bộ nhiều thiết bị.
