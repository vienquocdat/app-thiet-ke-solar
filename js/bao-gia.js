// Giai đoạn 6 – bước "Báo giá": tối đa 3 phương án, so sánh tiết kiệm / hoàn vốn, xuất PDF báo giá gửi khách.
const ManBaoGia = (() => {
  const SO = TaiChinh.SO;
  const THU_VIEN = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  ];
  const CFG_KT = ['tMin', 'tVmpNong', 'rhoDong', 'nguongSutApPhanTram', 'dcAcMin', 'dcAcMax', 'heSoCBDC', 'soChuoiCanCauChi', 'heSoCauChi', 'heSoCBAC'];
  const THANG = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  let hs, luuSau, vung, nc;

  const coGT = (x) => x !== null && x !== undefined && x !== '' && x !== CAN_DIEN;
  const tien = (x) => SO(x) ? `${TI.soVN(Math.round(x), 0)} đ` : null;
  const nam = (x) => SO(x) ? `${TI.soVN(x, 1)} năm` : null;
  // Tiền rút gọn cho khách dễ đọc: 85 nghìn đ · 1,2 triệu đ · 1,25 tỷ đ
  const tienGon = (x) => !SO(x) ? null : Math.abs(x) >= 1e9 ? `${TI.soVN(x / 1e9, 2)} tỷ đ`
    : Math.abs(x) >= 1e6 ? `${TI.soVN(x / 1e6, 1)} triệu đ` : `${TI.soVN(Math.round(x / 1000), 0)} nghìn đ`;

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
        TI.el('p', { class: 'mo' }, 'Cần xếp pin ở bước Xếp pin trước.'), TI.el('a', { class: 'nut', href: `#/ho-so/${hs.id}/xep-pin` }, 'Sang bước Xếp pin')));
      return;
    }
    if (!Array.isArray(hs.phuongAn) || !hs.phuongAn.length || !hs.phuongAn[0].soTamMang) hs.phuongAn = [phuongAnMoi(0)];
    if (!hs.baoGia || !hs.phuongAn.find(p => p.id === hs.baoGia.deXuat)) hs.baoGia = { deXuat: hs.phuongAn[0].id };
    veLai();
  }

  // Bố cục: máy tính 2 cột (trái: phương án, so sánh, chi tiết; phải: tóm tắt + xuất PDF, ghim khi cuộn).
  // Điện thoại: tóm tắt ở trên, nút xuất ghim đáy.
  function veLai() {
    const ketQua = hs.phuongAn.map(phanTichPA);
    const dx = ketQua.find(k => k.pa.id === hs.baoGia.deXuat) || ketQua[0];
    const thieu = dsThieu(dx);
    vung.replaceChildren(TI.el('div', { class: 'bo-cuc-bao-gia' },
      TI.el('div', { class: 'bgm-chinh' },
        TI.el('h3', { class: 'bgm-h3-dau' }, 'Các phương án'),
        TI.el('div', { class: 'bgm-ds-pa' }, ...ketQua.map((k, i) => veTheP(k, i))),
        hs.phuongAn.length < 3 ? TI.el('button', { type: 'button', class: 'nut', onclick: () => {
          const moi = structuredClone(hs.phuongAn[hs.phuongAn.length - 1]); moi.id = TI.taoId('pa'); moi.ten = `Phương án ${hs.phuongAn.length + 1}`;
          hs.phuongAn.push(moi); luuSau(); veLai();
        } }, ...Icon.chu('plus', 'Thêm phương án (nhân bản phương án cuối)')) : null,
        ketQua.length > 1 ? TI.el('h3', {}, 'So sánh phương án') : null,
        ketQua.length > 1 ? TI.el('div', { class: 'cuon-ngang' }, bangSoSanh(ketQua, false)) : null,
        veChiTiet(dx)),
      TI.el('aside', { class: 'bgm-ben' }, veTomTat(dx, thieu),
        TI.el('div', { class: 'bgm-nut-xuat' },
          thieu.length
            ? TI.el('button', { type: 'button', class: 'nut nut-xuat', onclick: () => xuatPDF(ketQua, dx, thieu) }, ...Icon.chu('file-download', 'Xuất bản nháp'))
            : TI.el('button', { type: 'button', class: 'nut chinh nut-xuat', onclick: () => xuatPDF(ketQua, dx, thieu) }, ...Icon.chu('file-download', 'Xuất PDF báo giá')),
          TI.el('button', { type: 'button', class: 'nut-chu nut-xem', onclick: () => xemTruoc(ketQua, dx, thieu) }, ...Icon.chu('eye', 'Xem trước các trang'))))));
  }

  // Tóm tắt phương án đề xuất + danh sách còn thiếu
  function veTomTat(dx, thieu) {
    const kq = dx.kq, pa = dx.pa;
    // Con số chính là tổng tiền báo giá; các chỉ số khác xếp thành danh sách gọn bên dưới.
    const gtHoac = (gt) => gt ? TI.el('dd', {}, gt) : TI.el('dd', {}, TI.el('span', { class: 'gt-thieu' }, 'chưa có'));
    return TI.el('div', { class: 'bgm-tom-tat' },
      TI.el('div', { class: 'bgm-tom-tat-dau' }, TI.el('span', {}, 'Phương án đề xuất'), TI.el('b', {}, pa.ten)),
      TI.el('div', { class: 'bgm-tong' }, TI.el('small', {}, 'Tổng chi phí'),
        SO(kq.chiPhi.tong) ? TI.el('b', {}, tien(kq.chiPhi.tong)) : TI.el('b', { class: 'gt-thieu' }, 'chưa có')),
      TI.el('dl', { class: 'bgm-dl' },
        TI.el('dt', {}, 'Công suất'), gtHoac(SO(pa.kWp) ? `${TI.soVN(pa.kWp, 2)} kWp (${pa.soTam} tấm)` : null),
        TI.el('dt', {}, 'Tiết kiệm mỗi tháng'), gtHoac(SO(kq.tietKiemNam1) ? tienGon(kq.tietKiemNam1 / 12) : null),
        TI.el('dt', {}, 'Hoàn vốn dự kiến'), gtHoac(SO(kq.hoanVon) ? `khoảng ${TI.soVN(kq.hoanVon, 1)} năm` : null)),
      thieu.length
        ? TI.el('div', { class: 'the canh-bao nho' },
          TI.el('div', { class: 'co-icon' }, Icon('alert-triangle'), TI.el('b', {}, `Còn thiếu ${thieu.length} mục – chỉ xuất được bản nháp nội bộ`)),
          // Danh sách dài thì chỉ hiện 4 mục đầu, phần còn lại gập lại (tránh chiếm cả cột tóm tắt).
          TI.el('ul', { class: 'ds-thieu' }, ...thieu.slice(0, 4).map(t => TI.el('li', {}, t))),
          thieu.length > 5 ? TI.el('details', { class: 'xem-them' }, TI.el('summary', {}, `Xem thêm ${thieu.length - 4} mục`),
            TI.el('ul', { class: 'ds-thieu' }, ...thieu.slice(4).map(t => TI.el('li', {}, t))))
            : thieu.length === 5 ? TI.el('ul', { class: 'ds-thieu' }, TI.el('li', {}, thieu[4])) : null,
          TI.el('div', { class: 'hang' }, TI.el('a', { class: 'lien-ket-icon', href: '#/cai-dat' }, 'Cài đặt', Icon('arrow-right', { co: 16 })),
            TI.el('a', { class: 'lien-ket-icon', href: `#/ho-so/${hs.id}/thong-so` }, 'Thông số', Icon('arrow-right', { co: 16 }))))
        : TI.el('div', { class: 'the dat nho co-icon' }, Icon('circle-check'), 'Đủ số liệu để xuất báo giá gửi khách.'));
  }

  // Những mục bắt buộc phải có trước khi xuất báo giá gửi khách.
  function dsThieuChung() {
    const ds = [];
    for (const [ma, ten] of [['tenThuongHieu', 'Tên thương hiệu'], ['maSoThue', 'Mã số thuế công ty'], ['hotline', 'Hotline'], ['diaChi', 'Địa chỉ công ty'],
      ['nguoiTuVan', 'Người tư vấn'], ['hieuLucBaoGiaNgay', 'Hiệu lực báo giá (ngày)'], ['baoHanhTamPinNam', 'Bảo hành tấm pin'],
      ['baoHanhHieuSuatNam', 'Bảo hành hiệu suất'], ['baoHanhInverterNam', 'Bảo hành inverter'], ['baoHanhThiCongNam', 'Bảo hành thi công']]) {
      if (!coGT(nc.dn[ma])) ds.push(ten + ' (Cài đặt)');
    }
    if (!coGT(nc.bt.nguon) || !coGT(nc.bt.ngay)) ds.push('Nguồn và ngày áp dụng giá điện EVN (Cài đặt)');
    if (!coGT(nc.nguonNang)) ds.push('Nguồn số giờ nắng (Cài đặt)');
    if (!coGT(hs.khach.ten)) ds.push('Tên khách hàng');
    return ds;
  }
  // Phương án đề xuất còn lỗi kỹ thuật hoặc tỉ lệ DC/AC ngoài khoảng cho phép → chưa được gửi khách.
  function dsLoiKyThuat(dx) {
    const kt = dx.kq.kt, ds = kt.loi.map(l => `Lỗi kỹ thuật (${dx.pa.ten}): ${l}`);
    if (SO(kt.dcAc) && kt.dcAcDat === false) ds.push(`Tỉ lệ DC/AC ${TI.soVN(kt.dcAc, 2)} ngoài khoảng cho phép (${dx.pa.ten}) – chọn lại inverter hoặc số tấm`);
    return ds;
  }
  const dsThieu = (dx) => [...dx.kq.thieu, ...dsLoiKyThuat(dx), ...dsThieuChung()];

  function veTheP({ pa, kq, inv }, i) {
    const goc = hs.phuongAn[i], laDX = goc.id === hs.baoGia.deXuat;
    const doi = () => { luuSau(); veLai(); };
    const noiDung = [
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Tên phương án'),
        TI.el('input', { type: 'text', value: goc.ten, oninput: (e) => { goc.ten = e.target.value; luuSau(); } })),
      ...nc.mang.map(m => TI.el('label', { class: 'truong' }, TI.el('span', {}, `Số tấm ${m.ten} (tối đa ${m.toiDa})`),
        ONhap.hauTo(TI.oSo(pa.soTamMang[m.id], (n) => { goc.soTamMang[m.id] = n === null ? m.toiDa : Math.max(0, Math.min(Math.round(n), m.toiDa)); luuSau(); }, { onchange: veLai }), 'tấm'))),
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Inverter'),
        TI.el('select', { onchange: (e) => { goc.inverter = e.target.value || null; doi(); } },
          TI.el('option', { value: '' }, '— chọn —'),
          ...nc.dsINV.map(d => TI.el('option', { value: d.model, selected: d.model === goc.inverter }, `${d.model} (${SO(d.congSuatACkW) ? TI.soVN(d.congSuatACkW) + ' kW' : '?'}, ${coGT(d.loai) ? d.loai : '?'})`)))),
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Số lượng inverter'),
        ONhap.hauTo(TI.oSo(goc.soLuong, (n) => { goc.soLuong = n; luuSau(); }, { onchange: veLai }), 'cái')),
      TI.el('div', { class: 'luoi-o' },
        TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Pin lưu trữ'),
          TI.el('select', { onchange: (e) => { goc.pin = e.target.value ? { model: e.target.value, soLuong: (goc.pin && goc.pin.soLuong) || 1 } : null; doi(); } },
            TI.el('option', { value: '' }, 'Không'),
            ...nc.dsPin.map(d => TI.el('option', { value: d.model, selected: goc.pin && goc.pin.model === d.model }, `${d.model} (${SO(d.dungLuongKWh) ? TI.soVN(d.dungLuongKWh) + ' kWh' : '?'})`)))),
        goc.pin ? TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Số bộ pin'),
          ONhap.hauTo(TI.oSo(goc.pin.soLuong, (n) => { goc.pin.soLuong = n || 1; luuSau(); }, { onchange: veLai }), 'bộ')) : null),
      TI.el('div', { class: 'ket-qua-pa' },
        dong('Công suất', SO(pa.kWp) ? `${TI.soVN(pa.kWp, 2)} kWp (${pa.soTam} tấm)` : null),
        dong('Sản lượng dự kiến', SO(kq.SLnam) ? `${TI.soVN(kq.SLnam, 0)} kWh/năm` : null),
        dong('Tiết kiệm năm đầu', SO(kq.tietKiemNam1) ? tien(kq.tietKiemNam1) : null),
        dong('Tổng chi phí', SO(kq.chiPhi.tong) ? tien(kq.chiPhi.tong) : null),
        dong('Hoàn vốn dự kiến', SO(kq.hoanVon) ? nam(kq.hoanVon) : null),
        dong('Kỹ thuật', kq.kt.loi.length ? `${kq.kt.loi.length} lỗi` : kq.kt.nhom.length ? 'Đạt' : 'Chưa đủ số liệu', kq.kt.loi.length ? 'khong-dat' : '')),
      kq.kt.loi.length ? TI.el('ul', { class: 'ds-thieu nho chu-loi' }, ...kq.kt.loi.map(l => TI.el('li', {}, l))) : null,
      TI.el('div', { class: 'hang' },
        TI.el('label', { class: 'lua-chon' }, TI.el('input', { type: 'radio', name: 'de-xuat', checked: laDX, onchange: () => { hs.baoGia.deXuat = goc.id; doi(); } }), 'Phương án đề xuất (in chi tiết trong báo giá)'),
        hs.phuongAn.length > 1 ? TI.el('button', { type: 'button', class: 'nut nho nguy-hiem', onclick: () => {
          if (!confirm(`Xóa "${goc.ten}"?`)) return;
          hs.phuongAn.splice(i, 1); if (laDX) hs.baoGia.deXuat = hs.phuongAn[0].id; doi();
        } }, ...Icon.chu('trash', 'Xóa', { co: 18 })) : null),
    ];
    return TI.el('details', { class: 'nhom' + (laDX ? ' pa-de-xuat' : ''), open: laDX },
      TI.el('summary', {}, TI.el('span', {}, goc.ten), TI.el('span', { class: 'nhan' + (laDX ? ' nhan-du' : '') }, laDX ? 'Đề xuất' : SO(pa.kWp) ? `${TI.soVN(pa.kWp, 1)} kWp` : '')),
      TI.el('div', { class: 'nhom-noi-dung' }, ...noiDung));
  }
  // Dòng "nhãn – giá trị"; giá trị null = chưa có số liệu
  const dong = (a, b, cls = '') => TI.el('div', { class: 'dong-kt ' + cls }, TI.el('span', {}, a), b === null ? TI.el('b', { class: 'gt-thieu' }, 'chưa có') : TI.el('b', {}, b));

  // ---------- Bảng so sánh phương án (dùng chung màn hình và PDF), viết cho khách hộ gia đình ----------
  function bangSoSanh(ketQua, inPDF) {
    const thieu = () => inPDF ? TI.el('span', { class: 'pdf-thieu' }, 'chưa có') : TI.el('span', { class: 'gt-thieu' }, 'chưa có');
    const hang = [
      { ten: 'Công suất hệ thống', phu: 'Tổng công suất tấm pin',
        gt: k => SO(k.pa.kWp) ? `${TI.soVN(k.pa.kWp, 1)} kWp` : null, them: k => `${k.pa.soTam} tấm pin` },
      { ten: 'Pin lưu trữ', phu: 'Dùng điện ban đêm và khi mất điện',
        gt: k => k.pa.pin && k.pa.pin.model ? `Có (${k.pa.pin.soLuong || 1} bộ)` : 'Không có', them: k => k.pa.pin && k.pa.pin.model ? k.pa.pin.model : '' },
      { ten: 'Điện tạo ra mỗi tháng', phu: 'Trung bình cả năm',
        gt: k => SO(k.kq.SLnam) ? `${TI.soVN(k.kq.SLnam / 12, 0)} kWh` : null },
      { ten: 'Tiền điện tiết kiệm mỗi tháng', phu: 'Trung bình năm đầu',
        so: k => k.kq.tietKiemNam1, gt: k => SO(k.kq.tietKiemNam1) ? tienGon(k.kq.tietKiemNam1 / 12) : null, tot: 'max', nhanTot: 'Tiết kiệm nhiều nhất' },
      { ten: 'Tổng chi phí đầu tư', phu: 'Thiết bị và lắp đặt',
        gt: k => SO(k.kq.chiPhi.tong) ? tienGon(k.kq.chiPhi.tong) : null },
      { ten: 'Thời gian hoàn vốn', phu: 'Dự kiến',
        so: k => k.kq.hoanVon, gt: k => SO(k.kq.hoanVon) ? `khoảng ${TI.soVN(k.kq.hoanVon, 1)} năm` : null, tot: 'min', nhanTot: 'Hoàn vốn nhanh nhất' },
    ];
    const tot = (h) => {
      if (!h.tot) return null;
      const ds = ketQua.map(h.so).filter(SO);
      if (ds.length < 2 || Math.max(...ds) === Math.min(...ds)) return null;
      return h.tot === 'max' ? Math.max(...ds) : Math.min(...ds);
    };
    return TI.el('table', { class: 'bang-so-sanh-khach' + (inPDF ? ' pdf-so-sanh' : '') },
      TI.el('thead', {}, TI.el('tr', {}, TI.el('th', { scope: 'col' }, ''),
        ...ketQua.map(k => TI.el('th', { scope: 'col', class: k.pa.id === hs.baoGia.deXuat ? 'cot-de-xuat' : '' },
          TI.el('span', { class: 'ten-pa' }, k.pa.ten),
          k.pa.id === hs.baoGia.deXuat ? TI.el('span', { class: 'nhan-de-xuat' }, Icon('star', { co: 12 }), 'Đề xuất') : null)))),
      TI.el('tbody', {}, ...hang.map(h => {
        const giaTriTot = tot(h);
        return TI.el('tr', {}, TI.el('th', { scope: 'row' }, TI.el('span', {}, h.ten), TI.el('small', {}, h.phu)),
          ...ketQua.map(k => {
            const g = h.gt(k), phu = h.them ? h.them(k) : '';
            const laTot = giaTriTot !== null && h.so(k) === giaTriTot;
            return TI.el('td', { class: k.pa.id === hs.baoGia.deXuat ? 'cot-de-xuat' : '' },
              g === null ? thieu() : TI.el('b', {}, g), phu ? TI.el('small', {}, phu) : null,
              laTot ? TI.el('span', { class: 'nhan-tot' }, h.nhanTot) : null);
          }));
      })));
  }

  function veChiTiet(dx) {
    const kq = dx.kq, nd = [TI.el('h3', {}, `Chi tiết: ${dx.pa.ten}`)];
    if (kq.SL) {
      const c = TI.el('canvas', { class: 'bieu-do' });
      veBieuDo(c, kq.SL, 700, 260);
      nd.push(TI.el('div', { class: 'the' }, TI.el('h4', {}, 'Sản lượng dự kiến 12 tháng'), c,
        TI.el('p', { class: 'mo nho' }, `= ${TI.soVN(dx.pa.kWp, 2)} kWp × giờ nắng đỉnh tháng × PR ${TI.soVN(nc.PR)} × số ngày.`)));
    }
    nd.push(TI.el('div', { class: 'the' }, TI.el('h4', {}, 'Bảng giá'), TI.el('div', { class: 'cuon-ngang' }, bangGia(kq.chiPhi, false))));
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

  // Ghi chú VAT lấy từ Cài đặt (chỉ ghi chú, không tự tính thêm thuế).
  function ghiChuVAT() {
    const ds = [['tấm pin', nc.vat.tamPin], ['inverter', nc.vat.inverter], ['thi công', nc.vat.thiCong]];
    if (ds.some(([, v]) => !coGT(v))) return null;
    if (ds.every(([, v]) => v === 'Đã gồm VAT')) return 'Đơn giá đã gồm thuế VAT.';
    if (ds.every(([, v]) => v === 'Chưa gồm VAT')) return 'Đơn giá chưa gồm thuế VAT.';
    return 'Thuế VAT: ' + ds.map(([a, v]) => `${a} ${v.toLowerCase()}`).join('; ') + '.';
  }

  // Bảng giá: STT · Hạng mục · ĐVT · Số lượng · Đơn giá · Thành tiền, dòng tổng, VAT, bằng chữ.
  function bangGia(cp, inPDF) {
    const h = TI.el;
    const thieu = () => h('span', { class: inPDF ? 'pdf-thieu' : 'gt-thieu' }, 'chưa có');
    const vat = ghiChuVAT();
    return h('div', { class: 'khoi-bang-gia' },
      h('table', { class: 'bang-gia-chuan' + (inPDF ? ' pdf-bang-gia' : '') },
        h('thead', {}, h('tr', {}, h('th', { class: 'stt' }, 'STT'), h('th', {}, 'Hạng mục'), h('th', { class: 'dvt' }, 'ĐVT'),
          h('th', { class: 'so' }, 'Số lượng'), h('th', { class: 'so' }, 'Đơn giá (đ)'), h('th', { class: 'so' }, 'Thành tiền (đ)'))),
        h('tbody', {}, ...cp.dong.map((d, i) => h('tr', {},
          h('td', { class: 'stt' }, String(i + 1)),
          h('td', {}, d.ten, d.ghiChu ? h('small', {}, d.ghiChu) : null),
          h('td', { class: 'dvt' }, d.donVi || ''),
          h('td', { class: 'so' }, TI.soVN(d.soLuong, 2)),
          h('td', { class: 'so' }, SO(d.donGia) ? TI.soVN(d.donGia, 0) : thieu()),
          h('td', { class: 'so' }, SO(d.thanhTien) ? TI.soVN(Math.round(d.thanhTien), 0) : thieu())))),
        h('tfoot', {},
          h('tr', { class: 'dong-vat' }, h('td', { colspan: '6' }, vat || h('span', {}, 'Thuế VAT: ', thieu()))),
          h('tr', { class: 'dong-tong' }, h('td', { colspan: '5' }, 'TỔNG CỘNG'), h('td', { class: 'so' }, SO(cp.tong) ? TI.soVN(Math.round(cp.tong), 0) : thieu())))),
      h('p', { class: 'bang-chu' }, h('b', {}, 'Bằng chữ: '), SO(cp.tong) ? TI.tienBangChu(cp.tong) + '.' : thieu()));
  }

  function veBieuDo(c, SL, W, H) {
    const dpr = 2; c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const font = (co, dam = 400) => `${dam} ${co}px "Be Vietnam Pro", system-ui, sans-serif`;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const max = Math.max(...SL) * 1.15 || 1, trai = 50, duoi = 28, tren = 14, rong = (W - trai - 10) / 12;
    g.strokeStyle = '#E3E6E8'; g.fillStyle = '#45525F'; g.font = font(11); g.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = tren + (H - tren - duoi) * (1 - i / 4);
      g.beginPath(); g.moveTo(trai, y); g.lineTo(W - 10, y); g.stroke();
      g.fillText(TI.soVN(max * i / 4, 0), trai - 6, y + 4);
    }
    SL.forEach((v, i) => {
      const h = (H - tren - duoi) * v / max, x = trai + i * rong + rong * 0.18, y = H - duoi - h;
      g.fillStyle = '#FFB020'; g.fillRect(x, y, rong * 0.64, h);
      g.fillStyle = '#0B2A4A'; g.textAlign = 'center'; g.font = font(10, 600);
      g.fillText(TI.soVN(v, 0), x + rong * 0.32, y - 4);
      g.fillStyle = '#45525F'; g.font = font(11); g.fillText(THANG[i], x + rong * 0.32, H - 10);
    });
    g.save(); g.translate(12, H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = '#45525F'; g.fillText('kWh', 0, 0); g.restore();
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
      const [x, y] = S(HH.trongTam(n.P)), t = `${n.mang.ten || 'Mảng mái'}: ${so} tấm`;
      g.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const rong = g.measureText(t).width + 16;
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(x - rong / 2, y - 12, rong, 24, 6); g.fill();
      g.strokeStyle = '#D5DBE0'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#0B2A4A'; g.fillText(t, x, y + 0.5); g.textBaseline = 'alphabetic';
    }
    // Thước tỉ lệ 5 m
    const L = 5 * s; g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, H - 14); g.lineTo(14 + L, H - 14); g.stroke();
    g.fillStyle = '#222'; g.textAlign = 'left'; g.font = '11px system-ui, sans-serif'; g.fillText('5 m', 18 + L, H - 10);
    return c.toDataURL('image/png');
  }

  // ---------- Các trang báo giá A4 (theo mục 7 ui-viet-nam) ----------
  // nhap = true: còn thiếu mục bắt buộc → in chữ "BẢN NHÁP" mờ trên mọi trang, chỗ thiếu ghi "chưa có".
  async function taoTrang(ketQua, dx, nhap) {
    const h = TI.el, dn = nc.dn, pa = dx.pa, kq = dx.kq;
    const thieu = () => h('span', { class: 'pdf-thieu' }, 'chưa có');
    const cd = (x) => coGT(x) ? String(x) : thieu();
    const homNay = new Date();
    const ngay = TI.ngayVN(TI.homNay());
    const soBG = `BG-${TI.homNay().replace(/-/g, '')}-${hs.id.slice(-4).toUpperCase()}`;
    const hieuLuc = SO(dn.hieuLucBaoGiaNgay) ? (() => {
      const d = new Date(homNay); d.setDate(d.getDate() + dn.hieuLucBaoGiaNgay);
      return `${TI.soVN(dn.hieuLucBaoGiaNgay, 0)} ngày (đến ${TI.ngayVN(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)})`;
    })() : null;
    // File logo gốc có khoảng trống phía dưới → dùng bản đã cắt.
    const logo = coGT(dn.logo) && dn.logo !== 'anh/logo-tdh.png' ? dn.logo : 'anh/logo-tdh-bieu-tuong.png';
    // Dòng liên hệ: MST luôn có mặt (thiếu thì đánh dấu), điện thoại / Zalo có thì in.
    // (tạo mới cho từng trang: một phần tử HTML chỉ nằm được ở một chỗ)
    const lienHe = () => [h('span', {}, 'MST: ', cd(dn.maSoThue)), coGT(dn.hotline) ? `ĐT: ${dn.hotline}` : null, coGT(dn.zalo) ? `Zalo: ${dn.zalo}` : null]
      .filter(Boolean).flatMap((x, i) => i ? [' · ', x] : [x]);

    const dauTrang = (trang1) => h('div', { class: 'pdf-dau' },
      h('img', { src: logo, alt: '' }),
      h('div', { class: 'pdf-dn' },
        h('b', {}, cd(dn.tenThuongHieu)),
        coGT(dn.tenDayDu) ? h('div', {}, dn.tenDayDu) : null,
        h('div', {}, ...lienHe()),
        h('div', {}, cd(dn.diaChi))),
      trang1 ? h('div', { class: 'pdf-so' }, h('b', {}, 'BÁO GIÁ'), h('div', {}, `Số: ${soBG}`), h('div', {}, `Ngày lập: ${ngay}`)) : null);
    const TONG_TRANG = 4;
    const trang = (so, ...con) => h('div', { class: 'trang-a4' + (nhap ? ' la-nhap' : '') },
      nhap ? h('div', { class: 'pdf-chu-nhap', 'aria-hidden': 'true' }, 'BẢN NHÁP') : null,
      dauTrang(so === 1),
      nhap && so === 1 ? h('div', { class: 'pdf-bao-nhap' }, 'Bản nháp nội bộ – còn thiếu số liệu, chưa gửi cho khách.') : null,
      ...con,
      h('div', { class: 'pdf-chan' }, h('span', {}, coGT(dn.hotline) ? `Hotline ${dn.hotline}` : ''), h('span', {}, `${soBG} · Trang ${so}/${TONG_TRANG}`)));
    const muc = (so, ten) => h('h2', { class: 'pdf-muc' }, `${so}. ${ten}`);
    const bang = (dsHang) => h('table', { class: 'pdf-bang' }, h('tbody', {}, ...dsHang.map(([a, b]) => h('tr', {}, h('th', {}, a), h('td', {}, b)))));
    const chiSo = (nhan, gt, phu) => h('div', { class: 'pdf-chi-so' }, h('small', {}, nhan), h('b', {}, gt === null ? thieu() : gt), phu ? h('span', {}, phu) : null);

    // Ảnh
    // Ảnh 3D dựng lại theo đúng số tấm của phương án đề xuất (ảnh chụp tay ở bước 3D có thể khác số tấm).
    let anhPC = null;
    try { anhPC = await ManDung3D.chupTheoPhuongAn(hs, pa.soTamMang); } catch (e) { console.warn('Không dựng được 3D cho báo giá:', e); }
    const anhMB = anhMatBang(pa);
    const bd = kq.SL ? veBieuDo(document.createElement('canvas'), kq.SL, 700, 250).toDataURL('image/png') : null;

    // Trang 1: khách hàng, tóm tắt, hình
    const t1 = trang(1,
      h('h1', { class: 'pdf-tieu-de' }, 'BÁO GIÁ HỆ THỐNG ĐIỆN MẶT TRỜI MÁI NHÀ'),
      h('div', { class: 'pdf-hieu-luc' }, 'Hiệu lực báo giá: ', hieuLuc || thieu()),
      muc(1, 'Thông tin khách hàng'),
      h('div', { class: 'pdf-hai-cot' },
        bang([['Kính gửi', h('b', {}, cd(hs.khach.ten))], ['Điện thoại', coGT(hs.khach.dienThoai) ? TI.dienThoaiVN(hs.khach.dienThoai) : thieu()], ['Địa chỉ lắp đặt', cd(hs.khach.diaChi)]]),
        bang([['Đơn vị tư vấn', cd(dn.tenThuongHieu)], ['Người tư vấn', cd(dn.nguoiTuVan)], ['Điện thoại', cd(dn.hotline)]])),
      muc(2, `Tóm tắt phương án đề xuất – ${pa.ten}`),
      h('div', { class: 'pdf-luoi-chi-so' },
        chiSo('Công suất hệ thống', SO(pa.kWp) ? `${TI.soVN(pa.kWp, 2)} kWp` : null, `${pa.soTam} tấm pin`),
        chiSo('Điện tạo ra mỗi tháng', SO(kq.SLnam) ? `${TI.soVN(kq.SLnam / 12, 0)} kWh` : null, 'trung bình cả năm'),
        chiSo('Tiết kiệm mỗi tháng', SO(kq.tietKiemNam1) ? tienGon(kq.tietKiemNam1 / 12) : null, 'trung bình năm đầu'),
        chiSo('Hoàn vốn dự kiến', SO(kq.hoanVon) ? `${TI.soVN(kq.hoanVon, 1)} năm` : null, SO(kq.chiPhi.tong) ? `vốn ${tienGon(kq.chiPhi.tong)}` : '')),
      h('div', { class: 'pdf-hai-anh' },
        h('figure', {}, anhPC ? h('img', { src: anhPC, alt: '' }) : h('div', { class: 'pdf-anh-trong' }, 'Không dựng được ảnh 3D (cần kết nối mạng)'), h('figcaption', {}, `Phối cảnh 3D – ${pa.soTam} tấm`)),
        h('figure', {}, h('img', { src: anhMB, alt: '' }), h('figcaption', {}, 'Mặt bằng xếp tấm pin'))),
      h('p', { class: 'pdf-ghi-chu' }, 'Hình minh họa dựng theo số đo khảo sát; vị trí tấm có thể điều chỉnh nhỏ khi thi công.'));

    // Trang 2: thông số + sản lượng
    const tpm = nc.tp || {};
    const t2 = trang(2,
      muc(3, 'Thông số hệ thống'),
      bang([
        ['Tấm pin', h('span', {}, cd(tpm.model), ' – ', SO(tpm.congSuatW) ? `${TI.soVN(tpm.congSuatW)} W/tấm` : thieu())],
        ['Số tấm', `${pa.soTam} tấm (${nc.mang.map(m => `${m.ten}: ${pa.soTamMang[m.id] || 0}`).join('; ')})`],
        ['Tổng công suất', SO(pa.kWp) ? `${TI.soVN(pa.kWp, 2)} kWp` : thieu()],
        ['Inverter', dx.inv ? `${dx.inv.model} × ${pa.soLuong || 1} (${TI.soVN(dx.inv.congSuatACkW)} kW, ${dx.inv.loai}, ${dx.inv.soPha})` : thieu()],
        ['Pin lưu trữ', pa.pin && pa.pin.model ? `${pa.pin.model} × ${pa.pin.soLuong || 1}` : 'Không'],
        ['Cách lắp', nc.mang.filter(m => pa.soTamMang[m.id]).map(m => `${m.ten}: ${m.kieuLap === 'khung-nang' ? 'khung nâng' : 'áp mái'}`).join('; ')],
      ]),
      muc(4, 'Sản lượng điện dự kiến 12 tháng'),
      bd ? h('img', { class: 'pdf-bieu-do', src: bd, alt: '' }) : h('div', { class: 'pdf-anh-trong' }, 'Biểu đồ sản lượng: ', thieu()),
      kq.SL ? h('table', { class: 'pdf-bang pdf-thang' },
        h('tr', {}, h('th', {}, 'Tháng'), ...THANG.map(t => h('th', {}, t))),
        h('tr', {}, h('th', {}, 'kWh'), ...kq.SL.map(v => h('td', {}, TI.soVN(v, 0))))) : null,
      h('p', { class: 'pdf-ghi-chu' }, 'Tổng dự kiến: ', SO(kq.SLnam) ? h('b', {}, `${TI.soVN(kq.SLnam, 0)} kWh/năm`) : thieu(),
        '. Ước tính theo số giờ nắng đỉnh trung bình từng tháng (nguồn: ', cd(nc.nguonNang), ') và hệ số hiệu suất hệ thống PR ',
        SO(nc.PR) ? TI.soVN(nc.PR) : thieu(), '. Sản lượng thực tế thay đổi theo thời tiết từng năm.'));

    // Trang 3: bảng giá + so sánh phương án
    const t3 = trang(3,
      muc(5, `Bảng giá chi tiết – ${pa.ten}`),
      bangGia(kq.chiPhi, true),
      ketQua.length > 1 ? muc(6, 'So sánh các phương án') : null,
      ketQua.length > 1 ? bangSoSanh(ketQua, true) : null,
      ketQua.length > 1 ? h('p', { class: 'pdf-ghi-chu' }, 'Phương án đánh dấu "Đề xuất" là phương án chúng tôi khuyên dùng; Quý khách có thể chọn phương án khác phù hợp nhu cầu.') : null);

    // Trang 4: tiết kiệm, bảo hành, các bước, chữ ký
    const buoc = String(dn.cacBuocTiepTheo || '').split(';').map(s => s.trim()).filter(Boolean);
    const soMuc = ketQua.length > 1 ? 7 : 6;
    const noiKy = coGT(dn.khuVuc) ? String(dn.khuVuc).split(/[,;]/)[0].trim() : '……………';
    const t4 = trang(4,
      muc(soMuc, 'Tiết kiệm và hoàn vốn dự kiến'),
      bang([
        ['Tiêu thụ điện hiện tại', SO(nc.C) ? `khoảng ${TI.soVN(nc.C, 0)} kWh/tháng (trung bình hóa đơn)` : thieu()],
        ['Tiền điện năm đầu – chưa lắp', kq.nam1 ? tien(kq.nam1.truoc) : thieu()],
        ['Tiền điện năm đầu – sau khi lắp', kq.nam1 ? tien(kq.nam1.sau) : thieu()],
        ['Tiết kiệm dự kiến năm đầu', kq.nam1 ? h('b', {}, tien(kq.nam1.tietKiem)) : thieu()],
        ['Thời gian hoàn vốn dự kiến', SO(kq.hoanVon) ? h('b', {}, `khoảng ${TI.soVN(kq.hoanVon, 1)} năm`) : thieu()],
      ]),
      h('p', { class: 'pdf-ghi-chu' }, 'Tiền điện tính theo bảng giá bậc thang EVN (', cd(nc.bt.nguon), ', áp dụng từ ', cd(nc.bt.ngay),
        `). Giả định: tiêu thụ mỗi tháng bằng trung bình hóa đơn, `, SO(nc.d) ? `${TI.soVN(nc.d * 100, 0)}%` : thieu(),
        ' điện dùng ban ngày, điện dư chưa tính thành tiền, hiệu suất tấm giảm ', SO(nc.suyGiam) ? `${TI.soVN(nc.suyGiam)}%` : thieu(), '/năm, chưa tính tăng giá điện.'),
      muc(soMuc + 1, 'Bảo hành'),
      bang([
        ['Tấm pin – sản phẩm', SO(dn.baoHanhTamPinNam) ? `${TI.soVN(dn.baoHanhTamPinNam)} năm` : thieu()],
        ['Tấm pin – hiệu suất', SO(dn.baoHanhHieuSuatNam) ? `${TI.soVN(dn.baoHanhHieuSuatNam)} năm` : thieu()],
        ['Inverter', SO(dn.baoHanhInverterNam) ? `${TI.soVN(dn.baoHanhInverterNam)} năm` : thieu()],
        ['Thi công, chống dột', SO(dn.baoHanhThiCongNam) ? `${TI.soVN(dn.baoHanhThiCongNam)} năm` : thieu()],
      ]),
      h('h3', { class: 'pdf-nho' }, 'Các bước tiếp theo'),
      buoc.length && coGT(dn.cacBuocTiepTheo) ? h('ol', { class: 'pdf-buoc' }, ...buoc.map(b => h('li', {}, b))) : h('p', {}, thieu()),
      h('div', { class: 'pdf-luu-y' }, h('b', {}, 'Lưu ý: '), 'Sản lượng, tiết kiệm và hoàn vốn trong báo giá là số ước tính theo số liệu khảo sát, hóa đơn điện và giờ nắng trung bình; kết quả thực tế có thể khác.'),
      h('p', { class: 'pdf-noi-ky' }, `${noiKy}, ngày ${homNay.getDate()} tháng ${homNay.getMonth() + 1} năm ${homNay.getFullYear()}`),
      h('div', { class: 'pdf-ky' },
        h('div', {}, h('b', {}, 'ĐẠI DIỆN KHÁCH HÀNG'), h('small', {}, '(Ký, ghi rõ họ tên)'), h('div', { class: 'pdf-ky-o' })),
        h('div', {}, h('b', {}, 'ĐƠN VỊ TƯ VẤN'), h('small', {}, '(Ký, ghi rõ họ tên)'), h('div', { class: 'pdf-ky-o' }), h('div', { class: 'pdf-ky-ten' }, cd(dn.nguoiTuVan)))),
      h('p', { class: 'pdf-cam-on' }, 'Trân trọng cảm ơn Quý khách đã quan tâm!'));
    return [t1, t2, t3, t4];
  }

  async function xemTruoc(ketQua, dx, thieu) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const trang = await taoTrang(ketQua, dx, thieu.length > 0);
    const ti = Math.min(1, (window.innerWidth - 24) / 794);
    const lop = TI.el('dialog', { class: 'lop-xem-truoc', 'aria-label': 'Xem trước báo giá', onclose: () => lop.remove() },
      TI.el('div', { class: 'hang' }, TI.el('button', { type: 'button', class: 'nut', onclick: () => lop.close() }, ...Icon.chu('x', 'Đóng')),
        TI.el('button', { type: 'button', class: 'nut chinh', onclick: () => { lop.close(); xuatPDF(ketQua, dx, thieu); } },
          ...Icon.chu('file-download', thieu.length ? 'Xuất bản nháp' : 'Xuất PDF'))),
      ...trang.map(t => TI.el('div', { class: 'khung-trang', style: `width:${794 * ti}px;height:${1123 * ti}px` },
        (t.style.transform = `scale(${ti})`, t.style.transformOrigin = '0 0', t))));
    document.body.append(lop);
    lop.showModal();
  }

  async function napThuVien() {
    if (window.html2canvas && window.jspdf) return;
    for (const url of THU_VIEN) {
      await new Promise((ok, loi) => { const s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = () => { s.remove(); loi(new Error('Không tải được thư viện PDF (cần mạng).')); }; document.head.append(s); });
    }
  }

  async function taoPDF(ketQua, dx, nhap) {
    await napThuVien();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const trang = await taoTrang(ketQua, dx, nhap);
    const giu = TI.el('div', { class: 'giu-trang' }, ...trang);
    document.body.append(giu);
    try {
      await Promise.all([...giu.querySelectorAll('img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      for (let i = 0; i < trang.length; i++) {
        const c = await html2canvas(trang[i], { scale: 2, backgroundColor: '#ffffff', logging: false });
        if (i) pdf.addPage();
        pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297);
      }
      return { blob: pdf.output('blob'), soTrang: trang.length };
    } finally { giu.remove(); }
  }

  // Còn thiếu mục bắt buộc thì chỉ cho xuất bản nháp (có chữ BẢN NHÁP trên mọi trang).
  async function xuatPDF(ketQua, dx, thieu) {
    const nhap = thieu.length > 0;
    if (nhap && !confirm(`Báo giá còn thiếu ${thieu.length} mục nên chỉ xuất được BẢN NHÁP nội bộ (có chữ "BẢN NHÁP" trên mọi trang, không gửi khách). Tiếp tục?`)) return;
    TI.thongBao('Đang tạo PDF…');
    try {
      const { blob } = await taoPDF(ketQua, dx, nhap);
      await TI.luuFile(`${nhap ? 'ban-nhap-' : ''}bao-gia-${TI.tenFile(hs.khach.ten)}-${TI.homNay()}.pdf`, blob, 'application/pdf');
      TI.thongBao(nhap ? 'Đã tạo bản nháp PDF' : 'Đã tạo PDF báo giá');
    } catch (e) { alert('Không tạo được PDF: ' + e.message); }
  }

  const ketQuaHienTai = () => { const kq = hs.phuongAn.map(phanTichPA); return [kq, kq.find(k => k.pa.id === hs.baoGia.deXuat) || kq[0]]; };
  return { ve,
    _taoPDF: async () => { const [kq, dx] = ketQuaHienTai(); return taoPDF(kq, dx, dsThieu(dx).length > 0); },
    _taoTrang: async () => { const [kq, dx] = ketQuaHienTai(); return taoTrang(kq, dx, dsThieu(dx).length > 0); },
    _ketQua: () => hs.phuongAn.map(phanTichPA), _nc: () => nc };
})();
