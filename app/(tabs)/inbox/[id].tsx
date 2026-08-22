import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  danhDauDaDoc,
  getTinNhan,
  guiTinNhan,
  listHoiThoai,
  type GuiTinNhanBody,
} from '../../../src/api/erp/inbox';
import { apiErrorMessage } from '../../../src/api/client';
import { usePermissions, useCurrentUser } from '../../../src/auth/store';
import { permsForInbox } from '../../../src/features/inbox/perms';
import { cungNgay, nhanNgay } from '../../../src/features/inbox/thoiGian';
import type { TinNhan } from '../../../src/features/inbox/types';
import { useInboxDraftStore } from '../../../src/stores/inbox-draft';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { MessageBubble } from '../../../src/features/inbox/components/MessageBubble';
import { DaySeparator } from '../../../src/features/inbox/components/DaySeparator';
import { TypingBubble } from '../../../src/features/inbox/components/TypingBubble';
import { ChatComposer } from '../../../src/features/inbox/components/ChatComposer';
import { MAU } from '../../../src/theme/tokens';

// Tin optimistic cục bộ — KHÔNG nằm trong query cache (poll 4s sẽ xoá mất).
type TinTam = TinNhan & { tempId: string; trangThai: 'dang_gui' | 'loi' };

type Row =
  | { kind: 'sep'; id: string; nhan: string }
  | { kind: 'msg'; id: string; tin: TinNhan | TinTam }
  | { kind: 'typing'; id: 'typing' };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hoiThoaiId = typeof id === 'string' ? id : '';
  const permissions = usePermissions();
  const perms = permsForInbox(permissions);
  const user = useCurrentUser();
  // Demo 2 vai: user role 'htx' xem/gửi từ phía khách; còn lại là quầy.
  const laVaiHTX = Boolean(user?.roles?.includes('htx'));
  const phiaGui: 'toi' | 'khach' = laVaiHTX ? 'khach' : 'toi';
  const qc = useQueryClient();

  // Nháp gõ dở — RAM store (giữ khi chuyển màn; mất khi kill app; PII không xuống đĩa).
  const text = useInboxDraftStore((s) => s.drafts[hoiThoaiId] ?? '');
  const setDraft = useInboxDraftStore((s) => s.setDraft);
  const clearDraft = useInboxDraftStore((s) => s.clearDraft);

  const [pending, setPending] = useState<TinTam[]>([]);
  const [dangSoan, setDangSoan] = useState(false);

  const htQuery = useQuery({
    queryKey: ['inbox', 'hoi-thoai'],
    queryFn: () => listHoiThoai(),
    enabled: perms.canView,
  });
  const hoiThoai = (htQuery.data ?? []).find((h) => h.id === hoiThoaiId);

  const q = useQuery({
    queryKey: ['inbox', 'tin', hoiThoaiId],
    queryFn: () => getTinNhan(hoiThoaiId),
    enabled: perms.canView && !!hoiThoaiId,
    // Poll nhẹ thay realtime (mock — auto-reply đến sau ~1.5s).
    refetchInterval: 4000,
  });

  // Vào màn: đánh dấu đã đọc + làm mới list.
  useEffect(() => {
    if (!perms.canView || !hoiThoaiId) return;
    void danhDauDaDoc(hoiThoaiId).then(() => {
      qc.invalidateQueries({ queryKey: ['inbox', 'hoi-thoai'] });
    });
  }, [hoiThoaiId, perms.canView, qc]);

  const send = useMutation({
    mutationFn: ({ body }: { body: GuiTinNhanBody; tempId: string }) =>
      guiTinNhan(hoiThoaiId, { ...body, phiaGui }),
    // Chèn tin thật vào cache + gỡ optimistic cùng lúc → không nháy/không trùng.
    onSuccess: (realTin, vars) => {
      qc.setQueryData<TinNhan[]>(['inbox', 'tin', hoiThoaiId], (old) => {
        const list = old ?? [];
        return list.some((t) => t.id === realTin.id) ? list : [...list, realTin];
      });
      setPending((p) => p.filter((m) => m.tempId !== vars.tempId));
      qc.invalidateQueries({ queryKey: ['inbox', 'hoi-thoai'] });
      // Typing: kéo auto-reply mock (~1.5s) về nhanh hơn poll 4s.
      setDangSoan(true);
      setTimeout(() => qc.invalidateQueries({ queryKey: ['inbox', 'tin', hoiThoaiId] }), 1700);
      setTimeout(() => setDangSoan(false), 4000); // phao an toàn nếu reply không tới
    },
    onError: (_e, vars) =>
      setPending((p) =>
        p.map((m) => (m.tempId === vars.tempId ? { ...m, trangThai: 'loi' } : m)),
      ),
  });

  const guiText = useCallback(
    (noiDung: string) => {
      const tempId = `tmp_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
      const opt: TinTam = {
        id: tempId,
        tempId,
        hoiThoaiId,
        phia: phiaGui,
        loai: 'text',
        noiDung,
        guiLuc: new Date().toISOString(),
        daDoc: true,
        trangThai: 'dang_gui',
      };
      setPending((p) => [...p, opt]);
      send.mutate({ body: { loai: 'text', noiDung }, tempId });
    },
    [hoiThoaiId, phiaGui, send],
  );

  const onSend = useCallback(() => {
    const noiDung = text.trim();
    if (!noiDung) return;
    clearDraft(hoiThoaiId);
    guiText(noiDung);
  }, [text, hoiThoaiId, clearDraft, guiText]);

  const retry = useCallback(
    (tam: TinTam) => {
      setPending((p) =>
        p.map((m) => (m.tempId === tam.tempId ? { ...m, trangThai: 'dang_gui' } : m)),
      );
      send.mutate({ body: { loai: 'text', noiDung: tam.noiDung }, tempId: tam.tempId });
    },
    [send],
  );

  // Auto-clear typing khi có tin đối phương mới hơn.
  useEffect(() => {
    if (!dangSoan) return;
    const list = q.data ?? [];
    const last = list[list.length - 1];
    if (last && last.phia !== phiaGui) setDangSoan(false);
  }, [q.data, dangSoan, phiaGui]);

  // Dựng row (separator ngày + tin + typing) theo thứ tự thời gian rồi đảo cho inverted.
  const { data, lastOwnSentId, daXemLastOwn } = useMemo(() => {
    const server = q.data ?? [];
    let lastOwnSent: TinNhan | undefined;
    for (const t of server) if (t.phia === phiaGui) lastOwnSent = t;
    const daXem = lastOwnSent
      ? server.some((t) => t.phia !== phiaGui && t.guiLuc > lastOwnSent!.guiLuc)
      : false;

    const chrono: (TinNhan | TinTam)[] = [...server, ...pending];
    const built: Row[] = [];
    let prev: string | undefined;
    for (const t of chrono) {
      if (!prev || !cungNgay(prev, t.guiLuc)) {
        built.push({ kind: 'sep', id: `sep_${t.id}`, nhan: nhanNgay(t.guiLuc) });
      }
      built.push({ kind: 'msg', id: t.id, tin: t });
      prev = t.guiLuc;
    }
    if (dangSoan) built.push({ kind: 'typing', id: 'typing' });
    return {
      data: [...built].reverse(),
      lastOwnSentId: lastOwnSent?.id,
      daXemLastOwn: daXem,
    };
  }, [q.data, pending, dangSoan, phiaGui]);

  if (!perms.canView) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['top', 'bottom']}>
        <EmptyState
          icon="lock-closed-outline"
          title="Không có quyền xem tin nhắn"
          message="Tài khoản của bạn chưa được cấp quyền inbox."
        />
      </SafeAreaView>
    );
  }

  const rong = (q.data ?? []).length === 0 && pending.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: hoiThoai?.ten ?? 'Trò chuyện' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {q.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={MAU.primary} />
          </View>
        ) : q.isError ? (
          <View className="flex-1 justify-center">
            <ErrorState message={apiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
          </View>
        ) : rong ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="Chưa có tin nhắn"
              message="Gửi tin đầu tiên cho khách."
            />
          </View>
        ) : (
          <FlatList
            data={data}
            inverted
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.kind === 'sep') return <DaySeparator nhan={item.nhan} />;
              if (item.kind === 'typing') return <TypingBubble />;
              const tin = item.tin;
              const isTemp = 'trangThai' in tin;
              const mine = tin.phia === phiaGui;
              return (
                <MessageBubble
                  tin={tin}
                  mine={mine}
                  onOpenPhieu={(pid) => router.push(`/vat-tu/ban-hang/${pid}` as never)}
                  trangThai={isTemp ? (tin as TinTam).trangThai : undefined}
                  showStatus={!isTemp && mine && tin.id === lastOwnSentId}
                  daXem={daXemLastOwn}
                  onRetry={isTemp ? () => retry(tin as TinTam) : undefined}
                />
              );
            }}
          />
        )}

        {perms.canSend ? (
          <ChatComposer
            value={text}
            onChangeText={(t) => setDraft(hoiThoaiId, t)}
            onSend={onSend}
          />
        ) : (
          <View className="px-4 py-3 border-t border-border bg-bg">
            <Text className="text-caption text-ink-muted text-center">
              Bạn không có quyền gửi tin nhắn.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
