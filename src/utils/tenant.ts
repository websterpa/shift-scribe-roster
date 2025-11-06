// Tenant utility for single-tenant installations
// In a multi-tenant setup, this would retrieve from auth context

export function getTenantId(): string {
  // Hardcoded for single-tenant deployment
  return '00000000-0000-0000-0000-000000000001';
}
