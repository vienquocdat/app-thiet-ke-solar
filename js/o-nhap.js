// Ô nhập kiểu Việt Nam dùng chung: tháng, tiền, số điện thoại, địa chỉ 2 cấp, ô có đơn vị,
// khung trường có đánh dấu "chưa có số liệu", và danh sách "Còn thiếu N mục" bấm để nhảy tới ô.
const ONhap = (() => {
  const coGT = (x) => x !== null && x !== undefined && x !== '' && x !== CAN_DIEN;

  // 34 tỉnh, thành phố sau sắp xếp đơn vị hành chính (hiệu lực 01/07/2025).
  // Danh sách phường/xã chưa có trong app: gõ tay, app gợi ý các tên đã nhập ở hồ sơ trước.
  const TINH = [
    'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai',
    'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình',
    'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên', 'Thanh Hóa',
    'Tuyên Quang', 'Vĩnh Long',
    'Thành phố Cần Thơ', 'Thành phố Đà Nẵng', 'Thành phố Hà Nội', 'Thành phố Hải Phòng', 'Thành phố Hồ Chí Minh', 'Thành phố Huế',
  ].sort((a, b) => a.localeCompare(b, 'vi'));

  // Giữ con trỏ đúng chỗ khi định dạng lại chuỗi (đếm số chữ số đứng trước con trỏ).
  function datLaiGiuConTro(o, chuMoi) {
    const viTri = o.selectionStart ?? o.value.length;
    const soTruoc = o.value.slice(0, viTri).replace(/\D/g, '').length;
    o.value = chuMoi;
    let i = 0, dem = 0;
    while (i < chuMoi.length && dem < soTruoc) { if (/\d/.test(chuMoi[i])) dem++; i++; }
    if (document.activeElement === o) o.setSelectionRange(i, i);
  }

  // Ô có chữ đơn vị cố định ở cuối (đ, kWh, m, %…)
  function hauTo(o, chu) {
    return TI.el('div', { class: 'o-hau-to' }, o, TI.el('span', { class: 'hau-to', 'aria-hidden': 'true' }, chu));
  }

  // ---------- Tháng: ô chọn "Tháng 11/2026" (không dùng input type="month" của trình duyệt) ----------
  function thang(gt, khiDoi, { soThang = 36, ...phu } = {}) {
    const ds = [];
    const d = new Date();
    for (let i = 0; i < soThang; i++) {
      const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
      ds.push([`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`, `Tháng ${t.getMonth() + 1}/${t.getFullYear()}`]);
    }
    if (gt && !ds.some(([ma]) => ma === gt)) {
      const [y, m] = gt.split('-');
      ds.unshift([gt, `Tháng ${Number(m)}/${y}`]);
    }
    return TI.el('select', { ...phu, onchange: (e) => khiDoi(e.target.value) },
      TI.el('option', { value: '' }, 'Chọn tháng'),
      ...ds.map(([ma, ten]) => TI.el('option', { value: ma, selected: ma === gt }, ten)));
  }

  // ---------- Tiền: tự chèn dấu chấm nghìn, gõ tắt 85k, 1tr2, 1,5tr, 2 tỷ ----------
  const DON_VI_TIEN = [[/^(k|n|ng|nghin|nghìn|ngàn|ngan)$/, 1e3], [/^(tr|trieu|triệu|m)$/, 1e6], [/^(t|ty|tỷ|ti|tỉ)$/, 1e9]];
  function docTien(chu) {
    let s = String(chu || '').toLowerCase().replace(/\s|đ|₫|vnd|đồng|dong/g, '');
    if (!s) return null;
    if (/^[\d.]+$/.test(s)) return Number(s.replace(/\./g, ''));
    const m = s.match(/^(\d+(?:[.,]\d+)?)([a-zà-ỹ]+)(\d*)$/);
    if (!m) return NaN;
    const dv = DON_VI_TIEN.find(([re]) => re.test(m[2]));
    if (!dv) return NaN;
    let so = Number(m[1].replace(',', '.'));
    if (m[3]) so += Number('0.' + m[3]);   // 1tr2 = 1,2 triệu
    return Math.round(so * dv[1]);
  }

  function tien(gt, khiDoi, phu = {}) {
    const o = TI.el('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'o-so',
      value: coGT(gt) ? TI.soVN(gt, 0) : '', placeholder: 'Ví dụ 1.500.000 hoặc 1tr5', ...phu });
    const loi = TI.el('small', { class: 'loi-nhap', hidden: true }, 'Gõ số tiền, ví dụ 85k, 1tr2 hoặc 1.200.000');
    o.addEventListener('input', () => {
      if (/^[\d.\s]*$/.test(o.value)) {
        const so = o.value.replace(/\D/g, '');
        datLaiGiuConTro(o, so ? Number(so).toLocaleString('vi-VN') : '');
      }
      const n = docTien(o.value);
      const sai = Number.isNaN(n);
      o.classList.toggle('sai', sai); loi.hidden = !sai;
      if (!sai) khiDoi(n);
    });
    o.addEventListener('blur', () => { const n = docTien(o.value); if (n !== null && !Number.isNaN(n)) o.value = TI.soVN(n, 0); });
    return TI.el('div', { class: 'o-tien' }, hauTo(o, 'đ'), loi);
  }

  // ---------- Số điện thoại: hiện 0912 345 678, lưu 10 chữ số ----------
  function dinhDangDT(so) {
    const nhom = so.length > 10 ? [4, 3, 4] : [4, 3, 3];
    const kq = []; let i = 0;
    for (const n of nhom) { if (i >= so.length) break; kq.push(so.slice(i, i + n)); i += n; }
    return kq.join(' ');
  }

  function dienThoai(gt, khiDoi, phu = {}) {
    const so0 = coGT(gt) ? String(gt).replace(/\D/g, '') : '';
    const o = TI.el('input', { type: 'tel', inputmode: 'tel', autocomplete: 'tel', value: dinhDangDT(so0),
      placeholder: '0912 345 678', ...phu });
    const goiY = TI.el('small', { class: 'loi-nhap', hidden: true }, 'Số di động có 10 chữ số');
    const lienKet = TI.el('div', { class: 'lien-ket-dt' });
    const capNhatLienKet = (so) => {
      const du = so.length === 10;
      goiY.hidden = !so || du || so.length === 11;
      lienKet.replaceChildren(...(du ? [
        TI.el('a', { class: 'nut nho', href: `tel:${so}` }, ...Icon.chu('phone', 'Gọi')),
        TI.el('a', { class: 'nut nho', href: `https://zalo.me/${so}`, target: '_blank', rel: 'noopener' }, ...Icon.chu('message', 'Zalo')),
      ] : []));
    };
    o.addEventListener('input', () => {
      const so = o.value.replace(/\D/g, '').slice(0, 11);
      datLaiGiuConTro(o, dinhDangDT(so));
      capNhatLienKet(so);
      khiDoi(so);
    });
    capNhatLienKet(so0);
    return TI.el('div', { class: 'o-dien-thoai' }, TI.el('div', { class: 'hang-dt' }, o, lienKet), goiY);
  }

  // ---------- Địa chỉ 2 cấp: Tỉnh/Thành phố → Phường/Xã + số nhà, đường, thôn/xóm ----------
  // Lưu chi tiết ở khach.diaChiCT, đồng thời ghép thành khach.diaChi (dùng cho danh sách, báo giá).
  function diaChi(khach, khiDoi, goiYPhuongXa = []) {
    if (!khach.diaChiCT) khach.diaChiCT = { tinh: '', phuongXa: '', chiTiet: coGT(khach.diaChi) ? khach.diaChi : '' };
    const ct = khach.diaChiCT;
    const xem = TI.el('div', { class: 'xem-dia-chi' });
    const doi = () => {
      khach.diaChi = [ct.chiTiet, ct.phuongXa, ct.tinh].map(s => String(s || '').trim()).filter(Boolean).join(', ');
      xem.textContent = khach.diaChi ? 'Địa chỉ đầy đủ: ' + khach.diaChi : '';
      khiDoi();
    };
    const idDs = 'goi-y-phuong-xa';
    const chonTinh = TI.el('select', { 'aria-label': 'Tỉnh / Thành phố', onchange: (e) => { ct.tinh = e.target.value; doi(); } },
      TI.el('option', { value: '' }, 'Chọn tỉnh / thành phố'),
      ...TINH.map(t => TI.el('option', { value: t, selected: t === ct.tinh }, t)));
    const oPX = TI.el('input', { type: 'text', list: idDs, value: ct.phuongXa || '', autocomplete: 'off',
      placeholder: 'Ví dụ: Phường Hạc Thành', oninput: (e) => { ct.phuongXa = e.target.value; doi(); } });
    const oCT = TI.el('input', { type: 'text', value: ct.chiTiet || '', autocomplete: 'street-address',
      placeholder: 'Số nhà, đường, thôn/xóm', oninput: (e) => { ct.chiTiet = e.target.value; doi(); } });
    xem.textContent = coGT(khach.diaChi) ? 'Địa chỉ đầy đủ: ' + khach.diaChi : '';
    return TI.el('div', { class: 'dia-chi-2-cap' },
      TI.el('div', { class: 'luoi-2' },
        TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Tỉnh / Thành phố'), chonTinh),
        TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Phường / Xã'), oPX)),
      TI.el('datalist', { id: idDs }, ...[...new Set(goiYPhuongXa)].map(t => TI.el('option', { value: t }))),
      TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Số nhà, đường, thôn/xóm'), oCT),
      xem);
  }

  // ---------- Khung trường: nhãn + ô + ghi chú, có đánh dấu "chưa có số liệu" ----------
  // Trả về { el, datThieu(bool) }. Ô nhập bên trong được tô viền nét đứt màu nắng khi thiếu.
  function truong({ nhan, id, ghiChu, khongBatBuoc, chuThieu = 'Chưa có', toO = true }, oNhap, thieuBanDau = false) {
    const chip = TI.el('em', { class: 'chip-thieu' }, chuThieu);
    const el = TI.el(oNhap.matches && oNhap.matches('input, select, textarea') ? 'label' : 'div', { class: 'truong', id },
      TI.el('span', { class: 'nhan-truong' }, TI.el('span', {}, nhan),
        khongBatBuoc ? TI.el('span', { class: 'khong-bat-buoc' }, 'Không bắt buộc') : null, chip),
      oNhap,
      ghiChu ? TI.el('small', { class: 'ghi-chu' }, ghiChu) : null);
    const datThieu = (thieu) => {
      el.classList.toggle('dang-thieu', !!thieu);
      if (toO) el.querySelectorAll('input:not([type=file]), select, textarea').forEach(c => c.classList.toggle('can-dien', !!thieu));
    };
    datThieu(thieuBanDau);
    return { el, datThieu };
  }

  // ---------- Danh sách "Còn thiếu N mục": bấm để nhảy tới ô ----------
  function nhayToi(id) {
    const o = document.getElementById(id);
    if (!o) return;
    const d = o.closest('details'); if (d) d.open = true;
    o.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const c = o.querySelector('input:not([type=hidden]), select, textarea, a, button');
    if (c) setTimeout(() => c.focus({ preventScroll: true }), 350);
  }

  // Danh sách dài thì chỉ hiện 4 mục đầu, bấm "Xem thêm" để mở hết (đỡ chiếm cả màn hình điện thoại).
  let moHetThieu = false;
  function dsThieu(muc, tieuDe = 'Còn thiếu') {
    if (!muc.length) return TI.el('div', { class: 'the dat nho co-icon' }, Icon('circle-check'), 'Đã đủ các mục bắt buộc.');
    const GIOI_HAN = 4;
    const gon = muc.length > GIOI_HAN + 1 && !moHetThieu;
    const khung = TI.el('div', { class: 'the canh-bao ds-thieu-nhay' });
    const ve = () => khung.replaceChildren(
      TI.el('div', { class: 'co-icon' }, Icon('alert-triangle'), TI.el('b', {}, `${tieuDe} ${muc.length} mục`)),
      TI.el('div', { class: 'ds-nut-thieu' },
        ...(gon && !moHetThieu ? muc.slice(0, GIOI_HAN) : muc).map(m => TI.el('button', { type: 'button', class: 'nut-thieu', onclick: () => nhayToi(m.id) },
          m.nhan, Icon('chevron-right', { co: 16 }))),
        gon && !moHetThieu ? TI.el('button', { type: 'button', class: 'nut-chu', onclick: () => { moHetThieu = true; ve(); } },
          `Xem thêm ${muc.length - GIOI_HAN} mục`, Icon('chevron-down', { co: 16 })) : null));
    ve();
    return khung;
  }

  return { TINH, hauTo, thang, tien, docTien, dienThoai, diaChi, truong, dsThieu, nhayToi };
})();
