# Blender MCP Guidelines

When working with Blender (`/Applications/Blender.app`) or `blender-mcp`:
- **Check Live vs Headless First**: Use `blender_status` to check if the user has an open Blender session listening on `127.0.0.1:9876`. If live-connected, use the live viewport tools (`blender_get_scene_info`, `blender_create_object`, `blender_execute_code`, `blender_capture_viewport`, etc.). If Blender is not open or the server is not started, either use `blender_run_headless` or remind the user they can click **Start MCP Server** in `View3D > Sidebar (N) > BlenderMCP`.
- **Blender 5.x API Compatibility**: Use Blender 4.x/5.x Principled BSDF socket names (`Base Color`, `Metallic`, `Roughness`, `Transmission Weight`, `Emission Color`, `Emission Strength`, `Coat Weight`) and `'BLENDER_EEVEE'` / `'CYCLES'` engine identifiers.
- **Visual Verification**: When modifying or lighting a 3D scene, capture a render or viewport screenshot to `/Users/admin/Downloads` and inspect it with `view_file` to verify framing, lighting, and materials.
