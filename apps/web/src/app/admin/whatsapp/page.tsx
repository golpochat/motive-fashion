'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  IconButton,
  JobCard,
  Modal,
  Panel,
  PrimaryButton,
  RowActions,
  SecondaryButton,
  Td,
  fieldClass,
} from '@/components/dashboard-ui';

type SessionRow = {
  id: string;
  waId: string;
  state: string;
  lastMessage: string | null;
  updatedAt: string;
  messages: { id: string; body: string; createdAt: string }[];
};

type Inbox = { optedIn: number; sessions: SessionRow[] };

export default function AdminWhatsapp() {
  const { data, error: loadError, loading, reload } = useConsoleQuery<Inbox>(
    '/admin/whatsapp/sessions',
    'Could not load WhatsApp threads',
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [open, setOpen] = useState<SessionRow | null>(null);
  const sessions = data?.sessions ?? [];
  const optedIn = data?.optedIn ?? 0;

  async function send() {
    setError('');
    setNotice('');
    setBusy(true);
    const res = await fetch(`${API}/admin/whatsapp/broadcast`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: draft }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Broadcast failed. Admin only, and the number must be opted in.'));
      return;
    }
    const sent = typeof payload?.sent === 'number' ? payload.sent : optedIn;
    setNotice(`Queued to ${sent} opted-in number${sent === 1 ? '' : 's'}.`);
    setDraft('');
    setConfirm(false);
    reload();
  }

  return (
    <div>
      <PageHeader title="WhatsApp" description="Threads and broadcasts. Customers pick size and colour, then collection or Ireland delivery." />
      {loadError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <h2 className="mb-3 font-serif text-2xl [[data-theme=admin]_&]:font-sans">Inbox</h2>
          {loading && !data ? <p className="text-sm text-ink/70">Loading threads…</p> : null}
          {!loading && sessions.length === 0 ? (
            <p className="text-sm text-ink/70">No sessions yet. Customers who write to the shop number appear here.</p>
          ) : sessions.length ? (
            <DataTable
              headers={['Number', 'State', 'Last message', 'Updated', 'Action']}
              cards={sessions.map((row) => {
                const last = row.messages[0];
                return (
                  <JobCard
                    key={row.id}
                    title={row.waId}
                    meta={`${row.state} · ${new Date(row.updatedAt).toLocaleString('en-IE', { hour12: false })}`}
                    actions={
                      <RowActions>
                        <IconButton label="View thread" icon="open" onClick={() => setOpen(row)} />
                      </RowActions>
                    }
                  >
                    <p className="mt-2 text-sm">{last?.body ?? row.lastMessage ?? 'No outbound yet.'}</p>
                  </JobCard>
                );
              })}
            >
              {sessions.map((row) => {
                const last = row.messages[0];
                return (
                  <tr key={row.id} className="hover:bg-ink/5">
                    <Td>
                      <span className="font-mono text-xs">{row.waId}</span>
                    </Td>
                    <Td muted>{row.state}</Td>
                    <Td>{last?.body ?? row.lastMessage ?? 'No outbound yet.'}</Td>
                    <Td muted>{new Date(row.updatedAt).toLocaleString('en-IE', { hour12: false })}</Td>
                    <Td nowrap>
                      <RowActions>
                        <IconButton label="View thread" icon="open" onClick={() => setOpen(row)} />
                      </RowActions>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          ) : null}
        </section>
        <div>
          <Panel title="Broadcast">
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                setConfirm(true);
              }}
              className="space-y-3"
            >
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="text-sm text-moss" role="status">
                  {notice}
                </p>
              ) : null}
              <Field label="Message" hint={`${optedIn} opted-in number${optedIn === 1 ? '' : 's'}.`}>
                <textarea
                  required
                  className={fieldClass}
                  rows={5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </Field>
              <PrimaryButton type="submit" disabled={busy || !draft.trim()}>
                Review broadcast
              </PrimaryButton>
            </form>
          </Panel>
        </div>
      </div>
      {confirm ? (
        <Modal title="Send this broadcast?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-ink/70">
            This goes to {optedIn} opted-in number{optedIn === 1 ? '' : 's'} only. People who have not opted in are skipped.
          </p>
          <p className="mt-3 rounded-xl border border-ink/10 bg-ink/5 p-3 text-sm">{draft}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PrimaryButton type="button" disabled={busy} onClick={() => void send()}>
              {busy ? 'Sending…' : `Send to ${optedIn}`}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setConfirm(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
      {open ? (
        <Modal title={open.waId} onClose={() => setOpen(null)} wide>
          <p className="text-sm text-ink/70">
            {open.state} · {new Date(open.updatedAt).toLocaleString('en-IE', { hour12: false })}
          </p>
          {open.messages.length === 0 && !open.lastMessage ? (
            <p className="mt-3 text-sm text-ink/70">No messages on this thread yet.</p>
          ) : (
            <DataTable headers={['When', 'Message']}>
              {(open.messages.length ? open.messages : [{ id: 'last', body: open.lastMessage ?? '', createdAt: open.updatedAt }]).map(
                (message) => (
                  <tr key={message.id} className="hover:bg-ink/5">
                    <Td muted>{new Date(message.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
                    <Td>{message.body}</Td>
                  </tr>
                ),
              )}
            </DataTable>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
