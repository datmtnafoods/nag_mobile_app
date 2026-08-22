import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listKho } from '../../api/erp/warehouse';
import { useAuthStore } from '../../auth/store';
import { useKhoTamQueueStore } from '../../stores/kho-tam-queue';
import type { Kho } from './types';

/**
 * Danh sách kho = kho backend (`listKho`) + kho tạm khai offline CHƯA đồng bộ
 * (`kho-tam-queue`, gắn cờ `dongBoTam`). Kho tạm chỉ của KTV hiện tại.
 *
 * Dùng ở các màn CHỌN kho (chuyển kho đích, bán hàng) để kho vừa tạo hiện ngay
 * kể cả khi chưa lên được BE. Query key trùng `['kho','list']` nên
 * `invalidateQueries` sau khi tạo/sync vẫn refresh đúng.
 */
export function useKhoList() {
  const q = useQuery({ queryKey: ['kho', 'list'], queryFn: () => listKho(), staleTime: 60_000 });
  const userId = useAuthStore((s) => s.user?.id);
  const pending = useKhoTamQueueStore((s) => s.pending);

  const khos = useMemo<Kho[]>(() => {
    const base = q.data ?? [];
    const tam: Kho[] = pending
      .filter((p) => p.custodianUserId === userId)
      // Nếu tempId đã có trong list backend (đã sync trong cùng phiên) thì bỏ trùng.
      .filter((p) => !base.some((k) => k.id === p.tempId))
      .map((p) => ({
        id: p.tempId,
        ten: p.ten,
        loai: 'xe' as const,
        loaiXe: p.loaiXe,
        custodianUserId: p.custodianUserId,
        custodianName: p.custodianName,
        trangThai: 'active',
        dongBoTam: true,
      }));
    return [...base, ...tam];
  }, [q.data, pending, userId]);

  return { khos, isPending: q.isPending, isError: q.isError, refetch: q.refetch };
}
