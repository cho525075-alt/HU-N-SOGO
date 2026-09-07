CONTINUITY DIRECTOR V11 — TEAM CONTROL
=======================================

V11 phát triển trực tiếp từ V10 và giữ các chức năng V9/V10.

CHỨC NĂNG MỚI
- Phân công từng scene cho nhân viên.
- Khóa scene khi một người đang sửa để giảm ghi đè.
- Khóa tự hết hạn sau 2 giờ.
- Chủ đội có thể mở khóa.
- Lịch sử phiên bản project thủ công.
- Có thể nạp lại một phiên bản cũ vào máy rồi đồng bộ lên Cloud khi đã kiểm tra.
- Chỉ chủ đội được phân công và xóa phiên bản.

NẾU BẠN ĐÃ CÓ V10 ONLINE
1. Mở Supabase > SQL Editor.
2. Copy toàn bộ file UPGRADE-V10-TO-V11.sql và Run.
3. Thay mã nguồn V10 trên GitHub bằng toàn bộ file V11.
4. Vercel sẽ deploy lại; nếu không, bấm Redeploy.
5. Không cần đổi SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY.

NẾU CÀI MỚI
- Chạy toàn bộ SUPABASE-SETUP.sql.
- Deploy mã nguồn lên Vercel giống V10.

CÁCH DÙNG
- Online Team > đăng nhập > mở project Cloud.
- Phân công & khóa cảnh > chủ đội chọn người phụ trách từng cảnh.
- Nhân viên bấm “Mở & khóa” trước khi chỉnh.
- Chỉnh xong quay lại trang này và bấm “Mở khóa”.
- Trước thay đổi lớn, bấm “Lưu phiên bản hiện tại”.

LƯU Ý
V11 giảm xung đột theo scene nhưng chưa phải realtime field-by-field kiểu Google Docs.
Không để OpenAI/Veo/TTS service key trong index.html.
