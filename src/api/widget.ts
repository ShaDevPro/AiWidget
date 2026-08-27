import { invoke } from '@tauri-apps/api/tauri';

export const widgetApi = {
  widgetTogglePin: (): Promise<boolean> => invoke<boolean>('widget_toggle_pin'),
  widgetSetPin: (pinned: boolean): Promise<void> => invoke<void>('widget_set_pin', { pinned }),
  widgetMinimize: (): Promise<void> => invoke<void>('widget_minimize'),
  widgetMaximize: (): Promise<void> => invoke<void>('widget_maximize'),
  widgetClose: (): Promise<void> => invoke<void>('widget_close'),
  widgetResize: (w: number, h: number): Promise<void> => invoke<void>('widget_resize', { width: w, height: h }),
  widgetStartDrag: (): Promise<void> => invoke<void>('widget_start_drag'),
  widgetCenter: (): Promise<void> => invoke<void>('widget_center'),
};
