// Màn "Tính nhanh tiết kiệm": ước lượng nhanh khi đang nói chuyện với khách, chưa cần hồ sơ.
// Chỉ khái toán tiền điện giảm so với khi chưa lắp; chi phí và hoàn vốn để phần báo giá.
// Dùng lại đúng các hàm tính của báo giá (TaiChinh: bậc thang EVN, sản lượng tháng, điện tự dùng).
// Phần gợi ý là ước lượng nhanh, ghi rõ cách tính ngay trên màn:
//   kWp theo hóa đơn = kWh/tháng × tỉ lệ cần bù ÷ (30 × giờ nắng đỉnh TB năm × PR × hệ số hướng mái)
//   Có pin + mục tiêu: dò pin nhỏ nhất rồi ít tấm nhất đạt mục tiêu tiền điện cả năm (mô phỏng 12 tháng)
//   Biến tần: cỡ nhỏ nhất trong danh sách cỡ hay bán mà tỉ lệ DC/AC không vượt mức cao nhất;
//     có pin thì là hybrid và không nhỏ hơn tải buổi tối (nếu có nhập)
const ManTinhNhanh = (() => {
  const SO = (x) => typeof x === 'number' && isFinite(x);
  const coGT = (x) => x !== null && x !== undefined && x !== '' && x !== CAN_DIEN;
  const NGAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Giữ lại số đã nhập khi quay lại màn này (không lưu vào máy).
  const st = {
    cheDo: 'tien', tien: null, kWh: null, thang: 0, dienTich: null, d: 50, banDu: false, model: null,
    huong: 'nam', kWpMuon: null, pin: false, mucTieu: 'max', mucTieuKhac: null, soPha: '1', taiToi: null,
  };

  // Hướng mái → hệ số sản lượng so với mái hướng Nam (số lấy trong Cài đặt → Cấu hình).
  const HUONG = [
    { ma: 'nam', ten: 'Nam', cauHinh: 'heSoHuongNamPhanTram' },
    { ma: 'dn-tn', ten: 'Đông Nam / Tây Nam', cauHinh: 'heSoHuongDongNamTayNamPhanTram' },
    { ma: 'dong-tay', ten: 'Đông / Tây', cauHinh: 'heSoHuongDongTayPhanTram' },
    { ma: 'bac', ten: 'Bắc', cauHinh: 'heSoHuongBacPhanTram', phu: 'không khuyến khích' },
  ];

  let nc = null, vungKQ = null, oGhim = null, vungTaiToi = null;

  const tienGon = (x) => !SO(x) ? null : Math.abs(x) >= 1e9 ? `${TI.soVN(x / 1e9, 2)} tỷ đ`
    : Math.abs(x) >= 1e6 ? `${TI.soVN(x / 1e6, 2)} triệu đ` : `${TI.soVN(Math.round(x / 1000), 0)} nghìn đ`;
  const pt = (x) => `${Math.round(x * 100)}%`;

  async function napDuLieu() {
    const evn = await DuLieu.lay('gia-dien-evn'), nang = await DuLieu.lay('nang-khu-vuc'), tp = await DuLieu.lay('tam-pin');
    const cfg = (ma) => DuLieu.giaTri('cau-hinh', ma);
    const coBT = await cfg('cacCoBienTanKW');
    return {
      bt: TaiChinh.bangBacThang(evn),
      nang: nang.bang.dong.map(r => r.gioNangDinh),
      PR: await cfg('PR'),
      m2kWp: await cfg('dienTichMaiMoiKWp'),
      giaMua: await cfg('giaMuaDienDu'),
      dsTP: tp.bang.dong.filter(d => coGT(d.model)),
      doXaSau: await cfg('doXaSauPinPhanTram'),
      buocPin: await cfg('buocLamTronPinKWh'),
      pinMin: await cfg('pinNhoNhatKWh'),
      hieuSuatPin: await cfg('hieuSuatPinLuuTruPhanTram'),
      dcAcMax: await cfg('dcAcMax'),
      bt1Pha: await cfg('bienTan1PhaToiDaKW'),
      coBienTan: coGT(coBT) ? String(coBT).split(/[;\s]+/).map(TI.docSo).filter(x => SO(x) && x > 0).sort((a, b) => a - b) : [],
      huong: Object.fromEntries(await Promise.all(HUONG.map(async h => [h.ma, await cfg(h.cauHinh)]))),
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

  // Biến tần gợi ý cho 1 phương án.
  function chonBienTan(kWp, coPin) {
    const loai = coPin ? 'Hybrid' : 'Hòa lưới';
    if (!SO(nc.dcAcMax) || nc.dcAcMax <= 0 || !nc.coBienTan.length) return { loai, thieu: true };
    const theoTam = kWp / nc.dcAcMax;
    const theoTai = coPin && SO(st.taiToi) && st.taiToi > theoTam;
    const can = theoTai ? st.taiToi : theoTam;
    const kW = nc.coBienTan.find(c => c >= can - 1e-9) ?? null;
    return {
      loai, kW, can, theoTai, tiLe: kW ? kWp / kW : null, lonNhat: nc.coBienTan[nc.coBienTan.length - 1],
      vuot1Pha: st.soPha === '1' && SO(nc.bt1Pha) && SO(kW) && kW > nc.bt1Pha,
    };
  }
  const tenBienTan = (b) => b.thieu ? `${b.loai} (chưa có cỡ trong Cài đặt)`
    : b.kW ? `${b.loai} ${TI.soVN(b.kW)} kW` : `${b.loai} trên ${TI.soVN(b.lonNhat)} kW`;

  // ---------- Tính ----------
  function tinh() {
    const thieu = [];
    if (nc.bt.thieu.length) thieu.push(`Giá điện EVN: ${nc.bt.thieu.join(', ')}`);
    if (nc.nang.some(h => !SO(h))) thieu.push('Giờ nắng đỉnh 12 tháng');
    if (!SO(nc.PR)) thieu.push('Hệ số PR');
    const tp = nc.dsTP.find(d => d.model === st.model) || nc.dsTP[0] || null;
    if (!tp) thieu.push('Danh mục tấm pin');
    else if (!SO(tp.congSuatW) || !SO(tp.daiMm) || !SO(tp.rongMm)) thieu.push(`Công suất / kích thước tấm ${tp.model}`);
    const hsHuong = nc.huong[st.huong];
    const tenHuong = HUONG.find(h => h.ma === st.huong).ten;
    if (!SO(hsHuong) || hsHuong <= 0) thieu.push(`Hệ số sản lượng mái hướng ${tenHuong}`);
    if (thieu.length) return { thieu };
    const hs = hsHuong / 100;

    const C = st.cheDo === 'tien' ? kWhTuTien(st.tien, nc.bt) : (SO(st.kWh) ? st.kWh : 0);
    if (!(C > 0)) return { thieu: [], chuaNhap: true };
    const d = st.d / 100, W = tp.congSuatW;
    const pshTB = nc.nang.reduce((s, h, i) => s + h * NGAY[i], 0) / 365;
    const kWpMai = SO(st.dienTich) && st.dienTich > 0 && SO(nc.m2kWp) && nc.m2kWp > 0 ? st.dienTich / nc.m2kWp : null;
    const toiDaMai = kWpMai !== null ? Math.floor(kWpMai * 1000 / W) : Infinity;
    const theoMuon = SO(st.kWpMuon) && st.kWpMuon > 0;
    const truoc = TaiChinh.tienDien(C, nc.bt);
    const coGiaMua = SO(nc.giaMua);
    const demNgay = C * (1 - d) / 30;   // điện dùng ban đêm mỗi ngày (kWh)

    // Tính 1 phương án theo đúng số tấm và dung lượng pin dùng được (kWh), đủ 12 tháng như báo giá.
    function theoSoTam(soTam, pinDungDuoc, hsPin) {
      const kWp = soTam * W / 1000;
      const SL = TaiChinh.sanLuongThang(kWp, nc.nang, nc.PR).map(x => x * hs);
      const thang = SL.map((sl, i) => {
        const banNgay = Math.min(sl, C * d);
        const td = TaiChinh.tuDung(sl, C, d, pinDungDuoc, hsPin, NGAY[i]);
        const quaPin = td - banNgay;
        const du = Math.max(0, sl - banNgay - (pinDungDuoc > 0 ? quaPin / hsPin : 0));
        const giamHD = truoc - TaiChinh.tienDien(C - td, nc.bt);
        const ban = st.banDu && coGiaMua ? du * nc.giaMua : 0;
        return { sl, td, du, quaPin, pinDu: quaPin >= C * (1 - d) - 0.5, giamHD, ban, giam: giamHD + ban };
      });
      const nam = thang.reduce((s, t) => s + t.giam, 0);
      const chon = st.thang ? thang[st.thang - 1] : null;
      const giamHDTB = thang.reduce((s, t) => s + t.giamHD, 0) / 12;
      return {
        soTam, kWp, SL, thang, nam, pinKWh: 0, vuotMai: theoMuon && soTam > toiDaMai,
        giam: chon ? chon.giam : nam / 12,
        giamHD: chon ? chon.giamHD : giamHDTB,
        datTB: giamHDTB / truoc,
        thangMin: Math.min(...thang.map(t => t.giamHD)) / truoc,
        thangMinSo: thang.reduce((m, t, i) => t.giamHD < thang[m].giamHD ? i : m, 0) + 1,
        dtTam: soTam * tp.daiMm * tp.rongMm / 1e6, SLnam: SL.reduce((s, x) => s + x, 0),
        duNam: thang.reduce((s, t) => s + t.du, 0),
      };
    }
    // Số tấm theo tỉ lệ điện cần tạo ra (tiLeBu), có giới hạn mái; nếu nhập "công suất muốn lắp" thì theo số đó.
    const soTamTheo = (tiLeBu) => {
      const kWpHD = C * tiLeBu / (30 * pshTB * nc.PR * hs);
      let n = Math.max(1, Math.round((theoMuon ? st.kWpMuon : kWpHD) * 1000 / W));
      if (!theoMuon) n = Math.min(n, toiDaMai);
      return { n, kWpHD };
    };
    const phuongAn = (tiLeBu, pinDungDuoc, hsPin) => {
      const { n, kWpHD } = soTamTheo(tiLeBu);
      return { ...theoSoTam(n, pinDungDuoc, hsPin), kWpHD };
    };

    const khongPin = phuongAn(st.banDu ? 1 : d, 0, 0);
    khongPin.mt = 'khong';

    // Pin "tối đa" theo tính toán (không lấy từ danh mục): đủ điện ban đêm 1 ngày ÷ độ xả sâu, làm tròn lên.
    let pin = null;
    const thieuPin = [];
    if (d < 1 && demNgay > 0) {
      if (!SO(nc.hieuSuatPin) || nc.hieuSuatPin <= 0) thieuPin.push('Hiệu suất sạc–xả pin lưu trữ (Cài đặt → Cấu hình)');
      const coDoD = SO(nc.doXaSau) && nc.doXaSau > 0 && nc.doXaSau <= 100;
      const dod = coDoD ? nc.doXaSau / 100 : 1;
      const buoc = SO(nc.buocPin) && nc.buocPin > 0 ? nc.buocPin : 1;
      const lenBuoc = (x) => Math.ceil(x / buoc - 1e-9) * buoc;
      const min = SO(nc.pinMin) && nc.pinMin > 0 ? lenBuoc(nc.pinMin) : 0;
      const can = demNgay / dod;
      const kWh = Math.max(lenBuoc(can), min);
      pin = { can, kWh, dungDuoc: kWh * dod, coDoD, dod, buoc, min };
    }
    let coPin = null, mucTieu = [], nTran = null;
    if (pin && !thieuPin.length) {
      const hsPin = nc.hieuSuatPin / 100;
      const tiLeMax = Math.max(st.banDu ? 1 : 0, d + (1 - d) / hsPin);
      coPin = { ...phuongAn(tiLeMax, pin.dungDuoc, hsPin), pinKWh: pin.kWh, mt: 'max' };

      // Trần số tấm khi dò: không vượt mái và không tạo ra nhiều hơn mức nhà dùng hết (kể cả phần qua pin).
      nTran = theoMuon ? soTamTheo(tiLeMax).n
        : Math.min(toiDaMai, Math.max(coPin.soTam, Math.ceil(C * tiLeMax / (30 * pshTB * nc.PR * hs) * 1000 / W)));
      // Các mức pin được thử: 0 (không pin), rồi từ pin nhỏ nhất bán được tới mức tối đa.
      const dsB = [0];
      for (let B = Math.max(pin.buoc, pin.min); B <= pin.kWh + 1e-9; B += pin.buoc) dsB.push(B);
      // Mỗi mức pin tìm số tấm ít nhất đạt mục tiêu (tiền giảm tăng dần theo số tấm → tìm nhị phân).
      const timToiUu = (T) => {
        for (const B of dsB) {
          const dat = (n) => theoSoTam(n, B * pin.dod, hsPin).datTB >= T - 1e-9;
          if (!dat(nTran)) continue;
          let lo = theoMuon ? nTran : 1, hi = nTran;
          while (lo < hi) { const g = (lo + hi) >> 1; if (dat(g)) hi = g; else lo = g + 1; }
          return { ...theoSoTam(lo, B * pin.dod, hsPin), pinKWh: B, mt: T };
        }
        return null;
      };
      // Mốc gợi ý: chẵn 10% cao hơn mức không pin, tối đa 3 mốc, thấp hơn mức "tối đa"; thêm mục tiêu tự gõ.
      const moc = [];
      for (let t = Math.floor(khongPin.datTB * 10 + 1e-9) / 10 + 0.1; t < coPin.datTB - 0.005 && moc.length < 3; t += 0.1) moc.push(Math.round(t * 100) / 100);
      if (SO(st.mucTieuKhac) && st.mucTieuKhac > 0 && !moc.includes(st.mucTieuKhac / 100)) moc.push(st.mucTieuKhac / 100);
      moc.sort((a, b) => a - b);
      mucTieu = moc.map(T => ({ T, pa: timToiUu(T) }));
    }
    // Gắn biến tần cho từng phương án.
    for (const p of [khongPin, coPin, ...mucTieu.map(m => m.pa)]) if (p) p.bienTan = chonBienTan(p.kWp, p.pinKWh > 0);

    let pa = khongPin;
    if (st.pin && coPin) {
      const chon = st.mucTieu === 'max' ? null : mucTieu.find(m => Math.abs(m.T - st.mucTieu) < 1e-6);
      if (chon && chon.pa) pa = chon.pa; else { pa = coPin; st.mucTieu = 'max'; }
    }
    return {
      thieu: [], C, d, tp, kWpMai, hs, tenHuong, theoMuon, truoc, coGiaMua, demNgay,
      khongPin, coPin, pin, thieuPin, dungPin: !!(st.pin && coPin), mucTieu, nTran, ...pa,
      kWpHD: pa.kWpHD ?? khongPin.kWpHD,
    };
  }

  // ---------- Màn hình ----------
  async function ve(v) {
    App.datTieuDe('Tính nhanh tiết kiệm');
    nc = await napDuLieu();
    if (!st.model && nc.dsTP.length) st.model = nc.dsTP[0].model;
    vungKQ = TI.el('section', { class: 'tn-kq', id: 'tn-ket-qua', 'aria-live': 'polite', 'aria-label': 'Kết quả' });
    oGhim = TI.el('div', { class: 'tn-ghim' });
    v.replaceChildren(TI.el('div', { class: 'bo-cuc-tinh-nhanh' }, veNhap(), vungKQ), oGhim);
    capNhat();
    if (!ve.daGanCuon) { window.addEventListener('scroll', anHienGhim, { passive: true }); ve.daGanCuon = true; }
    anHienGhim();
  }

  // Thanh ghim đáy chỉ hiện khi phần kết quả còn ở dưới màn hình (tránh lặp lại số đang thấy).
  function anHienGhim() {
    if (!oGhim || !vungKQ || !document.body.contains(oGhim)) return;
    oGhim.classList.toggle('an', vungKQ.getBoundingClientRect().top < window.innerHeight - 96);
  }

  function thanhKeo(min, max, buoc, gt, khiKeo, nhan) {
    return TI.el('input', { type: 'range', class: 'tn-keo', min, max, step: buoc, value: gt ?? min, 'aria-label': nhan,
      oninput: (e) => khiKeo(Number(e.target.value)) });
  }

  // Nhóm nút chọn 1 trong nhiều (dùng chung kiểu .phan-doan của app).
  function phanDoan(nhan, ds, gt, khiChon, lop = '') {
    const nhom = TI.el('div', { class: 'phan-doan ' + lop, role: 'group', 'aria-label': nhan });
    const danhDau = (v) => nhom.querySelectorAll('button').forEach(b => {
      const on = b.dataset.gt === String(v); b.classList.toggle('dang-chon', on); b.setAttribute('aria-pressed', String(on));
    });
    ds.forEach(([v, chu]) => nhom.append(TI.el('button', { type: 'button', 'data-gt': String(v),
      onclick: () => { danhDau(v); khiChon(v); } }, chu)));
    danhDau(gt);
    nhom.datGT = danhDau;
    return nhom;
  }

  const nhom = (so, tieuDe, ...con) => TI.el('div', { class: 'tn-nhom' },
    TI.el('h3', { class: 'tn-buoc' }, TI.el('span', { class: 'so-tron' }, so), tieuDe), ...con);
  const truong = (nhan, ...con) => TI.el('div', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, ...[].concat(nhan)), ...con);

  function veNhap() {
    // 1. Điện nhà khách
    const oTienKhung = ONhap.tien(st.tien, (n) => { st.tien = n; keoTien.value = n ?? 0; capNhat(); }, { 'aria-label': 'Tiền điện mỗi tháng', placeholder: 'Ví dụ 1tr5' });
    const oTien = oTienKhung.querySelector('input');
    const keoTien = thanhKeo(0, 5000000, 50000, st.tien, (n) => { st.tien = n; oTien.value = TI.soVN(n, 0); capNhat(); }, 'Kéo chọn tiền điện');
    const oKWh = TI.oSo(st.kWh, (n) => { st.kWh = n; keoKWh.value = n ?? 0; capNhat(); }, { placeholder: 'Ví dụ 500', 'aria-label': 'Số điện mỗi tháng' });
    const keoKWh = thanhKeo(0, 2000, 10, st.kWh, (n) => { st.kWh = n; oKWh.value = TI.soVN(n, 0); capNhat(); }, 'Kéo chọn số điện');
    const vungTien = TI.el('div', { class: 'tn-hang-keo' }, TI.el('div', { class: 'tn-o' }, oTienKhung), keoTien);
    const vungKWh = TI.el('div', { class: 'tn-hang-keo' }, TI.el('div', { class: 'tn-o' }, ONhap.hauTo(oKWh, 'kWh')), keoKWh);
    const hienCheDo = () => { vungTien.hidden = st.cheDo !== 'tien'; vungKWh.hidden = st.cheDo !== 'kwh'; };
    const chonCheDo = phanDoan('Nhập theo', [['tien', 'Tiền điện'], ['kwh', 'Số điện (kWh)']], st.cheDo,
      (v) => { st.cheDo = v; hienCheDo(); capNhat(); });
    hienCheDo();
    const chonThang = TI.el('select', { 'aria-label': 'Hóa đơn của tháng', onchange: (e) => { st.thang = Number(e.target.value); capNhat(); } },
      TI.el('option', { value: '0', selected: !st.thang }, 'Trung bình năm'),
      ...Array.from({ length: 12 }, (_, i) => TI.el('option', { value: String(i + 1), selected: st.thang === i + 1 }, `Tháng ${i + 1}`)));

    // 2. Thói quen dùng điện
    const nhanD = TI.el('b', { class: 'tn-so-nho' }, `${st.d}%`);
    const keoD = thanhKeo(10, 100, 5, st.d, (n) => datD(n), 'Tỉ lệ điện dùng ban ngày');
    const chonD = phanDoan('Chọn nhanh tỉ lệ dùng ban ngày', [[100, '100%'], [70, '70%'], [50, '50%']], st.d, (n) => datD(n), 'tn-chon-d');
    const datD = (n) => { st.d = n; nhanD.textContent = `${n}%`; keoD.value = n; chonD.datGT(n); capNhat(); };
    const chonPha = phanDoan('Điện nhà khách', [['1', '1 pha'], ['3', '3 pha']], st.soPha, (v) => { st.soPha = v; capNhat(); });
    const oTai = TI.oSo(st.taiToi, (n) => { st.taiToi = n; capNhat(); }, { placeholder: 'Ví dụ 3', 'aria-label': 'Thiết bị bật cùng lúc buổi tối' });
    vungTaiToi = truong(['Thiết bị bật cùng lúc buổi tối ', TI.el('span', { class: 'mo' }, '(không bắt buộc)')],
      TI.el('div', { class: 'tn-o-ngan' }, ONhap.hauTo(oTai, 'kW')),
      TI.el('small', { class: 'ghi-chu' }, 'Ví dụ 2 điều hòa + bình nóng lạnh ≈ 5 kW. Dùng để chọn cỡ biến tần hybrid.'));

    // 3. Mái nhà
    const oMai = TI.oSo(st.dienTich, (n) => { st.dienTich = n; keoMai.value = n ?? 0; capNhat(); }, { placeholder: 'Chưa đo', 'aria-label': 'Diện tích mái lắp được pin' });
    const keoMai = thanhKeo(0, 300, 1, st.dienTich, (n) => { st.dienTich = n; oMai.value = TI.soVN(n, 0); capNhat(); }, 'Kéo chọn diện tích mái');
    const chonHuong = TI.el('select', { 'aria-label': 'Hướng mái', onchange: (e) => { st.huong = e.target.value; capNhat(); } },
      ...HUONG.map(h => { const v = nc.huong[h.ma];
        return TI.el('option', { value: h.ma, selected: st.huong === h.ma }, `${h.ten}${SO(v) ? ` (≈ ${TI.soVN(v)}%${h.phu ? `, ${h.phu}` : ''})` : ' (chưa có hệ số)'}`); }));

    // Tùy chọn thêm (ít dùng, gập lại)
    const oMuon = TI.oSo(st.kWpMuon, (n) => { st.kWpMuon = n; capNhat(); }, { placeholder: 'Theo gợi ý', 'aria-label': 'Công suất muốn lắp' });
    const congTacBan = TI.el('input', { type: 'checkbox', role: 'switch', class: 'tn-cong-tac', checked: st.banDu,
      onchange: (e) => { st.banDu = e.target.checked; capNhat(); } });
    const chonTam = nc.dsTP.length > 1 ? truong('Loại tấm pin',
      TI.el('select', { onchange: (e) => { st.model = e.target.value; capNhat(); } },
        ...nc.dsTP.map(t => TI.el('option', { value: t.model, selected: t.model === st.model }, `${t.model}${SO(t.congSuatW) ? ` – ${TI.soVN(t.congSuatW)} W` : ''}`)))) : null;
    const moThem = SO(st.kWpMuon) || st.banDu;

    return TI.el('section', { class: 'the tn-nhap', 'aria-label': 'Nhập số liệu' },
      nhom('1', 'Điện nhà khách',
        chonCheDo, vungTien, vungKWh,
        TI.el('p', { class: 'tn-goi-y', id: 'tn-goi-y-dien' }),
        TI.el('label', { class: 'tn-hang-nho' }, TI.el('span', {}, 'Hóa đơn của'), chonThang)),
      nhom('2', 'Thói quen dùng điện',
        truong(['Dùng ban ngày khoảng ', nhanD], chonD, keoD,
          TI.el('small', { class: 'ghi-chu' }, 'Nhà có người ở nhà ban ngày thì cao; đi làm cả ngày thì 50% trở xuống.')),
        truong('Điện nhà', chonPha),
        vungTaiToi),
      nhom('3', 'Mái nhà',
        truong(['Diện tích lắp được ', TI.el('span', { class: 'mo' }, '(không bắt buộc)')],
          TI.el('div', { class: 'tn-hang-keo' }, TI.el('div', { class: 'tn-o' }, ONhap.hauTo(oMai, 'm²')), keoMai),
          TI.el('small', { class: 'ghi-chu', id: 'tn-goi-y-mai' })),
        TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Hướng mái'), chonHuong)),
      TI.el('details', { class: 'tn-them-tuy-chon', open: moThem },
        TI.el('summary', {}, 'Tùy chọn thêm', TI.el('span', { class: 'mo' }, 'công suất muốn lắp, loại tấm, bán điện dư')),
        TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Công suất muốn lắp'),
          TI.el('div', { class: 'tn-o-ngan' }, ONhap.hauTo(oMuon, 'kWp'))),
        chonTam,
        TI.el('label', { class: 'tn-dong-cong-tac' }, congTacBan, TI.el('span', {}, 'Đăng ký bán điện dư lên lưới'))));
  }

  function capNhat() {
    if (!vungKQ) return;
    const kq = tinh();
    const goiYDien = document.getElementById('tn-goi-y-dien'), goiYMai = document.getElementById('tn-goi-y-mai');
    if (goiYDien) goiYDien.textContent = kq.C > 0
      ? (st.cheDo === 'tien' ? `≈ ${TI.soVN(kq.C, 0)} kWh mỗi tháng` : `≈ ${TI.soVN(Math.round(kq.truoc / 1000) * 1000, 0)} đ mỗi tháng`) : '';
    if (goiYMai) goiYMai.textContent = !SO(nc.m2kWp)
      ? 'Chưa có "Diện tích mái cần cho 1 kWp" trong Cài đặt nên chưa giới hạn theo mái.'
      : SO(st.dienTich) && st.dienTich > 0 ? `Lắp được khoảng ${TI.soVN(st.dienTich / nc.m2kWp, 1)} kWp.` : 'Để trống thì chỉ tính theo hóa đơn.';
    if (vungTaiToi) vungTaiToi.hidden = !st.pin;

    const xoaGhim = () => oGhim.replaceChildren();
    if (kq.thieu.length) {
      xoaGhim();
      vungKQ.replaceChildren(TI.el('div', { class: 'the canh-bao' },
        TI.el('div', { class: 'co-icon' }, Icon('alert-triangle'), TI.el('b', {}, 'Chưa tính được vì còn thiếu số liệu chung')),
        TI.el('ul', { class: 'ds-thieu' }, ...kq.thieu.map(t => TI.el('li', {}, t))),
        TI.el('a', { class: 'lien-ket-icon', href: '#/cai-dat' }, 'Điền trong Cài đặt', Icon('arrow-right', { co: 18 }))));
      return;
    }
    if (kq.chuaNhap) {
      xoaGhim();
      vungKQ.replaceChildren(TI.el('div', { class: 'the trong tn-trong' },
        Icon('bolt', { co: 28 }),
        TI.el('b', {}, 'Nhập tiền điện hoặc số điện của khách'),
        TI.el('p', { class: 'mo' }, 'Gõ số (vd 1tr5) hoặc kéo thanh trượt; kết quả hiện ngay ở đây.')));
      return;
    }
    if (kq.soTam < 1) {
      xoaGhim();
      vungKQ.replaceChildren(TI.el('div', { class: 'the canh-bao' }, TI.el('b', {}, 'Mái quá nhỏ'),
        TI.el('p', {}, `Diện tích mái chưa đủ cho 1 tấm ${kq.tp.model}.`)));
      return;
    }

    const tenKy = st.thang ? `tháng ${st.thang}` : 'trung bình';
    const coBan = st.banDu && kq.coGiaMua;
    const sau = Math.max(0, kq.truoc - kq.giamHD);
    const tiGiam = kq.truoc > 0 ? Math.min(1, kq.giamHD / kq.truoc) : 0;

    vungKQ.replaceChildren(
      veDau(kq, tenKy, coBan, sau, tiGiam),
      vePhuongAn(kq),
      veBanKe(kq),
      TI.el('div', { class: 'the tn-the-bd' }, TI.el('h4', {}, 'Điện tạo ra từng tháng ', TI.el('span', { class: 'mo' }, '(kWh)')), bieuDo(kq)),
      veCachTinh(kq),
      TI.el('div', { class: 'tn-hanh-dong' },
        TI.el('button', { type: 'button', class: 'nut chinh', onclick: () => taoHoSo(kq) }, ...Icon.chu('plus', 'Tạo hồ sơ khách từ số liệu này'))));

    oGhim.replaceChildren(TI.el('button', { type: 'button', class: 'tn-ghim-nut', 'aria-label': 'Xem kết quả',
      onclick: () => vungKQ.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
      TI.el('div', {}, TI.el('small', {}, coBan ? `Giảm + bán dư (${tenKy})` : `Tiền điện giảm (${tenKy})`), TI.el('b', {}, `${tienGon(kq.giam)}/tháng`)),
      TI.el('span', {}, `${TI.soVN(kq.kWp, 2)} kWp${kq.pinKWh > 0 ? ` · pin ${TI.soVN(kq.pinKWh)} kWh` : ''}`), Icon('chevron-down', { co: 20 })));
    anHienGhim();
  }

  // Điểm nhấn chính: tiền điện giảm mỗi tháng + hóa đơn trước → sau.
  function veDau(kq, tenKy, coBan, sau, tiGiam) {
    const nhan = (coBan ? `Tiền điện giảm + bán điện dư, ${tenKy}` : `Tiền điện giảm, ${tenKy}`)
      + (kq.dungPin ? ` · có pin ${TI.soVN(kq.pinKWh)} kWh` : '');
    return TI.el('div', { class: 'tn-dau' },
      TI.el('span', { class: 'tn-dau-nhan' }, nhan),
      TI.el('div', { class: 'tn-so-lon' }, TI.el('b', {}, tienGon(kq.giam)), TI.el('span', {}, '/tháng')),
      TI.el('div', { class: 'tn-dau-ray', role: 'img', 'aria-label': `Hóa đơn giảm khoảng ${pt(tiGiam)}` },
        TI.el('i', { style: `width:${Math.max(2, Math.round(tiGiam * 100))}%` })),
      TI.el('div', { class: 'tn-dau-dong' },
        TI.el('span', {}, 'Hóa đơn ', TI.el('b', {}, tienGon(kq.truoc)), ' → còn khoảng ', TI.el('b', {}, tienGon(sau))),
        TI.el('span', {}, 'Cả năm ', TI.el('b', {}, tienGon(kq.nam)))),
      st.banDu && !kq.coGiaMua ? TI.el('small', { class: 'tn-dau-chu-thich' }, 'Chưa gồm tiền bán điện dư (thiếu giá mua trong Cài đặt).') : null);
  }

  // Chọn phương án: Không pin / Có pin lưu trữ (kèm danh sách mục tiêu).
  function vePhuongAn(kq) {
    const chon = phanDoan('Phương án', [['0', 'Không pin'], ['1', 'Có pin lưu trữ']], st.pin ? '1' : '0',
      (v) => { st.pin = v === '1'; capNhat(); }, 'tn-chon-pin');
    const the = TI.el('div', { class: 'the tn-phuong-an' }, TI.el('h4', {}, 'Phương án'), chon);

    if (!st.pin) {
      if (st.d < 80 && kq.pin) {
        const nho = kq.mucTieu.find(m => m.pa && m.pa.pinKWh > 0);
        the.append(TI.el('div', { class: 'tn-goi-y-pin co-icon' }, Icon('bolt'), TI.el('p', {},
          TI.el('b', {}, 'Nên cân nhắc pin lưu trữ. '),
          `Khách dùng ban ngày ${st.d}%, ban đêm khoảng ${TI.soVN(kq.demNgay, 1)} kWh mỗi ngày. `,
          kq.coPin ? [
            nho ? `Giảm ~${pt(nho.T)} tiền điện chỉ cần pin ${TI.soVN(nho.pa.pinKWh)} kWh; ` : '',
            `tối đa ~${pt(kq.coPin.datTB)} cần pin ${TI.soVN(kq.coPin.pinKWh)} kWh (không pin ~${pt(kq.khongPin.datTB)}).`,
          ] : `Pin tối đa khoảng ${TI.soVN(kq.pin.kWh)} kWh.`)));
      }
      the.append(TI.el('p', { class: 'mo nho' }, 'Nếu khách có thể lắp pin sau, nên chọn biến tần hybrid ngay từ đầu để khỏi thay.'));
      return the;
    }
    if (!kq.pin && !kq.thieuPin.length) {
      the.append(TI.el('p', { class: 'mo' }, 'Khách dùng hết điện ban ngày nên không cần pin lưu trữ.'));
      return the;
    }
    if (!kq.coPin) {
      the.append(TI.el('div', { class: 'the canh-bao' },
        TI.el('div', { class: 'co-icon' }, Icon('alert-triangle'), TI.el('b', {}, 'Chưa tính được phương án có pin')),
        TI.el('ul', { class: 'ds-thieu' }, ...kq.thieuPin.map(t => TI.el('li', {}, t))),
        TI.el('a', { class: 'lien-ket-icon', href: '#/cai-dat' }, 'Điền trong Cài đặt', Icon('arrow-right', { co: 18 }))));
      return the;
    }

    const hang = (nhan, p, khoa) => {
      if (!p) return TI.el('div', { class: 'tn-hang-pa tat' },
        TI.el('div', { class: 'tn-hp-trai' }, TI.el('b', {}, nhan)),
        TI.el('div', { class: 'tn-hp-phai' }, TI.el('span', {}, 'Không đạt được với mái / công suất hiện tại')));
      const dangChon = khoa !== null && st.mucTieu === khoa;
      const noiDung = [
        TI.el('div', { class: 'tn-hp-trai' }, TI.el('b', {}, nhan),
          TI.el('span', { class: 'tn-hp-pin' }, p.pinKWh > 0 ? `Pin ${TI.soVN(p.pinKWh)} kWh` : 'Không cần pin')),
        TI.el('div', { class: 'tn-hp-phai' },
          TI.el('b', {}, tienGon(p.giam), TI.el('em', {}, '/tháng')),
          TI.el('span', {}, `${p.soTam} tấm · ${TI.soVN(p.kWp, 2)} kWp · ${tenBienTan(p.bienTan)}`),
          TI.el('span', {}, `Đạt ~${pt(p.datTB)} cả năm · thấp nhất tháng ${p.thangMinSo} ~${pt(p.thangMin)}`))];
      if (khoa === null) return TI.el('div', { class: 'tn-hang-pa goc' }, ...noiDung);
      return TI.el('button', { type: 'button', class: 'tn-hang-pa' + (dangChon ? ' dang-chon' : ''), 'aria-pressed': String(dangChon),
        onclick: () => { st.mucTieu = khoa; capNhat(); } }, ...noiDung);
    };
    const oKhac = TI.el('input', { type: 'text', inputmode: 'numeric', class: 'tn-o-khac', placeholder: 'vd 65',
      value: SO(st.mucTieuKhac) ? TI.soVN(st.mucTieuKhac) : '', 'aria-label': 'Mục tiêu giảm tiền điện khác (%)',
      onchange: (e) => {
        const n = TI.docSo(e.target.value);
        st.mucTieuKhac = SO(n) && n > 0 && n < 100 ? n : null;
        st.mucTieu = st.mucTieuKhac ? st.mucTieuKhac / 100 : 'max';
        capNhat();
      } });
    const p = kq;  // phương án đang chọn đã gộp vào kq
    the.append(
      TI.el('p', { class: 'mo nho' }, 'Chọn mục tiêu giảm tiền điện. Mỗi mục tiêu dùng pin nhỏ nhất rồi ít tấm nhất, tính đủ 12 tháng.'),
      TI.el('div', { class: 'tn-ds-pa' },
        hang('Không pin', kq.khongPin, null),
        ...kq.mucTieu.map(m => hang(`Giảm ~${pt(m.T)}`, m.pa, m.T)),
        hang('Tối đa', kq.coPin, 'max')),
      TI.el('label', { class: 'tn-dong-khac' }, TI.el('span', {}, 'Mục tiêu khác'), ONhap.hauTo(oKhac, '%')),
      TI.el('p', { class: 'tn-them' }, 'So với không pin, giảm thêm khoảng ', TI.el('b', {}, `${tienGon(p.giam - kq.khongPin.giam)}/tháng`),
        ' (cả năm ', TI.el('b', {}, tienGon(p.nam - kq.khongPin.nam)), ').'));
    return the;
  }

  // Bản kê hệ thống: tấm pin, biến tần, pin lưu trữ, điện tạo ra — kiểu bảng kê trên bản vẽ.
  function veBanKe(kq) {
    const bt = kq.bienTan;
    const dong = (ten, gt, phu) => [TI.el('dt', {}, ten), TI.el('dd', {}, TI.el('b', {}, gt), phu ? TI.el('span', {}, phu) : null)];
    const phuBT = bt.thieu ? 'Điền "Các cỡ biến tần" và "Tỉ lệ DC/AC cao nhất" trong Cài đặt'
      : !bt.kW ? `Cần khoảng ${TI.soVN(bt.can, 1)} kW: lớn hơn cỡ lớn nhất trong danh sách, xem lại khi báo giá`
      : bt.theoTai ? `Theo tải buổi tối ${TI.soVN(st.taiToi)} kW (tấm pin chỉ cần ${TI.soVN(kq.kWp / nc.dcAcMax, 1)} kW)`
      : `DC/AC ${TI.soVN(bt.tiLe, 2)} (tối đa ${TI.soVN(nc.dcAcMax)})`;
    const canhBao = [];
    if (kq.vuotMai) canhBao.push(`Công suất muốn lắp vượt diện tích mái (lắp được khoảng ${TI.soVN(kq.kWpMai, 1)} kWp).`);
    if (bt.vuot1Pha) canhBao.push(`Biến tần ${TI.soVN(bt.kW)} kW lớn hơn mức 1 pha hay dùng (${TI.soVN(nc.bt1Pha)} kW): kiểm tra nhà có cần kéo điện 3 pha không.`);
    if (kq.pinKWh > 0 && !SO(st.taiToi)) canhBao.push('Chưa nhập thiết bị bật cùng lúc buổi tối: biến tần hybrid đang chọn theo tấm pin.');
    const giaiThich = kq.dungPin && kq.mt !== 'max'
      ? `Theo mục tiêu giảm ~${pt(kq.mt)} tiền điện cả năm.`
      : kq.theoMuon ? `Theo công suất muốn lắp ${TI.soVN(st.kWpMuon, 2)} kWp (gợi ý theo hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp).`
      : kq.kWpMai !== null ? `Theo mái ${TI.soVN(kq.kWpMai, 1)} kWp và hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp: lấy số nhỏ hơn.`
      : `Theo hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp, làm tròn theo số tấm.`;
    return TI.el('div', { class: 'the tn-ban-ke' },
      TI.el('h4', {}, 'Hệ thống gợi ý'),
      TI.el('dl', {},
        ...dong('Tấm pin', `${kq.soTam} × ${TI.soVN(kq.tp.congSuatW)} W = ${TI.soVN(kq.kWp, 2)} kWp`, `${kq.tp.model} · mặt tấm ${TI.soVN(kq.dtTam, 0)} m²`),
        ...dong('Biến tần', `${tenBienTan(bt)} · ${st.soPha} pha`, phuBT),
        ...(kq.pinKWh > 0 ? dong('Pin lưu trữ', `${TI.soVN(kq.pinKWh)} kWh`,
          `Dùng được ${TI.soVN(kq.pinKWh * kq.pin.dod, 1)} kWh mỗi đêm (cần ${TI.soVN(kq.demNgay, 1)} kWh)`) : []),
        ...dong('Điện tạo ra', `${TI.soVN(kq.SLnam, 0)} kWh/năm`,
          st.banDu ? `Dư ${TI.soVN(kq.duNam, 0)} kWh bán lên lưới` : `Nhà dùng ${TI.soVN(kq.SLnam - kq.duNam, 0)} kWh`)),
      TI.el('p', { class: 'mo nho' }, giaiThich),
      canhBao.length ? TI.el('ul', { class: 'tn-canh-bao' }, ...canhBao.map(c => TI.el('li', {}, Icon('alert-triangle', { co: 16 }), TI.el('span', {}, c)))) : null);
  }

  function veCachTinh(kq) {
    const li = (t) => TI.el('li', {}, t);
    const p = kq.pin;
    return TI.el('details', { class: 'tn-cach-tinh' }, TI.el('summary', {}, 'Cách tính và giả định'),
      TI.el('ul', { class: 'ds-thieu' },
        li('Tiền điện tính theo bảng bậc thang EVN trong Cài đặt; tiêu thụ mỗi tháng bằng số trên hóa đơn. Điện mặt trời cắt vào bậc giá cao nhất trước.'),
        li(`Sản lượng tháng = kWp × giờ nắng đỉnh của tháng × PR ${TI.soVN(nc.PR)} × số ngày × hệ số hướng ${kq.tenHuong} ${TI.soVN(kq.hs * 100)}% (giống báo giá).`),
        li(st.banDu ? 'Điện mặt trời thay phần dùng ban ngày; phần dư bán lên lưới theo giá mua trong Cài đặt.'
          : 'Không pin: điện mặt trời chỉ thay phần dùng ban ngày; phần dư không tính tiền (chống phát ngược).'),
        kq.coPin ? li(`Có pin: pin chỉ sạc từ điện dư ban ngày (hiệu suất sạc–xả ${TI.soVN(nc.hieuSuatPin)}%), mỗi đêm xả tối đa phần dung lượng được dùng và không quá điện dùng ban đêm.`) : null,
        p ? li(`Pin "Tối đa": cần ${TI.soVN(p.can, 1)} kWh = ${TI.soVN(kq.demNgay, 1)} kWh ban đêm${p.coDoD ? ` ÷ độ xả sâu ${TI.soVN(p.dod * 100)}%` : ' (chưa có độ xả sâu, coi như 100%)'}, ${p.buoc === 1 ? 'làm tròn lên số nguyên' : `làm tròn lên bội số ${TI.soVN(p.buoc)} kWh`}${p.min ? `, không nhỏ hơn ${TI.soVN(p.min)} kWh` : ''}.`) : null,
        kq.coPin ? li(`Mục tiêu tính trên tiền điện cả năm; tháng ít nắng giảm ít hơn. Khi dò, số tấm không vượt ${kq.nTran} tấm (theo mái và mức nhà dùng hết).`) : null,
        li(`Biến tần: cỡ nhỏ nhất trong danh sách cỡ hay bán mà tỉ lệ DC/AC không quá ${SO(nc.dcAcMax) ? TI.soVN(nc.dcAcMax) : 'mức trong Cài đặt'}; có pin thì là hybrid và không nhỏ hơn thiết bị bật cùng lúc buổi tối.`),
        li('% điện dùng ban ngày là ước đoán và ảnh hưởng kết quả nhiều nhất: hỏi kỹ khách ban ngày nhà có người không.'),
        li('Màn này chỉ ước tính tiền điện giảm; chi phí, hoàn vốn và chọn mẫu thiết bị xem ở báo giá.')));
  }

  // Biểu đồ cột 12 tháng (SVG), tháng đang chọn tô đậm. Màu lấy từ CSS (.tn-bd-*).
  function bieuDo(kq) {
    const hep = window.matchMedia('(max-width: 639px)').matches, W = hep ? 360 : 640, H = hep ? 200 : 220, coChu = hep ? 10 : 11,
      trai = 8, duoi = 26, tren = 22, max = Math.max(...kq.SL) * 1.1 || 1, rong = (W - trai * 2) / 12;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'tn-bieu-do'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Điện tạo ra từng tháng: ' + kq.SL.map((v, i) => `tháng ${i + 1} ${TI.soVN(v, 0)} kWh`).join(', '));
    let s = '';
    kq.SL.forEach((v, i) => {
      const h = (H - tren - duoi) * v / max, x = trai + i * rong + rong * 0.16, y = H - duoi - h, w = rong * 0.68;
      const dam = st.thang === i + 1, mo = st.thang && !dam;
      s += `<rect class="tn-bd-cot${dam ? ' dam' : ''}${mo ? ' mo' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
      s += `<text class="tn-bd-so" x="${x + w / 2}" y="${y - 6}" text-anchor="middle" font-size="${coChu}">${TI.soVN(v, 0)}</text>`;
      s += `<text class="tn-bd-thang${dam ? ' dam' : ''}" x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="12">T${i + 1}</text>`;
    });
    svg.innerHTML = s;
    return svg;
  }

  async function taoHoSo(kq) {
    const hs = HoSo.taoMoi();
    hs.dien.hoaDon = [{ thang: '', kWh: Math.round(kq.C), tien: st.cheDo === 'tien' && SO(st.tien) ? st.tien : Math.round(kq.truoc) }];
    hs.dien.phanTramDungBanNgay = st.d;
    hs.dien.banDienDu = st.banDu ? 'Có' : 'Không';
    hs.dien.loaiDien = st.soPha === '3' ? '3-pha' : '1-pha';
    const bt = kq.bienTan;
    hs.ghiChu = `Tính nhanh: ${kq.theoMuon ? 'muốn lắp' : 'gợi ý'} ${TI.soVN(kq.kWp, 2)} kWp (${kq.soTam} tấm ${kq.tp.model}), mái hướng ${kq.tenHuong}`
      + `, biến tần ${tenBienTan(bt).toLowerCase()} ${st.soPha} pha`
      + (kq.pinKWh > 0 ? `, pin lưu trữ khoảng ${TI.soVN(kq.pinKWh)} kWh${kq.mt !== 'max' ? ` (mục tiêu giảm ~${pt(kq.mt)} tiền điện)` : ''}` : '')
      + (SO(st.taiToi) ? `, thiết bị bật cùng lúc buổi tối khoảng ${TI.soVN(st.taiToi)} kW` : '')
      + (SO(st.dienTich) ? `, mái lắp được khoảng ${TI.soVN(st.dienTich, 0)} m²` : '') + '.';
    await HoSo.luu(hs);
    TI.thongBao('Đã tạo hồ sơ mới từ số liệu tính nhanh');
    location.hash = `#/ho-so/${hs.id}/khao-sat`;
  }

  return { ve, _tinh: () => tinh(), _st: st };
})();
