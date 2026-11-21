// Thanh tiến trình 7 bước của một hồ sơ.
// Mỗi bước có 1 trong 4 trạng thái: xong · đang làm · thiếu dữ liệu · chưa tới.
// Vẽ thành: thước ngang (điện thoại), cột bước dọc (máy tính), và bảng liệt kê chỗ còn thiếu (bấm "Các bước").
const TienTrinh = (() => {
  const BUOC = [
    { ma: 'thong-so', ten: 'Thông số', icon: 'ruler' },
    { ma: 'khao-sat', ten: 'Khảo sát', icon: 'clipboard-check' },
    { ma: 've-mai', ten: 'Vẽ mái', icon: 'drone' },
    { ma: 'xep-pin', ten: 'Xếp pin', icon: 'solar-panel' },
    { ma: '3d', ten: '3D', icon: 'box' },
    { ma: 'ky-thuat', ten: 'Kỹ thuật', icon: 'bolt' },
    { ma: 'bao-gia', ten: 'Báo giá', icon: 'file-invoice' },
  ];
  const TEN_TT = { xong: 'Xong', dang: 'Đang làm', thieu: 'Thiếu dữ liệu', 'chua-toi': 'Chưa tới' };
  const SO = (x) => typeof x === 'number' && isFinite(x);
  const coGT = (x) => x !== null && x !== undefined && x !== '' && x !== CAN_DIEN;
  const tenBuoc = (ma) => BUOC.find(b => b.ma === ma).ten;

  async function soModel(tenFile) {
    const nd = await DuLieu.lay(tenFile);
    return nd.bang.dong.filter(d => coGT(d.model)).length;
  }

  // ---------- Tính trạng thái ----------
  // Mỗi bước: { xong, daLam, thieu: [{ chu, href }], tom, canTruoc (mã bước phải xong trước) }
  async function tinhDieuKien(hs) {
    const h = (the) => `#/ho-so/${hs.id}/${the}`;
    const kq = {};

    // 1. Thông số: mọi số đo của nhà này + số liệu chung của công ty
    {
      const n = ManThongSo.demThieu(hs);
      let c = 0;
      for (const ten of DuLieu.DANH_SACH) c += DuLieu.demCanDien(await DuLieu.lay(ten));
      const thieu = [];
      if (n) thieu.push({ chu: `${n} thông số của nhà này`, href: h('thong-so') });
      if (c) thieu.push({ chu: `${c} ô số liệu chung (thiết bị, giá, giá điện)`, href: '#/cai-dat' });
      kq['thong-so'] = { xong: !thieu.length, daLam: true, thieu,
        tom: n ? `Thiếu ${n} thông số` : c ? `Thiếu ${c} số liệu chung` : 'Đủ' };
    }

    // 2. Khảo sát
    {
      const thieu = [];
      if (!coGT(hs.khach.ten)) thieu.push({ chu: 'Họ tên khách', href: h('khao-sat') });
      if (!hs.dien.loaiDien) thieu.push({ chu: 'Điện 1 pha hay 3 pha', href: h('khao-sat') });
      if (!hs.dien.hoaDon.some(x => SO(x.kWh) && x.kWh > 0)) thieu.push({ chu: 'Số điện ít nhất 1 tháng hóa đơn', href: h('khao-sat') });
      const daLam = coGT(hs.khach.ten) || coGT(hs.khach.dienThoai) || hs.dien.hoaDon.some(x => SO(x.kWh));
      kq['khao-sat'] = { xong: !thieu.length, daLam, thieu, tom: thieu.length ? `Thiếu ${thieu.length} mục` : 'Đủ' };
    }

    // 3. Vẽ mái
    const M = hs.mai;
    const dsMang = M ? M.mangMai.filter(m => m.diem.length >= 3) : [];
    {
      const thieu = [];
      if (!M || !M.anhNen) thieu.push({ chu: 'Chọn ảnh mái chụp từ drone', href: h('ve-mai') });
      else if (!ManVeMai.boDoiCuaHoSo(hs)) thieu.push({ chu: 'Tỉ lệ mái: cạnh chuẩn đo bằng thước', href: h('ve-mai') });
      if (!dsMang.length) thieu.push({ chu: 'Vẽ ít nhất 1 mảng mái', href: h('ve-mai') });
      kq['ve-mai'] = { xong: !thieu.length, daLam: !!(M && (M.anhNen || dsMang.length)), thieu,
        tom: thieu.length ? `Thiếu ${thieu.length} mục` : `${dsMang.length} mảng mái` };
    }

    // 4. Xếp pin
    const soTam = hs.xepPin ? hs.xepPin.tam.length : 0;
    {
      const thieu = [];
      if (!(await soModel('tam-pin'))) thieu.push({ chu: 'Danh mục tấm pin (Cài đặt)', href: '#/cai-dat/tam-pin' });
      const canTruoc = kq['ve-mai'].xong ? null : 've-mai';
      kq['xep-pin'] = { xong: !canTruoc && soTam > 0, daLam: soTam > 0, thieu, canTruoc,
        tom: soTam ? `${soTam} tấm` : thieu.length ? `Thiếu ${thieu.length} mục` : 'Chưa xếp' };
    }

    // 5. 3D: cần chiều cao các mảng mái, vật cản, khung nâng
    {
      const canTruoc = kq['xep-pin'].xong ? null : 'xep-pin';
      const thieu = canTruoc ? [] : ManThongSo.dsO(hs)
        .filter(o => (o.nhom === 'Mảng mái' || o.nhom === 'Vật cản') && o.kieu !== 'lienKet' && o.batBuoc && ManThongSo.thieuO(o))
        .map(o => ({ chu: o.nhan, href: h('3d') }));
      kq['3d'] = { xong: !canTruoc && !thieu.length, daLam: !canTruoc, thieu, canTruoc,
        tom: thieu.length ? `Thiếu ${thieu.length} số đo` : 'Đủ số đo' };
    }

    // 6. Kỹ thuật
    {
      const canTruoc = kq['xep-pin'].xong ? null : 'xep-pin';
      const thieu = [];
      const inv = hs.kyThuat && hs.kyThuat.inverter;
      if (!(await soModel('inverter'))) thieu.push({ chu: 'Danh mục inverter (Cài đặt)', href: '#/cai-dat/inverter' });
      else if (!inv) thieu.push({ chu: 'Chọn inverter', href: h('ky-thuat') });
      if (!SO(hs.dien.quangDuongDayM)) thieu.push({ chu: 'Quãng đường đi dây từ mái đến inverter', href: h('thong-so') });
      kq['ky-thuat'] = { xong: !canTruoc && !thieu.length, daLam: !!inv, thieu, canTruoc,
        tom: !thieu.length && inv ? inv : thieu.length ? `Thiếu ${thieu.length} mục` : 'Chưa chọn inverter' };
    }

    // 7. Báo giá
    {
      const canTruoc = !kq['xep-pin'].xong ? 'xep-pin' : !kq['ky-thuat'].xong ? 'ky-thuat' : null;
      const xong = ['da-bao-gia', 'da-ky'].includes(hs.trangThai);
      kq['bao-gia'] = { xong, daLam: Array.isArray(hs.phuongAn) && hs.phuongAn.length > 0, thieu: [], canTruoc: xong ? null : canTruoc,
        tom: xong ? 'Đã báo giá' : 'Chưa xuất báo giá' };
    }
    return kq;
  }

  async function tinh(hs, theHienTai) {
    const dk = await tinhDieuKien(hs);
    return BUOC.map((b, i) => {
      const d = dk[b.ma];
      let goc;
      if (d.xong) goc = 'xong';
      else if (d.canTruoc) goc = 'chua-toi';
      else if (d.thieu.length && d.daLam) goc = 'thieu';
      else goc = 'chua-toi';
      const thieuHien = d.canTruoc
        ? [{ chu: `Làm xong bước ${tenBuoc(d.canTruoc)} trước`, href: `#/ho-so/${hs.id}/${d.canTruoc}` }, ...d.thieu]
        : d.xong ? [] : d.thieu;
      return { ...b, so: i + 1, tt: b.ma === theHienTai ? 'dang' : goc, goc,
        tom: d.canTruoc ? `Cần xong ${tenBuoc(d.canTruoc)}` : d.tom, thieu: thieuHien,
        soThieuRieng: d.xong || d.canTruoc ? 0 : d.thieu.length };
    });
  }

  // ---------- Vẽ ----------
  const ICON_TT = { xong: 'circle-check', thieu: 'alert-triangle', 'chua-toi': 'circle-dashed' };
  const iconTT = (b) => b.tt === 'dang' ? Icon(b.icon, { lop: 'icon-buoc' }) : Icon(ICON_TT[b.tt], { lop: 'icon-tt' });

  let hs = null, theHienTai = null, oRay = null, oThuoc = null, oBang = null, hen = null;

  function dsThieu(b, dongBang) {
    if (!b.thieu.length) return null;
    return TI.el('ul', { class: 'buoc-thieu' }, ...b.thieu.map(t => TI.el('li', {},
      TI.el('a', { href: t.href, onclick: dongBang ? () => oBang.close() : null },
        TI.el('span', {}, t.chu), TI.el('span', { class: 'di-toi' }, 'Đi tới', Icon('chevron-right', { co: 16 }))))));
  }

  function veRay(ds) {
    const k = hs.khach;
    const phu = [k.dienThoai, k.diaChi].filter(coGT).join(' · ');
    oRay.replaceChildren(
      TI.el('div', { class: 'ray-khach' }, TI.el('b', {}, coGT(k.ten) ? k.ten : 'Hồ sơ mới'), phu ? TI.el('small', {}, phu) : null),
      TI.el('ol', { class: 'ray-ds' }, ...ds.map(b => TI.el('li', { 'data-tt': b.tt, 'data-goc': b.goc },
        TI.el('a', { class: 'ray-muc', href: `#/ho-so/${hs.id}/${b.ma}`, 'aria-current': b.tt === 'dang' ? 'step' : null,
          'aria-label': `Bước ${b.so}: ${b.ten} – ${TEN_TT[b.goc]}. ${b.tom}` },
          iconTT(b), TI.el('span', { class: 'ray-chu' }, TI.el('span', { class: 'ray-ten' }, b.ten), TI.el('small', {}, b.tom))),
        b.tt === 'dang' ? dsThieu(b, false) : null))),
      TI.el('button', { type: 'button', class: 'nut-chu ray-xem-het', onclick: moBang }, Icon('list'), 'Xem mọi chỗ còn thiếu'));
  }

  function veThuoc(ds) {
    const hien = ds.find(b => b.tt === 'dang') || ds[0];
    // Chỉ đếm mục thiếu của các bước đang làm được (bước bị chặn chỉ cần xong bước trước).
    const tongThieu = ds.reduce((s, b) => s + (b.goc === 'thieu' || b.tt === 'dang' ? b.soThieuRieng : 0), 0);
    oThuoc.replaceChildren(
      TI.el('div', { class: 'thuoc-vach' }, ...ds.map(b => TI.el('a', {
        class: 'vach', 'data-tt': b.tt, 'data-goc': b.goc, href: `#/ho-so/${hs.id}/${b.ma}`,
        'aria-current': b.tt === 'dang' ? 'step' : null, 'aria-label': `Bước ${b.so}: ${b.ten} – ${TEN_TT[b.goc]}`,
      }, TI.el('span', { class: 'vach-so' }, String(b.so)), TI.el('span', { class: 'vach-doan' })))),
      TI.el('div', { class: 'thuoc-dong' },
        TI.el('div', { class: 'thuoc-ten' },
          TI.el('b', {}, `Bước ${hien.so}/7 · ${hien.ten}`),
          TI.el('small', { 'data-goc': hien.goc }, hien.tom)),
        TI.el('button', { type: 'button', class: 'nut-chu', onclick: moBang, 'aria-haspopup': 'dialog' },
          tongThieu ? `Còn thiếu ${tongThieu} mục` : 'Các bước', Icon('chevron-down', { co: 18 }))));
  }

  function veBang(ds) {
    oBang.replaceChildren(
      TI.el('div', { class: 'bang-truot-dau' },
        TI.el('b', {}, 'Các bước của hồ sơ'),
        TI.el('button', { type: 'button', class: 'nut-icon', 'aria-label': 'Đóng', onclick: () => oBang.close() }, Icon('x', { co: 22 }))),
      TI.el('ol', { class: 'ray-ds bang-ds' }, ...ds.map(b => TI.el('li', { 'data-tt': b.tt, 'data-goc': b.goc },
        TI.el('a', { class: 'ray-muc', href: `#/ho-so/${hs.id}/${b.ma}`, onclick: () => oBang.close() },
          iconTT(b), TI.el('span', { class: 'ray-chu' }, TI.el('span', { class: 'ray-ten' }, `${b.so}. ${b.ten}`), TI.el('small', {}, b.tom))),
        dsThieu(b, true)))));
  }

  function moBang() {
    if (!oBang.open) oBang.showModal();
  }

  async function veLai() {
    if (!hs) return;
    const ds = await tinh(hs, theHienTai);
    veRay(ds); veThuoc(ds); veBang(ds);
  }

  // Tạo thanh tiến trình cho hồ sơ đang mở. Trả về { ray: cột trái (máy tính), thuoc: thước (điện thoại) }.
  async function dung(hoSo, the) {
    hs = hoSo; theHienTai = the;
    oRay = TI.el('nav', { class: 'ray-buoc', 'aria-label': 'Các bước của hồ sơ' });
    oThuoc = TI.el('nav', { class: 'thuoc', 'aria-label': 'Các bước của hồ sơ' });
    if (oBang) oBang.remove();
    oBang = TI.el('dialog', { class: 'bang-truot', 'aria-label': 'Các bước của hồ sơ',
      onclick: (e) => { if (e.target === oBang) oBang.close(); } });
    document.body.append(oBang);
    await veLai();
    return { ray: oRay, thuoc: oThuoc };
  }

  // Tính lại sau khi hồ sơ thay đổi (gọi nhiều lần liên tiếp chỉ vẽ 1 lần).
  function capNhat() {
    clearTimeout(hen);
    hen = setTimeout(() => { veLai().catch(e => console.error(e)); }, 250);
  }

  function roi() {
    clearTimeout(hen);
    hs = null;
    if (oBang) { oBang.remove(); oBang = null; }
  }

  return { BUOC, dung, capNhat, roi, tinh };
})();
