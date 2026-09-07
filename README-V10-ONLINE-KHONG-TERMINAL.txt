CONTINUITY DIRECTOR V10 — ONLINE TEAM

KHÔNG CẦN TERMINAL.

1. Tạo Supabase project bằng trình duyệt.
2. Vào SQL Editor, copy toàn bộ SUPABASE-SETUP.sql và Run.
3. Lấy Project URL và Publishable key trong Supabase.
4. Tạo GitHub repository, Upload toàn bộ nội dung V10 sao cho index.html, api/, vercel.json ở ROOT.
5. Vercel > Add New Project > Import repository.
6. Thêm Environment Variables:
   SUPABASE_URL = Project URL
   SUPABASE_PUBLISHABLE_KEY = Publishable key
7. Deploy. Nếu thêm env sau deploy thì Redeploy.

SỬ DỤNG
- Chủ đội: Online Team > đăng ký/đăng nhập > Tạo đội.
- Gửi Mã đội cho nhân viên.
- Nhân viên đăng ký/đăng nhập > nhập Mã đội > Tham gia.
- Chủ bấm “Đưa dự án hiện tại lên Cloud”.
- Nhân viên mở dự án từ danh sách Cloud.

V10 giữ toàn bộ V9: nhiều thể loại phim, chia cảnh, image studio, image continuity, voice director, batch production và export/import.

BẢO MẬT
- Không đưa service_role key, OpenAI key, Veo key, TTS key vào index.html.
- Publishable key dùng ở client với RLS.

LƯU Ý V10
- Chưa phải cộng tác realtime kiểu Google Docs. Hai người sửa cùng một project cùng lúc có thể ghi đè. Nên chia theo project/sequence/cảnh.
