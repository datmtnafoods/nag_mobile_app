import { create } from 'zustand';

type KhoPickerState = {
  khoDangChon?: string;
  setKho: (id: string | undefined) => void;
};

/** Global kho picker — sync giữa Home Vật tư + Tồn kho + prefilled cho wizard. */
export const useKhoPicker = create<KhoPickerState>((set) => ({
  khoDangChon: undefined,
  setKho: (id) => set({ khoDangChon: id }),
}));
