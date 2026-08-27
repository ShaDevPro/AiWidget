use crate::AppState;

#[tauri::command]
pub fn widget_toggle_pin(state: tauri::State<AppState>, window: tauri::Window) -> Result<bool, String> {
    let mut pinned = state.is_pinned.lock().map_err(|e| e.to_string())?;
    let new_val = !*pinned;
    window.set_always_on_top(new_val).map_err(|e| e.to_string())?;
    *pinned = new_val;
    Ok(new_val)
}

#[tauri::command]
pub fn widget_set_pin(state: tauri::State<AppState>, window: tauri::Window, pinned: bool) -> Result<(), String> {
    let mut current = state.is_pinned.lock().map_err(|e| e.to_string())?;
    window.set_always_on_top(pinned).map_err(|e| e.to_string())?;
    *current = pinned;
    Ok(())
}

#[tauri::command]
pub fn widget_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn widget_maximize(window: tauri::Window) -> Result<(), String> {
    match window.is_maximized().map_err(|e| e.to_string())? {
        true => window.unmaximize().map_err(|e| e.to_string())?,
        false => window.maximize().map_err(|e| e.to_string())?,
    };
    Ok(())
}

#[tauri::command]
pub fn widget_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn widget_resize(window: tauri::Window, width: u32, height: u32) -> Result<(), String> {
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: width as f64,
            height: height as f64,
        }))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn widget_start_drag(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn widget_center(window: tauri::Window) -> Result<(), String> {
    window.center().map_err(|e| e.to_string())
}
