/** Toạ độ đo tại một thời điểm. Đính kèm phiếu làm bằng chứng nơi lập. */
export interface ViTri {
  lat: number;
  lng: number;
  /** Sai số ước lượng (mét) do thiết bị báo. Lớn = kém tin cậy. */
  doChinhXac?: number;
  /** ISO — toạ độ có "hạn dùng"; cũ quá thì coi như không có. */
  ghiLuc: string;
}

/**
 * Kết quả reverse-geocode từ backend ERP.
 * LƯU Ý: `detail` (số nhà/đường) LUÔN rỗng với provider `polygon` mặc định —
 * polygon địa giới chỉ suy ra được tỉnh/xã. UI phải chừa ô cho user gõ tay.
 */
export interface DiaChiGeocode {
  province: string;
  commune: string;
  detail: string;
  lat: number;
  lng: number;
  /**
   * Địa chỉ này lấy được từ đâu. Backend KHÔNG trả field này — client tự gắn.
   * `mock` = đoán theo dải vĩ độ, phải nói rõ với người dùng để họ không tưởng
   * là số liệu thật.
   */
  nguon?: 'backend' | 'mock';
}

export interface GoiYDiaChi {
  description: string;
  placeId: string;
}

/** Trạng thái đo vị trí trên thiết bị. */
export type ViTriState = 'idle' | 'dang-lay' | 'co' | 'tu-choi' | 'loi';
