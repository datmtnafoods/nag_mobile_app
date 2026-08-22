import { create } from 'zustand';

/**
 * Bản nháp tin đang gõ theo hội thoại — Nhóm A (RAM, KHÔNG persist).
 *
 * Cố ý KHÔNG AsyncStorage: text chat là PII không giới hạn (tên, SĐT, số nợ, có
 * thể cả CCCD/địa chỉ) — Khuôn 1 buộc PII ở RAM (NĐ 13/2023). Đổi lại: mất nháp
 * nếu app bị kill nền (chấp nhận — tin ngắn, gõ lại nhanh). Giữ được khi chỉ
 * chuyển màn (component unmount) vì store sống ngoài màn.
 *
 * Bẫy cross-user: onUnauthorized/logout KHÔNG reload app nên nháp của user A còn
 * nguyên cho user B ⇒ PHẢI gọi `reset()` ở `wire.ts` + `profile.tsx` (đã đăng ký).
 */
type InboxDraftState = {
  drafts: Record<string, string>;
  setDraft: (hoiThoaiId: string, text: string) => void;
  getDraft: (hoiThoaiId: string) => string;
  clearDraft: (hoiThoaiId: string) => void;
  reset: () => void;
};

export const useInboxDraftStore = create<InboxDraftState>((set, get) => ({
  drafts: {},
  setDraft: (hoiThoaiId, text) =>
    set((s) => ({ drafts: { ...s.drafts, [hoiThoaiId]: text } })),
  getDraft: (hoiThoaiId) => get().drafts[hoiThoaiId] ?? '',
  clearDraft: (hoiThoaiId) =>
    set((s) => {
      if (!(hoiThoaiId in s.drafts)) return s;
      const next = { ...s.drafts };
      delete next[hoiThoaiId];
      return { drafts: next };
    }),
  reset: () => set({ drafts: {} }),
}));
