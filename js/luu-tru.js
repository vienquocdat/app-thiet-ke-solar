// Lưu dữ liệu ngay trên máy (IndexedDB = kho dữ liệu có sẵn trong trình duyệt, chứa được ảnh lớn).
// 3 ngăn: hoSo (hồ sơ khách), anh (ảnh, tách riêng cho nhẹ), caiDat (chỉnh sửa ở màn hình Cài đặt).
const LuuTru = (() => {
  const TEN_KHO = 'tdh-solar';
  const PHIEN_BAN = 1;
  let hua;

  function mo() {
    if (!hua) {
      hua = new Promise((ok, loi) => {
        const r = indexedDB.open(TEN_KHO, PHIEN_BAN);
        r.onupgradeneeded = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains('hoSo')) db.createObjectStore('hoSo', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('anh')) {
            const k = db.createObjectStore('anh', { keyPath: 'id' });
            k.createIndex('hoSoId', 'hoSoId');
          }
          if (!db.objectStoreNames.contains('caiDat')) db.createObjectStore('caiDat', { keyPath: 'ten' });
        };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => loi(r.error);
      });
    }
    return hua;
  }

  async function giaoDich(ngan, cheDo, viec) {
    const db = await mo();
    return new Promise((ok, loi) => {
      const tx = db.transaction(ngan, cheDo);
      const kq = viec(tx.objectStore(ngan));
      tx.oncomplete = () => ok(kq && 'result' in kq ? kq.result : undefined);
      tx.onerror = () => loi(tx.error);
      tx.onabort = () => loi(tx.error || new Error('Giao dịch bị hủy'));
    });
  }

  return {
    layHet: (ngan) => giaoDich(ngan, 'readonly', s => s.getAll()),
    lay: (ngan, id) => giaoDich(ngan, 'readonly', s => s.get(id)),
    ghi: (ngan, obj) => giaoDich(ngan, 'readwrite', s => s.put(obj)),
    xoa: (ngan, id) => giaoDich(ngan, 'readwrite', s => s.delete(id)),
    layTheoHoSo: (hoSoId) => giaoDich('anh', 'readonly', s => s.index('hoSoId').getAll(hoSoId)),
    // Xin trình duyệt giữ dữ liệu lâu dài, không tự xóa khi máy đầy bộ nhớ.
    async xinGiuLauDai() {
      try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); }
      catch (e) { /* bỏ qua */ }
      return false;
    },
  };
})();

// Nghiệp vụ hồ sơ khách hàng.
const HoSo = (() => {
  const DINH_DANG_SAO_LUU = 'tdh-solar-sao-luu';

  function taoMoi() {
    const hn = TI.homNay();
    return {
      id: TI.taoId('hs'),
      ngayTao: hn,
      ngaySua: new Date().toISOString(),
      trangThai: 'khao-sat',
      khach: { ten: '', dienThoai: '', zalo: '', diaChi: '', toaDo: null },
      dien: {
        hoaDon: [{ thang: '', kWh: null, tien: null }],
        phanTramDungBanNgay: null,
        banDienDu: '',
        loaiDien: '',
        viTriCongTo: '', viTriTuDien: '', viTriInverter: '',
        quangDuongDayM: null,
        coWifi: '',
        tiepDia: '',
      },
      nhuCau: { loaiHe: '', nganSach: null, mucTieu: '' },
      hienTrang: {
        huongNha: '', gocLaBan: null,
        ketCauMai: '', thamDot: '', bongChe: '', loiLenMai: '', ghiChuKhac: '',
        anh: [],
      },
      mai: null,       // Giai đoạn 2
      xepPin: null,    // Giai đoạn 3
      phuongAn: [],    // Giai đoạn 5–6
      ghiChu: '',
    };
  }

  async function danhSach() {
    const ds = await LuuTru.layHet('hoSo');
    return ds.sort((a, b) => String(b.ngaySua).localeCompare(String(a.ngaySua)));
  }

  async function luu(hs) {
    hs.ngaySua = new Date().toISOString();
    await LuuTru.ghi('hoSo', hs);
    return hs;
  }

  async function xoa(id) {
    const anh = await LuuTru.layTheoHoSo(id);
    for (const a of anh) await LuuTru.xoa('anh', a.id);
    await LuuTru.xoa('hoSo', id);
  }

  async function themAnh(hoSoId, file) {
    const { dataURL, rong, cao } = await TI.nenAnh(file);
    const anh = { id: TI.taoId('anh'), hoSoId, ten: file.name || 'anh.jpg', dataURL, rong, cao };
    await LuuTru.ghi('anh', anh);
    return anh;
  }

  // Gói hồ sơ + ảnh thành 1 file JSON để sao lưu / gửi sang máy khác.
  async function taoSaoLuu(ids) {
    const tatCa = await danhSach();
    const hoSo = ids ? tatCa.filter(h => ids.includes(h.id)) : tatCa;
    const anh = [];
    for (const h of hoSo) anh.push(...await LuuTru.layTheoHoSo(h.id));
    return {
      dinhDang: DINH_DANG_SAO_LUU, phienBan: 1,
      ngayXuat: new Date().toISOString(),
      soHoSo: hoSo.length, hoSo, anh,
    };
  }

  function kiemTraFile(du) {
    if (!du || du.dinhDang !== DINH_DANG_SAO_LUU || !Array.isArray(du.hoSo)) {
      throw new Error('File không phải file sao lưu của app này.');
    }
  }

  // Nhập file sao lưu. Ảnh mẫu có thể chỉ ghi đường dẫn (duongDan) → tải về rồi lưu.
  async function nhapSaoLuu(du) {
    kiemTraFile(du);
    for (const a of du.anh || []) {
      if (!a.dataURL && a.duongDan) {
        const r = await fetch(a.duongDan);
        if (!r.ok) throw new Error('Không tải được ảnh ' + a.duongDan);
        a.dataURL = await TI.blobSangDataURL(await r.blob());
        delete a.duongDan;
      }
      await LuuTru.ghi('anh', a);
    }
    for (const h of du.hoSo) await LuuTru.ghi('hoSo', h);
    return du.hoSo.length;
  }

  async function idDaCo(du) {
    kiemTraFile(du);
    const coSan = new Set((await LuuTru.layHet('hoSo')).map(h => h.id));
    return du.hoSo.filter(h => coSan.has(h.id));
  }

  return { taoMoi, danhSach, lay: (id) => LuuTru.lay('hoSo', id), luu, xoa, themAnh, taoSaoLuu, nhapSaoLuu, idDaCo };
})();
