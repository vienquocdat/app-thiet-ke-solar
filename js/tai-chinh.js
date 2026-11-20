// Giai đoạn 6 – phần tính tài chính (không có giao diện). Công thức theo mục [C] của file yêu cầu:
//   Sản lượng tháng (kWh) = kWp × giờ nắng đỉnh của tháng × PR × số ngày trong tháng
//   Tiền tiết kiệm = tiền điện trước − tiền điện sau, cả hai tính theo bảng bậc thang EVN
//   Hoàn vốn: tính theo năm, sản lượng giảm theo hệ số suy giảm hằng năm (0,5%/năm trong Cài đặt)
// Giả định (ghi rõ trên báo giá): tiêu thụ mỗi tháng = trung bình các hóa đơn đã nhập; điện mặt trời chỉ
// thay phần điện dùng ban ngày (cộng phần pin lưu trữ cấp ban đêm nếu có); điện dư chưa tính thành tiền.
const TaiChinh = (() => {
  const SO = (x) => typeof x === 'number' && isFinite(x);
  const NGAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Bảng bậc thang: mỗi bậc chiếm khoảng (đến của bậc trước, đến của bậc này]; bậc cuối "đến" = 0 → không giới hạn.
  function bangBacThang(evn) {
    const thieu = [];
    const bac = evn.bang.dong.map((d, i, ds) => {
      const cuoi = i === ds.length - 1;
      if (!SO(d.donGia)) thieu.push(`Đơn giá bậc ${d.bac ?? i + 1}`);
      if (!cuoi && !(SO(d.denKWh) && d.denKWh > 0)) thieu.push(`"Đến kWh" của bậc ${d.bac ?? i + 1}`);
      return { den: SO(d.denKWh) && d.denKWh > 0 ? d.denKWh : Infinity, gia: d.donGia };
    });
    if (bac.length && bac[bac.length - 1].den !== Infinity) thieu.push('Bậc cuối phải để "Đến kWh" = 0 (không giới hạn)');
    const tr = (ma) => (evn.truong.find(t => t.ma === ma) || {}).giaTri;
    let vat = 0;
    const gom = tr('daGomVAT');
    if (gom === 'Chưa gồm VAT') { if (SO(tr('thueVATPhanTram'))) vat = tr('thueVATPhanTram') / 100; else thieu.push('Thuế VAT tiền điện'); }
    else if (gom !== 'Đã gồm VAT') thieu.push('Giá điện đã gồm VAT chưa');
    return { bac, vat, thieu, nguon: tr('nguon'), ngay: tr('ngayApDung') };
  }

  function tienDien(kWh, bt) {
    let tien = 0, duoi = 0;
    for (const b of bt.bac) {
      const luong = Math.max(0, Math.min(kWh, b.den) - duoi);
      tien += luong * b.gia;
      duoi = b.den;
      if (kWh <= b.den) break;
    }
    return tien * (1 + bt.vat);
  }

  const sanLuongThang = (kWp, nang, PR) => nang.map((h, i) => kWp * h * PR * NGAY[i]);

  // Điện mặt trời tự dùng trong 1 tháng (kWh).
  function tuDung(SL, C, d, pinKWh, hieuSuat, ngay) {
    const banNgay = Math.min(SL, C * d);
    const du = SL - banNgay;
    const quaPin = pinKWh > 0 ? Math.min(du * hieuSuat, C * (1 - d), pinKWh * ngay) : 0;
    return banNgay + quaPin;
  }

  // Bảng giá chi tiết của 1 phương án. nc: thông tin chung (giá thiết bị, đơn giá...). Thiếu giá → thanhTien null.
  function chiPhi(pa, nc) {
    const dong = [], thieu = [];
    const them = (ten, soLuong, donVi, donGia, ghiChu) => {
      const tt = SO(donGia) ? soLuong * donGia : null;
      if (!SO(donGia)) thieu.push(ten);
      dong.push({ ten, soLuong, donVi, donGia: SO(donGia) ? donGia : null, thanhTien: tt, ghiChu });
    };
    const tp = nc.tp, kWp = pa.kWp;
    them(`Tấm pin ${tp ? tp.model : CAN_DIEN}`, pa.soTam, 'tấm', tp && tp.gia);
    const inv = nc.dsINV.find(d => d.model === pa.inverter);
    them(`Inverter ${inv ? inv.model : CAN_DIEN}`, pa.soLuong || 1, 'cái', inv && inv.gia);
    if (pa.pin && pa.pin.model) {
      const p = nc.dsPin.find(d => d.model === pa.pin.model);
      them(`Pin lưu trữ ${pa.pin.model}`, pa.pin.soLuong || 1, 'bộ', p && p.gia);
    }
    const dg = nc.donGia;
    if (pa.kWpApMai > 0) them('Khung áp mái tôn', round(pa.kWpApMai), 'kWp', dg.khungApMaiTon);
    for (const k of pa.khungNang) {
      const dongGia = SO(k.caoM) ? dg.khungNang.find(r => SO(r.caoTuM) && SO(r.caoDenM) && k.caoM >= r.caoTuM && k.caoM <= r.caoDenM) : null;
      them(`Khung nâng ${k.ten}${SO(k.caoM) ? ` (cao ${TI.soVN(k.caoM)} m)` : ''}`, round(k.kWp), 'kWp', dongGia && dongGia.donGia);
    }
    them('Cáp, tủ điện, thiết bị bảo vệ, tiếp địa', round(kWp), 'kWp', dg.capTuDienBaoVe);
    them('Nhân công lắp đặt', round(kWp), 'kWp', dg.nhanCong);
    if (nc.banDienDu !== 'Có') them('Thiết bị chống phát ngược', 1, 'bộ', dg.chongPhatNguoc);
    const tong = thieu.length ? null : dong.reduce((s, d) => s + d.thanhTien, 0);
    return { dong, tong, thieu };
  }
  const round = (x) => Math.round(x * 1000) / 1000;

  // Phân tích đầy đủ 1 phương án.
  function phanTich(pa, nc) {
    const kq = { thieu: [] };
    const tp = nc.tp;
    pa.soTam = Object.values(pa.soTamMang).reduce((s, n) => s + n, 0);
    pa.kWp = tp && SO(tp.congSuatW) ? pa.soTam * tp.congSuatW / 1000 : null;
    if (!SO(pa.kWp)) kq.thieu.push('Công suất tấm pin');
    pa.kWpApMai = 0; pa.khungNang = [];
    for (const m of nc.mang) {
      const kw = SO(pa.kWp) ? (pa.soTamMang[m.id] || 0) * tp.congSuatW / 1000 : 0;
      if (m.kieuLap === 'khung-nang') pa.khungNang.push({ ten: m.ten, caoM: m.caoKhungM, kWp: kw });
      else pa.kWpApMai += kw;
    }
    pa.khungNang = pa.khungNang.filter(k => k.kWp > 0);
    kq.chiPhi = chiPhi(pa, nc);
    if (kq.chiPhi.thieu.length) kq.thieu.push(`Giá: ${kq.chiPhi.thieu.join(', ')}`);

    if (nc.nang.some(h => !SO(h))) kq.thieu.push('Giờ nắng đỉnh 12 tháng');
    if (!SO(nc.PR)) kq.thieu.push('Hệ số PR');
    if (SO(pa.kWp) && !nc.nang.some(h => !SO(h)) && SO(nc.PR)) {
      kq.SL = sanLuongThang(pa.kWp, nc.nang, nc.PR);
      kq.SLnam = kq.SL.reduce((s, x) => s + x, 0);
    }
    const pinKWh = pa.pin && pa.pin.model ? (() => { const p = nc.dsPin.find(d => d.model === pa.pin.model); return p && SO(p.dungLuongKWh) ? p.dungLuongKWh * (pa.pin.soLuong || 1) : null; })() : 0;
    if (pinKWh === null) kq.thieu.push('Dung lượng pin lưu trữ');
    if (pinKWh > 0 && !SO(nc.hieuSuatPin)) kq.thieu.push('Hiệu suất pin lưu trữ');
    if (nc.bt.thieu.length) kq.thieu.push(`Giá điện EVN: ${nc.bt.thieu.join(', ')}`);
    if (!SO(nc.C)) kq.thieu.push('Số điện tiêu thụ (hóa đơn)');
    if (!SO(nc.d)) kq.thieu.push('% điện dùng ban ngày (Khảo sát)');
    if (!SO(nc.suyGiam)) kq.thieu.push('Hệ số suy giảm tấm');
    const duTietKiem = kq.SL && !nc.bt.thieu.length && SO(nc.C) && SO(nc.d) && pinKWh !== null && !(pinKWh > 0 && !SO(nc.hieuSuatPin)) && SO(nc.suyGiam);
    if (!duTietKiem) return kq;

    const hs = pinKWh > 0 ? nc.hieuSuatPin / 100 : 0;
    const motNam = (heSo) => {
      let truoc = 0, sau = 0, tuDungNam = 0;
      const thang = kq.SL.map((sl, i) => {
        const td = tuDung(sl * heSo, nc.C, nc.d, pinKWh, hs, NGAY[i]);
        const t1 = tienDien(nc.C, nc.bt), t2 = tienDien(nc.C - td, nc.bt);
        truoc += t1; sau += t2; tuDungNam += td;
        return { sanLuong: sl * heSo, tuDung: td, muaLuoi: nc.C - td, tienTruoc: t1, tienSau: t2 };
      });
      return { thang, truoc, sau, tietKiem: truoc - sau, tuDung: tuDungNam };
    };
    kq.nam1 = motNam(1);
    kq.tietKiemNam1 = kq.nam1.tietKiem;
    // Hoàn vốn theo năm
    if (SO(kq.chiPhi.tong)) {
      let tichLuy = 0;
      kq.dongTien = [];
      for (let y = 1; y <= 40; y++) {
        const tk = motNam(Math.pow(1 - nc.suyGiam / 100, y - 1)).tietKiem;
        const truocDo = tichLuy; tichLuy += tk;
        kq.dongTien.push({ nam: y, tietKiem: tk, tichLuy });
        if (kq.hoanVon === undefined && tichLuy >= kq.chiPhi.tong) kq.hoanVon = (y - 1) + (kq.chiPhi.tong - truocDo) / tk;
        if (kq.hoanVon !== undefined && y >= Math.ceil(kq.hoanVon)) break;
      }
    }
    return kq;
  }

  return { NGAY, bangBacThang, tienDien, sanLuongThang, tuDung, chiPhi, phanTich, SO };
})();
