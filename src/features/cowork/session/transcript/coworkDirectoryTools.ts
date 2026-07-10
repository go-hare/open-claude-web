export function isCoworkDirectoryToolName(name: string) {
  const normalized = name.replace(/[_-]/g, " ").toLowerCase();
  return normalized.includes("cowork") && normalized.includes("director");
}

export function isCoworkDirectoryPermissionRequest(request: { input: Record<string, unknown>; toolName: string }) {
  return isCoworkDirectoryToolName(request.toolName)
    || typeof request.input.path === "string" && request.toolName.toLowerCase().includes("directory");
}
