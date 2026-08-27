import { call } from './_core';
import type { EnterprisePolicy } from '../types';

export const policyApi = {
  getEnterprisePolicy: (): Promise<EnterprisePolicy> => call<EnterprisePolicy>('get_enterprise_policy'),
};
