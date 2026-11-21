// Bố cục chung cho 3 màn có khung vẽ (Vẽ mái, Xếp pin, 3D). Chỉ sắp xếp chỗ đặt, không đụng phần tính toán.
//   Máy tính (≥ 1024 px): khung vẽ chiếm phần lớn bên trái; bên phải là [phần trên] + [thanh công cụ] + [bảng thông số cuộn riêng].
//   Điện thoại: [phần trên] gọn → khung vẽ gần kín màn hình → thanh công cụ ghim đáy → bảng thông số cuộn xuống bên dưới.
const BoCucVe = (() => {
  function dung({ tren = null, khung, congCu, ben = [] }) {
    return TI.el('div', { class: 'bo-cuc-ve' },
      tren ? TI.el('div', { class: 'bcv-tren' }, tren) : null,
      TI.el('div', { class: 'bcv-ve' }, khung),
      TI.el('div', { class: 'bcv-cong-cu', role: 'toolbar', 'aria-label': 'Công cụ' }, congCu),
      TI.el('aside', { class: 'bcv-ben', 'aria-label': 'Thông số' }, ...[].concat(ben)));
  }
  return { dung };
})();
