'use client';

import { useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { Field, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';

export function StaffOrderActions({
  orderId,
  email,
  paymentMethod,
  remainingCents,
  onDone,
}: {
  orderId: string;
  email?: string | null;
  paymentMethod?: string;
  remainingCents?: number;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState<'print' | 'email' | 'refund' | ''>('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [to, setTo] = useState(email ?? '');
  const [refundEur, setRefundEur] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const cash = paymentMethod === 'CASH';
  const canRefund = typeof remainingCents === 'number' && remainingCents > 0;

  async function reprint() {
    setError('');
    setNote('');
    setBusy('print');
    const res = await fetch(`${API}/staff/orders/${orderId}/print`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const payload = (await res.json()) as { message?: string; printed?: boolean; error?: string };
    setBusy('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not reprint this ticket'));
      return;
    }
    setNote(payload.printed ? 'Ticket sent to the till printer.' : payload.error || 'Printer did not accept the ticket.');
  }

  async function sendEmail() {
    setError('');
    setNote('');
    setBusy('email');
    const res = await fetch(`${API}/staff/orders/${orderId}/email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: to.trim() || undefined }),
    });
    const payload = (await res.json()) as { message?: string; sent?: boolean; email?: string; skipped?: boolean };
    setBusy('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not email this receipt'));
      return;
    }
    setEmailOpen(false);
    if (payload.skipped) {
      setNote('Mail is not configured on this till. Receipt was not sent.');
      return;
    }
    setNote(`Receipt emailed to ${payload.email}.`);
  }

  async function refund() {
    setError('');
    setNote('');
    const amountCents = Math.round(Number(refundEur) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      setError('Enter a refund amount');
      return;
    }
    setBusy('refund');
    const res = await fetch(`${API}/staff/orders/${orderId}/refund`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents, reason: refundReason.trim() }),
    });
    const payload = await res.json().catch(() => null);
    setBusy('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not refund this sale'));
      return;
    }
    setRefundOpen(false);
    setNote(
      cash
        ? `Cash refund ${formatEur(amountCents)} — hand the notes back. Recorded under Admin → Refunds.`
        : `Card refund ${formatEur(amountCents)} sent to Stripe.`,
    );
    onDone?.();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <SecondaryButton type="button" disabled={Boolean(busy)} onClick={() => void reprint()}>
          {busy === 'print' ? 'Printing…' : 'Reprint'}
        </SecondaryButton>
        <SecondaryButton
          type="button"
          disabled={Boolean(busy)}
          onClick={() => {
            setTo(email ?? '');
            setEmailOpen(true);
          }}
        >
          Email receipt
        </SecondaryButton>
        {canRefund ? (
          <SecondaryButton
            type="button"
            disabled={Boolean(busy)}
            onClick={() => {
              setRefundEur(((remainingCents ?? 0) / 100).toFixed(2));
              setRefundReason('');
              setRefundOpen(true);
            }}
          >
            {cash ? 'Refund cash' : 'Refund card'}
          </SecondaryButton>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {note ? <p className="text-xs text-ink/55">{note}</p> : null}
      {emailOpen ? (
        <Modal title="Email receipt" onClose={() => setEmailOpen(false)}>
          <Field label="Customer email">
            <input
              className={fieldClass}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@email.com"
              autoComplete="email"
            />
          </Field>
          <div className="mt-4 flex gap-2">
            <PrimaryButton type="button" disabled={busy === 'email' || to.trim().length < 5} onClick={() => void sendEmail()}>
              {busy === 'email' ? 'Sending…' : 'Send'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setEmailOpen(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
      {refundOpen ? (
        <Modal title={cash ? 'Refund cash' : 'Refund card'} onClose={() => setRefundOpen(false)}>
          <p className="mb-3 text-sm text-ink/70">
            {cash
              ? 'Hand this amount back from the drawer. Stripe will not show cash refunds — they are listed under Admin → Refunds.'
              : 'This posts a refund to Stripe on the original card. It will appear in the Stripe log as POST /v1/refunds.'}
          </p>
          <Field label="Amount EUR">
            <input
              className={fieldClass}
              value={refundEur}
              onChange={(e) => setRefundEur(e.target.value)}
              inputMode="decimal"
            />
          </Field>
          <Field label="Reason">
            <input
              className={fieldClass}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </Field>
          <div className="mt-4 flex gap-2">
            <PrimaryButton
              type="button"
              disabled={busy === 'refund' || refundReason.trim().length < 3}
              onClick={() => void refund()}
            >
              {busy === 'refund' ? 'Refunding…' : cash ? 'Refund cash' : 'Refund card'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setRefundOpen(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
