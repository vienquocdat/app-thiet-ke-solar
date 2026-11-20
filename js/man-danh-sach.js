// Màn hình 1: danh sách hồ sơ khách.
const TRANG_THAI = {
  'khao-sat': 'Đang khảo sát',
  'da-thiet-ke': 'Đã thiết kế',
  'da-bao-gia': 'Đã báo giá',
  'da-ky': 'Đã ký hợp đồng',
};

const ManDanhSach = (() => {
  let tuKhoa = '';

  async function ve(v) {
    App.datTieuDe('Hồ sơ khách');
    const ds = await HoSo.danhSach();

    const oTim = TI.el('input', {
      type: 'search', class: 'o-tim', placeholder: 'Tìm theo tên, số điện thoại, địa chỉ…', value: tuKhoa,
      oninput: (e) => { tuKhoa = e.target.value; veDanhSach(); },
    });
    const vungDs = TI.el('div', { class: 'danh-sach' });

    function veDanhSach() {
      const k = TI.boDau(tuKhoa).toLowerCase().trim();
      const loc = ds.filter(h => !k || TI.boDau(
        [h.khach.ten, h.khach.dienThoai, h.khach.diaChi].join(' ')).toLowerCase().includes(k));
      if (!ds.length) {
        vungDs.replaceChildren(TI.el('div', { class: 'the trong' },
          TI.el('p', {}, 'Chưa có hồ sơ nào.'),
          TI.el('p', { class: 'mo' }, 'Bấm "+ Hồ sơ mới" để bắt đầu khảo sát, hoặc nạp hồ sơ mẫu nhà B ở cuối trang.')));
        return;
      }
      if (!loc.length) { vungDs.replaceChildren(TI.el('p', { class: 'mo' }, 'Không tìm thấy hồ sơ phù hợp.')); return; }
      vungDs.replaceChildren(...loc.map(h => TI.el('a', { class: 'the the-ho-so', href: `#/ho-so/${h.id}/khao-sat` },
        TI.el('div', { class: 'hang-giua' },
          TI.el('b', {}, h.khach.ten || '(Chưa có tên)'),
          TI.el('span', { class: 'nhan nhan-' + h.trangThai }, TRANG_THAI[h.trangThai] || '')),
        TI.el('div', { class: 'mo' }, [h.khach.dienThoai, h.khach.diaChi].filter(Boolean).join(' · ') || '—'),
        TI.el('div', { class: 'mo nho' }, 'Sửa lần cuối: ' + TI.ngayVN(h.ngaySua)))));
    }

    const oFile = TI.el('input', { type: 'file', accept: '.json,application/json', hidden: true,
      onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await nhapTuFile(f); } });

    v.replaceChildren(
      TI.el('div', { class: 'hang' },
        TI.el('button', { class: 'nut chinh to', onclick: taoHoSoMoi }, '+ Hồ sơ mới')),
      oTim,
      TI.el('div', { class: 'mo nho' }, `${ds.length} hồ sơ lưu trên máy này`),
      vungDs,
      TI.el('h3', {}, 'Sao lưu'),
      TI.el('p', { class: 'mo nho' }, 'Dữ liệu chỉ nằm trên máy này. Nên sao lưu thường xuyên, và dùng file sao lưu để chuyển hồ sơ giữa điện thoại và máy tính.'),
      TI.el('div', { class: 'hang' },
        TI.el('button', { class: 'nut', onclick: saoLuuTatCa, disabled: !ds.length }, 'Sao lưu tất cả'),
        TI.el('button', { class: 'nut', onclick: () => oFile.click() }, 'Nhập file sao lưu')),
      oFile,
      TI.el('h3', {}, 'Kiểm thử'),
      TI.el('div', { class: 'hang' },
        TI.el('button', { class: 'nut', onclick: napMauNhaB }, 'Nạp hồ sơ mẫu nhà B')),
    );
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
    TI.thongBao(`Đã nhập ${n} hồ sơ`);
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
