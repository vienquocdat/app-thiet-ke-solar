// Bộ icon SVG dùng chung (nét mảnh, lưới 24 × 24, theo phong cách Tabler outline).
// Dùng: Icon('settings') → phần tử <svg>; trong HTML: <span data-icon="settings"></span> rồi gọi Icon.thayTrong(document).
const Icon = (() => {
  const P = (...ds) => ds.map(d => `<path d="${d}"/>`).join('');
  const NET = {
    'settings': P('M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z', 'M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0'),
    'chevron-left': P('M15 6l-6 6l6 6'),
    'chevron-right': P('M9 6l6 6l-6 6'),
    'chevron-down': P('M6 9l6 6l6 -6'),
    'check': P('M5 12l5 5l10 -10'),
    'x': P('M18 6l-12 12', 'M6 6l12 12'),
    'plus': P('M12 5l0 14', 'M5 12l14 0'),
    'minus': P('M5 12l14 0'),
    'arrow-right': P('M5 12l14 0', 'M13 18l6 -6', 'M13 6l6 6'),
    'arrow-back-up': P('M9 14l-4 -4l4 -4', 'M5 10h11a4 4 0 1 1 0 8h-1'),
    'maximize': P('M4 8v-2a2 2 0 0 1 2 -2h2', 'M4 16v2a2 2 0 0 0 2 2h2', 'M16 4h2a2 2 0 0 1 2 2v2', 'M16 20h2a2 2 0 0 0 2 -2v-2'),
    'camera': P('M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2', 'M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0'),
    'trash': P('M4 7l16 0', 'M10 11l0 6', 'M14 11l0 6', 'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12', 'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3'),
    'rotate': P('M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5'),
    'eye': P('M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0', 'M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6'),
    'file-download': P('M14 3v4a1 1 0 0 0 1 1h4', 'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z', 'M12 17v-6', 'M9.5 14.5l2.5 2.5l2.5 -2.5'),
    'download': P('M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2', 'M7 11l5 5l5 -5', 'M12 4l0 12'),
    'upload': P('M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2', 'M7 9l5 -5l5 5', 'M12 4l0 12'),
    'star': P('M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z'),
    'list': P('M9 6l11 0', 'M9 12l11 0', 'M9 18l11 0', 'M5 6l0 .01', 'M5 12l0 .01', 'M5 18l0 .01'),
    'circle-check': P('M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 'M9 12l2 2l4 -4'),
    'circle-dashed': '<circle cx="12" cy="12" r="9" stroke-dasharray="2.6 3.05"/>',
    'alert-triangle': P('M12 9v4', 'M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z', 'M12 16h.01'),
    'alert-circle': P('M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 8v4', 'M12 16h.01'),
    // Icon 7 bước
    'ruler': P('M4 8h16a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1z', 'M7 8v3', 'M10 8v2', 'M13 8v3', 'M16 8v2'),
    'clipboard-check': P('M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2', 'M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z', 'M9 14l2 2l4 -4'),
    'drone': P('M10 10h4v4h-4z', 'M10 10l-3.5 -3.5', 'M14 10l3.5 -3.5', 'M14 14l3.5 3.5', 'M10 14l-3.5 3.5') +
      '<circle cx="5.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/>',
    'solar-panel': P('M4.28 14h15.44a1 1 0 0 0 .97 -1.243l-1.5 -6a1 1 0 0 0 -.97 -.757h-12.44a1 1 0 0 0 -.97 .757l-1.5 6a1 1 0 0 0 .97 1.243z', 'M4 10h16', 'M10 6l-1 8', 'M14 6l1 8', 'M12 14v4', 'M7 18h10'),
    'box': P('M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5', 'M12 12l8 -4.5', 'M12 12l0 9', 'M12 12l-8 -4.5'),
    'bolt': P('M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11'),
    'file-invoice': P('M14 3v4a1 1 0 0 0 1 1h4', 'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z', 'M9 7l1 0', 'M9 13l6 0', 'M13 17l2 0'),
  };

  function Icon(ten, { co = 20, lop = '' } = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', co);
    svg.setAttribute('height', co);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', ('icon ' + lop).trim());
    svg.innerHTML = NET[ten] || NET['alert-circle'];
    return svg;
  }

  // Thay mọi <span data-icon="..."> trong vùng bằng icon thật.
  Icon.thayTrong = (vung) => {
    vung.querySelectorAll('[data-icon]').forEach(o => {
      o.replaceWith(Icon(o.dataset.icon, { co: Number(o.dataset.co) || 20 }));
    });
  };

  // Nút/nhãn có icon đứng trước chữ: Icon.chu('camera', 'Thêm ảnh')
  Icon.chu = (ten, chu, phu) => [Icon(ten, phu), TI.el('span', {}, chu)];

  return Icon;
})();
