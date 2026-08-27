import { invoke } from '@tauri-apps/api/tauri';
import type { LicenseStatus, IntegrityStatus } from '../types';

export const licenseApi = {
  getHardwareId: (): Promise<string> => invoke<string>('get_hardware_id'),
  getLicenseStatus: (): Promise<LicenseStatus> => invoke<LicenseStatus>('get_license_status'),
  activateLicenseKey: (key: string, company?: string): Promise<LicenseStatus> =>
    invoke<LicenseStatus>('activate_license_key', { key, company }),
  deactivateLicense: (): Promise<void> => invoke<void>('deactivate_license'),
  generateLicenseKeyAdmin: (tier: string, hwid: string): Promise<string> =>
    invoke<string>('generate_license_key_admin', { tier, hwid }),
  verifyAppIntegrity: (activeLicenseKey?: string): Promise<IntegrityStatus> =>
    invoke<IntegrityStatus>('verify_app_integrity', { activeLicenseKey }),
};
