// Giai đoạn 6 – thẻ "Báo giá": tối đa 3 phương án, so sánh tiết kiệm / hoàn vốn, xuất PDF báo giá gửi khách.
const ManBaoGia = (() => {
  const SO = TaiChinh.SO;
  const THU_VIEN = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  ];
  const CFG_KT = ['tMin', 'tVmpNong', 'rhoDong', 'nguongSutApPhanTram', 'dcAcMin', 'dcAcMax', 'heSoCBDC', 'soChuoiCanCauChi', 'heSoCauChi', 'heSoCBAC'];
  const THANG = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  let hs, luuSau, vung, nc;

  const tien = (x) => SO(x) ? `${TI.soVN(Math.round(x), 0)} đ` : CAN_DIEN;
  const tr = (x, le = 0) => SO(x) ? `${TI.soVN(x / 1e6, le)} tr` : CAN_DIEN; // triệu đồng
  const nam = (x) => SO(x) ? `${TI.soVN(x, 1)} năm` : CAN_DIEN;

  // ---------- Dữ liệu dùng chung ----------
  async function dungNguCanh() {
    const tpF = await DuLieu.lay('tam-pin'), invF = await DuLieu.lay('inverter'), pinF = await DuLieu.lay('pin-luu-tru');
    const dgF = await DuLieu.lay('don-gia-thi-cong'), evnF = await DuLieu.lay('gia-dien-evn'), nangF = await DuLieu.lay('nang-khu-vuc');
    const dnF = await DuLieu.lay('doanh-nghiep');
    const gt = (f, ma) => (f.truong.find(t => t.ma === ma) || {}).giaTri;
    const cfgKT = {};
    for (const k of CFG_KT) cfgKT[k] = await DuLieu.giaTri('cau-hinh', k);
    const hoaDon = hs.dien.hoaDon.filter(h => SO(h.kWh) && h.kWh > 0);
    const tienHD = hs.dien.hoaDon.filter(h => SO(h.tien) && h.tien > 0);
    const mang = (hs.mai ? hs.mai.mangMai : []).map(m => ({
      id: m.id, ten: m.ten || 'Mảng mái', kieuLap: m.xep ? m.xep.kieuLap : 'ap-mai', caoKhungM: m.xep ? m.xep.caoKhungM : null,
      toiDa: hs.xepPin ? hs.xepPin.tam.filter(t => t.mang === m.id).length : 0,
    })).filter(m => m.toiDa > 0);
    const dn = {}; for (const t of dnF.truong) dn[t.ma] = t.giaTri;
    return {
      tp: hs.xepPin ? tpF.bang.dong.find(d => d.model === hs.xepPin.maTamPin) || null : null,
      dsINV: invF.bang.dong.filter(d => d.model && d.model !== CAN_DIEN),
      dsPin: pinF.bang.dong.filter(d => d.model && d.model !== CAN_DIEN),
      donGia: { khungApMaiTon: gt(dgF, 'khungApMaiTon'), capTuDienBaoVe: gt(dgF, 'capTuDienBaoVe'), nhanCong: gt(dgF, 'nhanCong'), chongPhatNguoc: gt(dgF, 'chongPhatNguoc'), khungNang: dgF.bang.dong },
      vat: { tamPin: gt(tpF, 'giaDaGomVAT'), inverter: gt(invF, 'giaDaGomVAT'), thiCong: gt(dgF, 'giaDaGomVAT') },
      bt: TaiChinh.bangBacThang(evnF),
      nang: nangF.bang.dong.map(r => r.gioNangDinh), nguonNang: gt(nangF, 'nguon'),
      PR: await DuLieu.giaTri('cau-hinh', 'PR'), suyGiam: await DuLieu.giaTri('cau-hinh', 'suyGiamNamPhanTram'),
      hieuSuatPin: await DuLieu.giaTri('cau-hinh', 'hieuSuatPinLuuTruPhanTram'),
      C: hoaDon.length ? hoaDon.reduce((s, h) => s + h.kWh, 0) / hoaDon.length : null,
      tienHD: tienHD.length ? tienHD.reduce((s, h) => s + h.tien, 0) / tienHD.length : null,
      d: SO(hs.dien.phanTramDungBanNgay) ? hs.dien.phanTramDungBanNgay / 100 : null,
      banDienDu: hs.dien.banDienDu, mang, dn, cfgKT,
    };
  }

  function phuongAnMoi(i) {
    const soTamMang = {}; for (const m of nc.mang) soTamMang[m.id] = m.toiDa;
    return { id: TI.taoId('pa'), ten: `Phương án ${i + 1}`, soTamMang,
      inverter: hs.kyThuat ? hs.kyThuat.inverter : null, soLuong: hs.kyThuat ? hs.kyThuat.soLuong || 1 : 1, pin: null };
  }

  function phanTichPA(pa) {
    const ban = structuredClone(pa);
    for (const m of nc.mang) ban.soTamMang[m.id] = Math.min(SO(ban.soTamMang[m.id]) ? ban.soTamMang[m.id] : m.toiDa, m.toiDa);
    for (const k of Object.keys(ban.soTamMang)) if (!nc.mang.find(m => m.id === k)) delete ban.soTamMang[k];
    const kq = TaiChinh.phanTich(ban, nc);
    const inv = nc.dsINV.find(d => d.model === pa.inverter) || null;
    kq.kt = KyThuat.tinh({ tp: nc.tp, inv, cfg: nc.cfgKT, nhomTam: nc.mang.map(m => ({ id: m.id, ten: m.ten, n: ban.soTamMang[m.id] || 0 })).filter(g => g.n > 0),
      dat: { soLuong: pa.soLuong, nhom: {} }, chieuDaiMacDinh: hs.dien.quangDuongDayM, loaiDien: hs.dien.loaiDien });
    if (pa.pin && pa.pin.model && inv && inv.loai !== 'Hybrid') kq.kt.loi.push('Có pin lưu trữ nhưng inverter không phải loại Hybrid.');
    return { pa: ban, kq, inv };
  }

  // ---------- Màn hình ----------
  async function ve(v, hoSo, hamLuu) {
    hs = hoSo; luuSau = hamLuu; vung = v;
    nc = await dungNguCanh();
    if (!nc.mang.length) {
      v.replaceChildren(TI.el('div', { class: 'the trong' }, TI.el('b', {}, 'Chưa có tấm pin nào'),
        TI.el('p', { class: 'mo' }, 'Cần xếp pin ở thẻ "Xếp pin" trước.'), TI.el('a', { class: 'nut', href: `#/ho-so/${hs.id}/xep-pin` }, 'Sang thẻ Xếp pin')));
      return;
    }
    if (!Array.isArray(hs.phuongAn) || !hs.phuongAn.length || !hs.phuongAn[0].soTamMang) hs.phuongAn = [phuongAnMoi(0)];
    if (!hs.baoGia || !hs.phuongAn.find(p => p.id === hs.baoGia.deXuat)) hs.baoGia = { deXuat: hs.phuongAn[0].id };
    veLai();
  }

  function veLai() {
    const ketQua = hs.phuongAn.map(phanTichPA);
    const dx = ketQua.find(k => k.pa.id === hs.baoGia.deXuat) || ketQua[0];
    vung.replaceChildren(
      veThieu(dx),
      TI.el('h3', {}, 'Các phương án'),
      ...ketQua.map((k, i) => veTheP(k, i)),
      hs.phuongAn.length < 3 ? TI.el('button', { type: 'button', class: 'nut', onclick: () => {
        const moi = structuredClone(hs.phuongAn[hs.phuongAn.length - 1]); moi.id = TI.taoId('pa'); moi.ten = `Phương án ${hs.phuongAn.length + 1}`;
        hs.phuongAn.push(moi); luuSau(); veLai();
      } }, ...Icon.chu('plus', 'Thêm phương án (nhân bản phương án cuối)')) : null,
      veSoSanh(ketQua),
      veChiTiet(dx),
      TI.el('div', { class: 'hang' },
        TI.el('button', { type: 'button', class: 'nut', onclick: () => xemTruoc(ketQua, dx) }, ...Icon.chu('eye', 'Xem trước báo giá')),
        TI.el('button', { type: 'button', class: 'nut chinh', onclick: () => xuatPDF(ketQua, dx) }, ...Icon.chu('file-download', 'Xuất PDF báo giá'))),
      TI.el('p', { class: 'mo nho' }, 'PDF dùng ảnh phối cảnh 3D mới nhất đã chụp ở thẻ 3D và mặt bằng xếp pin của phương án đề xuất.'));
  }

  function anh3D() {
    const ds = hs.hienTrang.anh.filter(a => a.loai === 'phoi-canh');
    return ds.length ? ds[ds.length - 1].id : null;
  }

  function dsThieuChung() {
    const ds = [];
    for (const [ma, ten] of [['tenThuongHieu', 'Tên thương hiệu'], ['hotline', 'Hotline'], ['diaChi', 'Địa chỉ công ty']]) if (nc.dn[ma] === CAN_DIEN) ds.push(ten);
    if (!anh3D()) ds.push('Ảnh phối cảnh 3D (bấm "Chụp ảnh vào hồ sơ" ở thẻ 3D)');
    if (!hs.khach.ten) ds.push('Tên khách hàng');
    return ds;
  }

  function veThieu(dx) {
    const ds = [...dx.kq.thieu, ...dsThieuChung()];
    return ds.length ? TI.el('div', { class: 'the canh-bao nho' }, TI.el('b', {}, `Còn thiếu (${CAN_DIEN}) – báo giá sẽ in chữ đỏ ở các chỗ này:`),
      TI.el('ul', { class: 'ds-thieu' }, ...ds.map(t => TI.el('li', {}, t))),
      TI.el('a', { href: '#/cai-dat' }, 'Cài đặt'), ' · ', TI.el('a', { href: `#/ho-so/${hs.id}/thong-so` }, 'Thông số'))
      : TI.el('div', { class: 'the dat nho co-icon' }, Icon('circle-check'), 'Đủ số liệu để xuất báo giá.');
  }

  function veTheP({ pa, kq, inv }, i) {
    const goc = hs.phuongAn[i], laDX = goc.id === hs.baoGia.deXuat;
    const doi = () => { luuSau(); veLai(); };
    const noiDung = [
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Tên phương án'),
        TI.el('input', { type: 'text', value: goc.ten, oninput: (e) => { goc.ten = e.target.value; luuSau(); } })),
      ...nc.mang.map(m => TI.el('label', { class: 'truong' }, TI.el('span', {}, `Số tấm ${m.ten} (tối đa ${m.toiDa})`),
        TI.el('div', { class: 'co-don-vi' }, TI.oSo(pa.soTamMang[m.id], (n) => { goc.soTamMang[m.id] = n === null ? m.toiDa : Math.max(0, Math.min(Math.round(n), m.toiDa)); luuSau(); }, { onchange: veLai }), TI.el('i', {}, 'tấm')))),
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Inverter'),
        TI.el('select', { onchange: (e) => { goc.inverter = e.target.value || null; doi(); } },
          TI.el('option', { value: '' }, '— chọn —'),
          ...nc.dsINV.map(d => TI.el('option', { value: d.model, selected: d.model === goc.inverter }, `${d.model} (${SO(d.congSuatACkW) ? TI.soVN(d.congSuatACkW) + ' kW' : '?'}, ${d.loai})`)))),
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Số lượng inverter'),
        TI.el('div', { class: 'co-don-vi' }, TI.oSo(goc.soLuong, (n) => { goc.soLuong = n; luuSau(); }, { onchange: veLai }), TI.el('i', {}, 'cái'))),
      TI.el('div', { class: 'luoi-o' },
        TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Pin lưu trữ'),
          TI.el('select', { onchange: (e) => { goc.pin = e.target.value ? { model: e.target.value, soLuong: (goc.pin && goc.pin.soLuong) || 1 } : null; doi(); } },
            TI.el('option', { value: '' }, 'Không'),
            ...nc.dsPin.map(d => TI.el('option', { value: d.model, selected: goc.pin && goc.pin.model === d.model }, `${d.model} (${SO(d.dungLuongKWh) ? TI.soVN(d.dungLuongKWh) + ' kWh' : '?'})`)))),
        goc.pin ? TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Số bộ pin'),
          TI.el('div', { class: 'co-don-vi' }, TI.oSo(goc.pin.soLuong, (n) => { goc.pin.soLuong = n || 1; luuSau(); }, { onchange: veLai }), TI.el('i', {}, 'bộ'))) : null),
      TI.el('div', { class: 'ket-qua-pa' },
        dong('Công suất', SO(pa.kWp) ? `${TI.soVN(pa.kWp, 2)} kWp (${pa.soTam} tấm)` : CAN_DIEN),
        dong('Sản lượng dự kiến', SO(kq.SLnam) ? `${TI.soVN(kq.SLnam, 0)} kWh/năm` : CAN_DIEN),
        dong('Tiết kiệm năm đầu', tien(kq.tietKiemNam1)),
        dong('Tổng chi phí', tien(kq.chiPhi.tong)),
        dong('Hoàn vốn dự kiến', nam(kq.hoanVon)),
        dong('Kỹ thuật', kq.kt.loi.length ? `${kq.kt.loi.length} lỗi` : kq.kt.nhom.length ? 'Đạt' : 'Chưa đủ số liệu', kq.kt.loi.length ? 'khong-dat' : '')),
      kq.kt.loi.length ? TI.el('ul', { class: 'ds-thieu nho can-dien' }, ...kq.kt.loi.map(l => TI.el('li', {}, l))) : null,
      TI.el('div', { class: 'hang' },
        TI.el('label', { class: 'lua-chon' }, TI.el('input', { type: 'radio', name: 'de-xuat', checked: laDX, onchange: () => { hs.baoGia.deXuat = goc.id; doi(); } }), 'Phương án đề xuất (in chi tiết trong báo giá)'),
        hs.phuongAn.length > 1 ? TI.el('button', { type: 'button', class: 'nut nho nguy-hiem', onclick: () => {
          if (!confirm(`Xóa "${goc.ten}"?`)) return;
          hs.phuongAn.splice(i, 1); if (laDX) hs.baoGia.deXuat = hs.phuongAn[0].id; doi();
        } }, 'Xóa') : null),
    ];
    return TI.el('details', { class: 'nhom' + (laDX ? ' pa-de-xuat' : ''), open: laDX },
      TI.el('summary', {}, TI.el('span', {}, goc.ten), TI.el('span', { class: 'nhan' + (laDX ? ' nhan-du' : '') }, laDX ? 'Đề xuất' : SO(pa.kWp) ? `${TI.soVN(pa.kWp, 1)} kWp` : '')),
      TI.el('div', { class: 'nhom-noi-dung' }, ...noiDung));
  }
  const dong = (a, b, cls = '') => TI.el('div', { class: 'dong-kt ' + cls }, TI.el('span', {}, a), TI.el('b', {}, b));

  function bangSoSanh(ketQua) {
    const hang = [
      ['Công suất', k => SO(k.pa.kWp) ? `${TI.soVN(k.pa.kWp, 2)} kWp` : CAN_DIEN],
      ['Số tấm', k => String(k.pa.soTam)],
      ['Inverter', k => k.inv ? `${k.inv.model} × ${k.pa.soLuong || 1}` : CAN_DIEN],
      ['Pin lưu trữ', k => k.pa.pin && k.pa.pin.model ? `${k.pa.pin.model} × ${k.pa.pin.soLuong || 1}` : 'Không'],
      ['Sản lượng/năm', k => SO(k.kq.SLnam) ? `${TI.soVN(k.kq.SLnam, 0)} kWh` : CAN_DIEN],
      ['Tiết kiệm năm đầu', k => tien(k.kq.tietKiemNam1)],
      ['Tổng chi phí', k => tien(k.kq.chiPhi.tong)],
      ['Hoàn vốn dự kiến', k => nam(k.kq.hoanVon)],
    ];
    return TI.el('table', { class: 'bang-so bang-so-sanh' },
      TI.el('thead', {}, TI.el('tr', {}, TI.el('th', {}, ''), ...ketQua.map(k => TI.el('th', {}, k.pa.ten, k.pa.id === hs.baoGia.deXuat ? TI.el('span', { class: 'nhan-de-xuat' }, Icon('star', { co: 14 }), 'Đề xuất') : null)))),
      TI.el('tbody', {}, ...hang.map(([ten, f]) => TI.el('tr', {}, TI.el('td', {}, ten), ...ketQua.map(k => TI.el('td', { class: f(k).includes(CAN_DIEN) ? 'can-dien' : '' }, f(k)))))));
  }
  function veSoSanh(ketQua) {
    return TI.el('div', {}, TI.el('h3', {}, 'So sánh phương án'), TI.el('div', { class: 'cuon-ngang' }, bangSoSanh(ketQua)));
  }

  function veChiTiet(dx) {
    const kq = dx.kq, nd = [TI.el('h3', {}, `Chi tiết: ${dx.pa.ten}`)];
    if (kq.SL) {
      const c = TI.el('canvas', { class: 'bieu-do' });
      veBieuDo(c, kq.SL, 700, 260);
      nd.push(TI.el('div', { class: 'the' }, TI.el('h4', {}, 'Sản lượng dự kiến 12 tháng'), c,
        TI.el('p', { class: 'mo nho' }, `= ${TI.soVN(dx.pa.kWp, 2)} kWp × giờ nắng đỉnh tháng × PR ${TI.soVN(nc.PR)} × số ngày.`)));
    }
    nd.push(TI.el('div', { class: 'the' }, TI.el('h4', {}, 'Bảng giá'), bangGia(kq.chiPhi)));
    if (kq.nam1) {
      nd.push(TI.el('div', { class: 'the' }, TI.el('h4', {}, 'Tiền điện năm đầu (theo bậc thang EVN)'),
        dong('Tiêu thụ mỗi tháng (TB hóa đơn)', `${TI.soVN(nc.C, 0)} kWh`),
        dong('Tiền điện 1 tháng theo bậc thang', tien(kq.nam1.thang[0].tienTruoc)),
        SO(nc.tienHD) ? dong('Tiền điện TB trên hóa đơn thật', tien(nc.tienHD)) : null,
        dong('Tiền điện cả năm – trước khi lắp', tien(kq.nam1.truoc)),
        dong('Tiền điện cả năm – sau khi lắp', tien(kq.nam1.sau)),
        dong('Tiết kiệm năm đầu', tien(kq.nam1.tietKiem), 'dat'),
        dong('Điện mặt trời tự dùng', `${TI.soVN(kq.nam1.tuDung, 0)} / ${TI.soVN(kq.SLnam, 0)} kWh`),
        TI.el('p', { class: 'mo nho' }, 'Điện mặt trời dư (không dùng hết) chưa tính thành tiền.')));
    }
    return TI.el('div', {}, ...nd);
  }

  function bangGia(cp) {
    return TI.el('table', { class: 'bang-so bang-gia' },
      TI.el('thead', {}, TI.el('tr', {}, TI.el('th', {}, 'Hạng mục'), TI.el('th', {}, 'SL'), TI.el('th', {}, 'Đơn giá'), TI.el('th', {}, 'Thành tiền'))),
      TI.el('tbody', {}, ...cp.dong.map(d => TI.el('tr', {},
        TI.el('td', {}, d.ten), TI.el('td', {}, `${TI.soVN(d.soLuong, 2)} ${d.donVi}`),
        TI.el('td', { class: SO(d.donGia) ? '' : 'can-dien' }, SO(d.donGia) ? TI.soVN(d.donGia, 0) : CAN_DIEN),
        TI.el('td', { class: SO(d.thanhTien) ? '' : 'can-dien' }, SO(d.thanhTien) ? TI.soVN(Math.round(d.thanhTien), 0) : CAN_DIEN)))),
      TI.el('tfoot', {}, TI.el('tr', {}, TI.el('td', { colspan: '3' }, 'TỔNG CỘNG'), TI.el('td', { class: SO(cp.tong) ? '' : 'can-dien' }, SO(cp.tong) ? tien(cp.tong) : CAN_DIEN))));
  }

  function veBieuDo(c, SL, W, H) {
    const dpr = 2; c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const max = Math.max(...SL) * 1.15 || 1, trai = 50, duoi = 28, tren = 14, rong = (W - trai - 10) / 12;
    g.strokeStyle = '#e3e8ee'; g.fillStyle = '#5f6b78'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = tren + (H - tren - duoi) * (1 - i / 4);
      g.beginPath(); g.moveTo(trai, y); g.lineTo(W - 10, y); g.stroke();
      g.fillText(TI.soVN(max * i / 4, 0), trai - 6, y + 4);
    }
    SL.forEach((v, i) => {
      const h = (H - tren - duoi) * v / max, x = trai + i * rong + rong * 0.18, y = H - duoi - h;
      g.fillStyle = '#f0a020'; g.fillRect(x, y, rong * 0.64, h);
      g.fillStyle = '#1d2733'; g.textAlign = 'center'; g.font = '10px system-ui, sans-serif';
      g.fillText(TI.soVN(v, 0), x + rong * 0.32, y - 4);
      g.fillStyle = '#5f6b78'; g.font = '11px system-ui, sans-serif'; g.fillText(THANG[i], x + rong * 0.32, H - 10);
    });
    g.save(); g.translate(12, H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = '#5f6b78'; g.fillText('kWh', 0, 0); g.restore();
    return c;
  }

  // Ảnh mặt bằng xếp pin của 1 phương án (lấy n tấm đầu của mỗi mảng).
  function anhMatBang(pa, W = 700, H = 460) {
    const f = ManVeMai.boDoiCuaHoSo(hs);
    const dsNC = XepPin.nguCanh(hs.mai, f);
    const c = document.createElement('canvas'); const dpr = 2; c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const tat = dsNC.flatMap(n => n.P); const xs = tat.map(p => p[0]), ys = tat.map(p => p[1]);
    const x0 = Math.min(...xs) - 0.8, y0 = Math.min(...ys) - 0.8, x1 = Math.max(...xs) + 0.8, y1 = Math.max(...ys) + 0.8;
    const s = Math.min((W - 20) / (x1 - x0), (H - 40) / (y1 - y0));
    const ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = 10 + (H - 40 - (y1 - y0) * s) / 2 - y0 * s;
    const S = (p) => [p[0] * s + ox, p[1] * s + oy];
    const duong = (P) => { g.beginPath(); P.forEach((p, i) => { const q = S(p); i ? g.lineTo(...q) : g.moveTo(...q); }); g.closePath(); };
    for (const n of dsNC) { duong(n.P); g.fillStyle = n.mang.loai === 'ton' ? '#efe6f6' : '#e8eef6'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#555'; g.stroke(); }
    for (const v of hs.mai.vatCan.filter(v => v.diem.length >= 3)) { duong(v.diem.map(f)); g.fillStyle = '#ffd7d7'; g.fill(); g.strokeStyle = '#c62828'; g.lineWidth = 1; g.stroke(); }
    if (nc.tp && SO(nc.tp.daiMm)) {
      for (const n of dsNC) {
        const tams = hs.xepPin.tam.filter(t => t.mang === n.mang.id).sort((a, b) => a.v - b.v || a.u - b.u).slice(0, pa.soTamMang[n.mang.id] ?? 0);
        for (const t of tams) { duong(XepPin.daGiacTamChung(n, t, nc.tp)); g.fillStyle = '#1d3557'; g.fill(); g.strokeStyle = '#a8b8d8'; g.lineWidth = 1; g.stroke(); }
      }
    }
    for (const n of dsNC) {
      const so = Math.min(pa.soTamMang[n.mang.id] ?? 0, hs.xepPin.tam.filter(t => t.mang === n.mang.id).length);
      const [x, y] = S(HH.trongTam(n.P)); g.font = '600 13px system-ui, sans-serif'; g.textAlign = 'center';
      g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(`${n.mang.ten || 'Mảng mái'}: ${so} tấm`, x, y); g.fillStyle = '#b45309'; g.fillText(`${n.mang.ten || 'Mảng mái'}: ${so} tấm`, x, y);
    }
    // Thước tỉ lệ 5 m
    const L = 5 * s; g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, H - 14); g.lineTo(14 + L, H - 14); g.stroke();
    g.fillStyle = '#222'; g.textAlign = 'left'; g.font = '11px system-ui, sans-serif'; g.fillText('5 m', 18 + L, H - 10);
    return c.toDataURL('image/png');
  }

  // ---------- Các trang báo giá A4 ----------
  async function taoTrang(ketQua, dx) {
    const h = TI.el, dn = nc.dn, pa = dx.pa, kq = dx.kq;
    const cd = (x) => x === CAN_DIEN || x === undefined || x === null || x === '' ? h('span', { class: 'can-dien' }, CAN_DIEN) : String(x);
    const ngay = TI.ngayVN(TI.homNay());
    const soBG = `BG-${TI.homNay().replace(/-/g, '')}-${hs.id.slice(-4).toUpperCase()}`;
    const dauTrang = () => h('div', { class: 'bg-dau' },
      h('img', { src: dn.logo && dn.logo !== CAN_DIEN ? dn.logo : 'anh/logo-tdh.png', alt: '' }),
      h('div', { class: 'bg-dn' }, h('b', {}, cd(dn.tenThuongHieu)), h('div', {}, cd(dn.tenDayDu)),
        h('div', {}, 'Hotline: ', cd(dn.hotline), ' · Zalo: ', cd(dn.zalo)), h('div', {}, cd(dn.diaChi))));
    const trang = (so, ...con) => h('div', { class: 'trang-a4' }, dauTrang(), ...con, h('div', { class: 'bg-chan' }, `${soBG} · Trang ${so}/4`));
    const muc = (so, ten) => h('h2', { class: 'bg-muc' }, `${so}. ${ten}`);
    const bang = (dsHang) => h('table', { class: 'bg-bang' }, h('tbody', {}, ...dsHang.map(([a, b]) => h('tr', {}, h('th', {}, a), h('td', {}, b)))));

    // Ảnh
    let anhPC = null;
    const idPC = anh3D();
    if (idPC) { const a = await LuuTru.lay('anh', idPC); anhPC = a && a.dataURL; }
    const anhMB = anhMatBang(pa);
    const bd = kq.SL ? veBieuDo(document.createElement('canvas'), kq.SL, 700, 250).toDataURL('image/png') : null;

    const t1 = trang(1,
      h('h1', { class: 'bg-tieu-de' }, 'BÁO GIÁ HỆ THỐNG ĐIỆN MẶT TRỜI MÁI NHÀ'),
      h('div', { class: 'bg-so' }, `Số: ${soBG} · Ngày: ${ngay} · Hiệu lực: `, cd(dn.hieuLucBaoGiaNgay), ' ngày'),
      muc(1, 'Thông tin khách hàng và đơn vị tư vấn'),
      h('div', { class: 'bg-hai-cot' },
        bang([['Quý khách', cd(hs.khach.ten)], ['Điện thoại', cd(hs.khach.dienThoai)], ['Địa chỉ lắp đặt', cd(hs.khach.diaChi)]]),
        bang([['Đơn vị tư vấn', cd(dn.tenThuongHieu)], ['Người tư vấn', cd(dn.nguoiTuVan)], ['Liên hệ', cd(dn.hotline)]])),
      muc(2, 'Phối cảnh 3D và mặt bằng xếp pin'),
      anhPC ? h('img', { class: 'bg-anh-3d', src: anhPC, alt: '' }) : h('div', { class: 'bg-anh-trong' }, h('span', { class: 'can-dien' }, `${CAN_DIEN} ảnh phối cảnh 3D`)),
      h('img', { class: 'bg-anh-mb', src: anhMB, alt: '' }),
      h('p', { class: 'bg-ghi-chu' }, 'Hình minh họa dựng theo số đo khảo sát; vị trí tấm có thể điều chỉnh nhỏ khi thi công.'));

    const tpm = nc.tp || {};
    const t2 = trang(2,
      muc(3, 'Thông số hệ thống'),
      bang([
        ['Tấm pin', h('span', {}, cd(tpm.model), ` – ${SO(tpm.congSuatW) ? TI.soVN(tpm.congSuatW) + ' W' : CAN_DIEN}/tấm`)],
        ['Số tấm', `${pa.soTam} tấm (${nc.mang.map(m => `${m.ten}: ${pa.soTamMang[m.id] || 0}`).join('; ')})`],
        ['Tổng công suất', SO(pa.kWp) ? `${TI.soVN(pa.kWp, 2)} kWp` : cd(null)],
        ['Inverter', dx.inv ? `${dx.inv.model} × ${pa.soLuong || 1} (${TI.soVN(dx.inv.congSuatACkW)} kW, ${dx.inv.loai}, ${dx.inv.soPha})` : cd(null)],
        ['Pin lưu trữ', pa.pin && pa.pin.model ? `${pa.pin.model} × ${pa.pin.soLuong || 1}` : 'Không'],
        ['Cách lắp', nc.mang.filter(m => pa.soTamMang[m.id]).map(m => `${m.ten}: ${m.kieuLap === 'khung-nang' ? 'khung nâng' : 'áp mái'}`).join('; ')],
        ['Tỉ lệ DC/AC', SO(kq.kt.dcAc) ? TI.soVN(kq.kt.dcAc, 2) : cd(null)],
      ]),
      muc(4, 'Sản lượng điện dự kiến 12 tháng'),
      bd ? h('img', { class: 'bg-bieu-do', src: bd, alt: '' }) : h('div', { class: 'bg-anh-trong' }, h('span', { class: 'can-dien' }, `${CAN_DIEN} giờ nắng / PR`)),
      kq.SL ? h('table', { class: 'bg-bang bg-thang' },
        h('tr', {}, h('th', {}, 'Tháng'), ...THANG.map(t => h('th', {}, t))),
        h('tr', {}, h('th', {}, 'kWh'), ...kq.SL.map(v => h('td', {}, TI.soVN(v, 0))))) : null,
      h('p', { class: 'bg-ghi-chu' }, `Tổng dự kiến: ${SO(kq.SLnam) ? TI.soVN(kq.SLnam, 0) + ' kWh/năm' : CAN_DIEN}. Ước tính theo số giờ nắng đỉnh trung bình từng tháng (nguồn: `,
        cd(nc.nguonNang), `) và hệ số hiệu suất hệ thống PR ${SO(nc.PR) ? TI.soVN(nc.PR) : CAN_DIEN}. Sản lượng thực tế thay đổi theo thời tiết từng năm.`));

    const vatGhi = [['Tấm pin', nc.vat.tamPin], ['Inverter', nc.vat.inverter], ['Thi công', nc.vat.thiCong]].map(([a, b]) => `${a}: ${b === CAN_DIEN || !b ? CAN_DIEN : b.replace('Đã gồm', 'đã gồm').replace('Chưa gồm', 'chưa gồm')}`).join('; ');
    const t3 = trang(3,
      muc(5, 'Bảng giá chi tiết'),
      bangGia(kq.chiPhi),
      h('p', { class: 'bg-ghi-chu' }, `Thuế VAT – ${vatGhi}.`),
      muc(6, 'Tiết kiệm, hoàn vốn và so sánh phương án'),
      bang([
        ['Tiêu thụ điện hiện tại', SO(nc.C) ? `khoảng ${TI.soVN(nc.C, 0)} kWh/tháng (trung bình hóa đơn)` : cd(null)],
        ['Tiền điện năm đầu – chưa lắp', kq.nam1 ? tien(kq.nam1.truoc) : cd(null)],
        ['Tiền điện năm đầu – sau khi lắp', kq.nam1 ? tien(kq.nam1.sau) : cd(null)],
        ['Tiết kiệm dự kiến năm đầu', kq.nam1 ? h('b', {}, tien(kq.nam1.tietKiem)) : cd(null)],
        ['Thời gian hoàn vốn dự kiến', SO(kq.hoanVon) ? h('b', {}, `khoảng ${TI.soVN(kq.hoanVon, 1)} năm`) : cd(null)],
      ]),
      ketQua.length > 1 ? bangSoSanh(ketQua) : null,
      h('p', { class: 'bg-ghi-chu' }, 'Tiền điện tính theo bảng giá bậc thang EVN (', cd(nc.bt.nguon), ', áp dụng từ ', cd(nc.bt.ngay),
        `). Ước tính với giả định: tiêu thụ mỗi tháng bằng trung bình hóa đơn, ${SO(nc.d) ? TI.soVN(nc.d * 100, 0) : CAN_DIEN}% điện dùng ban ngày, điện dư chưa tính thành tiền, hiệu suất tấm giảm ${SO(nc.suyGiam) ? TI.soVN(nc.suyGiam) : CAN_DIEN}%/năm, chưa tính tăng giá điện.`));

    const buoc = String(dn.cacBuocTiepTheo || '').split(';').map(s => s.trim()).filter(Boolean);
    const t4 = trang(4,
      muc(7, 'Bảo hành và các bước tiếp theo'),
      bang([
        ['Tấm pin – sản phẩm', h('span', {}, cd(dn.baoHanhTamPinNam), ' năm')],
        ['Tấm pin – hiệu suất', h('span', {}, cd(dn.baoHanhHieuSuatNam), ' năm')],
        ['Inverter', h('span', {}, cd(dn.baoHanhInverterNam), ' năm')],
        ['Thi công, chống dột', h('span', {}, cd(dn.baoHanhThiCongNam), ' năm')],
      ]),
      h('h3', { class: 'bg-nho' }, 'Các bước tiếp theo'),
      buoc.length && dn.cacBuocTiepTheo !== CAN_DIEN ? h('ol', { class: 'bg-buoc' }, ...buoc.map(b => h('li', {}, b))) : cd(null),
      h('div', { class: 'bg-luu-y' }, h('b', {}, 'Lưu ý: '), 'Các số liệu sản lượng, tiết kiệm và hoàn vốn trong báo giá là ước tính dự kiến theo số liệu khảo sát, hóa đơn điện và giờ nắng trung bình; kết quả thực tế có thể khác. Chúng tôi sẵn sàng giải đáp mọi thắc mắc của Quý khách.'),
      h('div', { class: 'bg-ky' }, h('div', {}, h('b', {}, 'Đại diện khách hàng'), h('div', { class: 'bg-ky-o' })), h('div', {}, h('b', {}, 'Đơn vị tư vấn'), h('div', { class: 'bg-ky-o' }), cd(dn.nguoiTuVan))),
      h('p', { class: 'bg-cam-on' }, 'Trân trọng cảm ơn Quý khách đã quan tâm!'));
    return [t1, t2, t3, t4];
  }

  async function xemTruoc(ketQua, dx) {
    const trang = await taoTrang(ketQua, dx);
    const ti = Math.min(1, (window.innerWidth - 24) / 794);
    const lop = TI.el('div', { class: 'lop-xem-truoc' },
      TI.el('div', { class: 'hang' }, TI.el('button', { type: 'button', class: 'nut', onclick: () => lop.remove() }, ...Icon.chu('x', 'Đóng')),
        TI.el('button', { type: 'button', class: 'nut chinh', onclick: () => { lop.remove(); xuatPDF(ketQua, dx); } }, ...Icon.chu('file-download', 'Xuất PDF'))),
      ...trang.map(t => TI.el('div', { class: 'khung-trang', style: `width:${794 * ti}px;height:${1123 * ti}px` },
        (t.style.transform = `scale(${ti})`, t.style.transformOrigin = '0 0', t))));
    document.body.append(lop);
  }

  async function napThuVien() {
    if (window.html2canvas && window.jspdf) return;
    for (const url of THU_VIEN) {
      await new Promise((ok, loi) => { const s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = () => { s.remove(); loi(new Error('Không tải được thư viện PDF (cần mạng).')); }; document.head.append(s); });
    }
  }

  async function taoPDF(ketQua, dx) {
    await napThuVien();
    const trang = await taoTrang(ketQua, dx);
    const giu = TI.el('div', { class: 'giu-trang' }, ...trang);
    document.body.append(giu);
    try {
      await Promise.all([...giu.querySelectorAll('img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      for (let i = 0; i < trang.length; i++) {
        const c = await html2canvas(trang[i], { scale: 2, backgroundColor: '#ffffff', logging: false });
        if (i) pdf.addPage();
        pdf.addImage(c.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297);
      }
      return { blob: pdf.output('blob'), soTrang: trang.length };
    } finally { giu.remove(); }
  }

  async function xuatPDF(ketQua, dx) {
    const thieu = [...dx.kq.thieu, ...dsThieuChung()];
    if (thieu.length && !confirm(`Báo giá còn ${thieu.length} mục ${CAN_DIEN} (sẽ in chữ đỏ). Vẫn xuất PDF bản nháp?`)) return;
    TI.thongBao('Đang tạo PDF…');
    try {
      const { blob } = await taoPDF(ketQua, dx);
      await TI.luuFile(`bao-gia-${TI.tenFile(hs.khach.ten)}-${TI.homNay()}.pdf`, blob, 'application/pdf');
      TI.thongBao('Đã tạo PDF báo giá');
    } catch (e) { alert('Không tạo được PDF: ' + e.message); }
  }

  return { ve, _taoPDF: async () => { const kq = hs.phuongAn.map(phanTichPA); return taoPDF(kq, kq.find(k => k.pa.id === hs.baoGia.deXuat) || kq[0]); },
    _ketQua: () => hs.phuongAn.map(phanTichPA), _nc: () => nc };
})();
