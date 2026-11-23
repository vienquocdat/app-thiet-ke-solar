// Màn "Tính nhanh tiết kiệm": ước lượng nhanh khi đang nói chuyện với khách, chưa cần hồ sơ.
// Dùng lại đúng các hàm tính của báo giá (TaiChinh: bậc thang EVN, sản lượng tháng, điện tự dùng).
// Riêng phần gợi ý công suất là ước lượng nhanh, ghi rõ cách tính ngay trên màn:
//   kWp theo hóa đơn = kWh/tháng × tỉ lệ cần bù ÷ (30 × giờ nắng đỉnh TB năm × PR)
//     (tỉ lệ cần bù = % điện dùng ban ngày; nếu bán điện dư thì bù 100%)
//   kWp theo mái = diện tích mái ÷ diện tích mái cần cho 1 kWp (Cài đặt) → lấy số nhỏ hơn
const ManTinhNhanh = (() => {
  const SO = (x) => typeof x === 'number' && isFinite(x);
  const coGT = (x) => x !== null && x !== undefined && x !== '' && x !== CAN_DIEN;
  const NGAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Giữ lại số đã nhập khi quay lại màn này (không lưu vào máy).
  const st = { cheDo: 'tien', tien: null, kWh: null, thang: 0, dienTich: null, d: 50, banDu: false, model: null };

  let nc = null, vungKQ = null, oGhim = null;

  const tienGon = (x) => !SO(x) ? null : Math.abs(x) >= 1e9 ? `${TI.soVN(x / 1e9, 2)} tỷ đ`
    : Math.abs(x) >= 1e6 ? `${TI.soVN(x / 1e6, 2)} triệu đ` : `${TI.soVN(Math.round(x / 1000), 0)} nghìn đ`;

  async function napDuLieu() {
    const evn = await DuLieu.lay('gia-dien-evn'), nang = await DuLieu.lay('nang-khu-vuc'), tp = await DuLieu.lay('tam-pin');
    return {
      bt: TaiChinh.bangBacThang(evn),
      nang: nang.bang.dong.map(r => r.gioNangDinh),
      PR: await DuLieu.giaTri('cau-hinh', 'PR'),
      m2kWp: await DuLieu.giaTri('cau-hinh', 'dienTichMaiMoiKWp'),
      giaMua: await DuLieu.giaTri('cau-hinh', 'giaMuaDienDu'),
      dsTP: tp.bang.dong.filter(d => coGT(d.model)),
    };
  }

  // Đổi tiền điện → số kWh bằng cách dò ngược bảng bậc thang (tiền điện tăng dần theo kWh).
  function kWhTuTien(tien, bt) {
    if (!SO(tien) || tien <= 0) return 0;
    let lo = 0, hi = 100000;
    if (TaiChinh.tienDien(hi, bt) < tien) return hi;
    for (let i = 0; i < 50; i++) { const g = (lo + hi) / 2; if (TaiChinh.tienDien(g, bt) < tien) lo = g; else hi = g; }
    return (lo + hi) / 2;
  }

  // ---------- Tính ----------
  function tinh() {
    const thieu = [];
    if (nc.bt.thieu.length) thieu.push(`Giá điện EVN: ${nc.bt.thieu.join(', ')}`);
    if (nc.nang.some(h => !SO(h))) thieu.push('Giờ nắng đỉnh 12 tháng');
    if (!SO(nc.PR)) thieu.push('Hệ số PR');
    const tp = nc.dsTP.find(d => d.model === st.model) || nc.dsTP[0] || null;
    if (!tp) thieu.push('Danh mục tấm pin');
    else if (!SO(tp.congSuatW) || !SO(tp.daiMm) || !SO(tp.rongMm)) thieu.push(`Công suất / kích thước tấm ${tp.model}`);
    if (thieu.length) return { thieu };

    const C = st.cheDo === 'tien' ? kWhTuTien(st.tien, nc.bt) : (SO(st.kWh) ? st.kWh : 0);
    if (!(C > 0)) return { thieu: [], chuaNhap: true };
    const d = st.d / 100, W = tp.congSuatW;
    const pshTB = nc.nang.reduce((s, h, i) => s + h * NGAY[i], 0) / 365;
    const tiLeBu = st.banDu ? 1 : d;
    const kWpHD = C * tiLeBu / (30 * pshTB * nc.PR);
    const kWpMai = SO(st.dienTich) && st.dienTich > 0 && SO(nc.m2kWp) && nc.m2kWp > 0 ? st.dienTich / nc.m2kWp : null;
    let soTam = Math.max(1, Math.round(kWpHD * 1000 / W));
    if (kWpMai !== null) soTam = Math.min(soTam, Math.floor(kWpMai * 1000 / W));
    const kWp = soTam * W / 1000;
    const SL = TaiChinh.sanLuongThang(kWp, nc.nang, nc.PR);
    const truoc = TaiChinh.tienDien(C, nc.bt);
    const coGiaMua = SO(nc.giaMua);
    const thang = SL.map((sl, i) => {
      const td = TaiChinh.tuDung(sl, C, d, 0, 0, NGAY[i]);
      const giamHD = truoc - TaiChinh.tienDien(C - td, nc.bt);
      const du = sl - td, ban = st.banDu && coGiaMua ? du * nc.giaMua : 0;
      return { sl, td, du, giamHD, ban, giam: giamHD + ban };
    });
    const nam = thang.reduce((s, t) => s + t.giam, 0);
    const chon = st.thang ? thang[st.thang - 1] : null;
    const giam = chon ? chon.giam : nam / 12;
    return {
      thieu: [], C, d, tp, kWpHD, kWpMai, soTam, kWp, SL, thang, truoc, nam, giam,
      giamHD: chon ? chon.giamHD : thang.reduce((s, t) => s + t.giamHD, 0) / 12,
      dtTam: soTam * tp.daiMm * tp.rongMm / 1e6, SLnam: SL.reduce((s, x) => s + x, 0),
      duNam: thang.reduce((s, t) => s + t.du, 0), coGiaMua,
    };
  }

  // ---------- Màn hình ----------
  async function ve(v) {
    App.datTieuDe('Tính nhanh tiết kiệm');
    nc = await napDuLieu();
    if (!st.model && nc.dsTP.length) st.model = nc.dsTP[0].model;
    vungKQ = TI.el('section', { class: 'tn-kq', 'aria-live': 'polite', 'aria-label': 'Kết quả' });
    oGhim = TI.el('div', { class: 'tn-ghim' });
    v.replaceChildren(TI.el('div', { class: 'bo-cuc-tinh-nhanh' }, veNhap(), vungKQ), oGhim);
    capNhat();
  }

  function thanhKeo(min, max, buoc, gt, khiKeo, nhan) {
    return TI.el('input', { type: 'range', class: 'tn-keo', min, max, step: buoc, value: gt ?? min, 'aria-label': nhan,
      oninput: (e) => khiKeo(Number(e.target.value)) });
  }

  function veNhap() {
    // 1. Điện nhà dùng
    const oTienKhung = ONhap.tien(st.tien, (n) => { st.tien = n; keoTien.value = n ?? 0; capNhat(); }, { 'aria-label': 'Tiền điện mỗi tháng', placeholder: 'Ví dụ 1tr5' });
    const oTien = oTienKhung.querySelector('input');
    const keoTien = thanhKeo(0, 5000000, 50000, st.tien, (n) => { st.tien = n; oTien.value = TI.soVN(n, 0); capNhat(); }, 'Kéo chọn tiền điện');
    const oKWh = TI.oSo(st.kWh, (n) => { st.kWh = n; keoKWh.value = n ?? 0; capNhat(); }, { placeholder: 'Ví dụ 500', 'aria-label': 'Số điện mỗi tháng' });
    const keoKWh = thanhKeo(0, 2000, 10, st.kWh, (n) => { st.kWh = n; oKWh.value = TI.soVN(n, 0); capNhat(); }, 'Kéo chọn số điện');
    const vungTien = TI.el('div', { class: 'tn-hang-keo' }, keoTien, TI.el('div', { class: 'tn-o' }, oTienKhung));
    const vungKWh = TI.el('div', { class: 'tn-hang-keo' }, keoKWh, TI.el('div', { class: 'tn-o' }, ONhap.hauTo(oKWh, 'kWh')));
    const goiYDien = TI.el('p', { class: 'tn-goi-y', id: 'tn-goi-y-dien' });
    const doiCheDo = (cd) => {
      st.cheDo = cd;
      chon.querySelectorAll('button').forEach(b => b.classList.toggle('dang-chon', b.dataset.cd === cd));
      chon.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cd === cd)));
      vungTien.hidden = cd !== 'tien'; vungKWh.hidden = cd !== 'kwh';
      capNhat();
    };
    const chon = TI.el('div', { class: 'phan-doan', role: 'group', 'aria-label': 'Nhập theo' },
      TI.el('button', { type: 'button', 'data-cd': 'tien', onclick: () => doiCheDo('tien') }, 'Theo tiền điện'),
      TI.el('button', { type: 'button', 'data-cd': 'kwh', onclick: () => doiCheDo('kwh') }, 'Theo số điện (kWh)'));
    const chonThang = TI.el('select', { 'aria-label': 'Hóa đơn của tháng', onchange: (e) => { st.thang = Number(e.target.value); capNhat(); } },
      TI.el('option', { value: '0', selected: !st.thang }, 'Trung bình năm'),
      ...Array.from({ length: 12 }, (_, i) => TI.el('option', { value: String(i + 1), selected: st.thang === i + 1 }, `Tháng ${i + 1}`)));

    // 2. Mái nhà
    const oMai = TI.oSo(st.dienTich, (n) => { st.dienTich = n; keoMai.value = n ?? 0; capNhat(); }, { placeholder: 'Chưa đo', 'aria-label': 'Diện tích mái lắp được pin' });
    const keoMai = thanhKeo(0, 300, 1, st.dienTich, (n) => { st.dienTich = n; oMai.value = TI.soVN(n, 0); capNhat(); }, 'Kéo chọn diện tích mái');
    const goiYMai = TI.el('p', { class: 'tn-goi-y', id: 'tn-goi-y-mai' });

    // 3. Tùy chỉnh
    const nhanD = TI.el('b', {}, `${st.d}%`);
    const keoD = thanhKeo(10, 100, 5, st.d, (n) => { st.d = n; nhanD.textContent = `${n}%`; capNhat(); }, 'Tỉ lệ điện dùng ban ngày');
    const congTac = TI.el('input', { type: 'checkbox', role: 'switch', class: 'tn-cong-tac', checked: st.banDu,
      onchange: (e) => { st.banDu = e.target.checked; capNhat(); } });
    const chonTam = nc.dsTP.length > 1 ? TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Loại tấm pin'),
      TI.el('select', { onchange: (e) => { st.model = e.target.value; capNhat(); } },
        ...nc.dsTP.map(t => TI.el('option', { value: t.model, selected: t.model === st.model }, `${t.model}${SO(t.congSuatW) ? ` – ${TI.soVN(t.congSuatW)} W` : ''}`)))) : null;

    const khung = TI.el('section', { class: 'the tn-nhap', 'aria-label': 'Nhập số liệu' },
      TI.el('h3', { class: 'tn-buoc' }, TI.el('span', { class: 'so-tron' }, '1'), 'Điện nhà khách dùng'),
      chon, vungTien, vungKWh, goiYDien,
      TI.el('label', { class: 'truong tn-thang' }, TI.el('span', { class: 'nhan-truong' }, 'Hóa đơn của tháng'), chonThang),
      TI.el('p', { class: 'mo nho' }, 'Chọn đúng tháng của hóa đơn để ra số tiền giảm của tháng đó (mỗi tháng nắng một khác).'),
      TI.el('h3', { class: 'tn-buoc' }, TI.el('span', { class: 'so-tron' }, '2'), 'Mái nhà lắp được pin'),
      TI.el('div', { class: 'tn-hang-keo' }, keoMai, TI.el('div', { class: 'tn-o' }, ONhap.hauTo(oMai, 'm²'))),
      goiYMai,
      TI.el('h3', { class: 'tn-buoc' }, TI.el('span', { class: 'so-tron' }, '3'), 'Tùy chỉnh thêm'),
      TI.el('div', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Điện dùng ban ngày khoảng ', nhanD), keoD,
        TI.el('small', { class: 'ghi-chu' }, 'Giả định, chỉnh theo thói quen của khách: nhà có người ở nhà ban ngày thì cao, đi làm cả ngày thì thấp.')),
      chonTam,
      TI.el('label', { class: 'tn-dong-cong-tac' }, congTac, TI.el('span', {}, 'Đăng ký bán điện dư lên lưới')));
    doiCheDo(st.cheDo);
    return khung;
  }

  function capNhat() {
    if (!vungKQ) return;
    const kq = tinh();
    // Dòng gợi ý dưới ô nhập
    const goiYDien = document.getElementById('tn-goi-y-dien'), goiYMai = document.getElementById('tn-goi-y-mai');
    if (goiYDien) goiYDien.textContent = kq.C > 0
      ? (st.cheDo === 'tien' ? `≈ ${TI.soVN(kq.C, 0)} kWh mỗi tháng` : `≈ ${TI.soVN(Math.round(kq.truoc / 1000) * 1000, 0)} đ mỗi tháng`) : '';
    if (goiYMai) goiYMai.textContent = !SO(nc.m2kWp)
      ? 'Chưa có "Diện tích mái cần cho 1 kWp" trong Cài đặt → chưa giới hạn theo mái.'
      : SO(st.dienTich) && st.dienTich > 0 ? `Lắp được khoảng ${TI.soVN(st.dienTich / nc.m2kWp, 1)} kWp (diện tích ÷ ${TI.soVN(nc.m2kWp)} m²/kWp)` : 'Để trống thì chỉ tính theo hóa đơn.';

    if (kq.thieu.length) {
      oGhim.replaceChildren();
      vungKQ.replaceChildren(TI.el('div', { class: 'the canh-bao' },
        TI.el('div', { class: 'co-icon' }, Icon('alert-triangle'), TI.el('b', {}, 'Chưa tính được vì còn thiếu số liệu chung')),
        TI.el('ul', { class: 'ds-thieu' }, ...kq.thieu.map(t => TI.el('li', {}, t))),
        TI.el('a', { class: 'lien-ket-icon', href: '#/cai-dat' }, 'Điền trong Cài đặt', Icon('arrow-right', { co: 18 }))));
      return;
    }
    if (kq.chuaNhap) {
      oGhim.replaceChildren();
      vungKQ.replaceChildren(TI.el('div', { class: 'the trong tn-trong' }, TI.el('b', {}, 'Nhập tiền điện hoặc số điện của khách'),
        TI.el('p', { class: 'mo' }, 'Kéo thanh trượt hoặc gõ số; kết quả hiện ngay ở đây.')));
      return;
    }
    if (kq.soTam < 1) {
      oGhim.replaceChildren();
      vungKQ.replaceChildren(TI.el('div', { class: 'the canh-bao' }, TI.el('b', {}, 'Mái quá nhỏ'),
        TI.el('p', {}, `Diện tích mái chưa đủ cho 1 tấm ${kq.tp.model}.`)));
      return;
    }

    const tenKy = st.thang ? `tháng ${st.thang}` : 'trung bình';
    const coBan = st.banDu && kq.coGiaMua;
    const nhanLon = coBan ? `Tiền điện giảm + tiền bán điện dư (${tenKy})` : `Tiền điện giảm ${tenKy}`;
    const sau = Math.max(0, kq.truoc - kq.giamHD);
    const phanTram = kq.truoc > 0 ? sau / kq.truoc : 0;
    const thanh = (nhan, tien, ti, lop) => TI.el('div', { class: 'tn-thanh' }, TI.el('span', {}, nhan),
      TI.el('div', { class: 'tn-ray' }, TI.el('i', { class: lop, style: `width:${Math.max(2, Math.round(ti * 100))}%` })),
      TI.el('b', {}, tienGon(tien)));
    const o = (nhan, gt, phu) => TI.el('div', { class: 'kt-o' }, TI.el('small', {}, nhan), TI.el('b', {}, gt), phu ? TI.el('span', {}, phu) : null);
    const giaiThich = kq.kWpMai !== null
      ? `Theo diện tích mái ${TI.soVN(kq.kWpMai, 1)} kWp · theo hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp: lấy số nhỏ hơn, làm tròn theo số tấm.`
      : `Theo hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp, làm tròn theo số tấm${SO(nc.m2kWp) ? ' (chưa nhập diện tích mái)' : ''}.`;

    vungKQ.replaceChildren(
      TI.el('div', { class: 'tn-dau' },
        TI.el('span', { class: 'tn-dau-nhan' }, nhanLon),
        TI.el('div', { class: 'tn-so-lon' }, TI.el('b', {}, tienGon(kq.giam)), TI.el('span', {}, '/tháng')),
        TI.el('span', { class: 'tn-dau-phu' }, 'Cả năm khoảng ', TI.el('b', {}, tienGon(kq.nam)),
          st.banDu ? (kq.coGiaMua ? ' (gồm tiền bán điện dư)' : ' (chưa gồm tiền bán điện dư: thiếu giá mua trong Cài đặt)') : '')),
      TI.el('div', { class: 'the tn-so-sanh' },
        thanh(st.thang ? `Hóa đơn tháng ${st.thang} hiện tại` : 'Hóa đơn hiện tại', kq.truoc, 1, 'truoc'),
        thanh(`Sau khi lắp (${tenKy})`, sau, phanTram, 'sau')),
      TI.el('div', { class: 'kt-tom-tat' },
        o('Hệ thống gợi ý', `${TI.soVN(kq.kWp, 2)} kWp`),
        o(`Số tấm pin ${TI.soVN(kq.tp.congSuatW)} W`, `${kq.soTam} tấm`, kq.tp.model),
        o('Diện tích tấm pin', `${TI.soVN(kq.dtTam, 0)} m²`, 'chưa gồm lối đi'),
        o('Điện tạo ra mỗi năm', `${TI.soVN(kq.SLnam, 0)} kWh`, st.banDu ? `dư ${TI.soVN(kq.duNam, 0)} kWh bán lên lưới` : `dùng ${TI.soVN(kq.SLnam - kq.duNam, 0)} kWh`)),
      TI.el('p', { class: 'mo nho' }, giaiThich),
      TI.el('div', { class: 'the' }, TI.el('h4', {}, 'Điện tạo ra từng tháng (kWh)'), bieuDo(kq)),
      TI.el('details', { class: 'tn-cach-tinh' }, TI.el('summary', {}, 'Cách tính và giả định'),
        TI.el('ul', { class: 'ds-thieu' },
          TI.el('li', {}, 'Tiền điện tính theo bảng bậc thang EVN trong Cài đặt; tiêu thụ mỗi tháng bằng số trên hóa đơn.'),
          TI.el('li', {}, `kWp theo hóa đơn = kWh/tháng × ${st.banDu ? '100%' : `${st.d}% (điện dùng ban ngày)`} ÷ (30 × giờ nắng đỉnh TB năm × PR ${TI.soVN(nc.PR)}).`),
          TI.el('li', {}, 'Sản lượng tháng = kWp × giờ nắng đỉnh của tháng × PR × số ngày (giống báo giá).'),
          TI.el('li', {}, st.banDu ? 'Điện mặt trời thay phần dùng ban ngày; phần dư bán lên lưới theo giá mua trong Cài đặt.' : 'Điện mặt trời chỉ thay phần dùng ban ngày; phần dư không tính tiền (chống phát ngược).'),
          TI.el('li', {}, 'Đây là ước tính nhanh; số chính xác xem ở báo giá sau khi khảo sát, vẽ mái và xếp pin.'))),
      TI.el('div', { class: 'hang tn-hanh-dong' },
        TI.el('button', { type: 'button', class: 'nut chinh', onclick: () => taoHoSo(kq) }, ...Icon.chu('plus', 'Tạo hồ sơ khách từ số liệu này'))));

    oGhim.replaceChildren(TI.el('div', {}, TI.el('small', {}, coBan ? `Giảm + bán dư (${tenKy})` : `Giảm ${tenKy}`), TI.el('b', {}, `${tienGon(kq.giam)}/tháng`)),
      TI.el('span', {}, `${TI.soVN(kq.kWp, 2)} kWp · ${kq.soTam} tấm`));
  }

  // Biểu đồ cột 12 tháng (SVG), tháng đang chọn tô đậm.
  function bieuDo(kq) {
    const hep = window.matchMedia('(max-width: 639px)').matches, W = hep ? 360 : 640, H = hep ? 200 : 220, coChu = hep ? 10 : 11, trai = 8, duoi = 26, tren = 22, max = Math.max(...kq.SL) * 1.1 || 1, rong = (W - trai * 2) / 12;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'tn-bieu-do'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Điện tạo ra từng tháng: ' + kq.SL.map((v, i) => `tháng ${i + 1} ${TI.soVN(v, 0)} kWh`).join(', '));
    let s = '';
    kq.SL.forEach((v, i) => {
      const h = (H - tren - duoi) * v / max, x = trai + i * rong + rong * 0.16, y = H - duoi - h, w = rong * 0.68;
      const dam = st.thang === i + 1;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${dam ? '#E8920C' : '#FFB020'}" opacity="${st.thang && !dam ? 0.55 : 1}"/>`;
      s += `<text x="${x + w / 2}" y="${y - 6}" text-anchor="middle" font-size="${coChu}" font-weight="600" fill="#0B2A4A">${TI.soVN(v, 0)}</text>`;
      s += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#45525F" font-weight="${dam ? 700 : 400}">T${i + 1}</text>`;
    });
    svg.innerHTML = s;
    return svg;
  }

  async function taoHoSo(kq) {
    const hs = HoSo.taoMoi();
    hs.dien.hoaDon = [{ thang: '', kWh: Math.round(kq.C), tien: st.cheDo === 'tien' && SO(st.tien) ? st.tien : Math.round(kq.truoc) }];
    hs.dien.phanTramDungBanNgay = st.d;
    hs.dien.banDienDu = st.banDu ? 'Có' : 'Không';
    hs.ghiChu = `Tính nhanh: gợi ý ${TI.soVN(kq.kWp, 2)} kWp (${kq.soTam} tấm ${kq.tp.model})${SO(st.dienTich) ? `, mái lắp được khoảng ${TI.soVN(st.dienTich, 0)} m²` : ''}.`;
    await HoSo.luu(hs);
    TI.thongBao('Đã tạo hồ sơ mới từ số liệu tính nhanh');
    location.hash = `#/ho-so/${hs.id}/khao-sat`;
  }

  return { ve, _tinh: () => tinh(), _st: st };
})();
