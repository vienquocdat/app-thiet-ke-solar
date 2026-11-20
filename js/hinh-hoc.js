// Các phép tính hình học dùng chung (đo trên ảnh, đổi ra mét, diện tích).
const HH = {
  kc(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); },

  // Diện tích có dấu (công thức "dây giày"); lấy trị tuyệt đối để ra diện tích.
  dienTichCoDau(ds) {
    let s = 0;
    for (let i = 0; i < ds.length; i++) {
      const [x1, y1] = ds[i], [x2, y2] = ds[(i + 1) % ds.length];
      s += x1 * y2 - x2 * y1;
    }
    return s / 2;
  },
  dienTich(ds) { return ds.length < 3 ? 0 : Math.abs(HH.dienTichCoDau(ds)); },

  trongTam(ds) {
    const n = ds.length;
    return [ds.reduce((s, p) => s + p[0], 0) / n, ds.reduce((s, p) => s + p[1], 0) / n];
  },

  namTrong(p, ds) {
    let trong = false;
    for (let i = 0, j = ds.length - 1; i < ds.length; j = i++) {
      const [xi, yi] = ds[i], [xj, yj] = ds[j];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) trong = !trong;
    }
    return trong;
  },

  kcDenDoan(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  },

  // Phép "nắn ảnh": tìm ma trận biến 4 điểm trên ảnh chụp chéo thành 4 góc hình chữ nhật thật (mét).
  // Giải hệ 8 phương trình 8 ẩn bằng phương pháp khử Gauss.
  timMaTranNan(nguon, dich) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = nguon[i], [u, v] = dich[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const n = 8;
    for (let c = 0; c < n; c++) {
      let max = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[max][c])) max = r;
      if (Math.abs(A[max][c]) < 1e-12) return null; // 3 điểm thẳng hàng → không nắn được
      [A[c], A[max]] = [A[max], A[c]]; [b[c], b[max]] = [b[max], b[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const k = A[r][c] / A[c][c];
        for (let j = c; j < n; j++) A[r][j] -= k * A[c][j];
        b[r] -= k * b[c];
      }
    }
    return [...b.map((v, i) => v / A[i][i]), 1];
  },

  apMaTran(h, [x, y]) {
    const w = h[6] * x + h[7] * y + h[8];
    return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
  },
};
