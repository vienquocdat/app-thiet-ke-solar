# App thiết kế & báo giá điện mặt trời – TDH Solar

Web app tĩnh (HTML/CSS/JS), chạy trên điện thoại và máy tính.

**Mở app:** https://vienquocdat.github.io/app-thiet-ke-solar/

Lưu ý: kho này công khai. Không điền giá bán vào `du-lieu/` nếu không muốn người ngoài xem được; nhập giá trong màn hình Cài đặt của app (chỉ lưu trên máy đang dùng). Ảnh khảo sát của khách không đưa lên kho.

## Mở app trên máy tính để thử
Trình duyệt không cho đọc các file số liệu khi bấm đúp vào `index.html`, nên cần một máy chủ tạm:

```
cd app-thiet-ke
python3 -m http.server 8000
```
Rồi mở http://localhost:8000

## Số liệu (giá, thiết bị, giá điện, giờ nắng, hằng số)
- Nằm trong thư mục `du-lieu/*.json`. Không viết cứng trong code.
- Ô chưa có số liệu ghi `[CẦN ĐIỀN]`, app hiện chữ đỏ.
- Sửa trong màn hình **Cài đặt** thì chỉ lưu trên máy đang dùng. Muốn áp dụng cho mọi máy: bấm **Xuất file**, chép file đó đè vào `du-lieu/`, rồi đưa lên GitHub.

## Dữ liệu hồ sơ khách
- Lưu ngay trong trình duyệt của máy đang dùng (kể cả ảnh).
- Dùng **Sao lưu tất cả** / **Nhập file sao lưu** để giữ an toàn hoặc chuyển giữa điện thoại và máy tính.

## Kiểm thử
`mau-thu/nha-B.json` là hồ sơ mẫu nhà B, nạp bằng nút **Nạp hồ sơ mẫu nhà B** ở cuối trang danh sách.

## Khi cập nhật app
Tăng số `?v=` trong `index.html` (ví dụ `?v=4` → `?v=5`) để điện thoại tải bản mới, không dùng bản cũ đã lưu tạm.
