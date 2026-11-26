import { createAdminClient } from '@/lib/supabase/admin';

export async function recordAudit(params: {
  userId?: string | null;
  action: string;
  subjectType?: string | null;
  subjectId?: number | null;
  label?: string | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('audit_logs').insert({
      user_id: params.userId ?? null,
      action: params.action,
      subject_type: params.subjectType ?? null,
      subject_id: params.subjectId ?? null,
      label: params.label ? params.label.slice(0, 190) : null,
      meta: params.meta ?? null,
      ip: params.ip ?? null,
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
