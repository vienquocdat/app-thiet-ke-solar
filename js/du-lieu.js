// Đọc các file số liệu trong thư mục du-lieu/ và gộp với phần anh sửa ở màn hình Cài đặt.
// Nguyên tắc: file trong du-lieu/ là bản gốc; sửa trong app thì lưu trên máy, bấm "Về mặc định" để bỏ.
const DuLieu = (() => {
  const DANH_SACH = [
    'doanh-nghiep', 'tam-pin', 'inverter', 'pin-luu-tru',
    'don-gia-thi-cong', 'gia-dien-evn', 'nang-khu-vuc', 'cau-hinh',
  ];
  const goc = {};

  async function napGoc() {
    await Promise.all(DANH_SACH.map(async ten => {
      const r = await fetch(`du-lieu/${ten}.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`Không đọc được du-lieu/${ten}.json`);
      goc[ten] = await r.json();
    }));
  }

  // Gộp: lấy cấu trúc (tên ô, đơn vị) từ bản gốc, lấy giá trị từ bản sửa trên máy.
  function gop(banGoc, banSua) {
    const kq = structuredClone(banGoc);
    if (!banSua) return kq;
    if (kq.truong && banSua.truong) {
      for (const t of kq.truong) {
        const s = banSua.truong.find(x => x.ma === t.ma);
        if (s) t.giaTri = s.giaTri;
      }
    }
    if (kq.bang && banSua.bang && Array.isArray(banSua.bang.dong)) kq.bang.dong = banSua.bang.dong;
    return kq;
  }

  async function lay(ten) {
    const sua = await LuuTru.lay('caiDat', ten);
    return gop(goc[ten], sua && sua.noiDung);
  }

  async function thongTinSua(ten) {
    const sua = await LuuTru.lay('caiDat', ten);
    return sua ? sua.ngaySua : null;
  }

  async function luu(ten, noiDung) {
    await LuuTru.ghi('caiDat', { ten, noiDung, ngaySua: new Date().toISOString() });
  }

  async function veMacDinh(ten) {
    await LuuTru.xoa('caiDat', ten);
  }

  // Đếm số ô còn [CẦN ĐIỀN] trong 1 file.
  function demCanDien(noiDung) {
    let n = 0;
    for (const t of noiDung.truong || []) if (t.giaTri === CAN_DIEN) n++;
    if (noiDung.bang) {
      for (const d of noiDung.bang.dong) {
        for (const c of noiDung.bang.cot) if (d[c.ma] === CAN_DIEN) n++;
      }
    }
    return n;
  }

  // Lấy nhanh 1 giá trị dạng ô đơn: await DuLieu.giaTri('cau-hinh', 'PR')
  async function giaTri(ten, ma) {
    const nd = await lay(ten);
    const t = (nd.truong || []).find(x => x.ma === ma);
    return t ? t.giaTri : undefined;
  }

  return { DANH_SACH, napGoc, lay, luu, veMacDinh, thongTinSua, demCanDien, giaTri, goc: (ten) => structuredClone(goc[ten]) };
})();
