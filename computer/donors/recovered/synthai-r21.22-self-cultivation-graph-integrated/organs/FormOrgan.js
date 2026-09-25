/**
 * FormOrgan — drives BrowserFormState with consent gates on sensitive fields.
 * Inspect → draft → approve → confirm. Never auto-submits high-sensitivity fields.
 */
import { BrowserFormState } from '../vendor/ato-core/src/browser-form.mjs';

export class FormOrgan {
  constructor() {
    this.id = 'forms';
    this.capabilities = ['forms', 'applications', 'draft', 'consent', 'browser-form'];
    this.state = new BrowserFormState();
  }

  accepts(intent) {
    return /\b(form|application|apply|fill out|draft|submit|signup|register|enrollment)\b/i.test(intent);
  }

  async execute({ intent, address, mode = 'complement', profile = {} } = {}) {
    const text = String(intent || '');
    // Demo/inspect a generic application form the user can approve against
    const formId = 'generic-application';
    if (!this.state.forms.has(formId)) {
      this.state.inspectPage({
        url: 'local://synthia-form-surface',
        title: 'Synthia application surface',
        forms: []
      });
      this.state.inspectForm({
        id: formId,
        action: 'local://submit-preview',
        method: 'POST',
        official: false,
        fields: [
          { name: 'full_name', label: 'Full name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'purpose', label: 'Purpose / intent', type: 'textarea', required: true },
          { name: 'gate', label: 'Primary gate (optional)', type: 'number', required: false },
          { name: 'password', label: 'Password', type: 'password', required: false, sensitivity: 'high' }
        ]
      });
    }

    const values = {
      full_name: profile.name || '',
      email: profile.email || null,
      purpose: text.slice(0, 280) || 'Open application via Synthia',
      gate: address?.gate ?? address?.canonical?.gate ?? null
    };

    const draft = this.state.createDraft(formId, values, {
      sources: {
        full_name: { kind: 'profile' },
        purpose: { kind: 'intent' },
        gate: { kind: 'address' }
      }
    });

    // Auto-approve only non-sensitive resolved fields
    const safeNames = draft.entries
      .filter(e => e.status === 'resolved' && e.sensitivity !== 'high' && e.value != null)
      .map(e => e.name);
    if (safeNames.length) {
      this.state.approveFields(draft.id, safeNames, { actor: 'synthia-soft-approve' });
    }

    const snap = this.state.snapshot();
    const unresolved = draft.entries.filter(e => e.status === 'unresolved' || e.sensitivity === 'high');

    return {
      ok: true,
      organ: this.id,
      text: unresolved.length
        ? `Draft ${draft.id} ready. ${safeNames.length} fields soft-approved. ` +
          `${unresolved.length} field(s) still need your confirmation (including any sensitive ones). ` +
          `I will not submit high-sensitivity fields without explicit approval.`
        : `Draft ${draft.id} fully resolved and soft-approved. Ready for your confirm step before any submit.`,
      draft,
      unresolved: unresolved.map(e => ({ name: e.name, sensitivity: e.sensitivity, status: e.status })),
      page: snap.page,
      address,
      mode,
      consent: true
    };
  }
}

export default FormOrgan;
