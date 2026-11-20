// Giai đoạn 3 – màn hình "Xếp pin": mặt bằng mái theo mét, tự xếp tối đa, kéo thả / xoay / xóa / thêm tấm.
const ManXepPin = (() => {
  const CFG = ['chuaMepMaiTonM', 'chuaMepMaiBeTongM', 'chuaVatCanM', 'khoangHoGiuaTamM'];
  const TEN_CFG = {
    chuaMepMaiTonM: 'Khoảng chừa mép – mái tôn', chuaMepMaiBeTongM: 'Khoảng chừa mép – mái bê tông',
    chuaVatCanM: 'Khoảng cách tấm pin tới vật cản', khoangHoGiuaTamM: 'Khe hở giữa 2 tấm pin',
  };
  const MAU_MAI = { 'be-tong': '#1f6fbf', ton: '#8e44ad' };

  let hs, luuSau, kv = null, cfg, tp, dsTamPin, dsNC = [], loi = new Map();
  let chonId = null, cheDoThem = false;
  let vungBang, vungTong, oGoiY, nutThem, nutXoay, nutXoa;

  const SO = XepPin.SO;
  const tamCua = () => hs.xepPin.tam;
  const cfgDu = () => CFG.every(k => SO(cfg[k]));
  const tpDu = () => tp && SO(tp.daiMm) && SO(tp.rongMm);
  const coTheXep = () => cfgDu() && tpDu();

  async function ve(v, hoSo, hamLuu) {
    hs = hoSo; luuSau = hamLuu; chonId = null; cheDoThem = false;
    if (kv) { kv.ngatKetNoi(); kv = null; }
    const f = hs.mai ? ManVeMai.boDoiCuaHoSo(hs) : null;
    const dsMang = (hs.mai ? hs.mai.mangMai : []).filter(m => m.diem.length >= 3);
    if (!f || !dsMang.length) {
      v.replaceChildren(TI.el('div', { class: 'the trong' },
        TI.el('b', {}, 'Chưa có mặt bằng mái'),
        TI.el('p', { class: 'mo' }, 'Cần vẽ ít nhất 1 mảng mái và đặt tỉ lệ ở thẻ "Vẽ mái" trước.'),
        TI.el('a', { class: 'nut', href: `#/ho-so/${hs.id}/ve-mai` }, 'Sang thẻ Vẽ mái')));
      return;
    }
    cfg = {};
    for (const k of CFG) cfg[k] = await DuLieu.giaTri('cau-hinh', k);
    dsTamPin = (await DuLieu.lay('tam-pin')).bang.dong.filter(d => d.model && d.model !== CAN_DIEN);
    if (!hs.xepPin) hs.xepPin = { maTamPin: null, tam: [] };
    if (!hs.xepPin.maTamPin && dsTamPin.length) hs.xepPin.maTamPin = dsTamPin[0].model;
    tp = dsTamPin.find(d => d.model === hs.xepPin.maTamPin) || null;
    for (const m of dsMang) if (!m.xep) m.xep = XepPin.caiDatMacDinh(m, m.diem.map(f));
    dungNguCanh();

    oGoiY = TI.el('div', { class: 'goi-y-ve' });
    nutThem = TI.el('button', { type: 'button', onclick: () => { cheDoThem = !cheDoThem; if (cheDoThem) chonId = null; capNhatNut(); kv.veLai(); } }, '+ Thêm tấm');
    nutXoay = TI.el('button', { type: 'button', hidden: true, onclick: xoayTam }, '⟳ Xoay');
    nutXoa = TI.el('button', { type: 'button', hidden: true, onclick: xoaTam }, '🗑 Xóa');
    const khung = TI.el('div', { class: 'khung-ve khung-mat-bang' }, oGoiY,
      TI.el('div', { class: 'nut-noi' },
        TI.el('button', { type: 'button', 'aria-label': 'Phóng to', onclick: () => kv.phong(1.4) }, '+'),
        TI.el('button', { type: 'button', 'aria-label': 'Thu nhỏ', onclick: () => kv.phong(1 / 1.4) }, '−'),
        TI.el('button', { type: 'button', 'aria-label': 'Vừa khung', onclick: () => kv.vuaKhung() }, '⤢')),
      TI.el('div', { class: 'nut-noi-trai' }, nutThem, nutXoay, nutXoa));
    vungBang = TI.el('div', { class: 'bang-ve' });
    v.replaceChildren(veChonTamPin(), khung, vungBang);

    kv = taoKhungVe(khung, { ve: veMatBang, cham, batDauKeo });
    const tatCa = dsNC.flatMap(nc => nc.P);
    const xs = tatCa.map(p => p[0]), ys = tatCa.map(p => p[1]);
    kv.vuaKhung([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], 20, 58, 60);
    kiemTraLai();
    veBang();
  }

  let fMet = null; // hàm đổi điểm ảnh → mét của hồ sơ đang mở
  function dungNguCanh() {
    fMet = ManVeMai.boDoiCuaHoSo(hs);
    dsNC = XepPin.nguCanh(hs.mai, fMet);
  }
  function kiemTraLai() {
    loi = tpDu() && cfgDu() ? XepPin.kiemTra(dsNC, tamCua(), cfg, tp) : new Map();
  }

  // ---------- Chọn tấm pin + cảnh báo thiếu số liệu ----------
  function veChonTamPin() {
    const thieu = [];
    if (!dsTamPin.length) thieu.push('Danh mục tấm pin chưa có model nào');
    else if (tp) {
      if (!SO(tp.daiMm) || !SO(tp.rongMm)) thieu.push(`Kích thước tấm ${tp.model}`);
      if (!SO(tp.congSuatW)) thieu.push(`Công suất tấm ${tp.model} (để tính kWp)`);
    }
    for (const k of CFG) if (!SO(cfg[k])) thieu.push(TEN_CFG[k]);
    for (const nc of dsNC) {
      if (nc.mang.xep.kieuLap === 'khung-nang' && !SO(nc.mang.xep.gocNghieng)) thieu.push(`Góc nghiêng khung của "${nc.mang.ten || 'mảng mái'}" (nhập ở dưới)`);
    }
    const chon = TI.el('select', { onchange: (e) => {
      hs.xepPin.maTamPin = e.target.value;
      if (tamCua().length && !confirm('Đổi loại tấm sẽ xếp lại toàn bộ theo kích thước mới. Tiếp tục?')) { e.target.value = tp ? tp.model : ''; return; }
      hs.xepPin.tam = []; luuSau(); App.dieuHuong();
    } }, ...(dsTamPin.length ? dsTamPin : [{ model: '' }]).map(d =>
      TI.el('option', { value: d.model, selected: tp && d.model === tp.model }, d.model || `(${CAN_DIEN})`)));
    const moTa = tp ? `${SO(tp.congSuatW) ? TI.soVN(tp.congSuatW) + ' W' : CAN_DIEN + ' W'} · ${SO(tp.daiMm) ? TI.soVN(tp.daiMm) : '?'} × ${SO(tp.rongMm) ? TI.soVN(tp.rongMm) : '?'} mm` : '';
    return TI.el('div', {},
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Loại tấm pin'), chon, moTa ? TI.el('small', { class: 'mo' }, moTa) : null),
      thieu.length ? TI.el('div', { class: 'the canh-bao nho' },
        TI.el('b', {}, `Còn thiếu số liệu (${CAN_DIEN}):`),
        TI.el('ul', { class: 'ds-thieu' }, ...thieu.map(t => TI.el('li', {}, t))),
        TI.el('a', { href: '#/cai-dat' }, 'Điền trong Cài đặt →')) : null);
  }

  // ---------- Vẽ mặt bằng ----------
  function veMatBang(ctx, kv) {
    const { w, h } = kv.kt;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    veLuoi(ctx);
    const duong = (P, dong = true) => { ctx.beginPath(); P.forEach((p, i) => { const s = kv.S(p); i ? ctx.lineTo(...s) : ctx.moveTo(...s); }); if (dong) ctx.closePath(); };

    for (const nc of dsNC) {
      const mau = MAU_MAI[nc.mang.loai] || MAU_MAI['be-tong'];
      duong(nc.P); ctx.fillStyle = mau + '14'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = mau; ctx.stroke();
      const mep = XepPin.chuaMep(nc.mang, cfg);
      if (SO(mep) && mep !== 0) { duong(HH.thuVao(nc.P, mep)); ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); }
      const k = nc.mang.xep.canhGoc, a = nc.P[k], b = nc.P[(k + 1) % nc.P.length];
      ctx.beginPath(); ctx.moveTo(...kv.S(a)); ctx.lineTo(...kv.S(b)); ctx.lineWidth = 4; ctx.strokeStyle = '#f08c00'; ctx.stroke();
    }
    // Vật cản: đỏ = chặn; xám nét đứt = thấp hơn khung nâng nên không chặn.
    const f = fMet;
    const idChan = new Set(dsNC.flatMap(nc => nc.vatCanChan));
    for (const vc of hs.mai.vatCan.filter(v => v.diem.length >= 3)) {
      const P = vc.diem.map(f), chan = idChan.has(vc.id);
      duong(P); ctx.fillStyle = chan ? '#ffcdd2' : 'rgba(0,0,0,.04)'; ctx.fill();
      ctx.setLineDash(chan ? [] : [4, 3]); ctx.lineWidth = 1.2; ctx.strokeStyle = chan ? '#e53935' : '#90a4ae'; ctx.stroke(); ctx.setLineDash([]);
    }
    // Tấm pin
    if (tpDu()) {
      const theoMang = new Map(dsNC.map(nc => [nc.mang.id, nc]));
      for (const tam of tamCua()) {
        const nc = theoMang.get(tam.mang); if (!nc) continue;
        const P = XepPin.daGiacTamChung(nc, tam, tp);
        const coLoi = loi.has(tam.id), dangChon = tam.id === chonId;
        duong(P); ctx.fillStyle = coLoi ? '#d32f2f' : '#1d3557'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = '#a8b8d8'; ctx.stroke();
        // vạch giữa tấm cho giống tấm thật
        const g1 = trung(P[0], P[1]), g2 = trung(P[3], P[2]), g3 = trung(P[1], P[2]), g4 = trung(P[0], P[3]);
        const [m1, m2] = HH.kc(P[0], P[1]) > HH.kc(P[1], P[2]) ? [g1, g2] : [g3, g4];
        ctx.beginPath(); ctx.moveTo(...kv.S(m1)); ctx.lineTo(...kv.S(m2)); ctx.lineWidth = 0.7; ctx.strokeStyle = '#5c7099'; ctx.stroke();
        if (dangChon) { duong(P); ctx.lineWidth = 3; ctx.strokeStyle = '#ffca28'; ctx.stroke(); }
      }
    }
    // Nhãn mảng
    for (const nc of dsNC) {
      const n = tamCua().filter(t => t.mang === nc.mang.id).length;
      const [x, y] = kv.S(HH.trongTam(nc.P));
      chu(ctx, `${nc.mang.ten || 'Mảng mái'}: ${n} tấm`, x, y, MAU_MAI[nc.mang.loai] || '#1f6fbf');
    }
    capNhatGoiY();
  }
  const trung = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  function veLuoi(ctx) {
    const [x0, y0] = kv.T([0, 0]), [x1, y1] = kv.T([kv.kt.w, kv.kt.h]);
    if (x1 - x0 > 200) return;
    ctx.strokeStyle = '#eef1f4'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = Math.ceil(x0); x <= x1; x++) { const s = kv.S([x, 0])[0]; ctx.moveTo(s, 0); ctx.lineTo(s, kv.kt.h); }
    for (let y = Math.ceil(y0); y <= y1; y++) { const s = kv.S([0, y])[1]; ctx.moveTo(0, s); ctx.lineTo(kv.kt.w, s); }
    ctx.stroke();
  }

  function chu(ctx, t, x, y, mau) {
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.strokeText(t, x, y);
    ctx.fillStyle = mau; ctx.fillText(t, x, y);
  }

  function capNhatGoiY() {
    if (!oGoiY) return;
    oGoiY.textContent = !coTheXep() ? 'Thiếu số liệu nên chưa xếp được tấm (xem ô vàng phía trên).'
      : cheDoThem ? 'Chạm vào mái để đặt thêm tấm. Bấm "+ Thêm tấm" lần nữa để thôi.'
        : chonId ? 'Kéo tấm để dời · dùng nút Xoay / Xóa ở dưới'
          : 'Chạm tấm để chọn · kéo tấm để dời · 2 ngón để phóng to';
  }
  function capNhatNut() {
    nutThem.classList.toggle('chinh', cheDoThem);
    nutThem.disabled = !coTheXep();
    nutXoay.hidden = nutXoa.hidden = !chonId;
    capNhatGoiY();
  }

  // ---------- Chạm / kéo ----------
  function tamTai(w) {
    if (!tpDu()) return null;
    const theoMang = new Map(dsNC.map(nc => [nc.mang.id, nc]));
    const ds = tamCua();
    for (let i = ds.length - 1; i >= 0; i--) {
      const nc = theoMang.get(ds[i].mang);
      if (nc && HH.namTrong(w, XepPin.daGiacTamChung(nc, ds[i], tp))) return { tam: ds[i], nc };
    }
    return null;
  }

  function cham(p) {
    const w = kv.T(p);
    if (cheDoThem && coTheXep()) {
      const nc = dsNC.find(n => HH.namTrong(w, n.P));
      if (!nc) { TI.thongBao('Chạm vào bên trong 1 mảng mái'); return; }
      const [u, v] = nc.H.sangRieng(w);
      const tam = { id: TI.taoId('tam'), mang: nc.mang.id, u: lam(u), v: lam(v), huong: nc.mang.xep.huong };
      tamCua().push(tam); chonId = tam.id;
      sauKhiDoi();
      if (loi.has(tam.id)) TI.thongBao('Tấm mới bị lỗi: ' + loi.get(tam.id).join(', '), 'loi');
      return;
    }
    const t = tamTai(w);
    chonId = t ? t.tam.id : null;
    capNhatNut(); veTong(); kv.veLai();
  }

  function batDauKeo(p) {
    if (cheDoThem) return null;
    const w0 = kv.T(p), t = tamTai(w0);
    if (!t) return null;
    const { tam, nc } = t, bd = { u: tam.u, v: tam.v }, l0 = nc.H.sangRieng(w0);
    chonId = tam.id; capNhatNut();
    return {
      keo(q) {
        const l = nc.H.sangRieng(kv.T(q));
        // làm tròn quãng kéo (1 cm), không làm tròn vị trí → kéo đi rồi kéo về đúng chỗ cũ
        tam.u = bd.u + lam(l[0] - l0[0]); tam.v = bd.v + lam(l[1] - l0[1]);
        kiemTraLai();
      },
      tha() { sauKhiDoi(); },
    };
  }
  const lam = (n) => Math.round(n * 100) / 100; // làm tròn 1 cm

  function xoayTam() {
    const tam = tamCua().find(t => t.id === chonId); if (!tam) return;
    tam.huong = tam.huong === 'doc' ? 'ngang' : 'doc';
    sauKhiDoi();
    if (loi.has(tam.id)) TI.thongBao('Sau khi xoay: ' + loi.get(tam.id).join(', '), 'loi');
  }
  function xoaTam() {
    hs.xepPin.tam = tamCua().filter(t => t.id !== chonId); chonId = null; sauKhiDoi();
  }

  function sauKhiDoi() { kiemTraLai(); luuSau(); capNhatNut(); veTong(); kv.veLai(); }

  // ---------- Bảng dưới mặt bằng ----------
  function tuXepMang(nc) {
    hs.xepPin.tam = tamCua().filter(t => t.mang !== nc.mang.id).concat(XepPin.tuXep(nc, cfg, tp));
  }

  function veBang() {
    const nd = [
      TI.el('div', { class: 'hang' },
        TI.el('button', { type: 'button', class: 'nut chinh', disabled: !coTheXep(), onclick: () => {
          if (tamCua().length && !confirm('Xếp lại tất cả sẽ xóa cách xếp hiện tại (cả phần đã chỉnh tay). Tiếp tục?')) return;
          for (const nc of dsNC) if (khungNangDu(nc)) tuXepMang(nc);
          chonId = null; sauKhiDoi(); veBang();
          TI.thongBao(`Đã xếp ${tamCua().length} tấm`);
        } }, 'Tự xếp tất cả các mảng'),
        TI.el('button', { type: 'button', class: 'nut', disabled: !tamCua().length, onclick: () => {
          if (!confirm('Xóa hết tấm pin trên mọi mảng?')) return;
          hs.xepPin.tam = []; chonId = null; sauKhiDoi(); veBang();
        } }, 'Xóa hết')),
      TI.el('p', { class: 'mo nho' }, 'Vạch cam là "cạnh xếp hàng": các hàng tấm chạy song song cạnh này. Mái dốc nên chọn cạnh thấp (máng nước). Nét đứt là đường chừa mép.'),
    ];
    for (const nc of dsNC) nd.push(veCaiDatMang(nc));
    vungTong = TI.el('div', { class: 'tong-hop' });
    vungBang.replaceChildren(...nd, vungTong);
    capNhatNut();
    veTong();
  }

  const khungNangDu = (nc) => nc.mang.xep.kieuLap !== 'khung-nang' || SO(nc.mang.xep.gocNghieng);

  function veCaiDatMang(nc) {
    const m = nc.mang, x = m.xep, f = fMet;
    const doi = (k, gt, xepLai = true) => {
      x[k] = gt; luuSau(); dungNguCanh();
      const ncMoi = dsNC.find(n => n.mang.id === m.id);
      if (xepLai && coTheXep() && khungNangDu(ncMoi) && tamCua().some(t => t.mang === m.id)) {
        tuXepMang(ncMoi); TI.thongBao(`Đã xếp lại "${m.ten || 'mảng mái'}"`);
      }
      chonId = null; sauKhiDoi(); veBang();
    };
    const chon = (nhan, k, ds, xepLai = true) => TI.el('label', { class: 'truong' }, TI.el('span', {}, nhan),
      TI.el('select', { onchange: (e) => doi(k, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value), xepLai) },
        ...ds.map(([gt, ten]) => TI.el('option', { value: gt, selected: x[k] === gt }, ten))));
    const so = (nhan, k, dv) => TI.el('label', { class: 'truong' }, TI.el('span', {}, nhan),
      TI.el('div', { class: 'co-don-vi' }, TI.oSo(x[k], n => { x[k] = n; luuSau(); }, {
        onchange: () => doi(k, x[k]),
      }), TI.el('i', {}, dv)));
    const canh = m.diem.map((_, i) => [i, `Cạnh ${i + 1}→${(i + 1) % m.diem.length + 1} (${TI.soVN(HH.kc(f(m.diem[i]), f(m.diem[(i + 1) % m.diem.length])), 2)} m)`]);
    const n = tamCua().filter(t => t.mang === m.id).length;
    const noiDung = [
      chon('Cách lắp', 'kieuLap', [['ap-mai', 'Áp mái (theo dốc mái)'], ['khung-nang', 'Khung nâng']]),
      chon('Cạnh xếp hàng (vạch cam)', 'canhGoc', canh),
      chon('Hướng đặt tấm', 'huong', [['doc', 'Dọc (cạnh dài vuông góc vạch cam)'], ['ngang', 'Ngang (cạnh dài song song vạch cam)']]),
    ];
    if (x.kieuLap === 'khung-nang') {
      noiDung.push(TI.el('div', { class: 'luoi-o' },
        so('Góc nghiêng tấm', 'gocNghieng', '°'),
        so('Chiều cao khung', 'caoKhungM', 'm'),
        so('Số hàng tấm mỗi dãy khung', 'soHangMoiDay', 'hàng'),
        so('Khoảng hở giữa các dãy', 'khoangCachDayM', 'm'),
        so('Khung nhô ra ngoài mép mái', 'nhoRaM', 'm')),
        TI.el('p', { class: 'mo nho' }, 'Vật cản thấp hơn khung (đã nhập chiều cao ở thẻ Vẽ mái) sẽ không chặn tấm. Số hàng mỗi dãy để trống = xếp liền. Khung nhô ra: để trống = không nhô, tấm vẫn chừa mép như mái thường.'));
    } else {
      noiDung.push(TI.el('p', { class: 'mo nho' }, `Độ dốc mái: ${SO(m.doDocDo) ? TI.soVN(m.doDocDo) + '°' : 'chưa nhập'} (sửa ở thẻ Vẽ mái).`));
    }
    noiDung.push(TI.el('div', { class: 'hang' },
      TI.el('button', { type: 'button', class: 'nut nho', disabled: !coTheXep() || !khungNangDu(nc), onclick: () => {
        tuXepMang(dsNC.find(k => k.mang.id === m.id)); chonId = null; sauKhiDoi(); veBang();
        TI.thongBao(`Đã xếp ${tamCua().filter(t => t.mang === m.id).length} tấm`);
      } }, 'Tự xếp mảng này'),
      TI.el('button', { type: 'button', class: 'nut nho', disabled: !n, onclick: () => {
        hs.xepPin.tam = tamCua().filter(t => t.mang !== m.id); chonId = null; sauKhiDoi(); veBang();
      } }, 'Xóa tấm mảng này')));
    return TI.el('details', { class: 'nhom' },
      TI.el('summary', {}, TI.el('span', {}, m.ten || 'Mảng mái'), TI.el('span', { class: 'nhan' }, `${n} tấm`)),
      TI.el('div', { class: 'nhom-noi-dung' }, ...noiDung));
  }

  function veTong() {
    if (!vungTong) return;
    const coCS = tp && SO(tp.congSuatW);
    const kWp = (n) => coCS ? TI.soVN(n * tp.congSuatW / 1000, 2) : CAN_DIEN;
    let tong = 0;
    const dong = dsNC.map(nc => {
      const n = tamCua().filter(t => t.mang === nc.mang.id).length; tong += n;
      return TI.el('tr', {}, TI.el('td', {}, nc.mang.ten || 'Mảng mái'), TI.el('td', {}, String(n)), TI.el('td', {}, kWp(n)));
    });
    const dsLoi = [...loi.entries()];
    const theoLyDo = {};
    for (const [, ly] of dsLoi) for (const l of ly) theoLyDo[l] = (theoLyDo[l] || 0) + 1;
    vungTong.replaceChildren(
      TI.el('h4', {}, 'Tổng hợp'),
      TI.el('table', { class: 'bang-so' },
        TI.el('thead', {}, TI.el('tr', {}, TI.el('th', {}, 'Mảng'), TI.el('th', {}, 'Số tấm'), TI.el('th', {}, 'kWp'))),
        TI.el('tbody', {}, ...dong),
        TI.el('tfoot', {}, TI.el('tr', {}, TI.el('td', {}, 'Tổng'), TI.el('td', {}, String(tong)), TI.el('td', {}, kWp(tong))))),
      !tamCua().length ? null : dsLoi.length
        ? TI.el('div', { class: 'the loi nho' }, `${dsLoi.length} tấm lỗi (tô đỏ): `,
          Object.entries(theoLyDo).map(([l, n]) => `${n} tấm ${l}`).join('; '))
        : TI.el('div', { class: 'the dat nho' }, '✓ Không tấm nào chồng nhau, đè vật cản hay vượt khoảng chừa mép.'));
  }

  // Dùng cho kiểm thử
  const _trangThai = () => ({ kv, chonId, cheDoThem, soLoi: loi.size, loi: [...loi.entries()], tam: hs.xepPin.tam, dsNC, tp });
  return { ve, _trangThai };
})();
