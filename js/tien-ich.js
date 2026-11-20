// Các hàm dùng chung cho toàn app.
const CAN_DIEN = '[CẦN ĐIỀN]';

const TI = {
  // Tạo phần tử HTML: TI.el('div', {class: 'a', onclick: fn}, 'chữ', conKhac)
  el(tag, thuocTinh = {}, ...con) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(thuocTinh || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'value') e.value = v;
      else if (k in e && typeof v !== 'string') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of con.flat()) {
      if (c === null || c === undefined || c === false) continue;
      e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return e;
  },

  laCanDien(v) {
    return v === CAN_DIEN || v === undefined || v === null || v === '';
  },

  // Hiển thị số kiểu Việt Nam: 1.234.567,5
  soVN(n, toiDaLe = 6) {
    if (TI.laCanDien(n) || isNaN(Number(n))) return '';
    return Number(n).toLocaleString('vi-VN', { maximumFractionDigits: toiDaLe });
  },

  // Đọc số người dùng gõ: "0,8" → 0.8; "1.234.000" → 1234000; "−0,25" → -0.25
  docSo(chuoi) {
    if (chuoi === null || chuoi === undefined) return null;
    let s = String(chuoi).trim().replace(/\s/g, '').replace(/[−–]/g, '-');
    if (s === '') return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return isNaN(n) ? NaN : n;
  },

  // Ô nhập số: gõ kiểu Việt Nam (dấu phẩy thập phân), sai định dạng thì viền đỏ và không lưu.
  oSo(gt, khiDoi, phu = {}) {
    const o = TI.el('input', { type: 'text', inputmode: 'decimal', value: TI.soVN(gt), ...phu });
    o.addEventListener('input', () => {
      const n = TI.docSo(o.value);
      o.classList.toggle('sai', Number.isNaN(n));
      if (!Number.isNaN(n)) khiDoi(n);
    });
    o.addEventListener('blur', () => { const n = TI.docSo(o.value); if (n !== null && !Number.isNaN(n)) o.value = TI.soVN(n); });
    return o;
  },

  homNay() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  ngayVN(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  },

  taoId(tienTo) {
    return `${tienTo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  },

  boDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D');
  },

  tenFile(s) {
    return TI.boDau(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ho-so';
  },

  // Lấy / đặt giá trị theo đường dẫn "khach.ten"
  layTheoDuong(obj, duong) {
    return duong.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  },
  datTheoDuong(obj, duong, giaTri) {
    const ks = duong.split('.');
    let o = obj;
    ks.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
    o[ks[ks.length - 1]] = giaTri;
  },

  thongBao(noiDung, loai = '') {
    const tb = document.getElementById('thong-bao');
    tb.textContent = noiDung;
    tb.className = 'thong-bao hien ' + loai;
    clearTimeout(TI._hen);
    TI._hen = setTimeout(() => { tb.className = 'thong-bao'; }, 2600);
  },

  // Lưu file về máy. Trên điện thoại ưu tiên mở bảng "Chia sẻ" (gửi Zalo, lưu vào Tệp…).
  async luuFile(tenFile, noiDung, kieu = 'application/json') {
    const blob = new Blob([noiDung], { type: kieu });
    const laDienThoai = window.matchMedia('(pointer: coarse)').matches;
    if (laDienThoai && navigator.canShare) {
      const file = new File([blob], tenFile, { type: kieu });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: tenFile }); return true; }
        catch (e) { if (e.name === 'AbortError') return false; }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = TI.el('a', { href: url, download: tenFile });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  },

  docFileChu(file) {
    return new Promise((ok, loi) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => loi(r.error);
      r.readAsText(file, 'utf-8');
    });
  },

  blobSangDataURL(blob) {
    return new Promise((ok, loi) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => loi(r.error);
      r.readAsDataURL(blob);
    });
  },

  // Thu nhỏ ảnh chụp (ảnh điện thoại 10–20 MB) cho nhẹ máy, giữ nguyên tỉ lệ khung.
  async nenAnh(file, canhDaiNhat = 2400, chatLuong = 0.88) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, loi) => {
        const i = new Image(); i.onload = () => ok(i); i.onerror = loi; i.src = url;
      });
      const tiLe = Math.min(1, canhDaiNhat / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * tiLe), h = Math.round(img.naturalHeight * tiLe);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return { dataURL: c.toDataURL('image/jpeg', chatLuong), rong: w, cao: h };
    } finally { URL.revokeObjectURL(url); }
  },
};
