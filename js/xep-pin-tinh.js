// Giai đoạn 3 – phần tính toán xếp pin (không có giao diện, để dễ kiểm tra).
// Mỗi mảng mái có 1 hệ trục riêng: trục u chạy dọc "cạnh xếp hàng", trục v vuông góc hướng vào trong mái.
// Tấm pin lưu theo toạ độ tâm (u, v) bằng mét trong hệ trục của mảng đó.
const XepPin = (() => {
  const SO = (x) => typeof x === 'number' && isFinite(x);
  const SAI_SO = 0.002; // cho phép lệch 2 mm khi kiểm tra (do làm tròn số)

  function canhDaiNhat(P) {
    let k = 0;
    P.forEach((a, i) => { if (HH.kc(a, P[(i + 1) % P.length]) > HH.kc(P[k], P[(k + 1) % P.length])) k = i; });
    return k;
  }

  function caiDatMacDinh(mang, P) {
    return {
      kieuLap: mang.loai === 'ton' ? 'ap-mai' : 'khung-nang',
      canhGoc: canhDaiNhat(P),
      huong: 'doc',            // dọc: cạnh dài của tấm vuông góc với cạnh xếp hàng
      gocNghieng: null,        // góc nghiêng tấm trên khung nâng (°)
      caoKhungM: null,         // chiều cao khung nâng so với mặt mái (m)
      soHangMoiDay: null,      // số hàng tấm trên 1 dãy khung (để trống = xếp liền)
      khoangCachDayM: null,    // khoảng hở giữa 2 dãy khung (m)
      nhoRaM: null,            // khung nâng nhô ra ngoài mép mái (m)
      mepThap: 'canh-goc',     // mép thấp của tấm trên khung quay về phía cạnh xếp hàng hay phía ngược lại
    };
  }

  function heTruc(P, canhGoc) {
    const n = P.length, k = Math.min(Math.max(canhGoc | 0, 0), n - 1);
    const a = P[k], b = P[(k + 1) % n], L = HH.kc(a, b) || 1;
    const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    let v = [-u[1], u[0]];
    const c = HH.trongTam(P);
    if ((c[0] - a[0]) * v[0] + (c[1] - a[1]) * v[1] < 0) v = [-v[0], -v[1]];
    return {
      sangRieng: (p) => [(p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], (p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]],
      sangChung: ([x, y]) => [a[0] + u[0] * x + v[0] * y, a[1] + u[1] * x + v[1] * y],
    };
  }

  // Góc làm tấm "ngắn lại" khi nhìn từ trên xuống: áp mái → độ dốc mái; khung nâng → góc nghiêng khung.
  function gocChieu(mang) {
    if (mang.xep.kieuLap === 'khung-nang') return SO(mang.xep.gocNghieng) ? mang.xep.gocNghieng : null;
    return SO(mang.doDocDo) ? mang.doDocDo : 0;
  }

  // Kích thước tấm trên mặt bằng: wu theo trục u, dv theo trục v.
  function kichThuoc(mang, huong, tp) {
    const dai = tp.daiMm / 1000, rong = tp.rongMm / 1000;
    const c = Math.cos((gocChieu(mang) || 0) * Math.PI / 180);
    return huong === 'doc' ? { wu: rong, dv: dai * c } : { wu: dai, dv: rong * c };
  }

  // Khoảng chừa mép thực dùng. Khung nâng có nhập "nhô ra ngoài mép" (nhoRaM) → tấm được vượt mép mái
  // tối đa đúng bằng nhoRaM (chừa mép âm); không nhập thì chừa mép như mái thường.
  const chuaMep = (mang, cfg) => {
    if (mang.xep && mang.xep.kieuLap === 'khung-nang' && SO(mang.xep.nhoRaM) && mang.xep.nhoRaM > 0) return -mang.xep.nhoRaM;
    return mang.loai === 'ton' ? cfg.chuaMepMaiTonM : cfg.chuaMepMaiBeTongM;
  };

  // Vật cản có chặn tấm của mảng này không: khung nâng cao hơn vật cản thì không chặn.
  function laVatCanChan(mang, vc) {
    if (mang.xep.kieuLap !== 'khung-nang') return true;
    return !(SO(vc.caoM) && SO(mang.xep.caoKhungM) && vc.caoM < mang.xep.caoKhungM);
  }

  // Dựng sẵn dữ liệu hình học cho từng mảng (đổi hết ra mét).
  function nguCanh(mai, f) {
    const dsVC = mai.vatCan.filter(v => v.diem.length >= 3).map(v => ({ vc: v, P: v.diem.map(f) }));
    return mai.mangMai.filter(m => m.diem.length >= 3 && m.xep).map(mang => {
      const P = mang.diem.map(f), H = heTruc(P, mang.xep.canhGoc);
      const lienQuan = dsVC.filter(o => HH.chongNhau(o.P, P));
      return {
        mang, P, H, L: P.map(H.sangRieng),
        chan: lienQuan.filter(o => laVatCanChan(mang, o.vc)).map(o => o.P.map(H.sangRieng)),
        vatCanChan: lienQuan.filter(o => laVatCanChan(mang, o.vc)).map(o => o.vc.id),
      };
    });
  }

  function daGiacTam(nc, tam, tp, them = 0) {
    const { wu, dv } = kichThuoc(nc.mang, tam.huong, tp);
    return HH.hinhChuNhat(tam.u, tam.v, wu, dv, them);
  }
  // Vùng được đặt tấm: chừa mép dương → nới tấm ra rồi đặt trong mái; chừa mép âm (khung nhô ra) → nới mái ra ngoài.
  function vungDat(nc, mep) {
    return mep < 0 ? { L: HH.thuVao(nc.L, mep), them: 0 } : { L: nc.L, them: mep };
  }
  const daGiacTamChung = (nc, tam, tp, them = 0) => daGiacTam(nc, tam, tp, them).map(nc.H.sangChung);

  // Tự xếp tối đa cho 1 mảng: xếp theo hàng song song cạnh xếp hàng, mỗi hàng đặt tấm từ trái qua phải
  // ở vị trí hợp lệ đầu tiên; thử 8 vị trí bắt đầu hàng khác nhau, lấy cách được nhiều tấm nhất.
  function tuXep(nc, cfg, tp) {
    const x = nc.mang.xep, huong = x.huong;
    const { wu, dv } = kichThuoc(nc.mang, huong, tp);
    const gap = cfg.khoangHoGiuaTamM, mep = chuaMep(nc.mang, cfg), cvc = cfg.chuaVatCanM;
    const us = nc.L.map(p => p[0]), vs = nc.L.map(p => p[1]);
    const umin = Math.min(...us), umax = Math.max(...us), vmin = Math.min(...vs), vmax = Math.max(...vs);
    const nhom = x.soHangMoiDay > 0 ? x.soHangMoiDay : Infinity;
    const khe = x.khoangCachDayM > 0 ? x.khoangCachDayM : 0;
    const vd = vungDat(nc, mep - 0.001); // nới 1 mm để tấm nằm đúng sát đường chừa mép vẫn tính là hợp lệ
    const hopLe = (u, v) => HH.namTronTrong(HH.hinhChuNhat(u, v, wu, dv, vd.them), vd.L) &&
      !nc.chan.some(O => HH.chongNhau(HH.hinhChuNhat(u, v, wu, dv, cvc), O));
    const BUOC = 0.02;
    let tot = [];
    for (let t = 0; t < 8; t++) {
      const kq = [];
      for (let r = 0; ; r++) {
        const v = vmin + mep + dv / 2 + t * (dv + gap) / 8 + r * (dv + gap) + (nhom < Infinity ? Math.floor(r / nhom) * khe : 0);
        if (v + dv / 2 > vmax - mep) break;   // mep âm (khung nhô ra) → được vượt mép
        let u = umin + mep + wu / 2;
        while (u + wu / 2 <= umax - mep) {
          if (hopLe(u, v)) { kq.push({ u, v }); u += wu + gap; } else u += BUOC;
        }
      }
      if (kq.length > tot.length) tot = kq;
    }
    const lam = (n) => Math.round(n * 1000) / 1000;
    return tot.map(p => ({ id: TI.taoId('tam'), mang: nc.mang.id, u: lam(p.u), v: lam(p.v), huong }));
  }

  // Kiểm tra từng tấm: trả về Map id → danh sách lỗi.
  function kiemTra(dsNC, dsTam, cfg, tp) {
    const loi = new Map();
    const them = (id, ly) => { if (!loi.has(id)) loi.set(id, []); if (!loi.get(id).includes(ly)) loi.get(id).push(ly); };
    const theoMang = new Map(dsNC.map(nc => [nc.mang.id, nc]));
    const hinh = [];
    for (const tam of dsTam) {
      const nc = theoMang.get(tam.mang);
      if (!nc) { them(tam.id, 'mảng mái đã bị xóa'); continue; }
      const mep = chuaMep(nc.mang, cfg);
      const vd = vungDat(nc, mep - SAI_SO);
      if (!HH.namTronTrong(daGiacTam(nc, tam, tp, vd.them), vd.L)) them(tam.id, 'vượt khoảng chừa mép');
      const R = daGiacTam(nc, tam, tp, cfg.chuaVatCanM - SAI_SO);
      if (nc.chan.some(O => HH.chongNhau(R, O))) them(tam.id, 'đè hoặc quá gần vật cản');
      hinh.push({ id: tam.id, P: daGiacTamChung(nc, tam, tp, -0.001) });
    }
    for (let i = 0; i < hinh.length; i++) {
      for (let j = i + 1; j < hinh.length; j++) {
        if (HH.chongNhau(hinh[i].P, hinh[j].P)) { them(hinh[i].id, 'chồng lên tấm khác'); them(hinh[j].id, 'chồng lên tấm khác'); }
      }
    }
    return loi;
  }

  return { SO, caiDatMacDinh, nguCanh, kichThuoc, gocChieu, chuaMep, laVatCanChan, daGiacTamChung, tuXep, kiemTra, canhDaiNhat, heTruc };
})();
