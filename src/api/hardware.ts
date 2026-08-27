import { invoke } from '@tauri-apps/api/tauri';
import type { HardwareSpecs } from '../types';

export const hardwareApi = {
  getHardwareSpecs: (): Promise<HardwareSpecs> =>
    invoke<HardwareSpecs>('get_hardware_specs'),
};
