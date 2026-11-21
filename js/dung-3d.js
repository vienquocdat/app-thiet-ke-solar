// Giai đoạn 4: dựng 3D tự động từ dữ liệu vẽ mái (GĐ2) và xếp pin (GĐ3).
// Phong cách như bản vẽ SketchUp của đội thi công: khối sạch, viền đen. Toạ độ: x, z = mặt bằng (mét); y = chiều cao.
// Mốc chiều cao 0 = mặt mái chính (mảng mái đầu tiên).
const ManDung3D = (() => {
  const THU_VIEN = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
  ];
  const GOC = [['iso', 'Góc 3D'], ['tren', 'Từ trên'], ['dung', 'Mặt đứng']];
  const SO = (x) => typeof x === 'number' && isFinite(x);

  let huaThuVien = null;
  function napThuVien() {
    if (window.THREE && THREE.OrbitControls) return Promise.resolve();
    if (!huaThuVien) {
      huaThuVien = (async () => {
        for (const url of THU_VIEN) {
          await new Promise((ok, loi) => {
            const s = document.createElement('script');
            s.src = url; s.onload = ok;
            s.onerror = () => { s.remove(); loi(new Error('Không tải được thư viện 3D. Máy cần có mạng ở lần mở đầu.')); };
            document.head.append(s);
          });
        }
      })().catch(e => { huaThuVien = null; throw e; });
    }
    return huaThuVien;
  }

  let hs, luuSau, tp = null;
  let r = null, canh, cam, dk, moHinh = null, quanSat = null, khung3d = null;
  let gocDangXem = 'iso', canhBao = [], thongKe = {};
  let vungCanhBao, vungThongKe;

  // ---------- Vòng đời ----------
  function huy() {
    if (!r) return;
    quanSat && quanSat.disconnect();
    dk && dk.dispose();
    giaiPhong(canh);
    r.dispose(); r.forceContextLoss && r.forceContextLoss();
    r.domElement.remove();
    r = null; moHinh = null;
  }
  function giaiPhong(obj) {
    obj && obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(m => { m.map && m.map.dispose(); m.dispose(); });
    });
  }

  async function ve(v, hoSo, hamLuu) {
    huy();
    hs = hoSo; luuSau = hamLuu;
    const f = hs.mai ? ManVeMai.boDoiCuaHoSo(hs) : null;
    const dsMang = (hs.mai ? hs.mai.mangMai : []).filter(m => m.diem.length >= 3);
    if (!f || !dsMang.length) {
      v.replaceChildren(TI.el('div', { class: 'the trong' },
        TI.el('b', {}, 'Chưa có mặt bằng mái'),
        TI.el('p', { class: 'mo' }, 'Cần vẽ mái và đặt tỉ lệ ở bước Vẽ mái, xếp pin ở bước Xếp pin trước.'),
        TI.el('a', { class: 'nut', href: `#/ho-so/${hs.id}/ve-mai` }, 'Sang bước Vẽ mái')));
      return;
    }
    for (const m of dsMang) {
      if (!m.xep) m.xep = XepPin.caiDatMacDinh(m, m.diem.map(f));
      if (!m.d3) m.d3 = { caoDoM: null, lanCanM: null };
    }
    if (!hs.dung3d) hs.dung3d = { caoNhaM: null };
    const dsTP = (await DuLieu.lay('tam-pin')).bang.dong;
    tp = hs.xepPin ? dsTP.find(d => d.model === hs.xepPin.maTamPin) || null : null;

    khung3d = TI.el('div', { class: 'khung-3d' }, TI.el('div', { class: 'xuong xuong-3d', role: 'status', 'aria-label': 'Đang tải thư viện 3D' }));
    vungCanhBao = TI.el('div', {});
    vungThongKe = TI.el('div', { class: 'thong-ke-3d' });
    const thanhGoc = TI.el('div', { class: 'phan-doan' }, ...GOC.map(([ma, ten]) =>
      TI.el('button', { type: 'button', class: ma === gocDangXem ? 'dang-chon' : '', onclick: (e) => {
        gocDangXem = ma; thanhGoc.querySelectorAll('button').forEach(b => b.classList.toggle('dang-chon', b === e.target)); datGoc(ma);
      } }, ten)));
    v.replaceChildren(BoCucVe.dung({
      khung: khung3d,
      congCu: TI.el('div', { class: 'cong-cu-ve hang-nut-cong-cu' }, thanhGoc,
        TI.el('button', { type: 'button', class: 'nut chinh nut-chup', onclick: chupAnh, 'aria-label': 'Chụp ảnh vào hồ sơ' },
          Icon('camera'), TI.el('span', { class: 'chu-chup' }, 'Chụp ảnh vào hồ sơ'))),
      ben: [TI.el('div', { class: 'hang' }, TI.el('button', { type: 'button', class: 'nut', onclick: taiAnh }, ...Icon.chu('download', 'Tải ảnh về máy'))),
        vungThongKe, vungCanhBao, veCaiDat()],
    }));

    try { await napThuVien(); }
    catch (e) { khung3d.replaceChildren(TI.el('div', { class: 'the loi' }, e.message)); return; }
    khoiTao3D();
    dungMoHinh();
    datGoc(gocDangXem);
  }

  function khoiTao3D() {
    khung3d.replaceChildren();
    canh = new THREE.Scene();
    canh.background = new THREE.Color(0xeef3f6);
    cam = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    khung3d.append(r.domElement);
    dk = new THREE.OrbitControls(cam, r.domElement);
    dk.addEventListener('change', veNgay);
    canh.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.85));
    const nang = new THREE.DirectionalLight(0xffffff, 0.5);
    nang.position.set(-10, 25, 15);
    canh.add(nang);
    quanSat = new ResizeObserver(() => {
      const w = khung3d.clientWidth, h = khung3d.clientHeight;
      if (!w || !h) return;
      r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); veNgay();
    });
    quanSat.observe(khung3d);
  }

  function veNgay() { if (r) r.render(canh, cam); }

  // ---------- Vật liệu, hình khối cơ bản ----------
  const VIEN = () => new THREE.LineBasicMaterial({ color: 0x222222 });
  function vl(mau, map) {
    return new THREE.MeshLambertMaterial({ color: mau, map: map || null, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  }
  function anhNen(w, h, ve, lapX = 1, lapY = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    ve(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(lapX, lapY);
    return t;
  }
  const texTon = () => anhNen(64, 64, (g, w, h) => {
    g.fillStyle = '#46536a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2e3a4d'; g.fillRect(0, 0, 14, h);
    g.fillStyle = '#5d6b82'; g.fillRect(30, 0, 6, h);
  });
  const texPin = (doc) => anhNen(64, 128, (g, w, h) => {
    g.fillStyle = '#161d28'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#33404f'; g.lineWidth = 1;
    for (let i = 8; i < w; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    for (let j = 8; j < h; j += 8) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); }
    g.strokeStyle = '#8090a0'; g.lineWidth = 2; g.beginPath();
    if (doc) { g.moveTo(0, h / 2); g.lineTo(w, h / 2); } else { g.moveTo(w / 2, 0); g.lineTo(w / 2, h); }
    g.stroke();
  });

  const V3 = (p, y) => new THREE.Vector3(p[0], y, p[1]);

  function luoiTuTamGiac(tamGiac, vatLieu, uvFn) {
    const pos = [], uv = [];
    for (const t of tamGiac) for (const p of t) { pos.push(p.x, p.y, p.z); if (uvFn) uv.push(...uvFn(p)); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uvFn) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, vatLieu);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), VIEN()));
    return m;
  }

  // Khối lăng trụ theo đa giác mặt bằng P, đáy ở hDuoi(p), mặt trên ở hTren(p) (mặt trên có thể dốc).
  function lapKhoi(P, hDuoi, hTren, vlTren, vlCanh, uvTren) {
    const g = new THREE.Group();
    const tg = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), []);
    const tren = tg.map(([a, b, c]) => {
      let A = V3(P[a], hTren(P[a])), B = V3(P[b], hTren(P[b])), C = V3(P[c], hTren(P[c]));
      const n = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A));
      return n.y < 0 ? [A, C, B] : [A, B, C];
    });
    g.add(luoiTuTamGiac(tren, vlTren, uvTren));
    const tam = HH.trongTam(P), canh = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const A0 = V3(a, hDuoi(a)), B0 = V3(b, hDuoi(b)), B1 = V3(b, hTren(b)), A1 = V3(a, hTren(a));
      const n = new THREE.Vector3().subVectors(B0, A0).cross(new THREE.Vector3().subVectors(B1, A0));
      const ra = new THREE.Vector3((a[0] + b[0]) / 2 - tam[0], 0, (a[1] + b[1]) / 2 - tam[1]);
      canh.push(...(n.dot(ra) < 0 ? [[A0, B1, B0], [A0, A1, B1]] : [[A0, B0, B1], [A0, B1, A1]]));
    }
    g.add(luoiTuTamGiac(canh, vlCanh));
    return g;
  }

  function hop(w, h, d, vatLieu, coVien = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vatLieu);
    if (coVien) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), coVien === true ? VIEN() : coVien));
    return m;
  }

  function thanh(a, b, banKinh, vatLieu) {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(banKinh, banKinh, d.length(), 6), vatLieu);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }

  // ---------- Dựng mô hình ----------
  function dungMoHinh() {
    if (moHinh) { canh.remove(moHinh); giaiPhong(moHinh); }
    moHinh = new THREE.Group(); canh.add(moHinh);
    canhBao = []; thongKe = { soTam: 0, caoNhat: 0 };
    const f = ManVeMai.boDoiCuaHoSo(hs);
    const dsNC = XepPin.nguCanh(hs.mai, f);
    const caoNha = SO(hs.dung3d.caoNhaM) && hs.dung3d.caoNhaM > 0 ? hs.dung3d.caoNhaM : 3;
    const yDat = -caoNha;

    // Chiều cao mặt mái tại 1 điểm mặt bằng của từng mảng.
    dsNC.forEach((nc, i) => {
      const m = nc.mang, ten = m.ten || 'mảng mái';
      const cd = i === 0 ? 0 : m.d3.caoDoM;
      if (i > 0 && !SO(cd)) canhBao.push(`Cao độ "${ten}" so với mái chính chưa nhập → tạm vẽ ngang mái chính.`);
      nc.caoDo = SO(cd) ? cd : 0;
      if (m.loai === 'ton' && !SO(m.doDocDo)) canhBao.push(`Độ dốc "${ten}" chưa nhập → tạm vẽ phẳng.`);
      nc.tanDoc = Math.tan((SO(m.doDocDo) ? m.doDocDo : 0) * Math.PI / 180);
      nc.hMai = (p) => nc.caoDo + Math.max(0, nc.H.sangRieng(p)[1]) * nc.tanDoc;
    });
    const mangChua = (p) => dsNC.find(nc => HH.namTrong(p, nc.P)) || dsNC[0];

    // Mặt đất
    const tatCa = dsNC.flatMap(nc => nc.P);
    const xs = tatCa.map(p => p[0]), zs = tatCa.map(p => p[1]);
    const tamX = (Math.min(...xs) + Math.max(...xs)) / 2, tamZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const coDat = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 3 + 20;
    const dat = new THREE.Mesh(new THREE.PlaneGeometry(coDat, coDat), new THREE.MeshLambertMaterial({ color: 0xe4e8e2 }));
    dat.rotation.x = -Math.PI / 2; dat.position.set(tamX, yDat - 0.02, tamZ);
    dat.userData.laDat = true;
    moHinh.add(dat);

    // Khối nhà + mặt mái + lan can
    for (const nc of dsNC) {
      const m = nc.mang, laTon = m.loai === 'ton';
      const tex = laTon ? texTon() : null;
      const uv = laTon ? (p) => { const l = nc.H.sangRieng([p.x, p.z]); return [l[0] * 4, l[1]]; } : null;
      moHinh.add(lapKhoi(nc.P, () => yDat, nc.hMai, laTon ? vl(0xffffff, tex) : vl(0xd9d9d6), vl(laTon ? 0xf0f0ee : 0xf6f6f4), uv));
      const lc = m.d3.lanCanM;
      if (SO(lc) && lc > 0) {
        const I = HH.thuVao(nc.P, 0.15);
        for (let i = 0; i < nc.P.length; i++) {
          const j = (i + 1) % nc.P.length;
          moHinh.add(lapKhoi([nc.P[i], nc.P[j], I[j], I[i]], nc.hMai, (p) => nc.hMai(p) + lc, vl(0xffffff), vl(0xffffff)));
        }
      }
    }

    // Vật cản
    for (const vc of hs.mai.vatCan.filter(x => x.diem.length >= 3)) {
      const P = vc.diem.map(f), tam = HH.trongTam(P), nc = mangChua(tam), day = nc.hMai(tam);
      if (!SO(vc.caoM)) canhBao.push(`Chiều cao "${vc.ten || 'vật cản'}" chưa nhập → tạm vẽ cao 0,4 m.`);
      const cao = SO(vc.caoM) && vc.caoM > 0 ? vc.caoM : 0.4;
      moHinh.add(dungVatCan(vc, P, tam, day, cao));
    }

    // Tấm pin + khung
    const coTP = tp && SO(tp.daiMm) && SO(tp.rongMm);
    const dsTam = hs.xepPin ? hs.xepPin.tam : [];
    if (!coTP) canhBao.push('Chưa có kích thước tấm pin (Cài đặt) → chưa vẽ tấm pin.');
    else if (!dsTam.length) canhBao.push('Chưa xếp tấm pin ở bước Xếp pin.');
    if (coTP) for (const nc of dsNC) {
      const tams = dsTam.filter(t => t.mang === nc.mang.id);
      if (!tams.length) continue;
      if (nc.mang.xep.kieuLap === 'khung-nang') dungKhungNang(nc, tams); else dungApMai(nc, tams);
      thongKe.soTam += tams.length;
    }
    // Độ cao cao nhất so với mái chính
    const hop3 = new THREE.Box3();
    moHinh.children.forEach(o => { if (!o.userData.laDat) hop3.expandByObject(o); });
    thongKe.caoNhat = hop3.max.y;
    capNhatThongTin();
  }

  function dungVatCan(vc, P, tam, day, cao) {
    // Hướng dài nhất của vật cản (để đặt bồn nước nằm)
    const a = P[0], b = P[1], L = HH.kc(a, b) || 1, d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1], d[0]];
    const chieu = (k) => { const v = P.map(p => (p[0] - tam[0]) * k[0] + (p[1] - tam[1]) * k[1]); return Math.max(...v) - Math.min(...v); };
    const dd = chieu(d), dn = chieu(n);
    const [truc, dai, rong] = dd >= dn ? [d, dd, dn] : [n, dn, dd];
    if (vc.loai === 'bon-nuoc') {
      const g = new THREE.Group();
      const dkinh = Math.min(rong, cao);
      const tru = new THREE.Mesh(new THREE.CylinderGeometry(dkinh / 2, dkinh / 2, dai, 24), vl(0xd5dae0));
      tru.add(new THREE.LineSegments(new THREE.EdgesGeometry(tru.geometry, 40), VIEN()));
      tru.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(truc[0], 0, truc[1]));
      tru.position.copy(V3(tam, day + Math.max(cao - dkinh, 0) + dkinh / 2));
      g.add(tru);
      if (cao > dkinh + 0.05) { // chân đỡ
        const chan = hop(dai * 0.8, cao - dkinh, rong * 0.6, vl(0x9aa3ad));
        chan.position.copy(V3(tam, day + (cao - dkinh) / 2));
        chan.rotation.y = -Math.atan2(truc[1], truc[0]);
        g.add(chan);
      }
      return g;
    }
    if (vc.loai === 'anten') return thanh(V3(tam, day), V3(tam, day + cao), 0.03, vl(0x555555));
    if (vc.loai === 'cay') {
      const g = new THREE.Group(), bk = Math.max(Math.min(dai, rong) / 2, 0.3);
      g.add(thanh(V3(tam, day), V3(tam, day + cao * 0.5), 0.08, vl(0x7a5a3a)));
      const tan = new THREE.Mesh(new THREE.SphereGeometry(bk, 12, 8), vl(0x5e9e4e));
      tan.position.copy(V3(tam, day + cao - bk)); g.add(tan);
      return g;
    }
    const mau = { 'gieng-troi': 0xcfe6ee, tum: 0xffffff }[vc.loai] || 0xdddddd;
    return lapKhoi(P, () => day, () => day + cao, vl(mau), vl(mau));
  }

  // Tấm pin: tâm g (Vector3), eu = hướng trục u, ev = hướng trục v (mặt bằng), nghiêng t (rad), dau = +1 nếu cao dần theo v.
  function tamPin(cha, g, eu, ev, t, dau, daiU, daiDoc, doc) {
    const s = ev.clone().multiplyScalar(Math.cos(t)).add(new THREE.Vector3(0, dau * Math.sin(t), 0)).normalize();
    let x = eu.clone(), n = new THREE.Vector3().crossVectors(s, x);
    if (n.y < 0) { x.negate(); n.negate(); }
    const m = hop(daiU, 0.035, daiDoc, vl(0xffffff, texPin(doc)), new THREE.LineBasicMaterial({ color: 0x7a8796 }));
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, n, s));
    m.position.copy(g);
    cha.add(m);
  }

  function trucMang(nc) {
    const o = nc.H.sangChung([0, 0]), a = nc.H.sangChung([1, 0]), b = nc.H.sangChung([0, 1]);
    return { eu: new THREE.Vector3(a[0] - o[0], 0, a[1] - o[1]), ev: new THREE.Vector3(b[0] - o[0], 0, b[1] - o[1]) };
  }
  const kichThat = (tam) => tam.huong === 'doc'
    ? { u: tp.rongMm / 1000, doc: tp.daiMm / 1000, laDoc: true } : { u: tp.daiMm / 1000, doc: tp.rongMm / 1000, laDoc: false };

  function dungApMai(nc, tams) {
    const { eu, ev } = trucMang(nc), t = Math.atan(nc.tanDoc);
    for (const tam of tams) {
      const p = nc.H.sangChung([tam.u, tam.v]), k = kichThat(tam);
      tamPin(moHinh, V3(p, nc.hMai(p) + 0.12), eu, ev, t, 1, k.u, k.doc, k.laDoc);
    }
  }

  function dungKhungNang(nc, tams) {
    const x = nc.mang.xep, ten = nc.mang.ten || 'mảng mái';
    if (!SO(x.caoKhungM)) canhBao.push(`Chiều cao khung "${ten}" chưa nhập → tạm vẽ 2 m.`);
    if (!SO(x.gocNghieng)) canhBao.push(`Góc nghiêng khung "${ten}" chưa nhập → tạm vẽ phẳng.`);
    const caoKhung = SO(x.caoKhungM) ? x.caoKhungM : 2;
    const t = (SO(x.gocNghieng) ? x.gocNghieng : 0) * Math.PI / 180, tanT = Math.tan(t);
    const H = nc.caoDo + caoKhung, nguoc = x.mepThap === 'nguoc';
    const { eu, ev } = trucMang(nc);
    const thep = vl(0x2b2b2b);
    const P3 = (u, v, y) => V3(nc.H.sangChung([u, v]), y);

    // Gom các hàng tấm sát nhau thành từng dãy khung.
    const ds = tams.map(tam => {
      const kt = XepPin.kichThuoc(nc.mang, tam.huong, tp);
      return { tam, v0: tam.v - kt.dv / 2, v1: tam.v + kt.dv / 2, u0: tam.u - kt.wu / 2, u1: tam.u + kt.wu / 2 };
    }).sort((a, b) => a.v0 - b.v0);
    const day = [];
    for (const o of ds) {
      const cuoi = day[day.length - 1];
      if (cuoi && o.v0 <= cuoi.v1 + 0.15) { cuoi.ds.push(o); cuoi.v1 = Math.max(cuoi.v1, o.v1); cuoi.u0 = Math.min(cuoi.u0, o.u0); cuoi.u1 = Math.max(cuoi.u1, o.u1); }
      else day.push({ ds: [o], v0: o.v0, v1: o.v1, u0: o.u0, u1: o.u1 });
    }

    for (const d of day) {
      const vThap = nguoc ? d.v1 : d.v0, vCao = nguoc ? d.v0 : d.v1;
      const nhoLen = Math.abs(d.v1 - d.v0) * tanT;
      for (const o of d.ds) {
        const k = kichThat(o.tam);
        const y = H + Math.abs(o.tam.v - vThap) * tanT + 0.07;
        tamPin(moHinh, P3(o.tam.u, o.tam.v, y), eu, ev, t, nguoc ? -1 : 1, k.u, k.doc, k.laDoc);
      }
      // Giàn tam giác (răng cưa) dọc theo dãy
      const soGian = Math.max(2, Math.ceil((d.u1 - d.u0) / 2.6) + 1);
      for (let i = 0; i < soGian; i++) {
        const u = d.u0 + 0.1 + (d.u1 - d.u0 - 0.2) * i / (soGian - 1);
        const A = P3(u, vCao, H + nhoLen), B = P3(u, vCao, H), C = P3(u, vThap, H);
        const M = A.clone().lerp(C, 0.5), Q = A.clone().lerp(C, 0.25), Pm = B.clone().lerp(C, 0.5), R = B.clone().lerp(C, 0.25);
        for (const [p, q] of [[A, B], [B, C], [A, C], [Q, R], [M, Pm], [B, Q], [R, M]]) moHinh.add(thanh(p, q, 0.03, thep));
      }
      // Xà dọc
      for (const [v, y] of [[vThap, H], [vCao, H], [vCao, H + nhoLen]]) moHinh.add(thanh(P3(d.u0, v, y), P3(d.u1, v, y), 0.04, thep));
      thongKe.caoNhat = Math.max(thongKe.caoNhat, H + nhoLen);
    }

    // Cột và dầm chính đỡ toàn bộ các dãy
    const u0 = Math.min(...day.map(d => d.u0)), u1 = Math.max(...day.map(d => d.u1));
    const v0 = Math.min(...day.map(d => d.v0)), v1 = Math.max(...day.map(d => d.v1));
    const chia = (a, b, buoc) => { const n = Math.max(2, Math.ceil((b - a) / buoc) + 1); return Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1)); };
    const dsU = chia(u0 + 0.15, u1 - 0.15, 4.8), dsV = chia(v0 + 0.15, v1 - 0.15, 4.8);
    for (const u of dsU) {
      moHinh.add(thanh(P3(u, v0, H), P3(u, v1, H), 0.05, thep));
      for (const v of dsV) {
        const p = nc.H.sangChung([u, v]);
        const goc = HH.namTrong(p, nc.P) ? nc.hMai(p) : nc.caoDo;
        moHinh.add(thanh(V3(p, goc), V3(p, H), 0.05, thep));
      }
    }
  }

  // ---------- Góc nhìn ----------
  function datGoc(ma) {
    if (!r || !moHinh) return;
    const hop3 = new THREE.Box3();
    moHinh.children.forEach(o => { if (!o.userData.laDat) hop3.expandByObject(o); });
    const c = hop3.getCenter(new THREE.Vector3()), s = hop3.getSize(new THREE.Vector3());
    const R = Math.max(s.x, s.y, s.z);
    let huong;
    if (ma === 'tren') { cam.fov = 20; huong = new THREE.Vector3(0, 1, 0.001); }
    else if (ma === 'dung') { cam.fov = 20; huong = s.z >= s.x ? new THREE.Vector3(-1, 0.06, 0) : new THREE.Vector3(0, 0.06, 1); }
    else { cam.fov = 35; huong = new THREE.Vector3(-0.8, 0.85, 1); }
    const xa = ma === 'iso' ? R * 1.9 : R * 3.4;
    cam.position.copy(c).add(huong.normalize().multiplyScalar(xa));
    cam.near = xa / 100; cam.far = xa * 10;
    cam.updateProjectionMatrix();
    dk.target.copy(c); dk.update();
    veNgay();
  }

  // ---------- Chụp ảnh ----------
  function anhHienTai() { veNgay(); return r.domElement.toDataURL('image/jpeg', 0.92); }
  async function chupAnh() {
    if (!r) return;
    const dataURL = anhHienTai();
    const ten = GOC.find(g => g[0] === gocDangXem)[1];
    const a = { id: TI.taoId('anh'), hoSoId: hs.id, ten: 'phoi-canh-3d.jpg', dataURL, rong: r.domElement.width, cao: r.domElement.height };
    await LuuTru.ghi('anh', a);
    hs.hienTrang.anh.push({ id: a.id, loai: 'phoi-canh', ghiChu: `Phối cảnh 3D – ${ten}` });
    luuSau();
    TI.thongBao('Đã lưu ảnh vào hồ sơ (bước Khảo sát → Ảnh khảo sát)');
  }
  async function taiAnh() {
    if (!r) return;
    const blob = await (await fetch(anhHienTai())).blob();
    await TI.luuFile(`3d-${TI.tenFile(hs.khach.ten)}-${gocDangXem}.jpg`, blob, 'image/jpeg');
  }

  // ---------- Bảng thông tin + cài đặt dựng 3D ----------
  function capNhatThongTin() {
    const coCS = tp && SO(tp.congSuatW);
    vungThongKe.replaceChildren(
      TI.el('div', { class: 'the' }, TI.el('small', {}, 'Số tấm'), TI.el('b', {}, String(thongKe.soTam))),
      TI.el('div', { class: 'the' }, TI.el('small', {}, 'Công suất'), TI.el('b', {}, coCS ? `${TI.soVN(thongKe.soTam * tp.congSuatW / 1000, 2)} kWp` : `${CAN_DIEN}`)),
      TI.el('div', { class: 'the' }, TI.el('small', {}, 'Điểm cao nhất so với mái chính'), TI.el('b', {}, `${TI.soVN(thongKe.caoNhat, 2)} m`)));
    vungCanhBao.replaceChildren(...(!canhBao.length ? [] : [TI.el('div', { class: 'the canh-bao nho' },
      TI.el('b', {}, 'Đang vẽ tạm vì thiếu số liệu:'),
      TI.el('ul', { class: 'ds-thieu' }, ...canhBao.map(c => TI.el('li', {}, c))),
      TI.el('a', { href: `#/ho-so/${hs.id}/thong-so`, class: 'lien-ket-icon' }, 'Điền ở bước Thông số', Icon('arrow-right', { co: 18 })))]));
  }

  let henDung = null;
  function doi() {
    luuSau();
    clearTimeout(henDung);
    henDung = setTimeout(() => { if (r) { dungMoHinh(); veNgay(); } }, 250);
  }

  function veCaiDat() {
    const dsMang = hs.mai.mangMai.filter(m => m.diem.length >= 3);
    const o = (nhan, gt, dat, dv, ghiChu) => TI.el('label', { class: 'truong' }, TI.el('span', {}, nhan),
      TI.el('div', { class: 'co-don-vi' }, TI.oSo(gt, (n) => { dat(n); doi(); }), TI.el('i', {}, dv)),
      ghiChu ? TI.el('small', { class: 'mo' }, ghiChu) : null);
    const nd = [];
    dsMang.forEach((m, i) => {
      const dong = [];
      if (i === 0) dong.push(TI.el('p', { class: 'mo nho' }, 'Mái chính: dùng làm mốc chiều cao 0.'));
      else dong.push(o('Cao độ so với mái chính', m.d3.caoDoM, (n) => { m.d3.caoDoM = n; }, 'm', 'Thấp hơn mái chính thì ghi số âm, vd −0,6. Mái dốc: tính ở mép thấp (vạch cam).'));
      dong.push(o('Chiều cao tường lan can', m.d3.lanCanM, (n) => { m.d3.lanCanM = n; }, 'm', 'Không có thì để trống.'));
      if (m.xep.kieuLap === 'khung-nang') {
        dong.push(TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Mép thấp của tấm trên khung quay về'),
          TI.el('select', { onchange: (e) => { m.xep.mepThap = e.target.value; doi(); } },
            ...[['canh-goc', 'Phía vạch cam (cạnh xếp hàng)'], ['nguoc', 'Phía ngược lại']].map(([gt, ten]) =>
              TI.el('option', { value: gt, selected: (m.xep.mepThap || 'canh-goc') === gt }, ten)))));
      }
      nd.push(TI.el('details', { class: 'nhom' }, TI.el('summary', {}, m.ten || 'Mảng mái'), TI.el('div', { class: 'nhom-noi-dung' }, ...dong)));
    });
    nd.push(TI.el('details', { class: 'nhom' }, TI.el('summary', {}, 'Khối nhà'), TI.el('div', { class: 'nhom-noi-dung' },
      o('Chiều cao nhà (chỉ để hình đẹp)', hs.dung3d.caoNhaM, (n) => { hs.dung3d.caoNhaM = n; }, 'm', 'Để trống thì vẽ tượng trưng 3 m.'))));
    return TI.el('div', {}, TI.el('h3', {}, 'Thông số dựng 3D'),
      TI.el('p', { class: 'mo nho' }, 'Độ dốc mái, khung nâng, chiều cao vật cản lấy từ các bước Vẽ mái, Xếp pin, Thông số.'), ...nd);
  }

  // Dựng ảnh phối cảnh 3D cho đúng một phương án (giữ n tấm đầu của mỗi mảng, cùng thứ tự với mặt bằng trong báo giá).
  // Dựng ngoài màn hình rồi giải phóng ngay; không lưu gì vào hồ sơ.
  async function chupTheoPhuongAn(hoSo, soTamMang, W = 900, H = 620) {
    const ban = structuredClone(hoSo);
    if (ban.xepPin) {
      const theoMang = {};
      for (const t of ban.xepPin.tam) (theoMang[t.mang] = theoMang[t.mang] || []).push(t);
      ban.xepPin.tam = Object.entries(theoMang).flatMap(([id, ds]) =>
        ds.sort((a, b) => a.v - b.v || a.u - b.u).slice(0, soTamMang[id] ?? ds.length));
    }
    const gocCu = gocDangXem;
    gocDangXem = 'iso';
    const vung = TI.el('div', { class: 'giu-trang', style: `width:${W}px` });
    document.body.append(vung);
    try {
      await ve(vung, ban, () => {});
      if (!r || !khung3d) throw new Error('Không dựng được 3D');
      khung3d.style.height = H + 'px';
      r.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
      datGoc('iso');
      await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
      return anhHienTai();
    } finally {
      huy(); vung.remove(); gocDangXem = gocCu;
    }
  }

  return { ve, huy, chupTheoPhuongAn, _trangThai: () => ({ thongKe, canhBao, coRenderer: !!r }) };
})();
