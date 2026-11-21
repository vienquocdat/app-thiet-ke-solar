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
    lk('Khảo sát', 'Số điện (kWh) ít nhất 1 tháng hóa đơn', coHoaDon, 'khao-sat', coHoaDon ? 'Đã có' : 'Nhập ở bước Khảo sát → Hóa đơn');
    ds.push({ nhom: 'Khảo sát', nhan: 'Điện dùng ban ngày khoảng bao nhiêu', dv: '%', kieu: 'so', batBuoc: true,
      lay: () => hs.dien.phanTramDungBanNgay, dat: (n) => { hs.dien.phanTramDungBanNgay = n; }, ghiChu: 'Dùng tính tiền tiết kiệm (Báo giá)' });
    ds.push({ nhom: 'Khảo sát', nhan: 'Khách muốn bán điện dư cho EVN?', kieu: 'chon', batBuoc: true,
      tc: [['', '— chọn —'], ['Có', 'Có'], ['Không', 'Không'], ['Chưa rõ', 'Chưa rõ']],
      lay: () => hs.dien.banDienDu, dat: (v) => { hs.dien.banDienDu = v; }, ghiChu: 'Không bán thì báo giá thêm chống phát ngược' });
    ds.push({ nhom: 'Khảo sát', nhan: 'Quãng đường đi dây từ mái đến inverter', dv: 'm', kieu: 'so', batBuoc: true,
      lay: () => hs.dien.quangDuongDayM, dat: (n) => { hs.dien.quangDuongDayM = n; }, ghiChu: 'Dùng tính sụt áp cáp DC (Giai đoạn 5)' });

    // --- Tỉ lệ mái ---
    const M = hs.mai;
    if (!M || !M.anhNen) {
      lk('Tỉ lệ mái', 'Ảnh mái và tỉ lệ', false, 've-mai', 'Chưa chọn ảnh mái ở bước Vẽ mái');
    } else if (M.cheDo === 'thang') {
      if (M.tiLe.diem.length < 2) lk('Tỉ lệ mái', 'Kẻ cạnh chuẩn trên ảnh', false, 've-mai', 'Kẻ ở bước Vẽ mái → Tỉ lệ');
      ds.push({ nhom: 'Tỉ lệ mái', nhan: 'Chiều dài thật của cạnh chuẩn (đo bằng thước)', dv: 'm', kieu: 'so', batBuoc: true,
        lay: () => M.tiLe.chieuDaiM, dat: (n) => { M.tiLe.chieuDaiM = n; } });
    } else {
      if (M.nan.diem.length < 4) lk('Tỉ lệ mái', 'Chấm 4 góc hình chữ nhật chuẩn trên ảnh', false, 've-mai', 'Chấm ở bước Vẽ mái → Tỉ lệ');
      ds.push({ nhom: 'Tỉ lệ mái', nhan: 'Cạnh A (góc 1→2) đo bằng thước', dv: 'm', kieu: 'so', batBuoc: true,
        lay: () => M.nan.canhA, dat: (n) => { M.nan.canhA = n; } });
      ds.push({ nhom: 'Tỉ lệ mái', nhan: 'Cạnh B (góc 2→3) đo bằng thước', dv: 'm', kieu: 'so', batBuoc: true,
        lay: () => M.nan.canhB, dat: (n) => { M.nan.canhB = n; } });
    }

    if (M) {
      // --- Mảng mái ---
      const dsMang = M.mangMai.filter(m => m.diem.length >= 3);
      if (!dsMang.length) lk('Mảng mái', 'Vẽ ít nhất 1 mảng mái', false, 've-mai', 'Vẽ ở bước Vẽ mái → Mảng mái');
      dsMang.forEach((m, i) => {
        const ten = m.ten || 'Mảng mái';
        if (!m.xep) m.xep = XepPin.caiDatMacDinh(m, m.diem);
        if (!m.d3) m.d3 = { caoDoM: null, lanCanM: null };
        if (i > 0) ds.push({ nhom: 'Mảng mái', nhan: `${ten}: cao độ so với mái chính (${dsMang[0].ten || 'mảng đầu'})`, dv: 'm', kieu: 'so', batBuoc: true,
          lay: () => m.d3.caoDoM, dat: (n) => { m.d3.caoDoM = n; }, ghiChu: 'Thấp hơn thì ghi số âm, vd −0,6. Mái dốc: đo ở mép thấp. Dùng cho 3D.' });
        ds.push({ nhom: 'Mảng mái', nhan: `${ten}: chiều cao tường lan can`, dv: 'm', kieu: 'so', batBuoc: false,
          lay: () => m.d3.lanCanM, dat: (n) => { m.d3.lanCanM = n; }, ghiChu: 'Dùng cho 3D' });
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
          ds.push({ nhom: 'Mảng mái', nhan: `${ten}: khung nhô ra ngoài mép mái`, dv: 'm', kieu: 'so', batBuoc: false,
            lay: () => m.xep.nhoRaM, dat: (n) => { m.xep.nhoRaM = n; } });
          ds.push({ nhom: 'Mảng mái', nhan: `${ten}: mép thấp của tấm quay về`, kieu: 'chon', batBuoc: true,
            tc: [['canh-goc', 'Phía vạch cam (cạnh xếp hàng)'], ['nguoc', 'Phía ngược lại']],
            lay: () => m.xep.mepThap || 'canh-goc', dat: (v) => { m.xep.mepThap = v; } });
        }
      });
      if (!hs.dung3d) hs.dung3d = { caoNhaM: null };
      ds.push({ nhom: 'Mảng mái', nhan: 'Chiều cao nhà (chỉ để vẽ 3D cho đẹp)', dv: 'm', kieu: 'so', batBuoc: false,
        lay: () => hs.dung3d.caoNhaM, dat: (n) => { hs.dung3d.caoNhaM = n; } });
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

  let hs, luuSau, oTongSo, dsTruong = [], tongChung = 0;

  async function ve(v, hoSo, hamLuu) {
    hs = hoSo; luuSau = hamLuu;
    const ds = dsO(hs);
    oTongSo = TI.el('div', { class: 'vung-thieu' });
    dsTruong = [];
    // Chia thẻ theo từng mảng mái / vật cản để nhãn không phải lặp "Mái bê tông: …" ở mọi dòng.
    // (Danh sách "Còn thiếu" vẫn dùng tên đầy đủ để biết ô nào của mảng nào.)
    const vietHoa = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const tach = (o) => {
      const i = o.nhan.indexOf(': ');
      if (o.nhom === 'Mảng mái') return i > 0 ? { the: o.nhan.slice(0, i), nhan: vietHoa(o.nhan.slice(i + 2)) } : { the: 'Khối nhà', nhan: o.nhan };
      if (o.nhom === 'Vật cản' && i > 0) return { the: 'Vật cản – chiều cao so với mặt mái', nhan: o.nhan.slice(0, i) };
      return { the: o.nhom, nhan: o.nhan };
    };
    const dsT = ds.map((o, i) => ({ o, id: 'ts-' + i, ...tach(o) }));
    const nhom = [...new Set(dsT.map(x => x.the))];
    const phanHoSo = nhom.map(ten => TI.el('div', { class: 'the nhom-thong-so' },
      TI.el('h4', {}, ten),
      ...dsT.filter(x => x.the === ten).map(x => veO(x.o, x.id, x.nhan))));

    // Số liệu chung trong Cài đặt
    const dongChung = [];
    tongChung = 0;
    for (const tenFile of DuLieu.DANH_SACH) {
      const nd = await DuLieu.lay(tenFile), n = DuLieu.demCanDien(nd);
      tongChung += n;
      if (n) dongChung.push(TI.el('a', { class: 'muc-hinh lien-ket-cai-dat', href: `#/cai-dat/${tenFile}` },
        nd.tieuDe, TI.el('small', { class: 'nhan nhan-thieu' }, `${n} ô chưa điền`), Icon('chevron-right', { co: 18 })));
    }

    v.replaceChildren(
      oTongSo,
      TI.el('h3', {}, 'Thông số của nhà này'),
      TI.el('p', { class: 'mo nho' }, 'Ô viền vàng nét đứt là còn thiếu. Điền ở đây hay ở các bước khác đều như nhau. Chưa có số đo chính xác thì để trống, có rồi điền sau.'),
      TI.el('div', { class: 'luoi-nhom' }, ...phanHoSo),
      TI.el('h3', {}, 'Số liệu chung của công ty (Cài đặt)'),
      TI.el('p', { class: 'mo nho' }, 'Dùng cho mọi hồ sơ: thiết bị, giá, giá điện, giờ nắng, hằng số tính toán. Bấm vào từng mục để điền.'),
      dongChung.length ? TI.el('div', { class: 'danh-sach-hinh luoi-chung' }, ...dongChung) : TI.el('div', { class: 'the dat nho co-icon' }, Icon('circle-check'), 'Đã điền đủ số liệu chung.'));
    capNhatTong();
  }

  // Tính lại: đánh dấu ô thiếu + danh sách "Còn thiếu N mục" (bấm để nhảy tới ô).
  function capNhatTong() {
    const thieuDs = dsTruong.filter(t => { const x = t.o.batBuoc && thieu(t.o); t.datThieu(x); return x; });
    oTongSo.replaceChildren(
      ONhap.dsThieu(thieuDs.map(t => ({ id: t.id, nhan: t.o.nhan })), 'Nhà này còn thiếu'),
      tongChung ? TI.el('a', { class: 'chip-canh-bao', href: '#/cai-dat' }, Icon('alert-triangle', { co: 18 }),
        `${tongChung} ô số liệu chung chưa điền`, Icon('chevron-right', { co: 16 })) : null);
    ManHoSo.capNhatHuyHieu(thieuDs.length);
  }

  function veO(o, id, nhanHien = o.nhan) {
    const chuThieu = o.kieu === 'so' && (o.dv === 'm' || o.dv === '°') ? 'Chưa đo' : 'Chưa có';
    let o2;
    if (o.kieu === 'lienKet') {
      o2 = TI.el('a', { class: 'nut' + (o.du ? '' : ' can-dien'), href: `#/ho-so/${hs.id}/${o.the}` },
        o.du ? Icon('check', { co: 18 }) : null, o.ghiChu || 'Mở', o.du ? null : Icon('chevron-right', { co: 18 }));
    } else if (o.kieu === 'chon') {
      o2 = TI.el('select', { onchange: (e) => {
        o.dat(e.target.value); luuSau();
        if (o.veLai) App.dieuHuong(); else capNhatTong();
      } }, ...o.tc.map(([gt, ten]) => TI.el('option', { value: gt, selected: (o.lay() || '') === gt }, ten)));
    } else {
      const oNhap = TI.oSo(o.lay(), (n) => { o.dat(n); luuSau(); capNhatTong(); },
        { placeholder: o.batBuoc ? 'Nhập số đo' : 'Để trống nếu không có' });
      o2 = o.dv ? ONhap.hauTo(oNhap, o.dv) : oNhap;
    }
    const tr = ONhap.truong({ nhan: nhanHien, id, ghiChu: o.ghiChu && o.kieu !== 'lienKet' ? o.ghiChu : null,
      khongBatBuoc: !o.batBuoc, chuThieu, toO: o.kieu !== 'lienKet' }, o2);
    dsTruong.push({ o, id, datThieu: tr.datThieu });
    return tr.el;
  }

  return { ve, demThieu, dsO, thieuO: thieu };
})();
