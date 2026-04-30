import { restRequest } from '../lib/supabase';

export const listCustomers = async () => {
  const rows = await restRequest('/profiles?select=*&role=eq.customer&order=created_at.desc', {
    headers: { Prefer: '' },
  });

  return rows.map(row => ({
    id: row.id,
    email: row.email,
    username: row.username || '',
    phone: row.phone || '',
    role: row.role,
    emailConfirmed: Boolean(row.email_confirmed_at),
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : '',
  }));
};
