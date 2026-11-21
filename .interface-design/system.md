# Hệ thiết kế TDH Solar – "Bản vẽ trên mái nắng"

Áp dụng cho toàn bộ giao diện app và báo giá PDF. Dùng cùng skill `interface-design` + `ui-viet-nam`. Mọi giá trị dưới đây đã chốt; giữ nguyên, không tự đổi.

## 1. Người dùng và cảm giác
- Người tư vấn đứng trên mái nhà, nắng chói, điện thoại, có khi chỉ dùng một tay → tương phản cao, chữ to, nút ≥ 48 px, thao tác chính ở nửa dưới màn hình.
- Vẽ mái, xếp pin, 3D, báo giá thường làm trên laptop → dùng hết chiều ngang, bố cục kiểu phần mềm CAD.
- Hộ dân ở Thanh Hóa đọc báo giá PDF → rõ ràng, đáng tin, chuyên nghiệp, không màu mè.
- Cảm giác: bản vẽ kỹ thuật sạch trên nền sáng. Navy là cấu trúc, màu nắng chỉ cho hành động chính và chỗ "chưa đo".

## 2. Dấu ấn riêng: "đường kích thước"
- Thanh 7 bước vẽ như thước cuộn có vạch chia và số bước.
- Số đo trên khung vẽ hiện như nhãn kích thước của bản vẽ (đường mảnh màu nắng + số, vd "8,0 m").
- Số chưa đo hiện thành ô nét đứt màu nắng với nhãn "Chưa đo", KHÔNG bao giờ hiện chữ `[CẦN ĐIỀN]`.

## 3. Màu (lấy từ logo `anh/logo-tdh.png`)
Tên biến theo thế giới của sản phẩm. Chỉ dùng các biến này, không rải mã màu trong JS.

| Biến | Giá trị | Dùng cho |
|---|---|---|
| `--khung` | `#0B2A4A` | Chữ chính, cấu trúc, bước đã xong (navy ngôi nhà trong logo, làm đậm) |
| `--khung-nhat` | `#1E4F86` | Liên kết, nút dạng chữ, tiêu đề phụ |
| `--nang` | `#FFB020` | Nền nút chính, bước đang làm, nhãn kích thước (mặt trời trong logo) |
| `--nang-dam` | `#E8920C` | Viền ô thiếu số liệu, icon thiếu dữ liệu |
| `--nang-chu` | `#8A5A00` | Chữ trên nền nắng nhạt ("Chưa đo", "Thiếu 2 số đo") |
| `--nang-nhat` | `#FFF1CC` | Nền nhãn thiếu, nền bước đang làm ở cột trái |
| `--nang-nen` | `#FFFBF0` | Nền ô nhập đang thiếu |
| `--la` | `#13803F` | Chỉ cho trạng thái đạt / đủ / đã xong (xanh lá logo) |
| `--la-nhat` | `#E8F5EC` | Nền thông báo đạt |
| `--kinh` | `#12B5C9` | Chỉ trên khung vẽ: đường đang vẽ, hình đang chọn (xanh ngọc tấm pin) |
| `--loi` | `#C62828` | Chỉ cho lỗi thật (nhập sai, thiết kế không đạt) và nút xóa |
| `--loi-nhat` | `#FDECEC` | Nền thông báo lỗi |
| `--be-tong` | `#F4F5F3` | Nền trang |
| `--mat` | `#FFFFFF` | Thẻ, thanh trên, cột trái, bảng thuộc tính |
| `--o-nhap` | `#F7F8F7` | Nền ô nhập (hơi tối hơn thẻ) |
| `--vien` | `#E3E6E8` | Đường chia, viền thẻ |
| `--vien-dam` | `#C9D1D8` | Viền ô nhập, viền nút phụ |
| `--chu-phu` | `#45525F` | Chữ phụ (không dùng xám nhạt hơn mức này cho chữ cần đọc) |
| `--chu-mo` | `#6B7782` | Ghi chú, ngày sửa |
| `--chu-tat` | `#8A96A3` | Bước chưa tới, gợi ý mờ trong ô nhập |
| `--nen-ve` | `#1B2430` | Nền khung vẽ mái (ảnh drone nổi bật) |

Quy tắc:
- Khoảng 60% nền sáng, 30% navy, 10% màu nắng. Mỗi màn hình chỉ 1 nút màu nắng.
- Thiếu số liệu = màu nắng. Sai = màu đỏ. Không dùng đỏ cho "chưa điền".
- Xanh lá chỉ để báo đạt, không dùng làm nút.
- Chữ trên nền nắng luôn là `--khung` (tương phản ~9:1), không dùng chữ trắng.

## 4. Chữ
- Font: **Be Vietnam Pro** (Google Fonts, `subset=vietnamese`), độ đậm 400 / 500 / 600 / 700. Dự phòng `system-ui, sans-serif`. Báo giá PDF dùng cùng font.
- Chuỗi thử bắt buộc: `Nguyễn Thị Ngọc Huyền – Ỷ Ứ Ộ ẫ ặ ỹ Ẩ Ậ – Đặng Quốc Việt`.
- Mọi số: `font-variant-numeric: tabular-nums`; cột số căn phải.

Thang cỡ chữ (tỉ lệ 1,25):

| Cỡ | Độ đậm | Dùng cho |
|---|---|---|
| 12 | 400–500 | Ghi chú, ngày sửa, số trên thước |
| 14 | 400–600 | Chữ phụ, bảng số, nhãn ô nhập |
| 16 | 400 | Chữ chính, ô nhập (điện thoại không được nhỏ hơn 16) |
| 20 | 600 | Tiêu đề nhóm |
| 25 | 600 | Tiêu đề màn hình |
| 31 | 700 | Con số chính: kWp, tổng tiền (letter-spacing −0,02em) |

- Thứ bậc tạo bằng độ đậm + màu trước, cỡ chữ sau.
- Chiều cao dòng: thân bài 1,5; tiêu đề 1,3.
- Hạn chế chữ hoa toàn bộ; nếu dùng thì cỡ ≥ 12, letter-spacing ≤ 0,04em.

## 5. Khoảng cách, góc bo, chiều sâu
- Khoảng cách: bước 4 px → 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Lề: điện thoại 16; bảng/thẻ trên máy tính 16–20.
- Góc bo: ô nhập và nhãn nhỏ 6 · nút và thẻ 10 · bảng trượt đáy 14.
- Chiều sâu: chỉ dùng viền. Riêng phần nổi (thanh tác vụ đáy, bảng trượt, nút nổi trên khung vẽ) có 1 lớp bóng: `0 0 0 1px rgba(11,42,74,.06), 0 4px 12px rgba(11,42,74,.10)`.
- Vùng bấm tối thiểu 48 × 48 px trên điện thoại.

## 6. Nút
| Loại | Mô tả | Khi nào |
|---|---|---|
| Chính | Nền `--nang`, chữ `--khung` 600, cao 48 (52 trên thanh đáy), bo 10, có icon mũi tên khi là bước tiếp | 1 nút/màn hình: "Tiếp: Xếp pin", "Xuất báo giá" |
| Phụ | Nền trắng, viền 1,5 px `--vien-dam`, chữ `--khung` | Chụp ảnh, tải ảnh, hoàn tác |
| Chữ | Không viền, chữ `--khung-nhat` | Sao lưu, xuất file |
| Nguy hiểm | Chữ `--loi`, luôn hỏi lại trước khi làm | Xóa hồ sơ, xóa ảnh |

- Trạng thái bắt buộc: thường, rê chuột, nhấn (`scale(0.97)`, 120 ms), focus (vòng 2 px `--khung-nhat`), tắt.
- Nhãn nút: động từ + đối tượng ("Lưu số liệu", "Tạo báo giá"), không "OK", "Xác nhận".
- Máy tính: nút chính không kéo full-width.

## 7. Icon
- Bộ **Tabler**, kiểu nét (outline), cỡ 20 px (24 px trên thanh đáy, thanh bước). Nhúng SVG trực tiếp, gom trong 1 file JS, không cần build.
- Cấm emoji và ký tự làm icon (`⚙︎ 📷 ✓ × ‹ › ▾ ▲ ▼ ★`).
- Icon 7 bước: Thông số `ruler-measure` · Khảo sát `clipboard-check` · Vẽ mái `drone` · Xếp pin `solar-panel` · 3D `box` · Kỹ thuật `bolt` · Báo giá `file-invoice`.
- Icon trạng thái: xong `circle-check` (`--la`) · thiếu `ruler-measure` hoặc `alert-triangle` (`--nang-dam`) · chưa tới `circle-dashed` (`--chu-tat`) · lỗi `alert-circle` (`--loi`).

## 8. Thanh 7 bước
Thứ tự: Thông số → Khảo sát → Vẽ mái → Xếp pin → 3D → Kỹ thuật → Báo giá.

| Trạng thái | Điện thoại (thước) | Máy tính (cột trái) |
|---|---|---|
| Xong | Đoạn `--khung` đặc | Icon `circle-check` xanh lá + tóm tắt ("2 mảng · 103 m²") |
| Đang làm | Đoạn `--nang`, dày hơn | Nền `--nang-nhat`, vạch `--nang` 3 px bên trái, chữ đậm |
| Thiếu dữ liệu | Đoạn sọc `--nang` / `--nang-nhat` | Icon màu `--nang-dam` + "Thiếu N số đo" (`--nang-chu`) |
| Chưa tới | Đoạn `#DDE2E6` | Icon `circle-dashed`, chữ `--chu-tat` |

- Điện thoại: thước ghim dưới thanh trên; dòng dưới thước "Bước 4/7 · Xếp pin — 3D thiếu 2 số đo ›"; bấm vào mở bảng trượt đáy liệt kê 7 bước, bước thiếu ghi rõ thiếu gì + nút đi tới chỗ thiếu.
- Bước bị chặn vẫn bấm được; màn hình nói rõ cần làm gì trước và có nút đi tới đó.

## 9. Bố cục
Điện thoại (< 768 px):
- Thanh trên trắng: quay lại · tên khách + địa chỉ rút gọn · trạng thái lưu (icon) · menu ⋮ (sao lưu, xóa).
- Thước 7 bước ghim dưới thanh trên.
- Nội dung 1 cột. Khung vẽ tràn ngang; nút phóng to / thu nhỏ / hoàn tác ở góc dưới phải.
- Thanh tác vụ ghim đáy: 1 nút phụ + nút chính "Tiếp: …"; nội dung có `padding-bottom` đủ để không bị che.
- Danh sách hồ sơ: thẻ; nút "Hồ sơ mới" ở đáy.

Máy tính (≥ 1024 px):
- Cột trái 240 px (cùng nền trắng, viền phải): logo, thẻ khách (tên, kWp), 7 bước dọc có trạng thái, Cài đặt ở cuối.
- Vẽ mái / Xếp pin / 3D: khung vẽ chiếm giữa + bảng thuộc tính 340 px bên phải.
- Khảo sát / Thông số: form 2 cột + bảng "Còn thiếu" bên phải, bấm từng mục nhảy tới ô.
- Báo giá: trái so sánh 3 phương án, phải xem trước trang A4 cập nhật ngay.
- Danh sách hồ sơ: bảng (Khách · Địa chỉ · kWp · Trạng thái · Sửa lần cuối), tiêu đề cột ghim, có tìm và lọc trạng thái.
- Nội dung rộng tối đa 1440 px.

## 10. Số liệu thiếu
- Trong `du-lieu/*.json`: giữ `[CẦN ĐIỀN]`. Chỉ phần hiển thị thay đổi.
- Trên giao diện: ô trống, viền nét đứt `--nang-dam`, nền `--nang-nen`, nhãn "Chưa đo" (số đo) hoặc "Chưa có số liệu" (số liệu chung), gợi ý mờ "Nhập số đo".
- Đỏ chỉ khi nhập sai, kèm cách sửa: "Số phải lớn hơn 0".
- Có danh sách "Còn thiếu N mục" bấm được.
- Chặn xuất báo giá PDF khi còn thiếu mục bắt buộc; hiện danh sách thiếu.
- Văn bản hiển thị (danh sách, thông báo) không bao giờ chứa chuỗi `[CẦN ĐIỀN]`.

## 11. Trạng thái màn hình
- Đang tải: khung xương, không chỉ chữ "Đang tải…".
- Trống: nói vì sao trống + nút hành động tiếp theo.
- Lỗi: nói cách sửa.
- Dữ liệu mẫu nhà B và nút "Nạp hồ sơ mẫu" chỉ hiện khi có `?dev=1`.

## 12. Chuyển động
- Nhấn nút 120 ms, bảng trượt 220 ms, `cubic-bezier(0.23, 1, 0.32, 1)`. Chỉ animate `transform` và `opacity`.
- Tôn trọng `prefers-reduced-motion`.

## 13. Báo giá PDF
- A4 dọc, lề 15 mm, Be Vietnam Pro, navy + một đường nắng mảnh dưới đầu trang.
- Đầu trang: logo, tên công ty, mã số thuế, địa chỉ, điện thoại; số báo giá, ngày lập, hiệu lực.
- Bảng hạng mục: STT · Hạng mục · ĐVT · Số lượng · Đơn giá · Thành tiền; tổng, VAT (nếu có), tổng cộng, **bằng chữ**.
- Cuối: chỗ ký, ghi rõ họ tên. Kiểm tra bằng PDF thật.

## 14. Việt Nam
- Tiền: `1.250.000 đ` (ký hiệu `đ`, thống nhất toàn app). Rút gọn trong thẻ số / biểu đồ: `85 nghìn` · `350 tr` · `1,25 tỷ`.
- Số thập phân dấu phẩy: `25,5 kWp`, `0,8`. Phần trăm `12,5%`.
- Ngày `21/11/2026`, ngày giờ `21/11/2026 19:45`, tháng `Tháng 11/2026`. Dùng `Intl` locale `vi-VN`.
- Không dùng `<input type="date">` / `type="month">` của trình duyệt; dùng ô chọn tháng/ngày tiếng Việt.
- Ô nhập tiền: `inputmode="numeric"`, tự chèn dấu chấm nghìn, căn phải, chữ "đ" cố định cuối ô, cho gõ tắt `k` / `tr`.
- Điện thoại: hiển thị `0912 345 678`, lưu 10 số, có link `tel:` và `https://zalo.me/…`.
- Địa chỉ mới: Tỉnh/Thành phố → Phường/Xã + "Số nhà, đường, thôn/xóm".
- Xưng hô: trong app không cần xưng hô; trên báo giá PDF xưng "chúng tôi", gọi "Quý khách".

Bảng thuật ngữ (dùng đúng một cách gọi trong toàn app):

| Dùng | Không dùng |
|---|---|
| Hồ sơ khách | dự án, khách hàng (khi nói về hồ sơ) |
| Mảng mái | mặt mái, vùng mái |
| Vật cản | chướng ngại vật |
| Tấm pin | tấm quang điện, module |
| Khung nâng / Áp mái | khung cao, lắp sát mái |
| Pin lưu trữ | ắc quy, battery |
| Chuỗi | string |
| Cạnh chuẩn | cạnh tham chiếu |
| Tỉ lệ mái | scale |
| Phương án | gói, option |
| Báo giá | bảng giá |
| Số liệu chung (trong Cài đặt) | dữ liệu gốc |
