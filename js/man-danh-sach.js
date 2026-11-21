// Màn hình 1: danh sách hồ sơ khách.
const TRANG_THAI = {
  'khao-sat': 'Đang khảo sát',
  'da-thiet-ke': 'Đã thiết kế',
  'da-bao-gia': 'Đã báo giá',
  'da-ky': 'Đã ký hợp đồng',
};

const ManDanhSach = (() => {
  // Giữ lại tìm kiếm và bộ lọc khi quay về danh sách.
  let tuKhoa = '';
  let locTT = '';

  const coGT = (x) => x !== null && x !== undefined && x !== '' && x !== CAN_DIEN;
  const tenKhach = (h) => coGT(h.khach.ten) ? h.khach.ten : 'Chưa có tên';
  const trong = () => TI.el('span', { class: 'o-trong' }, '—');

  async function ve(v) {
    App.datTieuDe('Hồ sơ khách');
    const ds = await HoSo.danhSach();

    // Công suất: số tấm × công suất tấm (lấy từ danh mục). Chưa có công suất tấm thì hiện số tấm.
    const congSuatW = {};
    for (const d of (await DuLieu.lay('tam-pin')).bang.dong) {
      if (coGT(d.model) && typeof d.congSuatW === 'number') congSuatW[d.model] = d.congSuatW;
    }
    const congSuat = (h) => {
      const n = h.xepPin && Array.isArray(h.xepPin.tam) ? h.xepPin.tam.length : 0;
      if (!n) return null;
      const w = congSuatW[h.xepPin.maTamPin];
      return w ? { chu: `${TI.soVN(n * w / 1000, 1)} kWp`, phu: `${n} tấm` } : { chu: `${n} tấm`, phu: 'chưa có công suất tấm' };
    };

    let tongThieu = 0;
    for (const ten of DuLieu.DANH_SACH) tongThieu += DuLieu.demCanDien(await DuLieu.lay(ten));

    // ---------- Thanh tìm và lọc ----------
    const oTim = TI.el('input', {
      type: 'search', class: 'o-tim', placeholder: 'Tìm tên, số điện thoại, địa chỉ', value: tuKhoa,
      'aria-label': 'Tìm hồ sơ', oninput: (e) => { tuKhoa = e.target.value; veDanhSach(); },
    });
    const thanhLoc = TI.el('div', { class: 'loc-trang-thai', role: 'group', 'aria-label': 'Lọc theo trạng thái' });
    const oDem = TI.el('div', { class: 'dem-ho-so', role: 'status' });
    const vungDs = TI.el('div', { class: 'vung-danh-sach' });

    function veLoc() {
      const dem = (ma) => ds.filter(h => !ma || h.trangThai === ma).length;
      thanhLoc.replaceChildren(...[['', 'Tất cả'], ...Object.entries(TRANG_THAI)].map(([ma, ten]) =>
        TI.el('button', { type: 'button', class: 'chip-loc', 'aria-pressed': String(locTT === ma),
          onclick: () => { locTT = ma; veLoc(); veDanhSach(); } },
          ten, TI.el('span', { class: 'chip-so' }, String(dem(ma))))));
      // Trên điện thoại hàng lọc cuộn ngang: kéo nút đang chọn vào tầm nhìn.
      const dangChon = thanhLoc.querySelector('[aria-pressed="true"]');
      if (dangChon) requestAnimationFrame(() => {
        thanhLoc.scrollLeft = Math.max(0, dangChon.offsetLeft - thanhLoc.offsetLeft - 16);
      });
    }

    function xoaLoc() { tuKhoa = ''; locTT = ''; oTim.value = ''; veLoc(); veDanhSach(); }

    function veDanhSach() {
      const k = TI.boDau(tuKhoa).toLowerCase().trim();
      const loc = ds.filter(h => (!locTT || h.trangThai === locTT) && (!k || TI.boDau(
        [h.khach.ten, h.khach.dienThoai, TI.dienThoaiVN(h.khach.dienThoai), h.khach.diaChi].filter(coGT).join(' ')).toLowerCase().includes(k)));
      oDem.textContent = loc.length === ds.length ? `${ds.length} hồ sơ lưu trên máy này` : `Đang hiện ${loc.length} / ${ds.length} hồ sơ`;

      if (!ds.length) {
        vungDs.replaceChildren(TI.el('div', { class: 'the trong' },
          TI.el('b', {}, 'Chưa có hồ sơ nào'),
          TI.el('p', { class: 'mo' }, App.cheDoThu
            ? 'Bấm "Hồ sơ mới" để bắt đầu khảo sát, hoặc nạp hồ sơ mẫu nhà B ở cuối trang.'
            : 'Bấm "Hồ sơ mới" để bắt đầu khảo sát nhà đầu tiên.')));
        return;
      }
      if (!loc.length) {
        vungDs.replaceChildren(TI.el('div', { class: 'the trong' },
          TI.el('b', {}, 'Không có hồ sơ khớp'),
          TI.el('p', { class: 'mo' }, 'Thử từ khóa khác hoặc bỏ bộ lọc trạng thái.'),
          TI.el('button', { type: 'button', class: 'nut', onclick: xoaLoc }, ...Icon.chu('x', 'Xóa tìm kiếm và bộ lọc'))));
        return;
      }
      vungDs.replaceChildren(veBang(loc), veThe(loc));
    }

    const href = (h) => `#/ho-so/${h.id}/khao-sat`;
    const nhanTT = (h) => TI.el('span', { class: 'nhan nhan-' + h.trangThai }, TRANG_THAI[h.trangThai] || 'Chưa rõ');

    // Máy tính: bảng
    function veBang(loc) {
      const cot = ['Khách hàng', 'Số điện thoại', 'Địa chỉ', 'Trạng thái', 'Công suất', 'Ngày tạo', 'Cập nhật'];
      return TI.el('div', { class: 'khung-bang-ho-so' }, TI.el('table', { class: 'bang-ho-so' },
        TI.el('thead', {}, TI.el('tr', {}, ...cot.map((t, i) => TI.el('th', { scope: 'col', class: i === 4 ? 'so' : '' }, t)))),
        TI.el('tbody', {}, ...loc.map(h => {
          const cs = congSuat(h);
          return TI.el('tr', { onclick: (e) => { if (!e.target.closest('a')) location.hash = href(h); } },
            TI.el('td', { class: 'cot-ten' }, TI.el('a', { href: href(h) }, tenKhach(h))),
            TI.el('td', { class: 'cot-dt' }, coGT(h.khach.dienThoai) ? TI.dienThoaiVN(h.khach.dienThoai) : trong()),
            TI.el('td', { class: 'cot-dia-chi' }, coGT(h.khach.diaChi) ? h.khach.diaChi : trong()),
            TI.el('td', {}, nhanTT(h)),
            TI.el('td', { class: 'so' }, cs ? TI.el('span', { title: cs.phu }, cs.chu) : trong()),
            TI.el('td', { class: 'cot-ngay' }, TI.ngayVN(h.ngayTao)),
            TI.el('td', { class: 'cot-ngay' }, TI.ngayGioVN(h.ngaySua)));
        }))));
    }

    // Điện thoại: thẻ
    function veThe(loc) {
      return TI.el('div', { class: 'ds-the-ho-so' }, ...loc.map(h => {
        const cs = congSuat(h);
        return TI.el('a', { class: 'the the-ho-so', href: href(h) },
          TI.el('div', { class: 'the-ho-so-dau' }, TI.el('b', {}, tenKhach(h)), nhanTT(h)),
          TI.el('div', { class: 'the-ho-so-dong' }, coGT(h.khach.dienThoai) ? TI.dienThoaiVN(h.khach.dienThoai) : 'Chưa có số điện thoại'),
          TI.el('div', { class: 'the-ho-so-dong' }, coGT(h.khach.diaChi) ? h.khach.diaChi : 'Chưa có địa chỉ'),
          TI.el('div', { class: 'the-ho-so-chan' },
            TI.el('span', { class: cs ? 'cs' : '' }, cs ? cs.chu : 'Chưa xếp pin'),
            TI.el('span', {}, 'Cập nhật ' + TI.ngayGioVN(h.ngaySua))));
      }));
    }

    const oFile = TI.el('input', { type: 'file', accept: '.json,application/json', hidden: true,
      onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await nhapTuFile(f); } });

    v.replaceChildren(
      TI.el('div', { class: 'thanh-tim-loc' },
        TI.el('div', { class: 'o-tim-boc' }, Icon('search'), oTim),
        thanhLoc,
        TI.el('div', { class: 'dau-danh-sach-viec' },
          tongThieu ? TI.el('a', { class: 'chip-canh-bao', href: '#/cai-dat',
            'aria-label': `Số liệu chung còn thiếu ${tongThieu} ô. Mở Cài đặt để điền.` },
            Icon('alert-triangle', { co: 18 }), `${tongThieu} ô số liệu chưa điền`, Icon('chevron-right', { co: 16 })) : null,
          TI.el('button', { class: 'nut chinh nut-ho-so-moi', onclick: taoHoSoMoi }, ...Icon.chu('plus', 'Hồ sơ mới')))),
      oDem,
      vungDs,
      TI.el('h3', {}, 'Sao lưu'),
      TI.el('p', { class: 'mo nho' }, 'Dữ liệu chỉ nằm trên máy này. Nên sao lưu thường xuyên, và dùng file sao lưu để chuyển hồ sơ giữa điện thoại và máy tính.'),
      TI.el('div', { class: 'hang' },
        TI.el('button', { class: 'nut', onclick: saoLuuTatCa, disabled: !ds.length }, ...Icon.chu('download', 'Sao lưu tất cả')),
        TI.el('button', { class: 'nut', onclick: () => oFile.click() }, ...Icon.chu('upload', 'Nhập file sao lưu'))),
      oFile,
      // Chỉ hiện khi mở app với ?dev=1
      App.cheDoThu ? TI.el('h3', {}, 'Kiểm thử') : null,
      App.cheDoThu ? TI.el('div', { class: 'hang' },
        TI.el('button', { class: 'nut', onclick: napMauNhaB }, 'Nạp hồ sơ mẫu nhà B')) : null,
    );
    veLoc();
    veDanhSach();
  }

  async function taoHoSoMoi() {
    const hs = HoSo.taoMoi();
    await HoSo.luu(hs);
    location.hash = `#/ho-so/${hs.id}/khao-sat`;
  }

  async function saoLuuTatCa() {
    const du = await HoSo.taoSaoLuu();
    await TI.luuFile(`tdh-solar-sao-luu-${TI.homNay()}.json`, JSON.stringify(du));
    TI.thongBao(`Đã xuất ${du.soHoSo} hồ sơ`);
  }

  async function nhapDuLieu(du) {
    const trung = await HoSo.idDaCo(du);
    if (trung.length) {
      const ten = trung.map(h => '• ' + (h.khach.ten || '(chưa có tên)')).join('\n');
      if (!confirm(`Các hồ sơ sau đã có trên máy và sẽ bị GHI ĐÈ bằng bản trong file:\n${ten}\n\nTiếp tục?`)) return 0;
    }
    const n = await HoSo.nhapSaoLuu(du);
    TI.thongBao(`Đã nhập ${n} hồ sơ` + (du.anhThieu ? ` (thiếu ${du.anhThieu} ảnh mẫu, không có trên bản này)` : ''));
    App.dieuHuong();
    return n;
  }

  async function nhapTuFile(file) {
    try {
      const du = JSON.parse(await TI.docFileChu(file));
      await nhapDuLieu(du);
    } catch (e) {
      alert('Không nhập được file: ' + e.message);
    }
  }

  async function napMauNhaB() {
    try {
      const r = await fetch('mau-thu/nha-B.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('Không tìm thấy mau-thu/nha-B.json');
      await nhapDuLieu(await r.json());
    } catch (e) {
      alert('Không nạp được hồ sơ mẫu: ' + e.message);
    }
  }

  return { ve, nhapTuFile };
})();
