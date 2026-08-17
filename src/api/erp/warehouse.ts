import { client, MOCK_API } from '../client';
import type {
  CreateReceiptBody,
  Kho,
  KhoMove,
  ListReceiptsQuery,
  Paginated,
  PhieuFull,
  PhieuHeader,
  ReceiptKind,
} from '../../features/vat-tu/types';
import {
  MOCK_KHO,
  MOCK_MOVES_STORE,
  MOCK_PHIEU_STORE,
  MOCK_VATTU,
  nextMoveId,
  nextPhieuId,
  sumStock,
} from '../../mocks/vat-tu.mock';
import { convertToBase } from '../../features/vat-tu/unit-convert';

const MOCK_DELAY = 300;
function delay<T>(v: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayShort(): string {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function paginate<T>(all: T[], page = 1, pageSize = 50): Paginated<T> {
  const total = all.length;
  const start = (page - 1) * pageSize;
  return { data: all.slice(start, start + pageSize), meta: { total, page, pageSize } };
}

// ============ KHO / STOCK / MOVES ============

export async function listKho(): Promise<Kho[]> {
  if (MOCK_API) return delay(MOCK_KHO);
  const { data } = await client.get<{ data: Kho[] }>('/kho');
  return data.data;
}

export async function getStock(input: { khoId: string; vatTuId: string }): Promise<{
  soLuong: number;
  donViCoBan: string;
}> {
  const { khoId, vatTuId } = input;
  if (MOCK_API) {
    const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
    return delay({ soLuong: sumStock(khoId, vatTuId), donViCoBan: sku?.donViCoBan ?? '' });
  }
  const { data } = await client.get<{ data: Array<{ khoId: string; vatTuId: string; soLuong: number }> }>(
    '/kho/ton',
    { params: { khoId, vatTuId } },
  );
  const row = data.data[0];
  const sku = row ? MOCK_VATTU.find((v) => v.id === row.vatTuId) : undefined;
  return { soLuong: row?.soLuong ?? 0, donViCoBan: sku?.donViCoBan ?? '' };
}

export async function getMoves(input: {
  khoId?: string;
  vatTuId?: string;
  chungTuId?: string;
  from?: string;
  to?: string;
}): Promise<KhoMove[]> {
  if (MOCK_API) {
    return delay(
      MOCK_MOVES_STORE.filter((m) => {
        if (input.khoId && m.khoId !== input.khoId) return false;
        if (input.vatTuId && m.vatTuId !== input.vatTuId) return false;
        if (input.chungTuId && m.chungTuId !== input.chungTuId) return false;
        return true;
      }).sort((a, b) => b.taoLuc.localeCompare(a.taoLuc)),
    );
  }
  const { data } = await client.get<{ data: KhoMove[] }>('/kho/moves', { params: input });
  return data.data;
}

// ============ PHIẾU ============

function pathFor(kind: ReceiptKind): string {
  return kind === 'nhap' ? '/kho/phieu-nhap' : '/kho/phieu-ban';
}

export async function listReceipts(query: ListReceiptsQuery): Promise<Paginated<PhieuHeader>> {
  const { kind, khoId, status, q, page = 1, pageSize = 50 } = query;
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    const filtered = MOCK_PHIEU_STORE.filter((p) => {
      if (kind !== 'all' && p.kind !== kind) return false;
      if (khoId && p.khoId !== khoId) return false;
      if (status && status !== 'all' && p.trangThai !== status) return false;
      if (needle) {
        const hay = `${p.id} ${p.partnerTen ?? ''} ${p.ncc ?? ''} ${p.nongHoTen ?? ''}`.toLowerCase();
        return hay.includes(needle);
      }
      return true;
    }).sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
    return delay(paginate(filtered, page, pageSize));
  }
  if (kind === 'all') {
    // real BE: 2 calls parallel
    const [nhap, ban] = await Promise.all([
      client.get<Paginated<PhieuHeader>>('/kho/phieu-nhap', { params: { khoId, status, q, page, pageSize } }),
      client.get<Paginated<PhieuHeader>>('/kho/phieu-ban', { params: { khoId, status, q, page, pageSize } }),
    ]);
    const merged = [...nhap.data.data, ...ban.data.data].sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
    return { data: merged, meta: { total: merged.length, page, pageSize } };
  }
  const { data } = await client.get<Paginated<PhieuHeader>>(pathFor(kind), {
    params: { khoId, status, q, page, pageSize },
  });
  return data;
}

export async function getReceipt(id: string): Promise<PhieuFull> {
  if (MOCK_API) {
    const phieu = MOCK_PHIEU_STORE.find((p) => p.id === id);
    if (!phieu) throw new Error('Không tìm thấy phiếu');
    const dongHang = MOCK_MOVES_STORE.filter(
      (m) => m.chungTuId === id && m.huong === (phieu.kind === 'nhap' ? 'in' : 'out'),
    ).map((m) => {
      const sku = MOCK_VATTU.find((v) => v.id === m.vatTuId);
      return {
        vatTuId: m.vatTuId,
        tenSku: sku?.ten,
        donViCoBan: sku?.donViCoBan ?? '',
        donViLon: sku?.donViLon,
        heSoQuyDoi: sku?.heSoQuyDoi,
        soLuongCoBan: m.soLuong,
        lo: m.lo,
        hanDung: m.hanDung,
        serial: m.serial,
        donGia: m.donGia,
      };
    });
    return delay({ phieu, dongHang });
  }
  const { data } = await client.get<{ data: PhieuFull }>(`/kho/phieu/${id}`);
  return data.data;
}

export async function createReceipt(kind: ReceiptKind, body: CreateReceiptBody): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 200));
    // Kiểm tra tồn cho phiếu bán
    if (kind === 'ban') {
      const groupBase: Record<string, number> = {};
      for (const d of body.dongHang) {
        const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
        const base = convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: sku?.heSoQuyDoi });
        groupBase[d.vatTuId] = (groupBase[d.vatTuId] ?? 0) + base;
      }
      for (const [vatTuId, need] of Object.entries(groupBase)) {
        const have = sumStock(body.khoId, vatTuId);
        if (need > have) {
          const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
          const err = new Error(`Kho thiếu ${vatTuId}: còn ${have} ${sku?.donViCoBan ?? ''}, cần ${need}`);
          (err as Error & { code?: string }).code = 'thieu_ton';
          throw err;
        }
      }
    }

    const shortDate = todayShort();
    const id = nextPhieuId(kind, shortDate);
    const kho = MOCK_KHO.find((k) => k.id === body.khoId);
    const taoLuc = nowIso();

    // Sinh moves + tính tổng
    const moves: KhoMove[] = [];
    let tongSoLuong = 0;
    let tongTien = 0;
    for (const d of body.dongHang) {
      const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
      const soLuongCoBan = convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: sku?.heSoQuyDoi });
      tongSoLuong += soLuongCoBan;
      const gia = d.donGia ?? sku?.giaBan ?? 0;
      tongTien += gia * soLuongCoBan;
      moves.push({
        id: nextMoveId(),
        khoId: body.khoId,
        huong: kind === 'nhap' ? 'in' : 'out',
        loaiHang: 'vat_tu',
        vatTuId: d.vatTuId,
        soLuong: soLuongCoBan,
        lo: d.lo,
        hanDung: d.hanDung,
        serial: d.serial,
        donGia: gia,
        chungTuLoai: kind,
        chungTuId: id,
        nguoiTao: 'u_mock_admin',
        taoLuc,
      });
    }
    MOCK_MOVES_STORE.push(...moves);

    const phieu: PhieuHeader = {
      id,
      kind,
      khoId: body.khoId,
      khoTen: kho?.ten,
      partnerTen: body.ncc ?? body.nongHoTen ?? (body.nongHoId ? undefined : 'Khách lẻ'),
      ncc: body.ncc,
      nongHoId: body.nongHoId,
      nongHoTen: body.nongHoTen,
      trangThai: 'ghi',
      ghiChu: body.ghiChu,
      tongSoLuong,
      tongTien,
      nguoiTao: 'u_mock_admin',
      taoLuc,
    };
    MOCK_PHIEU_STORE.unshift(phieu);

    return {
      phieu,
      dongHang: moves.map((m) => {
        const sku = MOCK_VATTU.find((v) => v.id === m.vatTuId);
        return {
          vatTuId: m.vatTuId,
          tenSku: sku?.ten,
          donViCoBan: sku?.donViCoBan ?? '',
          donViLon: sku?.donViLon,
          heSoQuyDoi: sku?.heSoQuyDoi,
          soLuongCoBan: m.soLuong,
          lo: m.lo,
          hanDung: m.hanDung,
          serial: m.serial,
          donGia: m.donGia,
        };
      }),
    };
  }

  const { data } = await client.post<{ data: PhieuFull }>(pathFor(kind), body);
  return data.data;
}

export async function cancelReceipt(id: string, lyDo: string): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const idx = MOCK_PHIEU_STORE.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error('Không tìm thấy phiếu');
    const prev = MOCK_PHIEU_STORE[idx]!;
    if (prev.trangThai === 'huy') return getReceipt(id);
    const now = nowIso();
    const next: PhieuHeader = {
      ...prev,
      trangThai: 'huy',
      lyDoHuy: lyDo,
      huyBoi: 'u_mock_admin',
      huyLuc: now,
    };
    MOCK_PHIEU_STORE[idx] = next;
    // Append dòng đảo dấu cho mỗi move gốc
    const originals = MOCK_MOVES_STORE.filter(
      (m) => m.chungTuId === id && m.huong === (prev.kind === 'nhap' ? 'in' : 'out'),
    );
    for (const m of originals) {
      MOCK_MOVES_STORE.push({
        ...m,
        id: nextMoveId(),
        huong: m.huong === 'in' ? 'out' : 'in',
        taoLuc: now,
      });
    }
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>(`/kho/phieu/${id}/huy`, { lyDo });
  return data.data;
}
