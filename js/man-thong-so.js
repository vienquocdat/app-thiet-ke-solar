// Thẻ "Thông số" trong hồ sơ: gom mọi số đo / thông số của nhà này còn thiếu vào 1 chỗ để điền sau,
// kèm danh sách số liệu chung (Cài đặt) còn [CẦN ĐIỀN].
const ManThongSo = (() => {
  const SO = (x) => typeof x === 'number' && isFinite(x);

  // Danh sách các ô của hồ sơ. Mỗi ô: { nhom, nhan, dv, kieu: 'so'|'chon'|'lienKet', lay, dat, batBuoc, the, ghiChu }
  function dsO(hs) {
    const ds = [];
    const lk = (nhom, nhan, du, the, ghiChu) => ds.push({ nhom, nhan, kieu: 'lienKet', du, the, ghiChu, batBuoc: true });

    // --- Khảo sát ---
    ds.push({ nhom: 'Khảo sát', nhan: 'Điện nhà khách', kieu: 'chon', batBuoc: true,
      tc: [['', '— chọn —'], ['1-pha', '1 pha'], ['3-pha', '3 pha']],
      lay: () => hs.dien.loaiDien, dat: (v) => { hs.dien.loaiDien = v; } });
    const coHoaDon = hs.dien.hoaDon.some(h => SO(h.kWh) && h.kWh > 0);
    lk('Khảo sát', 'Số điện (kWh) ít nhất 1 tháng hóa đơn', coHoaDon, 'khao-sat', coHoaDon ? 'Đã có' : 'Nhập ở thẻ Khảo sát → Hóa đơn');
    ds.push({ nhom: 'Khảo sát', nhan: 'Quãng đường đi dây từ mái đến inverter', dv: 'm', kieu: 'so', batBuoc: true,
      lay: () => hs.dien.quangDuongDayM, dat: (n) => { hs.dien.quangDuongDayM = n; }, ghiChu: 'Dùng tính sụt áp cáp DC (Giai đoạn 5)' });

    // --- Tỉ lệ mái ---
    const M = hs.mai;
    if (!M || !M.anhNen) {
      lk('Tỉ lệ mái', 'Ảnh mái và tỉ lệ', false, 've-mai', 'Chưa chọn ảnh mái ở thẻ Vẽ mái');
    } else if (M.cheDo === 'thang') {
      if (M.tiLe.diem.length < 2) lk('Tỉ lệ mái', 'Kẻ cạnh chuẩn trên ảnh', false, 've-mai', 'Kẻ ở thẻ Vẽ mái → Tỉ lệ');
      ds.push({ nhom: 'Tỉ lệ mái', nhan: 'Chiều dài thật của cạnh chuẩn (đo bằng thước)', dv: 'm', kieu: 'so', batBuoc: true,
        lay: () => M.tiLe.chieuDaiM, dat: (n) => { M.tiLe.chieuDaiM = n; } });
    } else {
      if (M.nan.diem.length < 4) lk('Tỉ lệ mái', 'Chấm 4 góc hình chữ nhật chuẩn trên ảnh', false, 've-mai', 'Chấm ở thẻ Vẽ mái → Tỉ lệ');
      ds.push({ nhom: 'Tỉ lệ mái', nhan: 'Cạnh A (góc 1→2) đo bằng thước', dv: 'm', kieu: 'so', batBuoc: true,
        lay: () => M.nan.canhA, dat: (n) => { M.nan.canhA = n; } });
      ds.push({ nhom: 'Tỉ lệ mái', nhan: 'Cạnh B (góc 2→3) đo bằng thước', dv: 'm', kieu: 'so', batBuoc: true,
        lay: () => M.nan.canhB, dat: (n) => { M.nan.canhB = n; } });
    }

    if (M) {
      // --- Mảng mái ---
      const dsMang = M.mangMai.filter(m => m.diem.length >= 3);
      if (!dsMang.length) lk('Mảng mái', 'Vẽ ít nhất 1 mảng mái', false, 've-mai', 'Vẽ ở thẻ Vẽ mái → Mảng mái');
      for (const m of dsMang) {
        const ten = m.ten || 'Mảng mái';
        if (!m.xep) m.xep = XepPin.caiDatMacDinh(m, m.diem);
        ds.push({ nhom: 'Mảng mái', nhan: `${ten}: độ dốc mái`, dv: '°', kieu: 'so', batBuoc: m.loai === 'ton',
          lay: () => m.doDocDo, dat: (n) => { m.doDocDo = n; }, ghiChu: m.loai === 'ton' ? 'Mái tôn cần độ dốc để tính diện tích và xếp tấm' : 'Mái bằng nhập 0' });
        ds.push({ nhom: 'Mảng mái', nhan: `${ten}: cách lắp`, kieu: 'chon', batBuoc: true,
          tc: [['ap-mai', 'Áp mái'], ['khung-nang', 'Khung nâng']],
          lay: () => m.xep.kieuLap, dat: (v) => { m.xep.kieuLap = v; }, veLai: true });
        if (m.xep.kieuLap === 'khung-nang') {
          ds.push({ nhom: 'Mảng mái', nhan: `${ten}: góc nghiêng tấm trên khung`, dv: '°', kieu: 'so', batBuoc: true,
            lay: () => m.xep.gocNghieng, dat: (n) => { m.xep.gocNghieng = n; } });
          ds.push({ nhom: 'Mảng mái', nhan: `${ten}: chiều cao khung nâng`, dv: 'm', kieu: 'so', batBuoc: true,
            lay: () => m.xep.caoKhungM, dat: (n) => { m.xep.caoKhungM = n; }, ghiChu: 'Vật cản thấp hơn khung sẽ không chặn tấm' });
          ds.push({ nhom: 'Mảng mái', nhan: `${ten}: số hàng tấm mỗi dãy khung`, dv: 'hàng', kieu: 'so', batBuoc: false,
            lay: () => m.xep.soHangMoiDay, dat: (n) => { m.xep.soHangMoiDay = n; }, ghiChu: 'Để trống = xếp liền' });
          ds.push({ nhom: 'Mảng mái', nhan: `${ten}: khoảng hở giữa các dãy khung`, dv: 'm', kieu: 'so', batBuoc: false,
            lay: () => m.xep.khoangCachDayM, dat: (n) => { m.xep.khoangCachDayM = n; } });
        }
      }
      // --- Vật cản ---
      for (const v of M.vatCan.filter(x => x.diem.length >= 3)) {
        ds.push({ nhom: 'Vật cản', nhan: `${v.ten || 'Vật cản'}: chiều cao so với mặt mái`, dv: 'm', kieu: 'so', batBuoc: true,
          lay: () => v.caoM, dat: (n) => { v.caoM = n; } });
      }
      // --- Đo kiểm tra ---
      M.kiemTra.forEach((k, i) => ds.push({ nhom: 'Đo kiểm tra', nhan: `Cạnh kiểm tra ${i + 1}: chiều dài đo bằng thước`, dv: 'm', kieu: 'so', batBuoc: false,
        lay: () => k.chieuDaiThatM, dat: (n) => { k.chieuDaiThatM = n; } }));
    }
    return ds;
  }

  const thieu = (o) => o.kieu === 'lienKet' ? !o.du : o.kieu === 'so' ? !SO(o.lay()) : !o.lay();
  function demThieu(hs) { return dsO(hs).filter(o => o.batBuoc && thieu(o)).length; }

  let hs, luuSau, oTongSo;

  async function ve(v, hoSo, hamLuu) {
    hs = hoSo; luuSau = hamLuu;
    const ds = dsO(hs);
    oTongSo = TI.el('div', {});
    const nhom = [...new Set(ds.map(o => o.nhom))];
    const phanHoSo = nhom.map(ten => TI.el('div', { class: 'the' },
      TI.el('h4', {}, ten),
      ...ds.filter(o => o.nhom === ten).map(veO)));

    // Số liệu chung trong Cài đặt
    const dongChung = [];
    let tongChung = 0;
    for (const tenFile of DuLieu.DANH_SACH) {
      const nd = await DuLieu.lay(tenFile), n = DuLieu.demCanDien(nd);
      tongChung += n;
      if (n) dongChung.push(TI.el('a', { class: 'muc-hinh lien-ket-cai-dat', href: `#/cai-dat/${tenFile}` },
        nd.tieuDe, TI.el('small', { class: 'can-dien' }, `${n} ô ${CAN_DIEN}`), '›'));
    }

    v.replaceChildren(
      oTongSo,
      TI.el('h3', {}, 'Thông số của nhà này'),
      TI.el('p', { class: 'mo nho' }, 'Ô viền đỏ là còn thiếu. Điền ở đây hay ở các thẻ khác đều như nhau. Chưa có số đo chính xác thì để trống, có rồi điền sau.'),
      ...phanHoSo,
      TI.el('h3', {}, 'Số liệu chung của công ty (Cài đặt)'),
      TI.el('p', { class: 'mo nho' }, 'Dùng cho mọi hồ sơ: thiết bị, giá, giá điện, giờ nắng, hằng số tính toán. Bấm vào từng mục để điền.'),
      dongChung.length ? TI.el('div', { class: 'danh-sach-hinh' }, ...dongChung) : TI.el('div', { class: 'the dat nho' }, '✓ Đã điền đủ số liệu chung.'));
    capNhatTong(tongChung);
  }

  function capNhatTong(tongChung) {
    if (tongChung !== undefined) oTongSo.dataset.chung = tongChung;
    const n = demThieu(hs), c = Number(oTongSo.dataset.chung || 0);
    oTongSo.replaceChildren(TI.el('div', { class: 'the ' + (n || c ? 'canh-bao' : 'dat') },
      n || c ? `Còn thiếu: ${n} thông số của nhà này, ${c} ô số liệu chung.` : '✓ Đã đủ thông số.'));
    ManHoSo.capNhatHuyHieu(n);
  }

  function veO(o) {
    const nhan = TI.el('span', {}, o.nhan + (o.dv ? ` (${o.dv})` : '') + (o.batBuoc ? '' : ' – không bắt buộc'));
    let o2;
    if (o.kieu === 'lienKet') {
      o2 = TI.el('a', { class: 'nut nho' + (o.du ? '' : ' can-dien'), href: `#/ho-so/${hs.id}/${o.the}` }, (o.du ? '✓ ' : '') + (o.ghiChu || 'Mở'));
      return TI.el('div', { class: 'truong' }, nhan, o2);
    }
    if (o.kieu === 'chon') {
      o2 = TI.el('select', { class: thieu(o) ? 'can-dien' : '', onchange: (e) => {
        o.dat(e.target.value); e.target.classList.toggle('can-dien', !e.target.value); luuSau();
        if (o.veLai) App.dieuHuong(); else capNhatTong();
      } }, ...o.tc.map(([gt, ten]) => TI.el('option', { value: gt, selected: (o.lay() || '') === gt }, ten)));
    } else {
      const oNhap = TI.oSo(o.lay(), (n) => { o.dat(n); luuSau(); oNhap.classList.toggle('can-dien', o.batBuoc && n === null); capNhatTong(); },
        { placeholder: o.batBuoc ? CAN_DIEN : 'để trống nếu không có', class: o.batBuoc && thieu(o) ? 'can-dien' : '' });
      o2 = TI.el('div', { class: 'co-don-vi' }, oNhap, o.dv ? TI.el('i', {}, o.dv) : null);
    }
    return TI.el('label', { class: 'truong' }, nhan, o2, o.ghiChu ? TI.el('small', { class: 'mo' }, o.ghiChu) : null);
  }

  return { ve, demThieu };
})();
