import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createSku, listLoai } from '../../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { ImagePickerRow } from '../../../src/features/vat-tu/components/ImagePickerRow';
import { MAX_ANH_PER_SKU } from '../../../src/features/vat-tu/anh';

const schema = z
  .object({
    ten: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự'),
    loaiId: z.string().min(1, 'Chọn loại vật tư'),
    donViCoBan: z.string().trim().min(1, 'Đơn vị cơ bản bắt buộc'),
    donViLon: z.string().trim().optional(),
    heSoQuyDoi: z
      .string()
      .optional()
      .refine((v) => !v || Number(v) > 0, 'Hệ số quy đổi phải > 0'),
    giaBan: z.string().optional(),
    tonMin: z.string().optional(),
    tonMax: z.string().optional(),
    moTa: z.string().optional(),
  })
  .refine((v) => !v.donViLon || Number(v.heSoQuyDoi) > 0, {
    path: ['heSoQuyDoi'],
    message: 'Có đơn vị lớn phải kèm hệ số quy đổi > 0',
  });

type FormValues = z.infer<typeof schema>;

export default function NewSku() {
  const qc = useQueryClient();
  const [anh, setAnh] = useState<string[]>([]);

  const loaiQuery = useQuery({
    queryKey: ['vat-tu', 'loai'],
    queryFn: () => listLoai(),
    staleTime: 60_000,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ten: '',
      loaiId: '',
      donViCoBan: '',
      donViLon: '',
      heSoQuyDoi: '',
      giaBan: '',
      tonMin: '',
      tonMax: '',
      moTa: '',
    },
  });
  const loaiId = watch('loaiId');

  const createMutation = useMutation({
    mutationFn: createSku,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vat-tu', 'list'] });
      qc.setQueryData(['vat-tu', 'one', data.id], data);
      router.replace(`/vat-tu/sku/${data.id}` as never);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const onSubmit = (v: FormValues) =>
    createMutation.mutate({
      ten: v.ten,
      loaiId: v.loaiId,
      donViCoBan: v.donViCoBan,
      donViLon: v.donViLon?.trim() || undefined,
      heSoQuyDoi: v.heSoQuyDoi ? Number(v.heSoQuyDoi) : undefined,
      giaBan: v.giaBan ? Number(v.giaBan) : undefined,
      tonMin: v.tonMin ? Number(v.tonMin) : undefined,
      tonMax: v.tonMax ? Number(v.tonMax) : undefined,
      moTa: v.moTa?.trim() || undefined,
      anh,
    });

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted mb-2">Ảnh SKU</Text>
            <ImagePickerRow
              images={anh}
              onChange={setAnh}
              maxCount={MAX_ANH_PER_SKU}
              showRepresentativeBadge
            />
          </View>

          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Controller
              control={control}
              name="ten"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Tên vật tư *"
                  placeholder="Phân Ure 46%"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.ten?.message}
                />
              )}
            />

            <Text className="text-caption text-ink-muted mb-1">Loại *</Text>
            <View className="flex-row flex-wrap mb-3">
              {(loaiQuery.data ?? []).map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => setValue('loaiId', l.id, { shouldValidate: true })}
                  className={`rounded-input mr-2 mb-1 px-3 py-1.5 border ${
                    loaiId === l.id
                      ? 'bg-primary border-primary'
                      : 'bg-white border-border'
                  }`}
                >
                  <Text
                    className={`text-caption font-semibold ${
                      loaiId === l.id ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {l.ten}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.loaiId ? (
              <Text className="text-small text-red-600 mb-2">{errors.loaiId.message}</Text>
            ) : null}

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="donViCoBan"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Đơn vị cơ bản *"
                      placeholder="kg / chai / cái"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.donViCoBan?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="donViLon"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Đơn vị lớn"
                      placeholder="bao / thùng"
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="heSoQuyDoi"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Hệ số quy đổi (đơn vị lớn → cơ bản)"
                  placeholder="50"
                  keyboardType="numeric"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.heSoQuyDoi?.message}
                />
              )}
            />

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="giaBan"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Giá bán"
                      placeholder="18000"
                      keyboardType="numeric"
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="tonMin"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Định mức tồn min"
                      placeholder="100"
                      keyboardType="numeric"
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="tonMax"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Định mức tồn max"
                  placeholder="Bỏ trống nếu không giới hạn"
                  keyboardType="numeric"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
          </View>

          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Controller
              control={control}
              name="moTa"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mô tả (tuỳ chọn)"
                  placeholder="Hoạt chất / cách sử dụng / bảo quản..."
                  multiline
                  numberOfLines={6}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
          </View>

          <Button
            label="Tạo vật tư"
            loading={createMutation.isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <View className="rounded-card bg-blue-50 border border-blue-200 p-3 mt-4 flex-row">
            <Ionicons name="information-circle-outline" size={18} color="#1e40af" />
            <Text className="text-small text-blue-800 ml-2 flex-1">
              Mã QR hệ thống sẽ được sinh tự động cho SKU mới (không xoá được — bảo vệ tem đã in).
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
