# XÁC MINH HOÀN THÀNH CÔNG VIỆC

Bản GitHub Pages mobile-first cho quản lý ca làm, giờ công và thu nhập.

## Đã có
- Tổng quan: tổng ca / tổng giờ / thu nhập.
- Lịch tháng, thêm/sửa/xóa/sao chép ca.
- Vị trí mặc định + tự thêm + đổi tên để thống kê.
- Giờ vào/ra không làm tròn, cảnh báo trùng ca.
- Lương/giờ, phí cộng thêm có tên tùy chỉnh, ghi chú.
- Ảnh đầu ca/cuối ca: **chụp camera hoặc chọn từ album**.
- OFF.
- Thống kê theo ngày/tuần/tháng; theo tên công việc hoặc vị trí; tìm kiếm không phân biệt hoa/thường.
- Bảng thống kê có ngày, ca, giờ làm, mức lương, từng khoản cộng thêm, lương chưa cộng và thực lãnh.
- Lưu local + đăng nhập Supabase + đồng bộ hai chiều.
- Sao lưu JSON và xuất báo cáo PDF.

## Kết nối Supabase
1. Mở Supabase > SQL Editor > New query.
2. Dán toàn bộ file `supabase-step-2.sql` rồi bấm **Run**.
3. App đã có sẵn Project URL và Publishable key của project bạn đã tạo.
4. Mở app > **☰ > Tài khoản** để tạo tài khoản / đăng nhập.

### Lưu ý
- Chỉ Publishable key được đưa vào app. Không đưa Secret key vào GitHub.
- Ảnh được nén/lưu cùng dữ liệu ca để đồng bộ. Nếu sử dụng số lượng ảnh rất lớn, có thể chuyển sang Supabase Storage ở bước sau.
- Nếu Supabase đang bật yêu cầu xác nhận email, sau khi tạo tài khoản hãy xác nhận email trước khi đăng nhập.
