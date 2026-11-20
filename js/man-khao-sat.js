// Màn hình 2–3: khung hồ sơ khách (các thẻ) + phiếu khảo sát.
const ManHoSo = (() => {
  const THE = [
    { ma: 'thong-so', ten: 'Thông số' },
    { ma: 'khao-sat', ten: 'Khảo sát' },
    { ma: 've-mai', ten: 'Vẽ mái', gd: 2 },
    { ma: 'xep-pin', ten: 'Xếp pin', gd: 3 },
    { ma: '3d', ten: '3D', gd: 4 },
    { ma: 'ky-thuat', ten: 'Kỹ thuật', gd: 5 },
    { ma: 'bao-gia', ten: 'Báo giá', gd: 6 },
  ];

  const CHON = (...ds) => [['', '— chọn —'], ...ds.map(x => Array.isArray(x) ? x : [x, x])];

  const NHOM = [
    { ten: 'Thông tin khách', truong: [
      { d: 'khach.ten', n: 'Họ tên khách', k: 'chu' },
      { d: 'khach.dienThoai', n: 'Số điện thoại', k: 'dt' },
      { d: 'khach.zalo', n: 'Zalo (nếu khác số điện thoại)', k: 'dt' },
      { d: 'khach.diaChi', n: 'Địa chỉ lắp đặt', k: 'van-ban' },
      { d: 'khach.toaDo', n: 'Vị trí GPS của nhà', k: 'toa-do' },
    ] },
    { ten: 'Hóa đơn và thói quen dùng điện', hoaDon: true, truong: [
      { d: 'dien.phanTramDungBanNgay', n: 'Điện dùng ban ngày khoảng bao nhiêu', k: 'so', dv: '%' },
      { d: 'dien.banDienDu', n: 'Khách muốn bán điện dư cho EVN?', k: 'chon', tc: CHON('Có', 'Không', 'Chưa rõ') },
    ] },
    { ten: 'Nhu cầu', truong: [
      { d: 'nhuCau.loaiHe', n: 'Loại hệ khách quan tâm', k: 'chon',
        tc: CHON(['hoa-luoi', 'Hòa lưới bám tải'], ['hybrid', 'Hybrid (có pin lưu trữ)'], ['doc-lap', 'Độc lập'], ['chua-ro', 'Chưa rõ, cần tư vấn']) },
      { d: 'nhuCau.nganSach', n: 'Ngân sách dự kiến', k: 'so', dv: 'đ' },
      { d: 'nhuCau.mucTieu', n: 'Mục tiêu của khách', k: 'van-ban', gy: 'Giảm tiền điện, dự phòng mất điện, chống nóng mái…' },
    ] },
    { ten: 'Hiện trạng điện', truong: [
      { d: 'dien.loaiDien', n: 'Điện nhà khách', k: 'chon', tc: CHON(['1-pha', '1 pha'], ['3-pha', '3 pha']) },
      { d: 'dien.viTriCongTo', n: 'Vị trí công tơ', k: 'chu' },
      { d: 'dien.viTriTuDien', n: 'Vị trí tủ điện tổng', k: 'chu' },
      { d: 'dien.viTriInverter', n: 'Chỗ đặt inverter dự kiến', k: 'chu' },
      { d: 'dien.quangDuongDayM', n: 'Quãng đường đi dây từ mái đến inverter', k: 'so', dv: 'm' },
      { d: 'dien.coWifi', n: 'Có wifi tại chỗ đặt inverter?', k: 'chon', tc: CHON('Có', 'Không', 'Yếu') },
      { d: 'dien.tiepDia', n: 'Hiện trạng tiếp địa', k: 'van-ban' },
    ] },
    { ten: 'Hiện trạng mái', truong: [
      { d: 'hienTrang.huongNha', n: 'Hướng mặt tiền nhà', k: 'chon',
        tc: CHON('Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc') },
      { d: 'hienTrang.gocLaBan', n: 'Góc la bàn mặt tiền (nếu đo)', k: 'so', dv: '°' },
      { d: 'hienTrang.ketCauMai', n: 'Kết cấu mái', k: 'van-ban', gy: 'Mái bê tông, mái tôn, xà gồ thép/gỗ, tình trạng…' },
      { d: 'hienTrang.thamDot', n: 'Thấm, dột', k: 'van-ban' },
      { d: 'hienTrang.bongChe', n: 'Bóng che', k: 'van-ban', gy: 'Nhà bên, cây, tum, nhà bên có thể xây cao…' },
      { d: 'hienTrang.loiLenMai', n: 'Lối lên mái', k: 'van-ban' },
      { d: 'hienTrang.ghiChuKhac', n: 'Ghi chú khác về mái', k: 'van-ban' },
    ] },
    { ten: 'Ảnh khảo sát', anh: true },
    { ten: 'Ghi chú chung', truong: [{ d: 'ghiChu', n: 'Ghi chú', k: 'van-ban' }] },
  ];

  const LOAI_ANH = [
    ['drone-thang', 'Drone chụp thẳng xuống'], ['drone-cheo', 'Drone chụp chéo'],
    ['hien-truong', 'Hiện trường'], ['hoa-don', 'Hóa đơn điện'], ['phoi-canh', 'Phối cảnh 3D'], ['khac', 'Khác'],
  ];

  let hs = null;
  let henLuu = null;
  let oHuyHieu = null;

  // Số đỏ trên thẻ "Thông số" = số thông số bắt buộc của nhà này còn thiếu.
  function capNhatHuyHieu(n) {
    if (!oHuyHieu) return;
    oHuyHieu.textContent = n ? String(n) : '✓';
    oHuyHieu.classList.toggle('du', !n);
  }
  let oTrangThaiLuu = null;

  function luuSau() {
    clearTimeout(henLuu);
    if (oTrangThaiLuu) oTrangThaiLuu.textContent = 'Đang lưu…';
    henLuu = setTimeout(luuNgay, 500);
  }

  async function luuNgay() {
    clearTimeout(henLuu); henLuu = null;
    if (!hs) return;
    await HoSo.luu(hs);
    if (oTrangThaiLuu) oTrangThaiLuu.textContent = 'Đã lưu ✓';
  }

  async function ve(v, id, the) {
    hs = await HoSo.lay(id);
    if (!hs) {
      v.replaceChildren(TI.el('div', { class: 'the loi' }, 'Không tìm thấy hồ sơ. ', TI.el('a', { href: '#/' }, 'Về danh sách')));
      return;
    }
    App.datTieuDe(hs.khach.ten || 'Hồ sơ mới');
    oTrangThaiLuu = TI.el('span', { class: 'trang-thai-luu' }, 'Đã lưu ✓');

    oHuyHieu = TI.el('b', { class: 'huy-hieu' });
    const thanhThe = TI.el('nav', { class: 'thanh-the' }, ...THE.map(t =>
      TI.el('a', { href: `#/ho-so/${hs.id}/${t.ma}`, class: t.ma === the ? 'dang-chon' : '' }, t.ten, t.ma === 'thong-so' ? oHuyHieu : null)));
    capNhatHuyHieu(ManThongSo.demThieu(hs));

    const vungThe = TI.el('div', {});
    v.replaceChildren(
      TI.el('div', { class: 'hang-giua' }, TI.el('a', { href: '#/', class: 'quay-lai' }, '‹ Danh sách'), oTrangThaiLuu),
      thanhThe, vungThe);

    const theChon = THE.find(t => t.ma === the) || THE[1];
    const nutThe = thanhThe.querySelector('.dang-chon');
    if (nutThe) requestAnimationFrame(() => nutThe.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    if (theChon.ma === 'khao-sat') veKhaoSat(vungThe);
    else if (theChon.ma === 'thong-so') await ManThongSo.ve(vungThe, hs, luuSau);
    else if (theChon.ma === 've-mai') await ManVeMai.ve(vungThe, hs, luuSau);
    else if (theChon.ma === 'xep-pin') await ManXepPin.ve(vungThe, hs, luuSau);
    else if (theChon.ma === '3d') await ManDung3D.ve(vungThe, hs, luuSau);
    else vungThe.replaceChildren(TI.el('div', { class: 'the trong' },
      TI.el('b', {}, theChon.ten), TI.el('p', { class: 'mo' }, `Phần này sẽ làm ở Giai đoạn ${theChon.gd}.`)));
  }

  // ---------- Phiếu khảo sát ----------
  function veKhaoSat(v) {
    const dsNhom = NHOM.map((nhom, i) => {
      const noiDung = [];
      if (nhom.hoaDon) noiDung.push(veHoaDon());
      for (const t of nhom.truong || []) noiDung.push(veTruong(t));
      if (nhom.anh) noiDung.push(veAnh());
      return TI.el('details', { class: 'nhom', open: i < 2 },
        TI.el('summary', {}, nhom.ten), TI.el('div', { class: 'nhom-noi-dung' }, ...noiDung));
    });

    const chonTrangThai = TI.el('select', { onchange: (e) => { hs.trangThai = e.target.value; luuSau(); } },
      ...Object.entries(TRANG_THAI).map(([ma, ten]) => TI.el('option', { value: ma, selected: hs.trangThai === ma }, ten)));

    v.replaceChildren(
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Trạng thái hồ sơ'), chonTrangThai),
      ...dsNhom,
      TI.el('h3', {}, 'Hồ sơ này'),
      TI.el('div', { class: 'hang' },
        TI.el('button', { class: 'nut', onclick: saoLuuHoSo }, 'Sao lưu hồ sơ này'),
        TI.el('button', { class: 'nut nguy-hiem', onclick: xoaHoSo }, 'Xóa hồ sơ')),
      TI.el('p', { class: 'mo nho' }, 'Tạo ngày ' + TI.ngayVN(hs.ngayTao)),
    );
  }

  function veTruong(t) {
    const gt = TI.layTheoDuong(hs, t.d);
    let o;
    if (t.k === 'chon') {
      o = TI.el('select', { onchange: (e) => { TI.datTheoDuong(hs, t.d, e.target.value); luuSau(); } },
        ...t.tc.map(([ma, ten]) => TI.el('option', { value: ma, selected: (gt || '') === ma }, ten)));
    } else if (t.k === 'van-ban') {
      o = TI.el('textarea', { rows: 2, placeholder: t.gy || '', value: gt || '',
        oninput: (e) => { TI.datTheoDuong(hs, t.d, e.target.value); luuSau(); } });
    } else if (t.k === 'so') {
      o = oSo(gt, (n) => { TI.datTheoDuong(hs, t.d, n); luuSau(); });
    } else if (t.k === 'toa-do') {
      return veToaDo(t);
    } else {
      o = TI.el('input', { type: t.k === 'dt' ? 'tel' : 'text', value: gt || '', placeholder: t.gy || '',
        oninput: (e) => {
          TI.datTheoDuong(hs, t.d, e.target.value);
          if (t.d === 'khach.ten') App.datTieuDe(e.target.value || 'Hồ sơ mới');
          luuSau();
        } });
    }
    return TI.el('label', { class: 'truong' },
      TI.el('span', {}, t.n), t.dv ? TI.el('div', { class: 'co-don-vi' }, o, TI.el('i', {}, t.dv)) : o);
  }

  const oSo = TI.oSo;

  function veToaDo(t) {
    const hien = TI.el('span', { class: 'mo' });
    const capNhat = () => {
      const td = hs.khach.toaDo;
      hien.replaceChildren(td ? TI.el('a', { href: `https://www.google.com/maps?q=${td.lat},${td.lng}`, target: '_blank', rel: 'noopener' },
        `${td.lat.toFixed(6)}, ${td.lng.toFixed(6)}`) : 'Chưa lấy');
    };
    capNhat();
    const nut = TI.el('button', { type: 'button', class: 'nut nho', onclick: () => {
      if (!navigator.geolocation) { alert('Máy không hỗ trợ lấy vị trí.'); return; }
      nut.disabled = true; nut.textContent = 'Đang lấy…';
      navigator.geolocation.getCurrentPosition(
        (p) => { hs.khach.toaDo = { lat: p.coords.latitude, lng: p.coords.longitude, saiSoM: Math.round(p.coords.accuracy) }; luuSau(); capNhat(); nut.disabled = false; nut.textContent = 'Lấy lại vị trí'; },
        (e) => { alert('Không lấy được vị trí: ' + e.message); nut.disabled = false; nut.textContent = 'Lấy vị trí hiện tại'; },
        { enableHighAccuracy: true, timeout: 15000 });
    } }, 'Lấy vị trí hiện tại');
    return TI.el('div', { class: 'truong' }, TI.el('span', {}, t.n), TI.el('div', { class: 'hang-giua' }, hien, nut));
  }

  // ---------- Hóa đơn điện ----------
  function veHoaDon() {
    const khung = TI.el('div', { class: 'hoa-don' });
    const tong = TI.el('div', { class: 'mo nho' });

    const tinhTong = () => {
      const ds = hs.dien.hoaDon.filter(h => typeof h.kWh === 'number');
      const dsTien = hs.dien.hoaDon.filter(h => typeof h.tien === 'number');
      tong.textContent = ds.length
        ? `Trung bình: ${TI.soVN(ds.reduce((s, h) => s + h.kWh, 0) / ds.length, 0)} kWh/tháng` +
          (dsTien.length ? ` · ${TI.soVN(dsTien.reduce((s, h) => s + h.tien, 0) / dsTien.length, 0)} đ/tháng` : '')
        : 'Nhập 2–3 tháng gần nhất (nên có cả tháng hè).';
    };

    const veLai = () => {
      khung.replaceChildren(
        TI.el('div', { class: 'hoa-don-dong dau' }, TI.el('span', {}, 'Tháng'), TI.el('span', {}, 'Số điện (kWh)'), TI.el('span', {}, 'Tiền (đ)'), TI.el('span', {})),
        ...hs.dien.hoaDon.map((h, i) => TI.el('div', { class: 'hoa-don-dong' },
          TI.el('input', { type: 'month', value: h.thang || '', 'aria-label': 'Tháng',
            onchange: (e) => { h.thang = e.target.value; luuSau(); } }),
          oSo(h.kWh, (n) => { h.kWh = n; luuSau(); tinhTong(); }, { 'aria-label': 'Số điện kWh' }),
          oSo(h.tien, (n) => { h.tien = n; luuSau(); tinhTong(); }, { 'aria-label': 'Tiền điện' }),
          TI.el('button', { type: 'button', class: 'nut-xoa', 'aria-label': 'Xóa tháng này',
            onclick: () => { hs.dien.hoaDon.splice(i, 1); luuSau(); veLai(); } }, '×'))),
        TI.el('button', { type: 'button', class: 'nut nho', onclick: () => {
          hs.dien.hoaDon.push({ thang: '', kWh: null, tien: null }); luuSau(); veLai();
        } }, '+ Thêm tháng'));
      tinhTong();
    };
    veLai();
    return TI.el('div', {}, khung, tong);
  }

  // ---------- Ảnh ----------
  function veAnh() {
    const luoi = TI.el('div', { class: 'luoi-anh' });
    const oFile = TI.el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true,
      onchange: async (e) => {
        const ds = [...e.target.files]; e.target.value = '';
        TI.thongBao(`Đang lưu ${ds.length} ảnh…`);
        for (const f of ds) {
          try {
            const a = await HoSo.themAnh(hs.id, f);
            hs.hienTrang.anh.push({ id: a.id, loai: 'hien-truong', ghiChu: '' });
          } catch (err) { alert('Không đọc được ảnh ' + f.name); }
        }
        await luuNgay(); veLai(); TI.thongBao('Đã lưu ảnh');
      } });

    const veLai = async () => {
      const the = [];
      for (const [i, m] of hs.hienTrang.anh.entries()) {
        const a = await LuuTru.lay('anh', m.id);
        the.push(TI.el('div', { class: 'the-anh' },
          a ? TI.el('img', { src: a.dataURL, alt: m.ghiChu || 'Ảnh khảo sát', loading: 'lazy', onclick: () => xemAnh(a.dataURL) })
            : TI.el('div', { class: 'anh-mat' }, 'Ảnh bị thiếu'),
          TI.el('select', { onchange: (e) => { m.loai = e.target.value; luuSau(); } },
            ...LOAI_ANH.map(([ma, ten]) => TI.el('option', { value: ma, selected: m.loai === ma }, ten))),
          TI.el('input', { type: 'text', placeholder: 'Ghi chú ảnh', value: m.ghiChu || '',
            oninput: (e) => { m.ghiChu = e.target.value; luuSau(); } }),
          TI.el('button', { type: 'button', class: 'nut nho nguy-hiem', onclick: async () => {
            if (!confirm('Xóa ảnh này?')) return;
            await LuuTru.xoa('anh', m.id);
            hs.hienTrang.anh.splice(i, 1); await luuNgay(); veLai();
          } }, 'Xóa ảnh')));
      }
      luoi.replaceChildren(...the);
    };
    veLai();
    return TI.el('div', {},
      TI.el('p', { class: 'mo nho' }, 'Chụp ảnh mái, công tơ, tủ điện, hóa đơn. Ảnh drone chụp thẳng xuống dùng để vẽ mái ở bước sau.'),
      TI.el('button', { type: 'button', class: 'nut', onclick: () => oFile.click() }, '📷 Thêm ảnh'),
      oFile, luoi);
  }

  function xemAnh(src) {
    const lop = TI.el('div', { class: 'lop-xem-anh', onclick: () => lop.remove() },
      TI.el('img', { src }), TI.el('span', {}, 'Chạm để đóng'));
    document.body.append(lop);
  }

  async function saoLuuHoSo() {
    await luuNgay();
    const du = await HoSo.taoSaoLuu([hs.id]);
    await TI.luuFile(`ho-so-${TI.tenFile(hs.khach.ten)}-${TI.homNay()}.json`, JSON.stringify(du));
    TI.thongBao('Đã xuất file hồ sơ');
  }

  async function xoaHoSo() {
    if (!confirm(`Xóa hồ sơ "${hs.khach.ten || 'chưa có tên'}" cùng toàn bộ ảnh?\nKhông khôi phục được nếu chưa sao lưu.`)) return;
    clearTimeout(henLuu); henLuu = null;
    await HoSo.xoa(hs.id);
    hs = null;
    TI.thongBao('Đã xóa hồ sơ');
    location.hash = '#/';
  }

  // Lưu ngay phần đang chờ (khi chuyển màn hình hoặc tắt app trên điện thoại).
  async function luuNeuDangCho() { if (henLuu) await luuNgay(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) luuNeuDangCho(); });
  window.addEventListener('pagehide', luuNeuDangCho);

  return { ve, luuNeuDangCho, LOAI_ANH, capNhatHuyHieu };
})();
