use crate::generation_controller::GenerationController;
use crate::AppState;

#[tauri::command]
pub fn cancel_generation(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.generation_controller.request_cancel();
    Ok(())
}
