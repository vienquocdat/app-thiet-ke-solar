// Giai đoạn 5 – thẻ "Kỹ thuật": chọn inverter, chia chuỗi, cáp DC, thiết bị bảo vệ, sơ đồ một sợi.
// Mọi kết quả hiện kèm phép tính có số cụ thể để kiểm tra tay được.
const ManKyThuat = (() => {
  const SO = KyThuat.SO;
  const CFG = ['tMin', 'tVmpNong', 'rhoDong', 'nguongSutApPhanTram', 'dcAcMin', 'dcAcMax', 'heSoCBDC', 'soChuoiCanCauChi', 'heSoCauChi', 'heSoCBAC'];
  let hs, luuSau, vung, cfg, dsTP, dsINV;

  const so = (x, le = 2) => SO(x) ? TI.soVN(x, le) : CAN_DIEN;

  async function ve(v, hoSo, hamLuu) {
    hs = hoSo; luuSau = hamLuu; vung = v;
    cfg = {};
    for (const k of CFG) cfg[k] = await DuLieu.giaTri('cau-hinh', k);
    dsTP = (await DuLieu.lay('tam-pin')).bang.dong;
    dsINV = (await DuLieu.lay('inverter')).bang.dong.filter(d => d.model && d.model !== CAN_DIEN);
    if (!hs.kyThuat) hs.kyThuat = { inverter: null, soLuong: 1, nhom: {} };
    veLai();
  }

  function duLieuVao() {
    const tp = hs.xepPin ? dsTP.find(d => d.model === hs.xepPin.maTamPin) || null : null;
    const inv = dsINV.find(d => d.model === hs.kyThuat.inverter) || null;
    const nhomTam = (hs.mai ? hs.mai.mangMai : []).map(m => ({ id: m.id, ten: m.ten || 'Mảng mái',
      n: hs.xepPin ? hs.xepPin.tam.filter(t => t.mang === m.id).length : 0 })).filter(g => g.n > 0);
    return { tp, inv, nhomTam };
  }

  function veLai() {
    const { tp, inv, nhomTam } = duLieuVao();
    if (!nhomTam.length) {
      vung.replaceChildren(TI.el('div', { class: 'the trong' }, TI.el('b', {}, 'Chưa có tấm pin nào'),
        TI.el('p', { class: 'mo' }, 'Cần xếp pin ở thẻ "Xếp pin" trước.'),
        TI.el('a', { class: 'nut', href: `#/ho-so/${hs.id}/xep-pin` }, 'Sang thẻ Xếp pin')));
      return;
    }
    const kq = KyThuat.tinh({ tp, inv, cfg, nhomTam, dat: hs.kyThuat, chieuDaiMacDinh: hs.dien.quangDuongDayM, loaiDien: hs.dien.loaiDien });
    vung.replaceChildren(
      veThieu(kq, tp),
      veInverter(kq, tp, inv),
      veNhietDo(kq, tp),
      veChuoi(kq, tp, inv),
      veCap(kq),
      veBaoVe(kq, inv),
      veSoDo(kq, tp, inv));
  }

  function doi() { luuSau(); veLai(); }

  // ---------- Thiếu số liệu + kết luận chung ----------
  function veThieu(kq, tp) {
    const ds = [];
    if (!tp) ds.push('Chưa chọn loại tấm pin (thẻ Xếp pin)');
    if (kq.thieuTP.length && tp) ds.push(`Tấm pin ${tp.model}: ${kq.thieuTP.join(', ')}`);
    if (!dsINV.length) ds.push('Danh mục inverter chưa có model nào');
    else if (hs.kyThuat.inverter && kq.thieuINV.length) ds.push(`Inverter ${hs.kyThuat.inverter}: ${kq.thieuINV.join(', ')}`);
    if (kq.thieuCFG.length) ds.push(`Hằng số: ${kq.thieuCFG.join(', ')}`);
    const the = [];
    if (ds.length) the.push(TI.el('div', { class: 'the canh-bao nho' }, TI.el('b', {}, `Còn thiếu số liệu (${CAN_DIEN}):`),
      TI.el('ul', { class: 'ds-thieu' }, ...ds.map(t => TI.el('li', {}, t))), TI.el('a', { href: '#/cai-dat' }, 'Điền trong Cài đặt →')));
    if (kq.loi.length) the.push(TI.el('div', { class: 'the loi nho' }, TI.el('b', {}, 'Lỗi thiết kế:'), TI.el('ul', { class: 'ds-thieu' }, ...kq.loi.map(t => TI.el('li', {}, t)))));
    if (kq.canhBao.length) the.push(TI.el('div', { class: 'the canh-bao nho' }, TI.el('b', {}, 'Cảnh báo:'), TI.el('ul', { class: 'ds-thieu' }, ...kq.canhBao.map(t => TI.el('li', {}, t)))));
    if (!ds.length && !kq.loi.length && !kq.canhBao.length && kq.nhom.length) the.push(TI.el('div', { class: 'the dat nho' }, '✓ Thiết kế đạt mọi kiểm tra.'));
    return TI.el('div', {}, ...the);
  }

  const phan = (tieuDe, ...con) => TI.el('div', { class: 'the phan-kt' }, TI.el('h4', {}, tieuDe), ...con);
  const dong = (nhan, gt, cls = '') => TI.el('div', { class: 'dong-kt ' + cls }, TI.el('span', {}, nhan), TI.el('b', {}, gt));
  const congThuc = (t) => TI.el('div', { class: 'cong-thuc' }, t);

  // ---------- 1. Inverter ----------
  function veInverter(kq, tp, inv) {
    const kWpTam = SO(kq.kWp) ? kq.kWp : null;
    const chon = TI.el('select', { onchange: (e) => { hs.kyThuat.inverter = e.target.value || null; doi(); } },
      TI.el('option', { value: '' }, dsINV.length ? '— chọn inverter —' : `(${CAN_DIEN} danh mục inverter)`),
      ...dsINV.map(d => {
        let goiY = '';
        if (kWpTam && SO(d.congSuatACkW) && SO(cfg.dcAcMin) && SO(cfg.dcAcMax)) {
          const r = kWpTam / (d.congSuatACkW * (hs.kyThuat.soLuong || 1));
          goiY = ` – DC/AC ${TI.soVN(r, 2)}${r >= cfg.dcAcMin && r <= cfg.dcAcMax ? ' ✓' : ' ✗'}`;
        }
        return TI.el('option', { value: d.model, selected: d.model === hs.kyThuat.inverter },
          `${d.model} (${SO(d.congSuatACkW) ? TI.soVN(d.congSuatACkW) + ' kW' : '?'}, ${d.loai !== CAN_DIEN ? d.loai : '?'}, ${d.soPha !== CAN_DIEN ? d.soPha : '?'})${goiY}`);
      }));
    const ds = [
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Inverter'), chon),
      TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Số lượng inverter'),
        TI.el('div', { class: 'co-don-vi' }, TI.oSo(hs.kyThuat.soLuong, (n) => { hs.kyThuat.soLuong = n; luuSau(); }, { onchange: veLai }), TI.el('i', {}, 'cái'))),
      dong('Số tấm', String(kq.soTam)),
      dong('Công suất DC', SO(kq.kWp) ? `${TI.soVN(kq.kWp, 2)} kWp` : CAN_DIEN),
    ];
    if (SO(kq.dcAc)) {
      ds.push(dong('Công suất AC', `${TI.soVN(kq.pAC, 2)} kW`),
        dong('Tỉ lệ DC/AC', `${TI.soVN(kq.dcAc, 3)} ${kq.dcAcDat ? '✓' : '✗'}`, kq.dcAcDat ? 'dat' : 'khong-dat'),
        congThuc(`DC/AC = ${TI.soVN(kq.kWp, 2)} ÷ ${TI.soVN(kq.pAC, 2)} = ${TI.soVN(kq.dcAc, 3)} (cho phép ${TI.soVN(cfg.dcAcMin)}–${TI.soVN(cfg.dcAcMax)})`));
    }
    if (hs.dien.loaiDien) ds.push(dong('Điện nhà khách', hs.dien.loaiDien === '3-pha' ? '3 pha' : '1 pha'));
    return phan('1. Inverter', ...ds);
  }

  // ---------- 2. Ảnh hưởng nhiệt độ, giới hạn chuỗi ----------
  function veNhietDo(kq, tp) {
    if (!SO(kq.vocMax)) return phan('2. Giới hạn số tấm mỗi chuỗi', TI.el('p', { class: 'mo nho' }, 'Cần đủ thông số tấm pin và nhiệt độ thấp nhất.'));
    const b = kq.beta;
    const ds = [
      dong('Voc tối đa (trời lạnh)', `${TI.soVN(kq.vocMax, 2)} V`),
      congThuc(`= ${TI.soVN(tp.vocV)} × (1 + (${TI.soVN(b, 4)}) × (${TI.soVN(cfg.tMin)} − 25)) = ${TI.soVN(kq.vocMax, 3)} V`),
      dong('Vmp khi nóng', `${TI.soVN(kq.vmpNong, 2)} V`),
      congThuc(`= ${TI.soVN(tp.vmpV)} × (1 + (${TI.soVN(b, 4)}) × (${TI.soVN(cfg.tVmpNong)} − 25)) = ${TI.soVN(kq.vmpNong, 3)} V`),
    ];
    const { inv } = duLieuVao();
    if (SO(kq.nMax)) {
      ds.push(dong('Số tấm tối đa mỗi chuỗi', String(kq.nMax)),
        congThuc(`= làm tròn xuống (${TI.soVN(inv.dienApDCMaxV)} ÷ ${TI.soVN(kq.vocMax, 3)}) = làm tròn xuống (${TI.soVN(inv.dienApDCMaxV / kq.vocMax, 3)}) = ${kq.nMax}`),
        dong('Số tấm tối thiểu mỗi chuỗi', String(kq.nMin)),
        congThuc(`= làm tròn lên (${TI.soVN(inv.mpptMinV)} ÷ ${TI.soVN(kq.vmpNong, 3)}) = làm tròn lên (${TI.soVN(inv.mpptMinV / kq.vmpNong, 3)}) = ${kq.nMin}`),
        dong('Số chuỗi song song tối đa / MPPT', String(kq.pMax)),
        congThuc(`= làm tròn xuống (${TI.soVN(inv.dongMPPTMaxA)} A ÷ Imp ${TI.soVN(tp.impA)} A) = ${kq.pMax}`));
    }
    return phan('2. Giới hạn số tấm mỗi chuỗi', ...ds);
  }

  // ---------- 3. Chia chuỗi ----------
  function veChuoi(kq, tp, inv) {
    if (!kq.nhom.length) return phan('3. Chia chuỗi', TI.el('p', { class: 'mo nho' }, 'Chọn inverter và điền đủ số liệu để chia chuỗi.'));
    const ds = kq.nhom.map(n => {
      const dat = hs.kyThuat.nhom[n.id] || (hs.kyThuat.nhom[n.id] = {});
      const lua = [['', `Tự động (${n.tuChon ? '' : n.L + ' tấm'})`]];
      for (let L = kq.nMin; L <= Math.min(kq.nMax, n.n); L++) lua.push([String(L), `${L} tấm/chuỗi → ${Math.floor(n.n / L)} chuỗi, thừa ${n.n % L}`]);
      return TI.el('div', { class: 'nhom-chuoi' },
        TI.el('b', {}, `${n.ten}: ${n.n} tấm`),
        TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Số tấm mỗi chuỗi'),
          TI.el('select', { onchange: (e) => { dat.L = e.target.value ? Number(e.target.value) : null; doi(); } },
            ...lua.map(([gt, t]) => TI.el('option', { value: gt, selected: String(dat.L || '') === gt }, t)))),
        dong('Cách đấu', n.soChuoi ? `${n.soChuoi} chuỗi × ${n.L} tấm${n.thua ? ` (thừa ${n.thua})` : ''}` : 'Không chia được', n.soChuoi && !n.thua ? '' : 'khong-dat'),
        dong('Dùng MPPT', n.soMPPT ? `số ${n.mpptTu}${n.soMPPT > 1 ? '–' + (n.mpptTu + n.soMPPT - 1) : ''} (${n.chuoiMoiMPPT} chuỗi/MPPT)` : '—'),
        n.L ? dong('Voc tối đa của chuỗi', `${TI.soVN(n.vocMaxChuoi, 1)} V ${n.vocMaxChuoi <= inv.dienApDCMaxV ? '✓' : '✗'} (≤ ${TI.soVN(inv.dienApDCMaxV)} V)`) : null,
        n.L ? dong('Vmp chuỗi khi nóng', `${TI.soVN(n.vmpNongChuoi, 1)} V ${n.vmpNongChuoi >= inv.mpptMinV ? '✓' : '✗'} (≥ ${TI.soVN(inv.mpptMinV)} V)`) : null,
        n.L ? dong('Vmp chuỗi (điều kiện chuẩn)', `${TI.soVN(n.vmpChuoi, 1)} V`) : null,
        n.soChuoi ? dong('Dòng vào 1 MPPT', `${TI.soVN(n.chuoiMoiMPPT * tp.impA, 2)} A ${n.chuoiMoiMPPT * tp.impA <= inv.dongMPPTMaxA ? '✓' : '✗'} (≤ ${TI.soVN(inv.dongMPPTMaxA)} A)`) : null);
    });
    ds.push(dong('Tổng MPPT dùng / có', `${kq.mpptDung} / ${kq.mpptCo} ${kq.mpptDung <= kq.mpptCo ? '✓' : '✗'}`, kq.mpptDung <= kq.mpptCo ? '' : 'khong-dat'),
      TI.el('p', { class: 'mo nho' }, 'Mỗi mảng mái (hướng, độ nghiêng khác nhau) đấu vào MPPT riêng; các chuỗi chung 1 MPPT dài bằng nhau.'));
    return phan('3. Chia chuỗi', ...ds);
  }

  // ---------- 4. Cáp DC ----------
  function veCap(kq) {
    if (!kq.nhom.length) return phan('4. Cáp DC', TI.el('p', { class: 'mo nho' }, 'Chia chuỗi xong sẽ tính cáp.'));
    const ds = kq.nhom.map(n => {
      const dat = hs.kyThuat.nhom[n.id] || (hs.kyThuat.nhom[n.id] = {});
      const c = n.cap;
      return TI.el('div', { class: 'nhom-chuoi' },
        TI.el('b', {}, n.ten),
        TI.el('div', { class: 'luoi-o' },
          TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Chiều dài cáp 1 chiều'),
            TI.el('div', { class: 'co-don-vi' }, TI.oSo(dat.chieuDaiM ?? c.Lm, (x) => { dat.chieuDaiM = x; luuSau(); }, { onchange: veLai, placeholder: CAN_DIEN }), TI.el('i', {}, 'm'))),
          TI.el('label', { class: 'truong' }, TI.el('span', {}, 'Tiết diện'),
            TI.el('select', { onchange: (e) => { dat.tietDien = e.target.value ? Number(e.target.value) : null; doi(); } },
              TI.el('option', { value: '' }, `Tự chọn (${SO(c.S) ? TI.soVN(c.S) + ' mm²' : '?'})`),
              ...KyThuat.TIET_DIEN_DC.map(s => TI.el('option', { value: String(s), selected: dat.tietDien === s }, `${s} mm²`))))),
        SO(c.dU) ? dong('Sụt áp', `${TI.soVN(c.dU, 2)} V = ${TI.soVN(c.phanTram, 2)}% ${c.dat ? '✓' : '✗'}`, c.dat ? 'dat' : 'khong-dat') : dong('Sụt áp', CAN_DIEN),
        SO(c.dU) ? congThuc(`ΔU = 2 × ${TI.soVN(c.Lm)} × ${TI.soVN(c.I)} × ${TI.soVN(cfg.rhoDong, 4)} ÷ ${TI.soVN(c.S)} = ${TI.soVN(c.dU, 3)} V; ` +
          `${TI.soVN(c.dU, 3)} ÷ ${TI.soVN(n.vmpChuoi, 1)} V = ${TI.soVN(c.phanTram, 2)}% (ngưỡng ${TI.soVN(cfg.nguongSutApPhanTram)}%)`) : null);
    });
    ds.push(TI.el('p', { class: 'mo nho' }, 'Chiều dài mặc định lấy từ "Quãng đường đi dây" ở thẻ Thông số; sửa riêng từng mảng nếu khác. Dòng tính theo Imp của chuỗi.'));
    return phan('4. Cáp DC (mỗi chuỗi)', ...ds);
  }

  // ---------- 5. Thiết bị bảo vệ ----------
  function veBaoVe(kq, inv) {
    if (!kq.baoVe) return phan('5. Thiết bị bảo vệ', TI.el('p', { class: 'mo nho' }, 'Chia chuỗi xong sẽ tính thiết bị bảo vệ.'));
    const b = kq.baoVe, { tp } = duLieuVao();
    const banDu = hs.dien.banDienDu === 'Có';
    const hang = [
      ['CB DC (mỗi MPPT)', `${b.cbDC.soLuong} cái; ≥ ${so(b.cbDC.dongA, 1)} A; ≥ ${TI.soVN(b.cbDC.dienApV, 0)} V DC`,
        SO(cfg.heSoCBDC) ? `${TI.soVN(cfg.heSoCBDC)} × Isc ${TI.soVN(tp.iscA)} A × ${Math.max(...kq.nhom.map(n => n.chuoiMoiMPPT))} chuỗi` : `Hệ số CB DC ${CAN_DIEN}`],
      ['Cầu chì chuỗi', !b.cauChi ? CAN_DIEN : b.cauChi.can ? `Cần; ≥ ${so(b.cauChi.dongA, 1)} A` : 'Không cần (ít chuỗi song song)',
        !b.cauChi ? `Số chuỗi cần cầu chì ${CAN_DIEN}` : b.cauChi.can && SO(cfg.heSoCauChi) ? `${TI.soVN(cfg.heSoCauChi)} × Isc ${TI.soVN(tp.iscA)} A` : `Cần khi ≥ ${TI.soVN(cfg.soChuoiCanCauChi)} chuỗi/MPPT`],
      ['Chống sét lan truyền DC (SPD DC)', `Điện áp làm việc ≥ ${TI.soVN(b.spdDC.dienApV, 0)} V DC`, 'Theo Voc tối đa của chuỗi dài nhất'],
      ['CB AC (mỗi inverter)', `${b.cbAC.soLuong} cái; ≥ ${so(b.cbAC.dongA, 1)} A, ${inv.soPha !== CAN_DIEN ? inv.soPha : '?'}`,
        SO(b.cbAC.dongA) ? `${TI.soVN(cfg.heSoCBAC)} × ${TI.soVN(inv.dongACmaxA)} A` : `Hệ số CB AC hoặc dòng AC inverter ${CAN_DIEN}`],
      ['Chống sét lan truyền AC (SPD AC)', inv.soPha !== CAN_DIEN ? inv.soPha : '?', 'Theo điện áp lưới'],
      ['Tiếp địa', 'Khung, vỏ tủ, SPD nối đất', 'Đo điện trở tiếp địa khi nghiệm thu'],
      ['Chống phát ngược', banDu ? 'Không cần (khách bán điện dư)' : 'Cần (khách không bán điện dư)', hs.dien.banDienDu ? '' : 'Chưa hỏi khách ở thẻ Khảo sát'],
    ];
    return phan('5. Thiết bị bảo vệ',
      TI.el('table', { class: 'bang-so bang-bao-ve' },
        TI.el('thead', {}, TI.el('tr', {}, TI.el('th', {}, 'Thiết bị'), TI.el('th', {}, 'Yêu cầu'))),
        TI.el('tbody', {}, ...hang.map(([a, bb, c]) => TI.el('tr', {}, TI.el('td', {}, a), TI.el('td', {}, bb, c ? TI.el('small', { class: 'mo' }, c) : null))))),
      TI.el('p', { class: 'mo nho' }, 'Hệ số chọn thiết bị lấy trong Cài đặt → Hằng số tính toán. Chọn thiết bị có định mức tiêu chuẩn ngay trên giá trị yêu cầu.'));
  }

  // ---------- 6. Sơ đồ một sợi ----------
  function veSoDo(kq, tp, inv) {
    if (!kq.nhom.length || !inv) return phan('6. Sơ đồ một sợi', TI.el('p', { class: 'mo nho' }, 'Chia chuỗi xong sẽ vẽ sơ đồ.'));
    const svg = soDoSVG(kq, tp, inv);
    return phan('6. Sơ đồ một sợi', TI.el('div', { class: 'so-do', html: svg }),
      TI.el('div', { class: 'hang' }, TI.el('button', { type: 'button', class: 'nut nho', onclick: () => TI.luuFile(`so-do-mot-soi-${TI.tenFile(hs.khach.ten)}.svg`, svg, 'image/svg+xml') }, 'Tải sơ đồ về máy')));
  }

  function soDoSVG(kq, tp, inv) {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const W = 360, out = [];
    const hop = (x, y, w, h, dong, mau = '#1f6fbf', nen = '#fff') => {
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${nen}" stroke="${mau}" stroke-width="1.5"/>`);
      dong.forEach((t, i) => out.push(`<text x="${x + w / 2}" y="${y + 16 + i * 14}" text-anchor="middle" font-size="${i ? 10.5 : 12}" font-weight="${i ? 400 : 700}" fill="#1d2733">${esc(t)}</text>`));
    };
    const day = (x1, y1, x2, y2, mau = '#333', net = '') => out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${mau}" stroke-width="1.6" ${net ? 'stroke-dasharray="4 3"' : ''}/>`);
    // Hàng trên: các MPPT (mỗi nhóm mảng mái)
    const o = []; kq.nhom.forEach(n => { for (let i = 0; i < n.soMPPT; i++) o.push({ n, so: n.mpptTu + i, chuoi: Math.min(n.chuoiMoiMPPT, n.soChuoi - i * n.chuoiMoiMPPT) }); });
    const cot = Math.min(o.length, 3), rongO = (W - 20 - (cot - 1) * 8) / cot;
    let y = 10;
    const tamO = [];
    o.forEach((m, i) => {
      const x = 10 + (i % cot) * (rongO + 8), yy = y + Math.floor(i / cot) * 66;
      hop(x, yy, rongO, 56, [`MPPT ${m.so}`, `${m.n.ten}`.slice(0, 22), `${m.chuoi} chuỗi × ${m.n.L} tấm`], '#2e7d32', '#f1f8f1');
      tamO.push([x + rongO / 2, yy + 56]);
    });
    y += Math.ceil(o.length / cot) * 66 + 14;
    const yTuDC = y;
    tamO.forEach(([x, yy]) => day(x, yy, x, yTuDC));
    const b = kq.baoVe;
    hop(30, yTuDC, W - 60, 60, ['Tủ DC',
      `CB DC ≥ ${SO(b.cbDC.dongA) ? TI.soVN(b.cbDC.dongA, 1) : CAN_DIEN} A, ≥ ${TI.soVN(b.cbDC.dienApV, 0)} V × ${b.cbDC.soLuong}`,
      `SPD DC ≥ ${TI.soVN(b.spdDC.dienApV, 0)} V${b.cauChi && b.cauChi.can ? ` · Cầu chì ≥ ${SO(b.cauChi.dongA) ? TI.soVN(b.cauChi.dongA, 1) : CAN_DIEN} A` : ''}`]);
    y = yTuDC + 60;
    day(W / 2, y, W / 2, y + 18); y += 18;
    const yInv = y + 24;
    hop(40, y, W - 80, 48, [`Inverter ${inv.model}`.slice(0, 40), `${kq.soLuong} × ${TI.soVN(inv.congSuatACkW)} kW · ${inv.soPha} · DC/AC ${TI.soVN(kq.dcAc, 2)}`], '#e65100', '#fff6e6');
    y += 48; day(W / 2, y, W / 2, y + 18); y += 18;
    hop(30, y, W - 60, 46, ['Tủ AC', `CB AC ≥ ${SO(b.cbAC.dongA) ? TI.soVN(b.cbAC.dongA, 1) : CAN_DIEN} A × ${b.cbAC.soLuong} · SPD AC`]);
    const yTuAC = y;
    y += 46;
    if (hs.dien.banDienDu !== 'Có') {
      day(W / 2, y, W / 2, y + 16); y += 16;
      hop(60, y, W - 120, 34, ['Chống phát ngược (CT / đồng hồ)'], '#6a1b9a');
      y += 34;
    }
    day(W / 2, y, W / 2, y + 16); y += 16;
    hop(60, y, W - 120, 34, ['Tủ điện nhà · Công tơ EVN'], '#455a64');
    y += 34; day(W / 2, y, W / 2, y + 16); y += 16;
    hop(100, y, W - 200, 30, ['Lưới điện EVN'], '#455a64', '#eceff1');
    y += 30;
    // Tiếp địa
    const xTD = W - 14;
    for (const [x0, yy] of [[W - 30, yTuDC + 30], [W - 40, yInv], [W - 30, yTuAC + 23]]) day(x0, yy, xTD, yy, '#2e7d32', true);
    day(xTD, yTuDC + 30, xTD, y + 8, '#2e7d32', true);
    out.push(`<text x="${xTD - 4}" y="${y + 20}" text-anchor="end" font-size="10.5" fill="#2e7d32">Tiếp địa</text>`);
    for (let i = 0; i < 3; i++) day(xTD - 8 + i * 2.5, y + 8 + i * 4, xTD + 8 - i * 2.5, y + 8 + i * 4, '#2e7d32');
    const H = y + 26;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${out.join('')}</svg>`;
  }

  return { ve, _tinh: () => { const { tp, inv, nhomTam } = duLieuVao(); return KyThuat.tinh({ tp, inv, cfg, nhomTam, dat: hs.kyThuat, chieuDaiMacDinh: hs.dien.quangDuongDayM, loaiDien: hs.dien.loaiDien }); } };
})();
