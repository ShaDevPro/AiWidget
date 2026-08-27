import { call } from './_core';
import type { UserQuota } from '../types';

export const quotaApi = {
  getUserQuota: (): Promise<UserQuota> =>
    call<UserQuota>('get_user_quota'),
  setUserQuotaLimit: (limit: number): Promise<void> =>
    call<void>('set_user_quota_limit', { limit }),
};
