// Giai đoạn 2: vẽ mái trên ảnh drone.
// Mọi điểm lưu theo toạ độ điểm ảnh (pixel) của ảnh nền; đổi ra mét bằng 1 trong 2 cách:
//  - "thang": ảnh chụp thẳng xuống → kẻ 1 cạnh đã đo, tỉ lệ đều khắp ảnh.
//  - "nan":   ảnh chụp chéo → chấm 4 góc 1 hình chữ nhật đã đo, app "nắn" ảnh về nhìn thẳng.
const ManVeMai = (() => {
  const LOAI_MAI = [['be-tong', 'Mái bê tông'], ['ton', 'Mái tôn']];
  const LOAI_VAT_CAN = [['bon-nuoc', 'Bồn nước'], ['gieng-troi', 'Giếng trời'], ['tum', 'Tum / hộp kỹ thuật'],
    ['anten', 'Cột anten'], ['cay', 'Cây'], ['khac', 'Khác']];
  const MAU = { 'be-tong': '#1f6fbf', ton: '#8e44ad', vatCan: '#e53935', tiLe: '#2e9e4a', kiemTra: '#f08c00' };
  const TOI_DA = { tiLe: 2, nan: 4, kiemTra: 2, mangMai: Infinity, vatCan: Infinity };
  const CONG_CU = [['ti-le', 'Tỉ lệ'], ['mai', 'Mảng mái'], ['vat-can', 'Vật cản'], ['kiem-tra', 'Đo kiểm tra']];

  let hs, luuSau, nguongLech;
  let anh = null, cv, ctx, khungCv, vungBang, vungTongHop, oGoiY, nutXongNoi, nutLuiNoi;
  let view = { s: 1, ox: 0, oy: 0 }, kt = { w: 0, h: 0 };
  let congCu = 'ti-le';
  let chon = null;        // hình đang chọn: { nhom, id }
  let dangThem = false;   // chạm vào ảnh = thêm điểm cho hình đang chọn
  let keo = null;         // điểm đang bị kéo
  let quanSat = null, henVe = null, idHoSoTruoc = null;

  const tenLoai = (ds, ma) => (ds.find(x => x[0] === ma) || [, ''])[1];
  const m = () => hs.mai;

  function maiMoi() {
    return {
      anhNen: null, cheDo: 'thang',
      tiLe: { diem: [], chieuDaiM: null },
      nan: { diem: [], canhA: null, canhB: null },
      mangMai: [], vatCan: [], kiemTra: [],
    };
  }

  // ---------- Đổi điểm ảnh → mét ----------
  function boDoi() {
    const M = m();
    if (M.cheDo === 'thang') {
      const [a, b] = M.tiLe.diem, L = M.tiLe.chieuDaiM;
      if (!b || !(L > 0) || HH.kc(a, b) < 1) return null;
      const k = L / HH.kc(a, b);
      return p => [p[0] * k, p[1] * k];
    }
    const d = M.nan.diem, A = M.nan.canhA, B = M.nan.canhB;
    if (d.length < 4 || !(A > 0) || !(B > 0)) return null;
    // Giữ đúng chiều (không bị lật gương) theo thứ tự chấm 4 góc.
    const dich = HH.dienTichCoDau(d) >= 0 ? [[0, 0], [A, 0], [A, B], [0, B]] : [[A, 0], [0, 0], [0, B], [A, B]];
    const H = HH.timMaTranNan(d, dich);
    return H ? p => HH.apMaTran(H, p) : null;
  }
  const doDai = (f, a, b) => HH.kc(f(a), f(b));
  const dienTichM2 = (f, ds) => HH.dienTich(ds.map(f));

  // ---------- Khởi tạo màn hình ----------
  async function ve(v, hoSo, hamLuu) {
    hs = hoSo; luuSau = hamLuu;
    if (!hs.mai) { hs.mai = maiMoi(); }
    nguongLech = await DuLieu.giaTri('cau-hinh', 'nguongLechDoPhanTram');
    if (typeof nguongLech !== 'number') nguongLech = null;
    chon = null; dangThem = false; keo = null; anh = null;
    if (quanSat) quanSat.disconnect();
    // Mở hồ sơ khác: chưa có tỉ lệ thì vào thẻ "Tỉ lệ", có rồi thì vào "Mảng mái".
    if (hs.id !== idHoSoTruoc) { congCu = boDoi() ? 'mai' : 'ti-le'; idHoSoTruoc = hs.id; }

    // Tự chọn ảnh nền nếu chưa có: ưu tiên ảnh drone chụp thẳng.
    const dsAnh = hs.hienTrang.anh;
    if (!m().anhNen && dsAnh.length) {
      const uuTien = dsAnh.find(a => a.loai === 'drone-thang') || dsAnh.find(a => a.loai === 'drone-cheo') || dsAnh[0];
      m().anhNen = uuTien.id;
      if (uuTien.loai === 'drone-cheo') m().cheDo = 'nan';
      luuSau();
    }

    cv = TI.el('canvas', { 'aria-label': 'Ảnh mái để chấm điểm' });
    ctx = cv.getContext('2d');
    oGoiY = TI.el('div', { class: 'goi-y-ve' });
    khungCv = TI.el('div', { class: 'khung-ve' }, cv, oGoiY,
      TI.el('div', { class: 'nut-noi' },
        TI.el('button', { type: 'button', 'aria-label': 'Phóng to', onclick: () => phong(1.4) }, '+'),
        TI.el('button', { type: 'button', 'aria-label': 'Thu nhỏ', onclick: () => phong(1 / 1.4) }, '−'),
        TI.el('button', { type: 'button', 'aria-label': 'Vừa khung', onclick: () => { vuaKhung(); veLai(); } }, '⤢')));
    nutXongNoi = TI.el('button', { type: 'button', class: 'chinh', hidden: true, onclick: () => { dangThem = false; veBang(); veLai(); } }, '✓ Xong');
    nutLuiNoi = TI.el('button', { type: 'button', hidden: true, onclick: () => {
      const h = layHinh(chon); if (!h) return;
      h.diem.pop(); luuSau(); veBang(); veLai();
    } }, '↶ Lùi');
    khungCv.append(TI.el('div', { class: 'nut-noi-trai' }, nutXongNoi, nutLuiNoi));
    vungBang = TI.el('div', { class: 'bang-ve' });

    v.replaceChildren(veChonAnh(), khungCv, vungBang);
    ganSuKien();
    quanSat = new ResizeObserver(() => doiCo());
    quanSat.observe(khungCv);
    await napAnh();
    chonCongCu(congCu);
  }

  function veChonAnh() {
    const dsAnh = hs.hienTrang.anh;
    const oFile = TI.el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f || !xacNhanDoiAnh()) return;
      const a = await HoSo.themAnh(hs.id, f);
      hs.hienTrang.anh.push({ id: a.id, loai: 'drone-thang', ghiChu: 'Ảnh vẽ mái' });
      datAnhNen(a.id);
    } });
    const chonAnh = TI.el('select', { onchange: (e) => {
      if (!xacNhanDoiAnh()) { e.target.value = m().anhNen || ''; return; }
      datAnhNen(e.target.value);
    } },
      TI.el('option', { value: '' }, dsAnh.length ? '— chọn ảnh nền —' : '(hồ sơ chưa có ảnh)'),
      ...dsAnh.map((a, i) => TI.el('option', { value: a.id, selected: a.id === m().anhNen },
        `Ảnh ${i + 1}: ${tenLoai(ManHoSo.LOAI_ANH, a.loai)}${a.ghiChu ? ' – ' + a.ghiChu : ''}`)));
    return TI.el('div', { class: 'hang-anh-nen' }, chonAnh,
      TI.el('button', { type: 'button', class: 'nut nho', onclick: () => oFile.click() }, 'Tải ảnh'), oFile);
  }

  function coDuLieuVe() {
    const M = m();
    return M.tiLe.diem.length || M.nan.diem.length || M.mangMai.length || M.vatCan.length || M.kiemTra.length;
  }
  function xacNhanDoiAnh() {
    return !coDuLieuVe() || confirm('Đổi ảnh nền sẽ XÓA toàn bộ điểm đã chấm (tỉ lệ, mảng mái, vật cản, đo kiểm tra). Tiếp tục?');
  }
  async function datAnhNen(id) {
    const M = m();
    M.anhNen = id || null;
    M.tiLe.diem = []; M.nan.diem = []; M.mangMai = []; M.vatCan = []; M.kiemTra = [];
    const meta = hs.hienTrang.anh.find(a => a.id === id);
    if (meta) M.cheDo = meta.loai === 'drone-cheo' ? 'nan' : 'thang';
    chon = null; dangThem = false;
    luuSau();
    App.dieuHuong();
  }

  async function napAnh() {
    const id = m().anhNen;
    if (!id) { veLai(); return; }
    const ban = await LuuTru.lay('anh', id);
    if (!ban) { veLai(); return; }
    anh = await new Promise((ok, loi) => { const i = new Image(); i.onload = () => ok(i); i.onerror = loi; i.src = ban.dataURL; });
    vuaKhung();
    veLai();
  }

  function doiCo() {
    const r = khungCv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const dauTien = !kt.w;
    kt = { w: r.width, h: r.height };
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    if (dauTien && anh) vuaKhung();
    veNgay();
  }

  function vuaKhung() {
    if (!anh || !kt.w) return;
    const s = Math.min(kt.w / anh.naturalWidth, kt.h / anh.naturalHeight);
    view = { s, ox: (kt.w - anh.naturalWidth * s) / 2, oy: (kt.h - anh.naturalHeight * s) / 2 };
  }
  function gioiHanS(s) {
    if (!anh) return s;
    const nho = Math.min(kt.w / anh.naturalWidth, kt.h / anh.naturalHeight) * 0.5;
    return Math.max(nho, Math.min(s, 12));
  }
  function phong(heSo, tam = [kt.w / 2, kt.h / 2]) {
    const s = gioiHanS(view.s * heSo);
    const ix = (tam[0] - view.ox) / view.s, iy = (tam[1] - view.oy) / view.s;
    view = { s, ox: tam[0] - ix * s, oy: tam[1] - iy * s };
    veLai();
  }

  // ---------- Chọn hình ----------
  function nhomCuaCongCu() {
    if (congCu === 'ti-le') return [m().cheDo === 'thang' ? 'tiLe' : 'nan'];
    return [{ mai: 'mangMai', 'vat-can': 'vatCan', 'kiem-tra': 'kiemTra' }[congCu]];
  }
  function layHinh(c) {
    if (!c) return null;
    if (c.nhom === 'tiLe') return m().tiLe;
    if (c.nhom === 'nan') return m().nan;
    return (m()[c.nhom] || []).find(x => x.id === c.id) || null;
  }
  const laChon = (nhom, id) => chon && chon.nhom === nhom && (id === undefined || chon.id === id);

  function chonCongCu(ma) {
    congCu = ma; keo = null;
    if (ma === 'ti-le') {
      const nhom = m().cheDo === 'thang' ? 'tiLe' : 'nan';
      chon = { nhom };
      dangThem = layHinh(chon).diem.length < TOI_DA[nhom];
    } else { chon = null; dangThem = false; }
    veBang(); veLai();
  }

  // ---------- Vẽ lên khung ----------
  function veLai() { if (!henVe) henVe = requestAnimationFrame(() => { henVe = null; veNgay(); }); }
  const S = p => [p[0] * view.s + view.ox, p[1] * view.s + view.oy];

  function veNgay() {
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1b1f24'; ctx.fillRect(0, 0, kt.w, kt.h);
    capNhatGoiY();
    if (!anh) return;
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    ctx.drawImage(anh, 0, 0); ctx.restore();

    const M = m(), f = boDoi();
    for (const x of M.mangMai) veDaGiac(x.diem, MAU[x.loai] || MAU['be-tong'], laChon('mangMai', x.id), f, x.ten || 'Mảng mái');
    for (const x of M.vatCan) veDaGiac(x.diem, MAU.vatCan, laChon('vatCan', x.id), f, tenVatCan(x), { nhanNho: true });
    if (M.cheDo === 'thang') {
      veDoan(M.tiLe.diem, MAU.tiLe, laChon('tiLe'), M.tiLe.chieuDaiM > 0 ? `${TI.soVN(M.tiLe.chieuDaiM)} m (chuẩn)` : 'cạnh chuẩn');
    } else {
      veDaGiac(M.nan.diem, MAU.tiLe, laChon('nan'), null, null, { netDut: true, danhSo: true, khongTo: true });
      if (M.nan.diem.length >= 2) {
        const d = M.nan.diem;
        veChu('A', ...trungDiem(S(d[0]), S(d[1])), MAU.tiLe);
        if (d.length >= 3) veChu('B', ...trungDiem(S(d[1]), S(d[2])), MAU.tiLe);
      }
    }
    for (const [i, k] of M.kiemTra.entries()) {
      let nhan = `KT${i + 1}`;
      if (f && k.diem.length === 2) nhan += `: ${TI.soVN(doDai(f, ...k.diem), 2)} m`;
      veDoan(k.diem, MAU.kiemTra, laChon('kiemTra', k.id), nhan);
    }
    if (keo) veKinhLup();
  }

  const trungDiem = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function tenVatCan(x) { return x.ten || tenLoai(LOAI_VAT_CAN, x.loai) || 'Vật cản'; }

  function veDinh(p, mau, to) {
    ctx.beginPath(); ctx.arc(p[0], p[1], to ? 7 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = to ? '#fff' : mau; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = mau; ctx.stroke();
  }

  function veChu(chu, x, y, mau = '#111', co = 12) {
    ctx.font = `600 ${co}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const dong = String(chu).split('\n');
    dong.forEach((d, i) => {
      const yy = y + (i - (dong.length - 1) / 2) * (co + 3);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(d, x, yy);
      ctx.fillStyle = mau; ctx.fillText(d, x, yy);
    });
  }

  function veDaGiac(diem, mau, dangChon, f, ten, tuy = {}) {
    if (!diem.length) return;
    const P = diem.map(S);
    ctx.setLineDash(tuy.netDut ? [7, 5] : []);
    ctx.lineWidth = dangChon ? 2.5 : 1.6; ctx.strokeStyle = mau;
    ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    if (P.length >= 3) {
      ctx.closePath();
      if (!tuy.khongTo) { ctx.fillStyle = mau + (dangChon ? '40' : '26'); ctx.fill(); }
    }
    ctx.stroke(); ctx.setLineDash([]);
    P.forEach((p, i) => {
      veDinh(p, mau, dangChon);
      if (tuy.danhSo) veChu(String(i + 1), p[0] + 12, p[1] - 12, mau, 13);
    });
    if (f && dangChon && diem.length >= 2) {
      const n = diem.length >= 3 ? diem.length : 1;
      for (let i = 0; i < n; i++) {
        const a = diem[i], b = diem[(i + 1) % diem.length];
        veChu(`${TI.soVN(doDai(f, a, b), 2)} m`, ...trungDiem(S(a), S(b)), mau, 11);
      }
    }
    if (f && ten !== null && diem.length >= 3) {
      const [x, y] = HH.trongTam(P);
      veChu(`${ten}\n${TI.soVN(dienTichM2(f, diem), 1)} m²`, x, y, mau, tuy.nhanNho ? 10 : 12);
    }
  }

  function veDoan(diem, mau, dangChon, nhan) {
    if (!diem.length) return;
    const P = diem.map(S);
    if (P.length === 2) {
      ctx.lineWidth = dangChon ? 3 : 2; ctx.strokeStyle = mau;
      ctx.beginPath(); ctx.moveTo(...P[0]); ctx.lineTo(...P[1]); ctx.stroke();
      veChu(nhan, ...trungDiem(P[0], P[1]), mau, 11);
    }
    P.forEach(p => veDinh(p, mau, dangChon || P.length < 2));
  }

  // Kính lúp: khi kéo 1 điểm, ngón tay che mất chỗ đang chấm → hiện phóng to ở góc trên.
  function veKinhLup() {
    const p = keo.diem, sp = S(p), r = 58;
    const cx = sp[0] < kt.w / 2 ? kt.w - r - 10 : r + 10, cy = r + 10;
    const z = Math.max(view.s * 3, 1.5);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.translate(cx - p[0] * z, cy - p[1] * z); ctx.scale(z, z); ctx.drawImage(anh, 0, 0);
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 14, cy); ctx.lineTo(cx + 14, cy); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy + 14); ctx.stroke();
  }

  function capNhatGoiY() {
    if (!oGoiY) return;
    oGoiY.style.visibility = keo ? 'hidden' : '';   // đang kéo điểm thì nhường chỗ cho kính lúp
    let chu;
    if (!anh) chu = 'Chọn hoặc tải ảnh mái ở ô phía trên.';
    else if (dangThem && chon) {
      const n = (layHinh(chon) || { diem: [] }).diem.length;
      chu = {
        tiLe: `Chạm để chấm đầu ${n + 1}/2 của cạnh đã đo bằng thước`,
        nan: `Chạm góc ${n + 1}/4 của hình chữ nhật đã đo (đi vòng 1 chiều)`,
        kiemTra: `Chạm đầu ${n + 1}/2 của cạnh kiểm tra`,
        mangMai: n >= 3 ? `Chạm để thêm góc (đã có ${n}). Đủ góc thì bấm "✓ Xong"` : `Chạm để chấm góc ${n + 1} của mảng mái`,
        vatCan: n >= 3 ? `Chạm để thêm góc (đã có ${n}). Đủ góc thì bấm "✓ Xong"` : `Chạm để chấm góc ${n + 1} của vật cản`,
      }[chon.nhom];
    } else chu = 'Kéo để dời ảnh · 2 ngón để phóng to · kéo chấm tròn để chỉnh';
    oGoiY.textContent = chu;
    // Nút nổi trên ảnh khi đang chấm mảng mái / vật cản / cạnh kiểm tra.
    const h = dangThem && chon ? layHinh(chon) : null;
    const laDaGiac = h && (chon.nhom === 'mangMai' || chon.nhom === 'vatCan');
    nutXongNoi.hidden = !(laDaGiac && h.diem.length >= 3);
    nutLuiNoi.hidden = !(h && h.diem.length > 0);
  }

  // ---------- Chạm, kéo, phóng to ----------
  const conTro = new Map();
  let cu = null;
  function toaDo(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  const sangAnh = ([x, y]) => [(x - view.ox) / view.s, (y - view.oy) / view.s];
  const kep = (v, a, b) => Math.max(a, Math.min(b, v));

  // Tìm điểm gần chỗ chạm (chỉ trong các hình thuộc công cụ đang dùng).
  function timDiem(p, banKinh) {
    let tot = null;
    for (const nhom of nhomCuaCongCu()) {
      const ds = nhom === 'tiLe' ? [m().tiLe] : nhom === 'nan' ? [m().nan] : m()[nhom];
      for (const h of ds) {
        h.diem.forEach((d, i) => {
          const kc = HH.kc(S(d), p) - (laChon(nhom, h.id) ? 4 : 0);
          if (kc < banKinh && (!tot || kc < tot.kc)) tot = { kc, nhom, id: h.id, diem: d, chiSo: i };
        });
      }
    }
    return tot;
  }
  function timHinh(p) {
    for (const nhom of nhomCuaCongCu()) {
      if (nhom === 'tiLe' || nhom === 'nan') return { nhom };
      const ds = m()[nhom];
      for (let i = ds.length - 1; i >= 0; i--) {
        const P = ds[i].diem.map(S);
        if ((P.length >= 3 && HH.namTrong(p, P)) || (P.length === 2 && HH.kcDenDoan(p, P[0], P[1]) < 14)) return { nhom, id: ds[i].id };
      }
    }
    return null;
  }

  function ganSuKien() {
    conTro.clear(); cu = null;
    cv.addEventListener('pointerdown', (e) => {
      if (!anh) return;
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* bỏ qua */ }
      const p = toaDo(e);
      conTro.set(e.pointerId, p);
      if (conTro.size === 1) {
        const trung = timDiem(p, e.pointerType === 'touch' ? 24 : 11);
        cu = { loai: 'mot', bd: p, ox: view.ox, oy: view.oy, daDi: false, trung };
        if (trung) { const q = sangAnh(p); keo = { diem: trung.diem, lech: [trung.diem[0] - q[0], trung.diem[1] - q[1]] }; }
      } else if (conTro.size === 2) {
        keo = null;
        const [a, b] = [...conTro.values()];
        cu = { loai: 'hai', d0: HH.kc(a, b), g0: trungDiem(a, b), s0: view.s, ox: view.ox, oy: view.oy };
      }
      veLai();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!conTro.has(e.pointerId)) return;
      const p = toaDo(e);
      conTro.set(e.pointerId, p);
      if (cu && cu.loai === 'hai' && conTro.size === 2) {
        const [a, b] = [...conTro.values()];
        const s = gioiHanS(cu.s0 * HH.kc(a, b) / cu.d0), g = trungDiem(a, b);
        const ix = (cu.g0[0] - cu.ox) / cu.s0, iy = (cu.g0[1] - cu.oy) / cu.s0;
        view = { s, ox: g[0] - ix * s, oy: g[1] - iy * s };
        veLai();
      } else if (cu && cu.loai === 'mot') {
        const dx = p[0] - cu.bd[0], dy = p[1] - cu.bd[1];
        if (Math.hypot(dx, dy) > 5) cu.daDi = true;
        if (!cu.daDi) return;
        if (keo) {
          const q = sangAnh(p);
          keo.diem[0] = kep(q[0] + keo.lech[0], 0, anh.naturalWidth);
          keo.diem[1] = kep(q[1] + keo.lech[1], 0, anh.naturalHeight);
        } else { view.ox = cu.ox + dx; view.oy = cu.oy + dy; }
        veLai();
      }
    });
    const ketThuc = (e, huy) => {
      if (!conTro.has(e.pointerId)) return;
      conTro.delete(e.pointerId);
      if (cu && cu.loai === 'mot' && !huy) {
        if (keo && cu.daDi) { luuSau(); capNhatTongHop(); veBangNeuCanh(); }
        else if (!cu.daDi) cham(cu.bd, cu.trung);
      }
      keo = null;
      if (conTro.size === 0 || (cu && cu.loai === 'hai')) cu = null;
      veLai();
    };
    cv.addEventListener('pointerup', (e) => ketThuc(e, false));
    cv.addEventListener('pointercancel', (e) => ketThuc(e, true));
    cv.addEventListener('wheel', (e) => {
      if (!anh) return;
      e.preventDefault();
      phong(Math.pow(1.0015, -e.deltaY), toaDo(e));
    }, { passive: false });
  }

  function cham(p, trung) {
    if (dangThem && chon) {
      // Đang chấm: mọi lần chạm (không kéo) đều là thêm góc mới, kể cả khi gần góc cũ.
      const h = layHinh(chon);
      if (h && h.diem.length < TOI_DA[chon.nhom]) {
        const q = sangAnh(p);
        h.diem.push([kep(q[0], 0, anh.naturalWidth), kep(q[1], 0, anh.naturalHeight)]);
        if (h.diem.length >= TOI_DA[chon.nhom]) dangThem = false;
        luuSau(); veBang(); veLai();
        return;
      }
    }
    // Không thêm điểm → chọn hình tại chỗ chạm.
    const moi = trung ? { nhom: trung.nhom, id: trung.id } : timHinh(p);
    if (congCu === 'ti-le') return;
    chon = moi; dangThem = false;
    veBang(); veLai();
  }

  // Sau khi kéo điểm: chỉ cập nhật bảng (danh sách cạnh) nếu đang hiện
  function veBangNeuCanh() { if (congCu !== 'ti-le') veBang(); else capNhatTiLe(); }

  // ---------- Bảng điều khiển dưới ảnh ----------
  let oKetQuaTiLe = null;
  function veBang() {
    const thanh = TI.el('div', { class: 'phan-doan' }, ...CONG_CU.map(([ma, ten]) =>
      TI.el('button', { type: 'button', class: ma === congCu ? 'dang-chon' : '', onclick: () => chonCongCu(ma) }, ten)));
    let nd;
    if (congCu === 'ti-le') nd = bangTiLe();
    else if (congCu === 'kiem-tra') nd = bangKiemTra();
    else nd = bangHinh(congCu === 'mai' ? 'mangMai' : 'vatCan');
    vungTongHop = TI.el('div', { class: 'tong-hop' });
    vungBang.replaceChildren(thanh, nd, vungTongHop);
    capNhatTongHop();
    capNhatGoiY();
  }

  function bangTiLe() {
    const M = m();
    const radio = (gt, chu) => TI.el('label', { class: 'lua-chon' },
      TI.el('input', { type: 'radio', name: 'che-do', value: gt, checked: M.cheDo === gt,
        onchange: () => { M.cheDo = gt; luuSau(); chonCongCu('ti-le'); } }), chu);
    const nd = [
      radio('thang', 'Ảnh chụp thẳng xuống: kẻ 1 cạnh đã đo'),
      radio('nan', 'Ảnh chụp chéo: chấm 4 góc 1 hình chữ nhật đã đo'),
    ];
    oKetQuaTiLe = TI.el('div', { class: 'ket-qua' });
    if (M.cheDo === 'thang') {
      nd.push(
        TI.el('p', { class: 'mo nho' }, 'Kẻ một đường trùng với 1 cạnh mái đã đo bằng thước (chọn cạnh dài nhất), rồi nhập chiều dài thật. Nên đo thêm 1 cạnh khác ở mục "Đo kiểm tra".'),
        TI.el('div', { class: 'mo nho' }, `Đã chấm ${M.tiLe.diem.length}/2 điểm`),
        TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Chiều dài thật của cạnh đã kẻ'),
          TI.el('div', { class: 'co-don-vi' }, TI.oSo(M.tiLe.chieuDaiM, n => { M.tiLe.chieuDaiM = n; doiSo(); }), TI.el('i', {}, 'm'))));
    } else {
      nd.push(
        TI.el('p', { class: 'mo nho' }, 'Chấm lần lượt 4 góc của một hình chữ nhật đã đo thật (ví dụ mái bê tông), đi vòng theo một chiều. Cạnh A = góc 1→2, cạnh B = góc 2→3.'),
        TI.el('p', { class: 'the canh-bao nho' }, 'Chỉ đo đúng cho phần nằm cùng độ cao với hình chữ nhật này. Phần cao hơn hoặc thấp hơn (mái tôn thấp hơn, đỉnh bồn nước…) sẽ bị lệch.'),
        TI.el('div', { class: 'mo nho' }, `Đã chấm ${M.nan.diem.length}/4 góc`),
        TI.el('div', { class: 'luoi-o' },
          TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Cạnh A (góc 1→2)'),
            TI.el('div', { class: 'co-don-vi' }, TI.oSo(M.nan.canhA, n => { M.nan.canhA = n; doiSo(); }), TI.el('i', {}, 'm'))),
          TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Cạnh B (góc 2→3)'),
            TI.el('div', { class: 'co-don-vi' }, TI.oSo(M.nan.canhB, n => { M.nan.canhB = n; doiSo(); }), TI.el('i', {}, 'm')))));
    }
    nd.push(oKetQuaTiLe, TI.el('div', { class: 'hang' },
      TI.el('button', { type: 'button', class: 'nut nho', onclick: () => {
        const h = layHinh(chon); h.diem = []; dangThem = true; luuSau(); veBang(); veLai();
      } }, M.cheDo === 'thang' ? 'Kẻ lại' : 'Chấm lại')));
    capNhatTiLe();
    return TI.el('div', {}, ...nd);
  }

  function capNhatTiLe() {
    if (!oKetQuaTiLe) return;
    const M = m(), f = boDoi();
    if (!f) { oKetQuaTiLe.textContent = 'Chưa đủ điểm hoặc chưa nhập chiều dài → chưa đổi ra mét được.'; return; }
    if (M.cheDo === 'thang') {
      const k = M.tiLe.chieuDaiM / HH.kc(...M.tiLe.diem);
      oKetQuaTiLe.textContent = `Tỉ lệ: 1 điểm ảnh = ${TI.soVN(k * 100, 2)} cm`;
    } else {
      const d = M.nan.diem;
      oKetQuaTiLe.textContent = `Đã nắn ảnh. Kiểm tra: cạnh 3→4 = ${TI.soVN(doDai(f, d[2], d[3]), 2)} m, cạnh 4→1 = ${TI.soVN(doDai(f, d[3], d[0]), 2)} m (phải bằng A và B).`;
    }
  }

  function doiSo() { luuSau(); capNhatTiLe(); capNhatTongHop(); veLai(); }

  function bangHinh(nhom) {
    const laMai = nhom === 'mangMai';
    const ds = m()[nhom], f = boDoi();
    const tenHinh = x => laMai ? (x.ten || 'Mảng mái') : tenVatCan(x);
    const mau = x => laMai ? (MAU[x.loai] || MAU['be-tong']) : MAU.vatCan;
    const nd = [];
    if (!f) nd.push(TI.el('p', { class: 'the canh-bao nho' }, 'Chưa đặt tỉ lệ ở thẻ "Tỉ lệ" nên chưa hiện được mét. Vẫn chấm được.'));
    nd.push(TI.el('div', { class: 'danh-sach-hinh' }, ...ds.map(x => TI.el('button', {
      type: 'button', class: 'muc-hinh' + (laChon(nhom, x.id) ? ' dang-chon' : ''),
      onclick: () => { chon = { nhom, id: x.id }; dangThem = false; veBang(); veLai(); },
    }, TI.el('i', { class: 'cham-mau', style: `background:${mau(x)}` }), tenHinh(x),
      TI.el('small', {}, f && x.diem.length >= 3 ? `${TI.soVN(dienTichM2(f, x.diem), 1)} m²` : `${x.diem.length} góc`)))));

    nd.push(TI.el('button', { type: 'button', class: 'nut', onclick: () => {
      const moi = laMai
        ? { id: TI.taoId('mai'), ten: `Mảng ${ds.length + 1}`, loai: 'be-tong', doDocDo: 0, diem: [] }
        : { id: TI.taoId('vc'), ten: '', loai: 'bon-nuoc', caoM: null, diem: [] };
      ds.push(moi); chon = { nhom, id: moi.id }; dangThem = true;
      luuSau(); veBang(); veLai();
    } }, laMai ? '+ Thêm mảng mái' : '+ Thêm vật cản'));

    const x = chon && chon.nhom === nhom ? layHinh(chon) : null;
    if (x) {
      const chiTiet = [
        TI.el('label', { class: 'truong' }, TI.el('span', {}, laMai ? 'Tên mảng mái' : 'Tên (không bắt buộc)'),
          TI.el('input', { type: 'text', value: x.ten || '', oninput: (e) => { x.ten = e.target.value; luuSau(); veLai(); } })),
        TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Loại'),
          TI.el('select', { onchange: (e) => { x.loai = e.target.value; luuSau(); veBang(); veLai(); } },
            ...(laMai ? LOAI_MAI : LOAI_VAT_CAN).map(([ma, ten]) => TI.el('option', { value: ma, selected: x.loai === ma }, ten)))),
        laMai
          ? TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Độ dốc mái (mái bằng nhập 0)'),
            TI.el('div', { class: 'co-don-vi' }, TI.oSo(x.doDocDo, n => { x.doDocDo = n; luuSau(); capNhatTongHop(); }), TI.el('i', {}, '°')))
          : TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Chiều cao so với mặt mái'),
            TI.el('div', { class: 'co-don-vi' }, TI.oSo(x.caoM, n => { x.caoM = n; luuSau(); capNhatTongHop(); }), TI.el('i', {}, 'm'))),
        TI.el('div', { class: 'hang' },
          TI.el('button', { type: 'button', class: 'nut nho' + (dangThem ? ' chinh' : ''), onclick: () => {
            if (dangThem && x.diem.length > 0 && x.diem.length < 3) { alert('Cần ít nhất 3 góc.'); return; }
            dangThem = !dangThem; veBang(); veLai();
          } }, dangThem ? 'Xong' : 'Chấm thêm góc'),
          TI.el('button', { type: 'button', class: 'nut nho', disabled: !x.diem.length, onclick: () => { x.diem.pop(); luuSau(); veBang(); veLai(); } }, 'Xóa góc cuối'),
          TI.el('button', { type: 'button', class: 'nut nho nguy-hiem', onclick: () => {
            if (!confirm(`Xóa "${tenHinh(x)}"?`)) return;
            ds.splice(ds.indexOf(x), 1); chon = null; dangThem = false; luuSau(); veBang(); veLai();
          } }, 'Xóa')),
      ];
      if (f && x.diem.length >= 2) {
        const n = x.diem.length >= 3 ? x.diem.length : 1;
        chiTiet.push(TI.el('div', { class: 'mo nho' }, 'Chiều dài các cạnh: ' + Array.from({ length: n }, (_, i) =>
          `${i + 1}→${(i + 1) % x.diem.length + 1}: ${TI.soVN(doDai(f, x.diem[i], x.diem[(i + 1) % x.diem.length]), 2)} m`).join(' · ')));
      }
      nd.push(TI.el('div', { class: 'the chi-tiet-hinh' }, ...chiTiet));
    }
    return TI.el('div', {}, ...nd);
  }

  function bangKiemTra() {
    const ds = m().kiemTra, f = boDoi();
    const nd = [TI.el('p', { class: 'mo nho' },
      `Kẻ thêm các cạnh đã đo thật bằng thước (khác cạnh dùng đặt tỉ lệ) để biết app đo đúng tới đâu. Lệch ${nguongLech === null ? CAN_DIEN : '≤ ' + TI.soVN(nguongLech) + '%'} là đạt.`)];
    for (const [i, k] of ds.entries()) {
      const dangChonK = laChon('kiemTra', k.id);
      const ket = danhGiaKiemTra(f, k);
      nd.push(TI.el('div', { class: 'the the-kiem-tra' + (dangChonK ? ' dang-chon' : ''), onclick: (e) => {
        if (e.target.closest('input,button')) return;
        chon = { nhom: 'kiemTra', id: k.id }; dangThem = k.diem.length < 2; veBang(); veLai();
      } },
        TI.el('div', { class: 'hang-giua' }, TI.el('b', {}, `Cạnh kiểm tra ${i + 1}`),
          ket ? TI.el('span', { class: 'nhan ' + (ket.dat ? 'nhan-du' : 'nhan-thieu') }, ket.dat ? 'Đạt' : 'Chưa đạt') : null),
        TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Chiều dài đo thật bằng thước'),
          TI.el('div', { class: 'co-don-vi' }, TI.oSo(k.chieuDaiThatM, n => { k.chieuDaiThatM = n; luuSau(); veLai(); }), TI.el('i', {}, 'm'))),
        TI.el('div', { class: 'mo nho' }, ket ? ket.chu : (k.diem.length < 2 ? `Chấm ${k.diem.length}/2 điểm trên ảnh` : 'Chưa đủ dữ liệu (tỉ lệ hoặc chiều dài thật)')),
        dangChonK ? TI.el('div', { class: 'hang' },
          TI.el('button', { type: 'button', class: 'nut nho', onclick: () => { k.diem = []; dangThem = true; luuSau(); veBang(); veLai(); } }, 'Kẻ lại'),
          TI.el('button', { type: 'button', class: 'nut nho nguy-hiem', onclick: () => {
            ds.splice(i, 1); chon = null; dangThem = false; luuSau(); veBang(); veLai();
          } }, 'Xóa')) : null));
    }
    nd.push(TI.el('button', { type: 'button', class: 'nut', onclick: () => {
      const k = { id: TI.taoId('kt'), diem: [], chieuDaiThatM: null };
      ds.push(k); chon = { nhom: 'kiemTra', id: k.id }; dangThem = true; luuSau(); veBang(); veLai();
    } }, '+ Thêm cạnh kiểm tra'));
    return TI.el('div', {}, ...nd);
  }

  function danhGiaKiemTra(f, k) {
    if (!f || k.diem.length < 2 || !(k.chieuDaiThatM > 0)) return null;
    const doDuoc = doDai(f, ...k.diem);
    const lech = (doDuoc - k.chieuDaiThatM) / k.chieuDaiThatM * 100;
    const dat = nguongLech !== null && Math.abs(lech) <= nguongLech;
    return { doDuoc, lech, dat, chu: `Đo trên ảnh ${TI.soVN(doDuoc, 2)} m, thật ${TI.soVN(k.chieuDaiThatM, 2)} m → lệch ${lech > 0 ? '+' : ''}${TI.soVN(lech, 1)}%` };
  }

  // Bảng tổng hợp diện tích (luôn hiện dưới cùng).
  function capNhatTongHop() {
    if (!vungTongHop) return;
    const M = m(), f = boDoi();
    if (!M.mangMai.length && !M.vatCan.length) { vungTongHop.replaceChildren(); return; }
    if (!f) { vungTongHop.replaceChildren(TI.el('h4', {}, 'Tổng hợp'), TI.el('p', { class: 'mo nho' }, 'Đặt tỉ lệ xong sẽ hiện diện tích.')); return; }
    const dong = [];
    let tongMB = 0, tongThat = 0;
    for (const x of M.mangMai.filter(x => x.diem.length >= 3)) {
      const P = x.diem.map(f), mb = HH.dienTich(P);
      const doc = typeof x.doDocDo === 'number' ? x.doDocDo : 0;
      const that = mb / Math.cos(doc * Math.PI / 180);
      const vc = M.vatCan.filter(v => v.diem.length >= 3 && HH.namTrong(HH.trongTam(v.diem.map(f)), P))
        .reduce((s, v) => s + dienTichM2(f, v.diem), 0);
      tongMB += mb; tongThat += that;
      dong.push(TI.el('tr', {}, TI.el('td', {}, x.ten || 'Mảng mái', TI.el('br'), TI.el('small', { class: 'mo' }, tenLoai(LOAI_MAI, x.loai) + (doc ? `, dốc ${TI.soVN(doc)}°` : ''))),
        TI.el('td', {}, TI.soVN(mb, 1)), TI.el('td', {}, TI.soVN(that, 1)), TI.el('td', {}, TI.soVN(mb - vc, 1))));
    }
    const bangVC = M.vatCan.filter(v => v.diem.length >= 3).map(v => {
      const P = v.diem.map(f);
      return TI.el('li', {}, `${tenVatCan(v)}: ${TI.soVN(HH.dienTich(P), 2)} m²`,
        v.caoM > 0 ? `, cao ${TI.soVN(v.caoM, 2)} m` : TI.el('span', { class: 'can-dien' }, ', chưa nhập chiều cao'));
    });
    vungTongHop.replaceChildren(
      TI.el('h4', {}, 'Tổng hợp diện tích (m²)'),
      TI.el('table', { class: 'bang-so' },
        TI.el('thead', {}, TI.el('tr', {}, TI.el('th', {}, 'Mảng'), TI.el('th', {}, 'Mặt bằng'), TI.el('th', {}, 'Thật (theo dốc)'), TI.el('th', {}, 'Trừ vật cản'))),
        TI.el('tbody', {}, ...dong),
        TI.el('tfoot', {}, TI.el('tr', {}, TI.el('td', {}, 'Tổng'), TI.el('td', {}, TI.soVN(tongMB, 1)), TI.el('td', {}, TI.soVN(tongThat, 1)), TI.el('td', {})))),
      TI.el('p', { class: 'mo nho' }, '"Mặt bằng" là diện tích nhìn từ trên xuống. "Trừ vật cản" là ước tính: trừ trọn diện tích các vật cản nằm trong mảng.'),
      bangVC.length ? TI.el('div', {}, TI.el('b', { class: 'nho' }, 'Vật cản'), TI.el('ul', { class: 'nho ds-vat-can' }, ...bangVC)) : null);
  }

  // Dùng cho kiểm thử: xem trạng thái khung vẽ.
  function _trangThai() { return { view: { ...view }, kt: { ...kt }, congCu, chon, dangThem }; }

  return { ve, boDoiCuaHoSo: (h) => { const cu = hs; hs = h; const f = boDoi(); hs = cu; return f; }, _trangThai };
})();
