// Khung app: đọc địa chỉ sau dấu # để biết đang ở màn hình nào.
//   #/                       → danh sách hồ sơ
//   #/ho-so/<mã>/<thẻ>       → hồ sơ khách (thẻ: khao-sat, ve-mai, xep-pin, 3d, ky-thuat, bao-gia)
//   #/cai-dat                → cài đặt
const App = (() => {
  const vung = () => document.getElementById('noi-dung');

  function datTieuDe(chu) {
    document.getElementById('tieu-de-trang').textContent = chu;
    document.title = chu + ' – TDH Solar';
  }

  async function dieuHuong() {
    const phan = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const v = vung();
    window.scrollTo(0, 0);
    try {
      await ManHoSo.luuNeuDangCho();
      if (phan[0] === 'ho-so' && phan[1]) await ManHoSo.ve(v, phan[1], phan[2] || 'khao-sat');
      else if (phan[0] === 'cai-dat') await ManCaiDat.ve(v);
      else await ManDanhSach.ve(v);
    } catch (e) {
      console.error(e);
      v.replaceChildren(TI.el('div', { class: 'the loi' }, 'Có lỗi: ' + e.message));
    }
  }

  async function khoiDong() {
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

  return { khoiDong, datTieuDe, dieuHuong };
})();

App.khoiDong();
