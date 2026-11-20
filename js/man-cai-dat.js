// Màn hình 4: Cài đặt – xem và sửa các file số liệu trong du-lieu/.
// Mọi ô có kiểu (chữ / số / chọn) lấy từ chính file JSON, nên thêm cột mới chỉ cần sửa file, không sửa code.
const ManCaiDat = (() => {
  async function ve(v, moMuc) {
    App.datTieuDe('Cài đặt');
    const cacMuc = [];
    let tongCanDien = 0;
    for (const ten of DuLieu.DANH_SACH) {
      const nd = await DuLieu.lay(ten);
      tongCanDien += DuLieu.demCanDien(nd);
      cacMuc.push(await veMuc(ten, nd, ten === moMuc));
    }
    v.replaceChildren(
      TI.el('a', { href: '#/', class: 'quay-lai' }, '‹ Danh sách'),
      TI.el('div', { class: 'the ' + (tongCanDien ? 'canh-bao' : 'dat') },
        tongCanDien
          ? `Còn ${tongCanDien} ô ${CAN_DIEN}. Các phép tính dùng tới ô này sẽ chưa chạy cho tới khi anh điền.`
          : 'Đã điền đủ số liệu.'),
      TI.el('p', { class: 'mo nho' }, 'Số thập phân gõ dấu phẩy, ví dụ 0,8. Để trống ô nghĩa là chưa có số liệu.'),
      ...cacMuc);
    const mo = v.querySelector('details[open]');
    if (mo) requestAnimationFrame(() => mo.scrollIntoView({ block: 'start' }));
  }

  async function veMuc(ten, nd, moSan = false) {
    const ngaySua = await DuLieu.thongTinSua(ten);
    const soThieu = DuLieu.demCanDien(nd);
    const huyHieu = TI.el('span', { class: 'nhan ' + (soThieu ? 'nhan-thieu' : 'nhan-du') }, soThieu ? `${soThieu} ô cần điền` : 'Đủ');
    const nutLuu = TI.el('button', { class: 'nut chinh', disabled: true, onclick: async () => {
      await DuLieu.luu(ten, nd); TI.thongBao('Đã lưu ' + nd.tieuDe); App.dieuHuong();
    } }, 'Lưu');
    const daDoi = () => {
      nutLuu.disabled = false;
      const n = DuLieu.demCanDien(nd);
      huyHieu.textContent = n ? `${n} ô cần điền` : 'Đủ';
      huyHieu.className = 'nhan ' + (n ? 'nhan-thieu' : 'nhan-du');
    };

    const noiDung = [
      nd.moTa ? TI.el('p', { class: 'mo nho' }, nd.moTa) : null,
      TI.el('p', { class: 'mo nho' }, ngaySua ? `Đang dùng bản đã sửa trên máy này (${TI.ngayVN(ngaySua)}).` : `Đang dùng bản gốc trong file du-lieu/${ten}.json.`),
    ];
    for (const t of nd.truong || []) {
      noiDung.push(TI.el('label', { class: 'truong' },
        TI.el('span', {}, t.ten + (t.donVi ? ` (${t.donVi})` : '')),
        oNhap(t, t.giaTri, (gt) => { t.giaTri = gt; daDoi(); }),
        t.ghiChu ? TI.el('small', { class: 'mo' }, t.ghiChu) : null));
    }
    if (nd.bang) noiDung.push(veBang(nd.bang, daDoi));

    noiDung.push(TI.el('div', { class: 'hang' },
      nutLuu,
      TI.el('button', { class: 'nut', disabled: !ngaySua, onclick: async () => {
        if (!confirm(`Bỏ các chỗ đã sửa trên máy, quay về bản gốc của "${nd.tieuDe}"?`)) return;
        await DuLieu.veMacDinh(ten); TI.thongBao('Đã về bản gốc'); App.dieuHuong();
      } }, 'Về mặc định'),
      TI.el('button', { class: 'nut', onclick: () => TI.luuFile(`${ten}.json`, JSON.stringify(nd, null, 2) + '\n') }, 'Xuất file')));

    return TI.el('details', { class: 'nhom', open: moSan },
      TI.el('summary', {}, TI.el('span', {}, nd.tieuDe), huyHieu),
      TI.el('div', { class: 'nhom-noi-dung' }, ...noiDung));
  }

  // Bảng hiển thị dạng thẻ (mỗi dòng 1 thẻ) cho vừa màn hình điện thoại.
  function veBang(bang, daDoi) {
    const khung = TI.el('div', { class: 'bang' });
    const veLai = () => {
      khung.replaceChildren(
        TI.el('h4', {}, bang.tieuDe || ''),
        ...bang.dong.map((dong, i) => TI.el('div', { class: 'the-dong' },
          TI.el('div', { class: 'hang-giua' }, TI.el('b', {}, `Dòng ${i + 1}`),
            bang.coDinhSoDong ? null : TI.el('button', { type: 'button', class: 'nut-xoa', 'aria-label': 'Xóa dòng',
              onclick: () => { if (confirm(`Xóa dòng ${i + 1}?`)) { bang.dong.splice(i, 1); daDoi(); veLai(); } } }, '×')),
          TI.el('div', { class: 'luoi-o' }, ...bang.cot.map(c => TI.el('label', { class: 'truong' },
            TI.el('span', {}, c.ten + (c.donVi ? ` (${c.donVi})` : '')),
            c.chiDoc ? TI.el('b', {}, String(dong[c.ma]))
              : oNhap(c, dong[c.ma], (gt) => { dong[c.ma] = gt; daDoi(); })))))),
        bang.coDinhSoDong ? null : TI.el('button', { type: 'button', class: 'nut nho', onclick: () => {
          const moi = {};
          for (const c of bang.cot) moi[c.ma] = c.kieu === 'chon' ? c.tuyChon[0] : CAN_DIEN;
          if (bang.cot.some(c => c.ma === 'bac')) moi.bac = bang.dong.length + 1;
          bang.dong.push(moi); daDoi(); veLai();
        } }, '+ Thêm dòng'));
    };
    veLai();
    return khung;
  }

  // 1 ô nhập. Để trống = [CẦN ĐIỀN] (hiện chữ đỏ).
  function oNhap(dinhNghia, gt, khiDoi) {
    if (dinhNghia.kieu === 'chon') {
      const s = TI.el('select', { class: gt === CAN_DIEN ? 'can-dien' : '',
        onchange: (e) => { s.classList.toggle('can-dien', e.target.value === CAN_DIEN); khiDoi(e.target.value); } },
        ...dinhNghia.tuyChon.map(x => TI.el('option', { value: x, selected: x === gt }, x)));
      return s;
    }
    const laSo = dinhNghia.kieu === 'so';
    const o = TI.el('input', {
      type: 'text', inputmode: laSo ? 'decimal' : null,
      value: gt === CAN_DIEN ? '' : (laSo ? TI.soVN(gt) : gt ?? ''),
      placeholder: dinhNghia.goiY ? `${CAN_DIEN} ${dinhNghia.goiY}` : CAN_DIEN,
      class: gt === CAN_DIEN ? 'can-dien' : '',
    });
    o.addEventListener('input', () => {
      const chu = o.value.trim();
      o.classList.toggle('can-dien', chu === '');
      if (chu === '') { o.classList.remove('sai'); khiDoi(CAN_DIEN); return; }
      if (!laSo) { khiDoi(chu); return; }
      const n = TI.docSo(chu);
      o.classList.toggle('sai', Number.isNaN(n));
      if (!Number.isNaN(n)) khiDoi(n);
    });
    if (laSo) o.addEventListener('blur', () => { const n = TI.docSo(o.value); if (n !== null && !Number.isNaN(n)) o.value = TI.soVN(n); });
    return o;
  }

  return { ve };
})();
