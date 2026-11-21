// Màn hình 2–3: khung hồ sơ khách (thanh tiến trình 7 bước + nội dung bước) + phiếu khảo sát.
const ManHoSo = (() => {
  const CHON = (...ds) => [['', '— chọn —'], ...ds.map(x => Array.isArray(x) ? x : [x, x])];

  const NHOM = [
    { ten: 'Thông tin khách', truong: [
      { d: 'khach.ten', n: 'Họ tên khách', k: 'chu', bb: true },
      { d: 'khach.dienThoai', n: 'Số điện thoại', k: 'dt' },
      { d: 'khach.zalo', n: 'Zalo (nếu khác số điện thoại)', k: 'dt' },
      { d: 'khach.diaChi', n: 'Địa chỉ lắp đặt', k: 'dia-chi' },
      { d: 'khach.toaDo', n: 'Vị trí GPS của nhà', k: 'toa-do' },
    ] },
    { ten: 'Hóa đơn và thói quen dùng điện', hoaDon: true, truong: [
      { d: 'dien.phanTramDungBanNgay', n: 'Điện dùng ban ngày khoảng bao nhiêu', k: 'so', dv: '%', bb: true },
      { d: 'dien.banDienDu', n: 'Khách muốn bán điện dư cho EVN?', k: 'chon', tc: CHON('Có', 'Không', 'Chưa rõ'), bb: true },
    ] },
    { ten: 'Nhu cầu', truong: [
      { d: 'nhuCau.loaiHe', n: 'Loại hệ khách quan tâm', k: 'chon',
        tc: CHON(['hoa-luoi', 'Hòa lưới bám tải'], ['hybrid', 'Hybrid (có pin lưu trữ)'], ['doc-lap', 'Độc lập'], ['chua-ro', 'Chưa rõ, cần tư vấn']) },
      { d: 'nhuCau.nganSach', n: 'Ngân sách dự kiến', k: 'tien' },
      { d: 'nhuCau.mucTieu', n: 'Mục tiêu của khách', k: 'van-ban', gy: 'Giảm tiền điện, dự phòng mất điện, chống nóng mái…' },
    ] },
    { ten: 'Hiện trạng điện', truong: [
      { d: 'dien.loaiDien', n: 'Điện nhà khách', k: 'chon', tc: CHON(['1-pha', '1 pha'], ['3-pha', '3 pha']), bb: true },
      { d: 'dien.viTriCongTo', n: 'Vị trí công tơ', k: 'chu' },
      { d: 'dien.viTriTuDien', n: 'Vị trí tủ điện tổng', k: 'chu' },
      { d: 'dien.viTriInverter', n: 'Chỗ đặt inverter dự kiến', k: 'chu' },
      { d: 'dien.quangDuongDayM', n: 'Quãng đường đi dây từ mái đến inverter', k: 'so', dv: 'm', bb: true },
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

  // Ô "Thông số" vừa đổi → tính lại thanh tiến trình (tên cũ giữ để các màn hình khác gọi).
  function capNhatHuyHieu() { TienTrinh.capNhat(); }

  // Trạng thái lưu hiện ở dòng nhỏ dưới tiêu đề trên cùng.
  let oTrangThaiLuu = null;
  function hienLuu(dangLuu) {
    if (!oTrangThaiLuu) return;
    oTrangThaiLuu.classList.toggle('dang-luu', dangLuu);
    oTrangThaiLuu.replaceChildren(...(dangLuu ? [TI.el('span', {}, 'Đang lưu…')] : Icon.chu('check', 'Đã lưu', { co: 14 })));
  }

  function luuSau() {
    clearTimeout(henLuu);
    hienLuu(true);
    henLuu = setTimeout(luuNgay, 500);
  }

  async function luuNgay() {
    clearTimeout(henLuu); henLuu = null;
    if (!hs) return;
    await HoSo.luu(hs);
    hienLuu(false);
    TienTrinh.capNhat();
  }

  async function ve(v, id, the) {
    hs = await HoSo.lay(id);
    if (!hs) {
      TienTrinh.roi();
      v.replaceChildren(TI.el('div', { class: 'the loi' }, 'Không tìm thấy hồ sơ. ', TI.el('a', { href: '#/' }, 'Về danh sách')));
      return;
    }
    App.datTieuDe(hs.khach.ten || 'Hồ sơ mới');
    oTrangThaiLuu = TI.el('span', { class: 'trang-thai-luu' });
    hienLuu(false);
    App.datPhuDe(oTrangThaiLuu);

    const theChon = TienTrinh.BUOC.find(t => t.ma === the) || TienTrinh.BUOC[1];
    const { ray, thuoc } = await TienTrinh.dung(hs, theChon.ma);
    const vungThe = TI.el('div', { class: 'vung-the', 'data-the': theChon.ma });
    // Bước có khung vẽ: thu cột bước bên trái thành dải icon để khung vẽ rộng hơn (máy tính).
    const coKhungVe = ['ve-mai', 'xep-pin', '3d'].includes(theChon.ma);
    v.replaceChildren(TI.el('div', { class: 'bo-cuc-ho-so', 'data-gon': coKhungVe || null }, ray, TI.el('div', { class: 'cot-chinh' }, thuoc, vungThe)));

    if (theChon.ma === 'khao-sat') veKhaoSat(vungThe);
    else if (theChon.ma === 'thong-so') await ManThongSo.ve(vungThe, hs, luuSau);
    else if (theChon.ma === 've-mai') await ManVeMai.ve(vungThe, hs, luuSau);
    else if (theChon.ma === 'xep-pin') await ManXepPin.ve(vungThe, hs, luuSau);
    else if (theChon.ma === '3d') await ManDung3D.ve(vungThe, hs, luuSau);
    else if (theChon.ma === 'ky-thuat') await ManKyThuat.ve(vungThe, hs, luuSau);
    else if (theChon.ma === 'bao-gia') await ManBaoGia.ve(vungThe, hs, luuSau);
  }

  // ---------- Phiếu khảo sát ----------
  const SO = (x) => typeof x === 'number' && isFinite(x);
  const coGT = (x) => x !== null && x !== undefined && x !== '' && x !== CAN_DIEN;
  const idTruong = (d) => 'ks-' + d.replace(/\./g, '-');

  // Các mục bắt buộc của phiếu: { id, nhan, thieu(), datThieu() }
  let dsBatBuoc = [];
  let oThieu = null;

  function capNhatThieu() {
    if (!oThieu) return;
    const thieu = dsBatBuoc.filter(m => { const t = m.thieu(); m.datThieu(t); return t; });
    oThieu.replaceChildren(ONhap.dsThieu(thieu.map(m => ({ id: m.id, nhan: m.nhan }))));
  }

  function doi() { luuSau(); capNhatThieu(); }

  function veKhaoSat(v) {
    dsBatBuoc = [];
    oThieu = TI.el('div', { class: 'vung-thieu' });
    const mayTinh = window.matchMedia('(min-width: 1024px)').matches;
    const dsNhom = NHOM.map((nhom, i) => {
      const noiDung = [];
      if (nhom.hoaDon) noiDung.push(veHoaDon());
      for (const t of nhom.truong || []) noiDung.push(veTruong(t));
      if (nhom.anh) noiDung.push(veAnh());
      return TI.el('details', { class: 'nhom', open: mayTinh || i < 2 },
        TI.el('summary', {}, nhom.ten), TI.el('div', { class: 'nhom-noi-dung' }, ...noiDung));
    });

    const chonTrangThai = TI.el('select', { onchange: (e) => { hs.trangThai = e.target.value; luuSau(); } },
      ...Object.entries(TRANG_THAI).map(([ma, ten]) => TI.el('option', { value: ma, selected: hs.trangThai === ma }, ten)));

    v.replaceChildren(
      TI.el('div', { class: 'dau-phieu' },
        TI.el('label', { class: 'truong' }, TI.el('span', { class: 'nhan-truong' }, 'Trạng thái hồ sơ'), chonTrangThai),
        oThieu),
      TI.el('div', { class: 'luoi-nhom' }, ...dsNhom),
      TI.el('h3', {}, 'Hồ sơ này'),
      TI.el('div', { class: 'hang' },
        TI.el('button', { class: 'nut', onclick: saoLuuHoSo }, ...Icon.chu('download', 'Sao lưu hồ sơ này')),
        TI.el('button', { class: 'nut nguy-hiem', onclick: xoaHoSo }, ...Icon.chu('trash', 'Xóa hồ sơ'))),
      TI.el('p', { class: 'mo nho' }, 'Tạo ngày ' + TI.ngayVN(hs.ngayTao)),
    );
    capNhatThieu();
    goiYPhuongXa();
  }

  // Gợi ý tên phường/xã đã nhập ở các hồ sơ khác.
  async function goiYPhuongXa() {
    const ds = await HoSo.danhSach();
    const dl = document.getElementById('goi-y-phuong-xa');
    if (!dl) return;
    const ten = [...new Set(ds.map(h => h.khach.diaChiCT && h.khach.diaChiCT.phuongXa).filter(Boolean))];
    dl.replaceChildren(...ten.map(t => TI.el('option', { value: t })));
  }

  function veTruong(t) {
    const gt = TI.layTheoDuong(hs, t.d);
    const dat = (x) => { TI.datTheoDuong(hs, t.d, x); doi(); };
    let o;
    if (t.k === 'chon') {
      o = TI.el('select', { onchange: (e) => dat(e.target.value) },
        ...t.tc.map(([ma, ten]) => TI.el('option', { value: ma, selected: (gt || '') === ma }, ten)));
    } else if (t.k === 'van-ban') {
      o = TI.el('textarea', { rows: 2, placeholder: t.gy || '', value: coGT(gt) ? gt : '', oninput: (e) => dat(e.target.value) });
    } else if (t.k === 'so') {
      o = TI.oSo(gt, dat, { placeholder: 'Nhập số' });
      if (t.dv) o = ONhap.hauTo(o, t.dv);
    } else if (t.k === 'tien') {
      o = ONhap.tien(gt, dat);
    } else if (t.k === 'dt') {
      o = ONhap.dienThoai(gt, dat);
    } else if (t.k === 'dia-chi') {
      o = ONhap.diaChi(hs.khach, doi);
    } else if (t.k === 'toa-do') {
      o = veToaDo();
    } else {
      o = TI.el('input', { type: 'text', value: coGT(gt) ? gt : '', placeholder: t.gy || '',
        autocomplete: t.d === 'khach.ten' ? 'name' : 'off',
        oninput: (e) => {
          if (t.d === 'khach.ten') App.datTieuDe(e.target.value || 'Hồ sơ mới');
          dat(e.target.value);
        } });
    }
    const id = idTruong(t.d);
    const tr = ONhap.truong({ nhan: t.n, id, ghiChu: t.k === 'tien' ? 'Gõ tắt được: 85k, 1tr2, 1,5tr' : null }, o);
    if (t.bb) {
      const thieu = () => { const x = TI.layTheoDuong(hs, t.d); return t.k === 'so' ? !SO(x) : !coGT(x); };
      dsBatBuoc.push({ id, nhan: t.n, thieu, datThieu: tr.datThieu });
    }
    return tr.el;
  }

  function veToaDo() {
    const hien = TI.el('span', { class: 'mo' });
    const capNhat = () => {
      const td = hs.khach.toaDo;
      hien.replaceChildren(td ? TI.el('a', { href: `https://www.google.com/maps?q=${td.lat},${td.lng}`, target: '_blank', rel: 'noopener' },
        `${TI.soVN(td.lat, 6)}, ${TI.soVN(td.lng, 6)}`) : 'Chưa lấy vị trí');
    };
    capNhat();
    const datNut = (chu) => nut.replaceChildren(...Icon.chu('map-pin', chu));
    const nut = TI.el('button', { type: 'button', class: 'nut', onclick: () => {
      if (!navigator.geolocation) { alert('Máy không hỗ trợ lấy vị trí.'); return; }
      nut.disabled = true; datNut('Đang lấy…');
      navigator.geolocation.getCurrentPosition(
        (p) => { hs.khach.toaDo = { lat: p.coords.latitude, lng: p.coords.longitude, saiSoM: Math.round(p.coords.accuracy) }; luuSau(); capNhat(); nut.disabled = false; datNut('Lấy lại vị trí'); },
        (e) => { alert('Không lấy được vị trí: ' + e.message); nut.disabled = false; datNut('Lấy vị trí hiện tại'); },
        { enableHighAccuracy: true, timeout: 15000 });
    } });
    datNut(hs.khach.toaDo ? 'Lấy lại vị trí' : 'Lấy vị trí hiện tại');
    return TI.el('div', { class: 'hang-giua hang-gps' }, hien, nut);
  }

  // ---------- Hóa đơn điện: mỗi tháng 1 thẻ (tháng · số điện · tiền) ----------
  function veHoaDon() {
    const khung = TI.el('div', { class: 'hoa-don' });
    const tong = TI.el('div', { class: 'mo nho' });

    const tinhTong = () => {
      const ds = hs.dien.hoaDon.filter(h => SO(h.kWh));
      const dsTien = hs.dien.hoaDon.filter(h => SO(h.tien));
      tong.textContent = ds.length
        ? `Trung bình: ${TI.soVN(ds.reduce((s, h) => s + h.kWh, 0) / ds.length, 0)} kWh/tháng` +
          (dsTien.length ? ` · ${TI.soVN(dsTien.reduce((s, h) => s + h.tien, 0) / dsTien.length, 0)} đ/tháng` : '')
        : 'Nhập 2–3 tháng gần nhất (nên có cả tháng hè).';
    };

    const veLai = () => {
      khung.replaceChildren(
        ...hs.dien.hoaDon.map((h, i) => TI.el('div', { class: 'hoa-don-the' },
          ONhap.thang(h.thang || '', (gt) => { h.thang = gt; luuSau(); }, { class: 'o-thang', 'aria-label': `Tháng hóa đơn ${i + 1}` }),
          TI.el('button', { type: 'button', class: 'nut-xoa', 'aria-label': `Xóa hóa đơn ${i + 1}`,
            onclick: () => { hs.dien.hoaDon.splice(i, 1); doi(); veLai(); } }, Icon('trash')),
          ONhap.hauTo(TI.oSo(h.kWh, (n) => { h.kWh = n; doi(); tinhTong(); }, { 'aria-label': 'Số điện (kWh)', placeholder: 'Số điện' }), 'kWh'),
          ONhap.tien(h.tien, (n) => { h.tien = n; luuSau(); tinhTong(); }, { 'aria-label': 'Tiền điện', placeholder: 'Tiền điện' }))),
        TI.el('button', { type: 'button', class: 'nut', onclick: () => {
          hs.dien.hoaDon.push({ thang: '', kWh: null, tien: null }); luuSau(); veLai();
        } }, ...Icon.chu('plus', 'Thêm tháng')));
      tinhTong();
    };
    veLai();
    const tr = ONhap.truong({ nhan: 'Hóa đơn điện các tháng gần nhất', id: 'ks-hoa-don', chuThieu: 'Chưa có số điện', toO: false },
      TI.el('div', {}, khung, tong));
    dsBatBuoc.push({ id: 'ks-hoa-don', nhan: 'Số điện ít nhất 1 tháng hóa đơn',
      thieu: () => !hs.dien.hoaDon.some(x => SO(x.kWh) && x.kWh > 0), datThieu: tr.datThieu });
    return tr.el;
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
          } }, ...Icon.chu('trash', 'Xóa ảnh', { co: 18 }))));
      }
      luoi.replaceChildren(...the);
    };
    veLai();
    return TI.el('div', {},
      TI.el('p', { class: 'mo nho' }, 'Chụp ảnh mái, công tơ, tủ điện, hóa đơn. Ảnh drone chụp thẳng xuống dùng để vẽ mái ở bước sau.'),
      TI.el('button', { type: 'button', class: 'nut', onclick: () => oFile.click() }, ...Icon.chu('camera', 'Thêm ảnh')),
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
