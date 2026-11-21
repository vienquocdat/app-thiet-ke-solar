// Khung app: đọc địa chỉ sau dấu # để biết đang ở màn hình nào.
//   #/                       → danh sách hồ sơ
//   #/ho-so/<mã>/<thẻ>       → hồ sơ khách (thẻ: khao-sat, ve-mai, xep-pin, 3d, ky-thuat, bao-gia)
//   #/cai-dat[/<tên file>]   → cài đặt (mở sẵn mục của file đó)
const App = (() => {
  const vung = () => document.getElementById('noi-dung');

  function datTieuDe(chu) {
    document.getElementById('tieu-de-trang').textContent = chu;
    document.title = chu + ' – TDH Solar';
  }

  // Dòng chữ nhỏ dưới tiêu đề (trạng thái lưu của hồ sơ…). Gọi không tham số để xóa.
  function datPhuDe(...con) {
    document.getElementById('phu-de-trang').replaceChildren(...con);
  }

  // Chế độ thử nghiệm: thêm ?dev=1 vào địa chỉ để hiện các nút kiểm thử (nạp hồ sơ mẫu…).
  const cheDoThu = new URLSearchParams(location.search).get('dev') === '1';

  async function dieuHuong() {
    const phan = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const v = vung();
    const man = phan[0] === 'ho-so' && phan[1] ? 'ho-so' : phan[0] === 'cai-dat' ? 'cai-dat' : 'danh-sach';
    document.body.dataset.man = man;
    document.getElementById('nut-lui').hidden = man === 'danh-sach';
    datPhuDe();
    window.scrollTo(0, 0);
    try {
      await ManHoSo.luuNeuDangCho();
      ManDung3D.huy(); // giải phóng khung 3D cũ (nếu có) trước khi vẽ màn hình mới
      if (man !== 'ho-so') TienTrinh.roi();
      if (man === 'ho-so') await ManHoSo.ve(v, phan[1], phan[2] || 'khao-sat');
      else if (phan[0] === 'cai-dat') await ManCaiDat.ve(v, phan[1]);
      else await ManDanhSach.ve(v);
    } catch (e) {
      console.error(e);
      v.replaceChildren(TI.el('div', { class: 'the loi' }, 'Có lỗi: ' + e.message));
    }
  }

  async function khoiDong() {
    Icon.thayTrong(document);
    try {
      await DuLieu.napGoc();
    } catch (e) {
      vung().replaceChildren(TI.el('div', { class: 'the loi' },
        TI.el('b', {}, 'Không đọc được file số liệu.'),
        TI.el('p', {}, 'App cần được mở qua địa chỉ web (GitHub Pages hoặc máy chủ tạm), không mở bằng cách bấm đúp vào file index.html.'),
        TI.el('p', { class: 'mo' }, e.message)));
      return;
    }
    LuuTru.xinGiuLauDai();
    window.addEventListener('hashchange', dieuHuong);
    dieuHuong();
  }

  return { khoiDong, datTieuDe, datPhuDe, dieuHuong, cheDoThu };
})();

App.khoiDong();
