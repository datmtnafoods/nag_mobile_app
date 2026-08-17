export type ReceiptKind = 'nhap' | 'ban';
export type ReceiptStatus = 'ghi' | 'huy';
export type KhoLoai = 'tong' | 'tram';
export type MaKieu = 'qr' | 'barcode' | 'datamatrix' | 'khac';
export type MaNguon = 'nha_sx' | 'tu_gan';

export type LoaiVatTu = {
  id: string;
  ten: string;
  thuTu?: number;
  thuocTinhMau?: string[];
};

export type MaVatTu = {
  ma: string;
  kieu: MaKieu;
  nguon: MaNguon;
};

export type VatTu = {
  id: string;
  loaiId: string;
  ten: string;
  donViCoBan: string;
  donViLon?: string;
  heSoQuyDoi?: number;
  thuocTinh?: Array<{ key: string; value: string }>;
  ma: MaVatTu[];
  giaBan?: number;
  trangThai: 'active' | 'ngung';
};

export type Kho = {
  id: string;
  ten: string;
  loai: KhoLoai;
};

export type KhoMove = {
  id: string;
  khoId: string;
  huong: 'in' | 'out';
  loaiHang: 'vat_tu';
  vatTuId: string;
  soLuong: number; // đơn vị cơ bản
  lo?: string;
  hanDung?: string;
  serial?: string;
  donGia?: number;
  chungTuLoai: ReceiptKind;
  chungTuId: string;
  nguoiTao: string;
  taoLuc: string;
};

export type PhieuHeader = {
  id: string;
  kind: ReceiptKind;
  khoId: string;
  khoTen?: string; // snapshot
  partnerTen?: string; // NCC or nong ho name snapshot
  ncc?: string; // when kind='nhap'
  nongHoId?: string; // when kind='ban' with party
  nongHoTen?: string; // snapshot
  trangThai: ReceiptStatus;
  ghiChu?: string;
  tongSoLuong: number;
  tongTien: number;
  nguoiTao: string;
  taoLuc: string;
  lyDoHuy?: string;
  huyBoi?: string;
  huyLuc?: string;
};

export type PhieuDongHang = {
  vatTuId: string;
  tenSku?: string;
  donViCoBan: string;
  donViLon?: string;
  heSoQuyDoi?: number;
  soLuongCoBan: number; // đã convert
  lo?: string;
  hanDung?: string;
  serial?: string;
  donGia?: number;
};

export type PhieuFull = {
  phieu: PhieuHeader;
  dongHang: PhieuDongHang[];
};

export type DraftLine = {
  vatTuId: string;
  tenSku: string;
  donViCoBan: string;
  donViLon?: string;
  heSoQuyDoi?: number;
  soLuong: number;
  donVi: 'co_ban' | 'lon';
  lo?: string;
  hanDung?: string;
  serial?: string;
  donGia?: number;
};

export type PartnerDraft = {
  id?: string;
  ten?: string;
  kind: 'ncc' | 'nongHo' | 'khachLe';
};

export type CreateReceiptBody = {
  khoId: string;
  ncc?: string;
  nongHoId?: string;
  nongHoTen?: string;
  ghiChu?: string;
  anh: string[];
  dongHang: Array<{
    vatTuId: string;
    soLuong: number;
    donVi: 'co_ban' | 'lon';
    lo?: string;
    hanDung?: string;
    serial?: string;
    donGia?: number;
  }>;
};

export type ListReceiptsQuery = {
  kind: ReceiptKind | 'all';
  khoId?: string;
  status?: ReceiptStatus | 'all';
  q?: string;
  page?: number;
  pageSize?: number;
};

export type Paginated<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};
