import { client, MOCK_API } from '../client';

export type BatchLookupInput = {
  code: string;
  sr: string;
  t?: string;
};

export type BatchInfo = {
  code: string;
  sr: string;
  productName: string;
  variety?: string;
  packageSize?: string;
  producedAt?: string;
  expiredAt?: string;
  status: 'available' | 'activated' | 'invalid';
  activatedAt?: string;
  activatedBy?: string;
};

export type ActivationInput = {
  code: string;
  sr: string;
  t?: string;
  farmerName: string;
  farmerPhone: string;
  gpsLat?: number;
  gpsLng?: number;
  notes?: string;
};

export type ActivationResult = {
  activationId: string;
  activatedAt: string;
  batch: BatchInfo;
};

const MOCK_DELAY = 500;

async function mockGetBatchInfo({ code, sr }: BatchLookupInput): Promise<BatchInfo> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  if (code.toLowerCase() === 'invalid') {
    return { code, sr, productName: '', status: 'invalid' };
  }
  return {
    code,
    sr,
    productName: 'Hạt giống NaSeeds ' + code.slice(0, 6).toUpperCase(),
    variety: 'Bí đao NAG-01',
    packageSize: '10 gram',
    producedAt: '2026-06-01',
    expiredAt: '2028-06-01',
    status: 'available',
  };
}

async function mockActivate(input: ActivationInput): Promise<ActivationResult> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY + 300));
  return {
    activationId: 'act_mock_' + Math.floor(Math.random() * 1_000_000).toString(36),
    activatedAt: new Date().toISOString(),
    batch: {
      code: input.code,
      sr: input.sr,
      productName: 'Hạt giống NaSeeds ' + input.code.slice(0, 6).toUpperCase(),
      variety: 'Bí đao NAG-01',
      packageSize: '10 gram',
      status: 'activated',
      activatedAt: new Date().toISOString(),
      activatedBy: input.farmerName,
    },
  };
}

export async function getBatchInfo(input: BatchLookupInput): Promise<BatchInfo> {
  if (MOCK_API) return mockGetBatchInfo(input);
  const { data } = await client.post<BatchInfo>('/batches/info', input);
  return data;
}

export async function activate(input: ActivationInput): Promise<ActivationResult> {
  if (MOCK_API) return mockActivate(input);
  const { data } = await client.post<ActivationResult>('/activations', input);
  return data;
}
