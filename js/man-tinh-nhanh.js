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
  const st = { cheDo: 'tien', tien: null, kWh: null, thang: 0, dienTich: null, d: 50, banDu: false, model: null, huong: 'nam', kWpMuon: null, pin: false, mucTieu: 'max', mucTieuKhac: null };

  // Hướng mái → hệ số sản lượng so với mái hướng Nam (số lấy trong Cài đặt → Cấu hình).
  const HUONG = [
    { ma: 'nam', ten: 'Nam', cauHinh: 'heSoHuongNamPhanTram' },
    { ma: 'dn-tn', ten: 'Đông Nam / Tây Nam', cauHinh: 'heSoHuongDongNamTayNamPhanTram' },
    { ma: 'dong-tay', ten: 'Đông / Tây', cauHinh: 'heSoHuongDongTayPhanTram' },
    { ma: 'bac', ten: 'Bắc', cauHinh: 'heSoHuongBacPhanTram', phu: 'không khuyến khích' },
  ];

  let nc = null, vungKQ = null, oGhim = null, congTacPin = null;

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
      doXaSau: await DuLieu.giaTri('cau-hinh', 'doXaSauPinPhanTram'),
      buocPin: await DuLieu.giaTri('cau-hinh', 'buocLamTronPinKWh'),
      hieuSuatPin: await DuLieu.giaTri('cau-hinh', 'hieuSuatPinLuuTruPhanTram'),
      huong: Object.fromEntries(await Promise.all(HUONG.map(async h => [h.ma, await DuLieu.giaTri('cau-hinh', h.cauHinh)]))),
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
        soTam, kWp, SL, thang, nam, vuotMai: theoMuon && soTam > toiDaMai,
        giam: chon ? chon.giam : nam / 12,
        giamHD: chon ? chon.giamHD : giamHDTB,
        datTB: giamHDTB / truoc,                                       // tỉ lệ tiền điện giảm cả năm
        thangMin: Math.min(...thang.map(t => t.giamHD)) / truoc,       // tháng giảm ít nhất
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
    function phuongAn(tiLeBu, pinDungDuoc, hsPin) {
      const { n, kWpHD } = soTamTheo(tiLeBu);
      return { ...theoSoTam(n, pinDungDuoc, hsPin), kWpHD };
    }

    const khongPin = phuongAn(st.banDu ? 1 : d, 0, 0);

    // Pin "tối đa" theo tính toán (không lấy từ danh mục): đủ cho điện ban đêm 1 ngày, chia độ xả sâu, làm tròn lên.
    let pin = null, thieuPin = [];
    if (d < 1 && demNgay > 0) {
      if (!SO(nc.hieuSuatPin) || nc.hieuSuatPin <= 0) thieuPin.push('Hiệu suất sạc–xả pin lưu trữ (Cài đặt → Cấu hình)');
      const coDoD = SO(nc.doXaSau) && nc.doXaSau > 0 && nc.doXaSau <= 100;
      const dod = coDoD ? nc.doXaSau / 100 : 1;
      const buoc = SO(nc.buocPin) && nc.buocPin > 0 ? nc.buocPin : 1;
      const can = demNgay / dod;
      const kWh = Math.ceil(can / buoc - 1e-9) * buoc;
      pin = { can, kWh, dungDuoc: kWh * dod, coDoD, dod, buoc };
    }
    let coPin = null, mucTieu = [], nTran = null;
    if (pin && !thieuPin.length) {
      const hsPin = nc.hieuSuatPin / 100;
      const tiLeMax = Math.max(st.banDu ? 1 : 0, d + (1 - d) / hsPin);
      coPin = { ...phuongAn(tiLeMax, pin.dungDuoc, hsPin), pinKWh: pin.kWh, mt: 'max' };
      coPin.thangThieu = coPin.thang.map((t, i) => t.pinDu ? null : i + 1).filter(Boolean);

      // Trần số tấm khi dò: không vượt mái và không tạo ra nhiều hơn mức nhà dùng hết (kể cả phần qua pin).
      nTran = theoMuon ? soTamTheo(tiLeMax).n
        : Math.min(toiDaMai, Math.max(coPin.soTam, Math.ceil(C * tiLeMax / (30 * pshTB * nc.PR * hs) * 1000 / W)));
      // Dò pin nhỏ nhất (0, 1, 2… kWh), mỗi mức pin tìm số tấm ít nhất đạt mục tiêu (tiền giảm tăng dần theo số tấm).
      const timToiUu = (T) => {
        for (let B = 0; B <= pin.kWh; B += pin.buoc) {
          const dat = (n) => theoSoTam(n, B * pin.dod, hsPin).datTB >= T - 1e-9;
          if (theoMuon) { if (dat(nTran)) return { ...theoSoTam(nTran, B * pin.dod, hsPin), pinKWh: B, mt: T }; continue; }
          if (!dat(nTran)) continue;
          let lo = 1, hi = nTran;
          while (lo < hi) { const g = (lo + hi) >> 1; if (dat(g)) hi = g; else lo = g + 1; }
          return { ...theoSoTam(lo, B * pin.dod, hsPin), pinKWh: B, mt: T };
        }
        return null;
      };
      // Mục tiêu gợi ý: các mốc chẵn 10% cao hơn mức không pin, tối đa 3 mốc, thấp hơn mức "tối đa".
      const goc = khongPin.datTB, tran = coPin.datTB;
      const moc = [];
      for (let t = Math.floor(goc * 10 + 1e-9) / 10 + 0.1; t < tran - 0.005 && moc.length < 3; t += 0.1) moc.push(Math.round(t * 100) / 100);
      if (SO(st.mucTieuKhac) && st.mucTieuKhac > 0 && !moc.includes(st.mucTieuKhac / 100)) moc.push(st.mucTieuKhac / 100);
      moc.sort((a, b) => a - b);
      mucTieu = moc.map(T => ({ T, pa: timToiUu(T) }));
    }
    let pa = khongPin;
    if (st.pin && coPin) {
      const chon = st.mucTieu === 'max' ? null : mucTieu.find(m => Math.abs(m.T - st.mucTieu) < 1e-6);
      if (chon && chon.pa) pa = chon.pa; else { pa = coPin; st.mucTieu = 'max'; }
    }
    const dungPin = !!(st.pin && coPin);
    return {
      thieu: [], C, d, tp, kWpMai, hs, tenHuong, theoMuon, truoc, coGiaMua, demNgay,
      khongPin, coPin, pin, thieuPin, dungPin, mucTieu, nTran, ...pa, kWpHD: pa.kWpHD ?? khongPin.kWpHD,
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
    const datD = (n) => {
      st.d = n; nhanD.textContent = `${n}%`; keoD.value = n;
      chonD.querySelectorAll('button').forEach(b => { const on = Number(b.dataset.d) === n; b.classList.toggle('dang-chon', on); b.setAttribute('aria-pressed', String(on)); });
      capNhat();
    };
    const keoD = thanhKeo(10, 100, 5, st.d, datD, 'Tỉ lệ điện dùng ban ngày');
    const chonD = TI.el('div', { class: 'phan-doan tn-chon-d', role: 'group', 'aria-label': 'Chọn nhanh tỉ lệ dùng ban ngày' },
      ...[100, 70, 50].map(n => TI.el('button', { type: 'button', 'data-d': n, class: st.d === n ? 'dang-chon' : '', 'aria-pressed': String(st.d === n), onclick: () => datD(n) }, `${n}%`)));
    const chonHuong = TI.el('select', { onchange: (e) => { st.huong = e.target.value; capNhat(); } },
      ...HUONG.map(h => { const v = nc.huong[h.ma];
        return TI.el('option', { value: h.ma, selected: st.huong === h.ma }, `${h.ten}${SO(v) ? ` (≈ ${TI.soVN(v)}%${h.phu ? `, ${h.phu}` : ''})` : ' (chưa có hệ số)'}`); }));
    const oMuon = TI.oSo(st.kWpMuon, (n) => { st.kWpMuon = n; capNhat(); }, { placeholder: 'Ví dụ 5', 'aria-label': 'Công suất muốn lắp' });
    const congTac = TI.el('input', { type: 'checkbox', role: 'switch', class: 'tn-cong-tac', checked: st.banDu,
      onchange: (e) => { st.banDu = e.target.checked; capNhat(); } });
    congTacPin = TI.el('input', { type: 'checkbox', role: 'switch', class: 'tn-cong-tac', checked: st.pin,
      onchange: (e) => { st.pin = e.target.checked; capNhat(); } });
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
      TI.el('div', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Điện dùng ban ngày khoảng ', nhanD), chonD, keoD,
        TI.el('small', { class: 'ghi-chu' }, '100%: điện mặt trời được dùng hết trong nhà, tối đa bằng điện dùng cả tháng. Nhà vắng người ban ngày chọn 70% hoặc 50% (hoặc kéo chỉnh): phần còn lại thành điện dư.')),
      TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Hướng mái'), chonHuong,
        TI.el('small', { class: 'ghi-chu' }, 'Sản lượng so với mái hướng Nam, theo PVGIS cho Thanh Hóa, mái nghiêng khoảng 15°. Hệ số sửa được trong Cài đặt → Cấu hình.')),
      TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Công suất muốn lắp ', TI.el('span', { class: 'mo' }, '(bỏ trống = theo gợi ý)')),
        TI.el('div', { class: 'tn-o-ngan' }, ONhap.hauTo(oMuon, 'kWp'))),
      chonTam,
      TI.el('label', { class: 'tn-dong-cong-tac' }, congTac, TI.el('span', {}, 'Đăng ký bán điện dư lên lưới')),
      TI.el('label', { class: 'tn-dong-cong-tac' }, congTacPin, TI.el('span', {}, 'Dùng pin lưu trữ ', TI.el('span', { class: 'mo' }, '(cất điện dư ban ngày để dùng ban đêm)'))));
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
    const nhanLon = (coBan ? `Tiền điện giảm + tiền bán điện dư (${tenKy})` : `Tiền điện giảm ${tenKy}`) + (kq.dungPin ? `, có pin ${TI.soVN(kq.pinKWh)} kWh` : '');
    const sau = Math.max(0, kq.truoc - kq.giamHD);
    const phanTram = kq.truoc > 0 ? sau / kq.truoc : 0;
    const thanh = (nhan, tien, ti, lop) => TI.el('div', { class: 'tn-thanh' }, TI.el('span', {}, nhan),
      TI.el('div', { class: 'tn-ray' }, TI.el('i', { class: lop, style: `width:${Math.max(2, Math.round(ti * 100))}%` })),
      TI.el('b', {}, tienGon(tien)));
    const o = (nhan, gt, phu) => TI.el('div', { class: 'kt-o' }, TI.el('small', {}, nhan), TI.el('b', {}, gt), phu ? TI.el('span', {}, phu) : null);
    const giaiThich = kq.dungPin && kq.mt !== 'max'
      ? `Theo mục tiêu giảm ~${Math.round(kq.mt * 100)}% tiền điện cả năm: pin nhỏ nhất rồi ít tấm nhất đạt mục tiêu.`
      : kq.theoMuon
      ? `Theo công suất muốn lắp ${TI.soVN(st.kWpMuon, 2)} kWp, làm tròn theo số tấm (gợi ý theo hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp).`
      : kq.kWpMai !== null
      ? `Theo diện tích mái ${TI.soVN(kq.kWpMai, 1)} kWp · theo hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp: lấy số nhỏ hơn, làm tròn theo số tấm.`
      : `Theo hóa đơn ${TI.soVN(kq.kWpHD, 1)} kWp, làm tròn theo số tấm${SO(nc.m2kWp) ? ' (chưa nhập diện tích mái)' : ''}.`;

    vungKQ.replaceChildren(
      TI.el('div', { class: 'tn-dau' },
        TI.el('span', { class: 'tn-dau-nhan' }, nhanLon),
        TI.el('div', { class: 'tn-so-lon' }, TI.el('b', {}, tienGon(kq.giam)), TI.el('span', {}, '/tháng')),
        TI.el('span', { class: 'tn-dau-phu' }, 'Cả năm khoảng ', TI.el('b', {}, tienGon(kq.nam)),
          st.banDu ? (kq.coGiaMua ? ' (gồm tiền bán điện dư)' : ' (chưa gồm tiền bán điện dư: thiếu giá mua trong Cài đặt)') : '')),
      vePin(kq, tenKy),
      TI.el('div', { class: 'the tn-so-sanh' },
        thanh(st.thang ? `Hóa đơn tháng ${st.thang} hiện tại` : 'Hóa đơn hiện tại', kq.truoc, 1, 'truoc'),
        thanh(`Sau khi lắp (${tenKy})`, sau, phanTram, 'sau')),
      TI.el('div', { class: 'kt-tom-tat' },
        o('Hệ thống gợi ý', `${TI.soVN(kq.kWp, 2)} kWp`),
        o(`Số tấm pin ${TI.soVN(kq.tp.congSuatW)} W`, `${kq.soTam} tấm`, kq.tp.model),
        o('Diện tích tấm pin', `${TI.soVN(kq.dtTam, 0)} m²`, 'chưa gồm lối đi'),
        o('Điện tạo ra mỗi năm', `${TI.soVN(kq.SLnam, 0)} kWh`, st.banDu ? `dư ${TI.soVN(kq.duNam, 0)} kWh bán lên lưới` : `dùng ${TI.soVN(kq.SLnam - kq.duNam, 0)} kWh`)),
      TI.el('p', { class: 'mo nho' }, giaiThich),
      kq.vuotMai ? TI.el('div', { class: 'the canh-bao co-icon' }, Icon('alert-triangle'),
        TI.el('span', {}, `Công suất muốn lắp vượt diện tích mái đã nhập (lắp được khoảng ${TI.soVN(kq.kWpMai, 1)} kWp). Kiểm tra lại mái hoặc giảm công suất.`)) : null,
      TI.el('div', { class: 'the' }, TI.el('h4', {}, 'Điện tạo ra từng tháng (kWh)'), bieuDo(kq)),
      TI.el('details', { class: 'tn-cach-tinh' }, TI.el('summary', {}, 'Cách tính và giả định'),
        TI.el('ul', { class: 'ds-thieu' },
          TI.el('li', {}, 'Tiền điện tính theo bảng bậc thang EVN trong Cài đặt; tiêu thụ mỗi tháng bằng số trên hóa đơn.'),
          TI.el('li', {}, `kWp theo hóa đơn = kWh/tháng × ${st.banDu ? '100%' : `${st.d}% (điện dùng ban ngày)`} ÷ (30 × giờ nắng đỉnh TB năm × PR ${TI.soVN(nc.PR)} × hệ số hướng mái).`),
          TI.el('li', {}, `Sản lượng tháng = kWp × giờ nắng đỉnh của tháng × PR × số ngày (giống báo giá) × hệ số hướng mái ${kq.tenHuong} ${TI.soVN(kq.hs * 100)}%.`),
          TI.el('li', {}, st.banDu ? 'Điện mặt trời thay phần dùng ban ngày; phần dư bán lên lưới theo giá mua trong Cài đặt.' : 'Điện mặt trời chỉ thay phần dùng ban ngày; phần dư không tính tiền (chống phát ngược).'),
          kq.coPin ? TI.el('li', {}, `Có pin: tấm pin tính đủ cho cả ban đêm (bù hao sạc–xả, hiệu suất ${TI.soVN(nc.hieuSuatPin)}%). Pin chỉ sạc từ điện dư ban ngày, mỗi ngày xả tối đa bằng phần dung lượng được dùng (theo độ xả sâu) và không quá điện dùng ban đêm (giống báo giá).`) : null,
          TI.el('li', {}, 'Màn này chỉ ước tính tiền điện giảm so với khi chưa lắp; chi phí và thời gian hoàn vốn xem ở phần báo giá.'),
          TI.el('li', {}, 'Đây là ước tính nhanh; số chính xác xem ở báo giá sau khi khảo sát, vẽ mái và xếp pin.'))),
      TI.el('div', { class: 'hang tn-hanh-dong' },
        TI.el('button', { type: 'button', class: 'nut chinh', onclick: () => taoHoSo(kq) }, ...Icon.chu('plus', 'Tạo hồ sơ khách từ số liệu này'))));

    oGhim.replaceChildren(TI.el('div', {}, TI.el('small', {}, coBan ? `Giảm + bán dư (${tenKy})` : `Giảm ${tenKy}`), TI.el('b', {}, `${tienGon(kq.giam)}/tháng`)),
      TI.el('span', {}, `${TI.soVN(kq.kWp, 2)} kWp · ${kq.soTam} tấm${kq.dungPin ? ` · pin ${TI.soVN(kq.pinKWh)} kWh` : ''}`));
  }

  // Khối pin lưu trữ: gợi ý (khi dùng ban ngày dưới 80%) hoặc so sánh 2 phương án (khi bật pin).
  function vePin(kq, tenKy) {
    const tenPin = kq.pin ? `khoảng ${TI.soVN(kq.pin.kWh)} kWh` : '';
    const cachTinhPin = kq.pin ? `Cần ${TI.soVN(kq.pin.can, 1)} kWh = ${TI.soVN(kq.demNgay, 1)} kWh ban đêm${kq.pin.coDoD ? ` ÷ độ xả sâu ${TI.soVN(kq.pin.dod * 100)}%` : ' (chưa có độ xả sâu trong Cài đặt, coi như dùng hết 100%)'}, ${kq.pin.buoc === 1 ? 'làm tròn lên số nguyên' : `làm tròn lên bội số ${TI.soVN(kq.pin.buoc)} kWh`}.` : '';
    const batPin = () => { st.pin = true; if (congTacPin) congTacPin.checked = true; capNhat(); };
    const thieuPin = () => TI.el('div', { class: 'the canh-bao' },
      TI.el('div', { class: 'co-icon' }, Icon('alert-triangle'), TI.el('b', {}, 'Chưa tính được phương án có pin')),
      TI.el('ul', { class: 'ds-thieu' }, ...kq.thieuPin.map(t => TI.el('li', {}, t))),
      TI.el('a', { class: 'lien-ket-icon', href: '#/cai-dat' }, 'Điền trong Cài đặt', Icon('arrow-right', { co: 18 })));

    if (!st.pin) {
      if (!(st.d < 80) || !kq.pin) return null;
      return TI.el('div', { class: 'the tn-goi-y-pin' },
        TI.el('div', { class: 'co-icon' }, Icon('bolt'), TI.el('div', {},
          TI.el('b', {}, 'Nên cân nhắc pin lưu trữ'),
          TI.el('p', {}, `Khách dùng ban ngày ${st.d}%, ban đêm khoảng ${TI.soVN(kq.demNgay, 1)} kWh mỗi ngày. `,
            (() => {
              if (!kq.coPin) return `Pin tối đa ${tenPin}.`;
              const nho = kq.mucTieu.find(m => m.pa && m.pa.pinKWh > 0);
              return (nho ? `Giảm ~${Math.round(nho.T * 100)}% tiền điện chỉ cần pin ${TI.soVN(nho.pa.pinKWh)} kWh; ` : '')
                + `tối đa ~${Math.round(kq.coPin.datTB * 100)}% cần pin ${TI.soVN(kq.coPin.pinKWh)} kWh (hiện không pin ~${Math.round(kq.khongPin.datTB * 100)}%).`;
            })()))),
        TI.el('button', { type: 'button', class: 'nut nho', onclick: batPin }, 'Xem phương án có pin'));
    }
    if (!kq.pin && !kq.thieuPin.length) return TI.el('div', { class: 'the trong' },
      TI.el('p', { class: 'mo' }, 'Khách dùng hết điện ban ngày nên không cần pin lưu trữ.'));
    if (!kq.coPin) return thieuPin();

    const pt = (x) => `${Math.round(x * 100)}%`;
    const pa = kq.dungPin ? kq : kq.coPin;   // phương án đang chọn (kq đã gộp phương án đang chọn)
    const hang = (nhan, p, khoa) => {
      if (!p) return TI.el('div', { class: 'tn-hang-pa tat' },
        TI.el('div', { class: 'tn-hp-trai' }, TI.el('b', {}, nhan)),
        TI.el('div', { class: 'tn-hp-phai' }, TI.el('span', {}, 'Không đạt được với mái / công suất hiện tại')));
      const chon = khoa !== null && st.mucTieu === khoa;
      const noiDung = [
        TI.el('div', { class: 'tn-hp-trai' }, TI.el('b', {}, nhan),
          TI.el('span', { class: 'tn-hp-pin' }, p.pinKWh > 0 ? `Pin ${TI.soVN(p.pinKWh)} kWh` : 'Không cần pin')),
        TI.el('div', { class: 'tn-hp-phai' },
          TI.el('b', {}, tienGon(p.giam), TI.el('em', {}, '/tháng')),
          TI.el('span', {}, `${TI.soVN(p.kWp, 2)} kWp · ${p.soTam} tấm · đạt ~${pt(p.datTB)} cả năm · tháng ${p.thangMinSo} ~${pt(p.thangMin)}`))];
      if (khoa === null) return TI.el('div', { class: 'tn-hang-pa goc' }, ...noiDung);
      return TI.el('button', { type: 'button', class: 'tn-hang-pa' + (chon ? ' dang-chon' : ''), 'aria-pressed': String(chon),
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
    const thangThieu = pa.pinKWh > 0 ? pa.thang.map((t, i) => t.pinDu ? null : i + 1).filter(Boolean) : [];
    return TI.el('div', { class: 'the tn-2-pa' },
      TI.el('h4', {}, 'Chọn mục tiêu giảm tiền điện'),
      TI.el('p', { class: 'mo nho' }, 'Mỗi mục tiêu: tìm pin nhỏ nhất, rồi ít tấm nhất, tính đủ 12 tháng theo bậc thang. Bấm một dòng để xem chi tiết bên dưới.'),
      TI.el('div', { class: 'tn-ds-pa' },
        hang('Không pin', kq.khongPin, null),
        ...kq.mucTieu.map(m => hang(`Giảm ~${pt(m.T)}`, m.pa, m.T)),
        hang('Tối đa', kq.coPin, 'max')),
      TI.el('label', { class: 'tn-dong-khac' }, TI.el('span', {}, 'Mục tiêu khác'), ONhap.hauTo(oKhac, '%')),
      TI.el('p', { class: 'tn-them' }, 'Phương án đang chọn giảm thêm khoảng ', TI.el('b', {}, `${tienGon(pa.giam - kq.khongPin.giam)}/tháng`),
        ' so với không pin (cả năm ', TI.el('b', {}, tienGon(pa.nam - kq.khongPin.nam)), ').'),
      pa.pinKWh > 0 ? TI.el('p', { class: 'mo nho' }, pa.mt !== 'max'
        ? `Pin ${TI.soVN(pa.pinKWh)} kWh gánh một phần điện ban đêm (khoảng ${TI.soVN(pa.pinKWh * kq.pin.dod, 1)} / ${TI.soVN(kq.demNgay, 1)} kWh mỗi đêm); phần còn lại vẫn mua điện lưới ở bậc giá thấp.`
        : thangThieu.length ? `Tháng ${thangThieu.join(', ')}: pin không đủ đầy cho cả đêm.` : 'Pin đủ điện cho ban đêm quanh năm.') : null,
      TI.el('p', { class: 'mo nho' }, `"Tối đa": ${cachTinhPin}`),
      TI.el('p', { class: 'mo nho' }, `Mục tiêu tính trên tiền điện cả năm; tháng ít nắng giảm ít hơn. Số tấm khi dò không vượt ${kq.nTran} tấm (theo mái và mức nhà dùng hết). % điện dùng ban ngày là ước đoán và ảnh hưởng kết quả nhiều nhất: hỏi kỹ khách ban ngày nhà có người không.`));
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
    hs.ghiChu = `Tính nhanh: ${kq.theoMuon ? 'muốn lắp' : 'gợi ý'} ${TI.soVN(kq.kWp, 2)} kWp (${kq.soTam} tấm ${kq.tp.model}), mái hướng ${kq.tenHuong}${kq.dungPin ? `, có pin lưu trữ khoảng ${TI.soVN(kq.pinKWh)} kWh${kq.mt !== 'max' ? ` (mục tiêu giảm ~${Math.round(kq.mt * 100)}% tiền điện)` : ''}` : ''}${SO(st.dienTich) ? `, mái lắp được khoảng ${TI.soVN(st.dienTich, 0)} m²` : ''}.`;
    await HoSo.luu(hs);
    TI.thongBao('Đã tạo hồ sơ mới từ số liệu tính nhanh');
    location.hash = `#/ho-so/${hs.id}/khao-sat`;
  }

  return { ve, _tinh: () => tinh(), _st: st };
})();
