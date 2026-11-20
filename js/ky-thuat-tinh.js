// Giai đoạn 5 – phần tính kỹ thuật (không có giao diện). Đúng các công thức bắt buộc ở mục [C] của file yêu cầu:
//   Voc tối đa = Voc × (1 + β × (T_min − 25))                 (β = hệ số nhiệt Voc đổi ra số thập phân, mang dấu âm)
//   Số tấm tối đa mỗi chuỗi = làm tròn xuống (U DC tối đa inverter ÷ Voc tối đa)
//   Vmp nóng = Vmp × (1 + β × (T_nóng − 25)),  số tấm tối thiểu = làm tròn lên (ngưỡng MPPT dưới ÷ Vmp nóng)
//   Tỉ lệ DC/AC trong khoảng cấu hình (1,0–1,3), ngoài khoảng thì cảnh báo
//   Sụt áp cáp DC: ΔU = 2 × L × I × ρ ÷ S; cảnh báo nếu ΔU vượt ngưỡng % (so với Vmp của chuỗi)
const KyThuat = (() => {
  const SO = (x) => typeof x === 'number' && isFinite(x);
  const TIET_DIEN_DC = [4, 6, 10, 16]; // các cỡ cáp DC thông dụng (mm²) để chọn tự động
  const CAN_TP = { congSuatW: 'Công suất', vocV: 'Voc', iscA: 'Isc', vmpV: 'Vmp', impA: 'Imp', heSoNhietVoc: 'Hệ số nhiệt Voc' };
  const CAN_INV = { congSuatACkW: 'Công suất AC', dienApDCMaxV: 'Điện áp DC tối đa', mpptMinV: 'Dải MPPT – thấp nhất',
    mpptMaxV: 'Dải MPPT – cao nhất', soMPPT: 'Số MPPT', dongMPPTMaxA: 'Dòng vào tối đa mỗi MPPT' };
  const CAN_CFG = { tMin: 'Nhiệt độ thấp nhất mùa đông', tVmpNong: 'Nhiệt độ tấm khi nóng', rhoDong: 'Điện trở suất đồng ρ',
    nguongSutApPhanTram: 'Ngưỡng cảnh báo sụt áp DC', dcAcMin: 'Tỉ lệ DC/AC thấp nhất', dcAcMax: 'Tỉ lệ DC/AC cao nhất' };

  const thieu = (obj, can) => Object.entries(can).filter(([k]) => !obj || !SO(obj[k])).map(([, t]) => t);

  // Phần chỉ cần tấm pin + cấu hình
  function nhietDo(tp, cfg) {
    const beta = tp.heSoNhietVoc / 100;
    return {
      beta,
      vocMax: tp.vocV * (1 + beta * (cfg.tMin - 25)),
      vmpNong: tp.vmpV * (1 + beta * (cfg.tVmpNong - 25)),
    };
  }

  // Chia n tấm thành các chuỗi dài bằng nhau trong khoảng [nMin, nMax]. Có L thì dùng L người dùng chọn.
  function chiaChuoi(n, nMin, nMax, L) {
    if (SO(L) && L > 0) { const k = Math.floor(n / L); return { soChuoi: k, L, thua: n - k * L, tuChon: true }; }
    let tot = null;
    if (nMax >= nMin && n >= nMin) {
      for (let k = Math.ceil(n / nMax); k <= Math.floor(n / nMin); k++) {
        const L2 = Math.floor(n / k);
        if (L2 > nMax || L2 < nMin) continue;
        const thua = n - k * L2;
        if (!tot || thua < tot.thua) tot = { soChuoi: k, L: L2, thua };
        if (thua === 0) break;
      }
    }
    return tot ? { ...tot, tuChon: false } : { soChuoi: 0, L: 0, thua: n, tuChon: false };
  }

  function sutAp(Lm, I, rho, S, Vchuoi) {
    const dU = 2 * Lm * I * rho / S;
    return { dU, phanTram: dU / Vchuoi * 100 };
  }

  // Tính toàn bộ. nhomTam: [{ id, ten, n }] (mỗi mảng mái = 1 nhóm hướng/nghiêng riêng → MPPT riêng).
  // dat: lựa chọn của người dùng { soLuong, nhom: { [id]: { L, chieuDaiM, tietDien } } }; chieuDaiMacDinh: quãng đường dây.
  function tinh({ tp, inv, cfg, nhomTam, dat, chieuDaiMacDinh, loaiDien }) {
    const kq = { thieuTP: thieu(tp, CAN_TP), thieuINV: inv ? thieu(inv, CAN_INV) : ['Chưa chọn inverter'], thieuCFG: thieu(cfg, CAN_CFG),
      canhBao: [], loi: [], nhom: [] };
    const soTam = nhomTam.reduce((s, g) => s + g.n, 0);
    kq.soTam = soTam;
    if (SO(tp && tp.congSuatW)) kq.kWp = soTam * tp.congSuatW / 1000;
    if (kq.thieuTP.length || !SO(cfg.tMin) || !SO(cfg.tVmpNong)) return kq;
    Object.assign(kq, nhietDo(tp, cfg));
    if (kq.thieuINV.length || kq.thieuCFG.length) return kq;

    const soLuong = SO(dat.soLuong) && dat.soLuong > 0 ? Math.round(dat.soLuong) : 1;
    kq.soLuong = soLuong;
    kq.nMax = Math.floor(inv.dienApDCMaxV / kq.vocMax);
    kq.nMin = Math.ceil(inv.mpptMinV / kq.vmpNong);
    kq.pAC = inv.congSuatACkW * soLuong;
    kq.dcAc = kq.kWp / kq.pAC;
    kq.dcAcDat = kq.dcAc >= cfg.dcAcMin && kq.dcAc <= cfg.dcAcMax;
    if (!kq.dcAcDat) kq.canhBao.push(`Tỉ lệ DC/AC = ${TI.soVN(kq.dcAc, 2)} nằm ngoài khoảng ${TI.soVN(cfg.dcAcMin)}–${TI.soVN(cfg.dcAcMax)}.`);
    if (kq.nMax < kq.nMin) kq.loi.push(`Tấm và inverter không hợp: tối đa ${kq.nMax} tấm/chuỗi nhưng tối thiểu phải ${kq.nMin} tấm/chuỗi.`);
    if (inv.soPha === '3 pha' && loaiDien === '1-pha') kq.loi.push('Inverter 3 pha nhưng nhà khách dùng điện 1 pha.');
    if (inv.soPha === '1 pha' && loaiDien === '3-pha') kq.canhBao.push('Inverter 1 pha cho nhà điện 3 pha: cần xem lại cân bằng pha.');

    // Số chuỗi tối đa đấu song song vào 1 MPPT theo dòng (dòng làm việc Imp).
    kq.pMax = Math.floor(inv.dongMPPTMaxA / tp.impA);
    if (kq.pMax < 1) kq.loi.push(`Dòng 1 chuỗi (Imp ${TI.soVN(tp.impA)} A) lớn hơn dòng vào tối đa của 1 MPPT (${TI.soVN(inv.dongMPPTMaxA)} A).`);
    const pMax = Math.max(kq.pMax, 1);

    kq.mpptCo = inv.soMPPT * soLuong;
    let mpptDung = 0;
    for (const g of nhomTam) {
      const d = (dat.nhom && dat.nhom[g.id]) || {};
      const c = chiaChuoi(g.n, kq.nMin, kq.nMax, d.L);
      const nh = { id: g.id, ten: g.ten, n: g.n, ...c };
      if (c.soChuoi === 0) kq.loi.push(`"${g.ten}": ${g.n} tấm không chia được chuỗi trong khoảng ${kq.nMin}–${kq.nMax} tấm.`);
      else if (c.thua) kq.canhBao.push(`"${g.ten}": thừa ${c.thua} tấm chưa đấu vào chuỗi nào → nên bớt hoặc thêm tấm.`);
      if (c.tuChon && (c.L > kq.nMax || c.L < kq.nMin)) kq.loi.push(`"${g.ten}": chuỗi ${c.L} tấm nằm ngoài khoảng ${kq.nMin}–${kq.nMax}.`);
      nh.soMPPT = Math.ceil(c.soChuoi / pMax);
      nh.chuoiMoiMPPT = nh.soMPPT ? Math.ceil(c.soChuoi / nh.soMPPT) : 0;
      nh.mpptTu = mpptDung + 1; mpptDung += nh.soMPPT;
      nh.vocMaxChuoi = c.L * kq.vocMax;
      nh.vmpChuoi = c.L * tp.vmpV;
      nh.vmpNongChuoi = c.L * kq.vmpNong;
      if (c.L && nh.vmpChuoi > inv.mpptMaxV) kq.canhBao.push(`"${g.ten}": Vmp chuỗi ${TI.soVN(nh.vmpChuoi, 1)} V cao hơn dải MPPT (${TI.soVN(inv.mpptMaxV)} V).`);
      // Cáp DC mỗi chuỗi
      const Lm = SO(d.chieuDaiM) ? d.chieuDaiM : chieuDaiMacDinh;
      nh.cap = { Lm, I: tp.impA };
      if (SO(Lm) && c.L) {
        let S = SO(d.tietDien) ? d.tietDien : null;
        if (!S) S = TIET_DIEN_DC.find(s => sutAp(Lm, tp.impA, cfg.rhoDong, s, nh.vmpChuoi).phanTram <= cfg.nguongSutApPhanTram) || TIET_DIEN_DC[TIET_DIEN_DC.length - 1];
        Object.assign(nh.cap, { S, tuChonS: SO(d.tietDien) }, sutAp(Lm, tp.impA, cfg.rhoDong, S, nh.vmpChuoi));
        nh.cap.dat = nh.cap.phanTram <= cfg.nguongSutApPhanTram;
        if (!nh.cap.dat) kq.canhBao.push(`"${g.ten}": sụt áp cáp DC ${TI.soVN(nh.cap.phanTram, 2)}% vượt ${TI.soVN(cfg.nguongSutApPhanTram)}%.`);
      }
      kq.nhom.push(nh);
    }
    kq.mpptDung = mpptDung;
    if (mpptDung > kq.mpptCo) kq.loi.push(`Cần ${mpptDung} MPPT nhưng ${soLuong} inverter chỉ có ${kq.mpptCo} MPPT.`);
    if (!SO(chieuDaiMacDinh) && kq.nhom.some(n => !SO(n.cap.Lm))) kq.canhBao.push('Chưa có quãng đường đi dây (thẻ Thông số) → chưa tính được sụt áp.');
    kq.vocMaxHeThong = Math.max(0, ...kq.nhom.map(n => n.vocMaxChuoi));

    // Thiết bị bảo vệ (hệ số lấy từ Cài đặt, thiếu thì để [CẦN ĐIỀN])
    const iscP = Math.max(0, ...kq.nhom.map(n => n.chuoiMoiMPPT)) * tp.iscA;
    kq.baoVe = {
      cbDC: { dongA: SO(cfg.heSoCBDC) ? cfg.heSoCBDC * iscP : null, dienApV: kq.vocMaxHeThong, soLuong: mpptDung },
      cauChi: SO(cfg.soChuoiCanCauChi)
        ? { can: kq.nhom.some(n => n.chuoiMoiMPPT >= cfg.soChuoiCanCauChi), dongA: SO(cfg.heSoCauChi) ? cfg.heSoCauChi * tp.iscA : null }
        : null,
      spdDC: { dienApV: kq.vocMaxHeThong },
      cbAC: { dongA: SO(cfg.heSoCBAC) && SO(inv.dongACmaxA) ? cfg.heSoCBAC * inv.dongACmaxA : null, soLuong },
    };
    return kq;
  }

  return { tinh, nhietDo, chiaChuoi, sutAp, TIET_DIEN_DC, SO };
})();
