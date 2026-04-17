// Admin emails that can see and use the /admin area.
// Keep in sync with supabase/migrations/009_admin_series_policies.sql
export const ADMIN_EMAILS = [
  "coolshale@gmail.com",
  "justiniloulian@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
