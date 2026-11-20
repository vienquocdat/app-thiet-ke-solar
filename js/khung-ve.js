// Khung vẽ dùng chung: tự co giãn theo màn hình, dời bằng 1 ngón / chuột, phóng to bằng 2 ngón / con lăn.
// Cách dùng: const kv = taoKhungVe(phanTuChua, { ve(ctx, kv), cham(p, e), batDauKeo(p, e) });
//   - ve: vẽ lại toàn bộ (toạ độ thế giới → màn hình bằng kv.S(p)).
//   - cham: chạm/bấm nhanh không kéo.
//   - batDauKeo: trả về { keo(p), tha() } nếu chỗ bấm là vật kéo được (vd tấm pin), không thì null → kéo = dời khung.
function taoKhungVe(khung, tuy) {
  const cv = TI.el('canvas');
  khung.prepend(cv);
  const ctx = cv.getContext('2d');
  const kv = {
    cv, ctx,
    view: { s: 1, ox: 0, oy: 0 },
    kt: { w: 0, h: 0 },
    bbox: null,
    S(p) { return [p[0] * kv.view.s + kv.view.ox, p[1] * kv.view.s + kv.view.oy]; },
    T([x, y]) { return [(x - kv.view.ox) / kv.view.s, (y - kv.view.oy) / kv.view.s]; },
    veLai,
    // Đặt khung nhìn vừa với vùng [xMin, yMin, xMax, yMax] (toạ độ thế giới), chừa lề 'le' điểm màn hình.
    // leTren / leDuoi: chừa thêm chỗ cho khung gợi ý ở trên và các nút ở dưới.
    vuaKhung(bbox = kv.bbox, le = kv.le ?? 24, leTren = kv.leTren ?? le, leDuoi = kv.leDuoi ?? le) {
      kv.bbox = bbox; kv.le = le; kv.leTren = leTren; kv.leDuoi = leDuoi;
      if (!bbox || !kv.kt.w) return;
      const [x0, y0, x1, y1] = bbox;
      const cao = kv.kt.h - leTren - leDuoi;
      const s = Math.min((kv.kt.w - 2 * le) / Math.max(x1 - x0, 1e-6), cao / Math.max(y1 - y0, 1e-6));
      kv.view = { s, ox: (kv.kt.w - (x1 - x0) * s) / 2 - x0 * s, oy: leTren + (cao - (y1 - y0) * s) / 2 - y0 * s };
      veLai();
    },
    phong(heSo, tam = [kv.kt.w / 2, kv.kt.h / 2]) {
      const s = gioiHan(kv.view.s * heSo);
      const ix = (tam[0] - kv.view.ox) / kv.view.s, iy = (tam[1] - kv.view.oy) / kv.view.s;
      kv.view = { s, ox: tam[0] - ix * s, oy: tam[1] - iy * s };
      veLai();
    },
    ngatKetNoi() { quanSat.disconnect(); },
  };

  function gioiHan(s) {
    if (!kv.bbox || !kv.kt.w) return s;
    const [x0, y0, x1, y1] = kv.bbox;
    const vua = Math.min(kv.kt.w / Math.max(x1 - x0, 1e-6), kv.kt.h / Math.max(y1 - y0, 1e-6));
    return Math.max(vua * 0.3, Math.min(s, vua * 25));
  }

  let henVe = null;
  function veLai() { if (!henVe) henVe = requestAnimationFrame(() => { henVe = null; veNgay(); }); }
  function veNgay() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, kv.kt.w, kv.kt.h);
    tuy.ve(ctx, kv);
  }

  const quanSat = new ResizeObserver(() => {
    const r = khung.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const dauTien = !kv.kt.w;
    kv.kt = { w: r.width, h: r.height };
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    if (dauTien) kv.vuaKhung();
    veNgay();
  });
  quanSat.observe(khung);

  // ----- Chạm, kéo, phóng to -----
  const conTro = new Map();
  let cu = null;
  const toaDo = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const giua = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  cv.addEventListener('pointerdown', (e) => {
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* bỏ qua */ }
    const p = toaDo(e);
    conTro.set(e.pointerId, p);
    if (conTro.size === 1) {
      cu = { loai: 'mot', bd: p, ox: kv.view.ox, oy: kv.view.oy, daDi: false, e, hk: tuy.batDauKeo ? tuy.batDauKeo(p, e) : null };
    } else if (conTro.size === 2) {
      const [a, b] = [...conTro.values()];
      cu = { loai: 'hai', d0: HH.kc(a, b), g0: giua(a, b), s0: kv.view.s, ox: kv.view.ox, oy: kv.view.oy };
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!conTro.has(e.pointerId)) return;
    const p = toaDo(e);
    conTro.set(e.pointerId, p);
    if (cu && cu.loai === 'hai' && conTro.size === 2) {
      const [a, b] = [...conTro.values()];
      const s = gioiHan(cu.s0 * HH.kc(a, b) / cu.d0), g = giua(a, b);
      const ix = (cu.g0[0] - cu.ox) / cu.s0, iy = (cu.g0[1] - cu.oy) / cu.s0;
      kv.view = { s, ox: g[0] - ix * s, oy: g[1] - iy * s };
      veLai();
    } else if (cu && cu.loai === 'mot') {
      const dx = p[0] - cu.bd[0], dy = p[1] - cu.bd[1];
      if (Math.hypot(dx, dy) > 5) cu.daDi = true;
      if (!cu.daDi) return;
      if (cu.hk) cu.hk.keo(p);
      else { kv.view.ox = cu.ox + dx; kv.view.oy = cu.oy + dy; }
      veLai();
    }
  });
  const ketThuc = (e, huy) => {
    if (!conTro.has(e.pointerId)) return;
    conTro.delete(e.pointerId);
    if (cu && cu.loai === 'mot') {
      if (cu.hk && cu.daDi) cu.hk.tha(huy);
      else if (!cu.daDi && !huy && tuy.cham) tuy.cham(cu.bd, cu.e);
    }
    if (conTro.size === 0 || (cu && cu.loai === 'hai')) cu = null;
    veLai();
  };
  cv.addEventListener('pointerup', (e) => ketThuc(e, false));
  cv.addEventListener('pointercancel', (e) => ketThuc(e, true));
  cv.addEventListener('wheel', (e) => { e.preventDefault(); kv.phong(Math.pow(1.0015, -e.deltaY), toaDo(e)); }, { passive: false });

  return kv;
}
