'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { hasPerm } from '@/lib/rbac';
import { accessibleWorkspaces, navActive, workspaceById, type WorkspaceId } from '@/lib/workspaces';
import { ProfileMenu } from '@/components/profile-menu';
import { useSession } from '@/components/session-provider';
import { ConsoleFooter } from '@/components/dashboard-ui';
import { ConsoleSearch } from '@/components/console-search';
import { Icon } from '@/components/icons';
import { BrandMark } from '@/components/brand-logo';
import { BRAND } from '@motive-fashion/config';

const COLLAPSE_KEY = 'mf_sidebar_collapsed';

function isTillPath(pathname: string) {
  return pathname === '/staff/pos' || pathname === '/admin/pos';
}

function MenuGlyph({ mobileOpen }: { mobileOpen: boolean }) {
  return <Icon name={mobileOpen ? 'close' : 'menu'} className="h-4 w-4" />;
}

export function DashboardShell({
  workspace,
  children,
}: {
  workspace: WorkspaceId;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { me } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ws = workspaceById(workspace);
  const workspaces = useMemo(() => accessibleWorkspaces(me), [me]);

  const visibleLinks = useMemo(
    () => ws.nav.filter((item) => !item.perm || hasPerm(me, item.perm)),
    [me, ws.nav],
  );

  const sections = useMemo(() => {
    const names = [...new Set(visibleLinks.map((l) => l.section))];
    return names.map((name) => ({ name, items: visibleLinks.filter((l) => l.section === name) }));
  }, [visibleLinks]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  function persistCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  function toggleNav() {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      persistCollapsed(!collapsed);
      return;
    }
    setMobileOpen((open) => !open);
  }

  const current = visibleLinks.find((item) => navActive(pathname, item));
  const narrow = collapsed;
  const till = isTillPath(pathname);

  return (
    <div data-theme={workspace} className="flex h-dvh overflow-hidden bg-surface print:h-auto print:overflow-visible">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-primary/40 transition-opacity duration-300 print:hidden md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-fg print:hidden transition-[transform,width] duration-300 ease-in-out md:relative md:inset-auto md:h-full md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${narrow ? 'md:w-16' : 'md:w-64'}`}
      >
        <div className={`flex shrink-0 items-center border-b border-sidebar-fg/10 ${narrow ? 'justify-center px-2 py-4' : 'gap-2.5 px-4 py-4'}`}>
          <Link
            href="/"
            className={`flex min-w-0 items-center text-sidebar-fg no-underline ${narrow ? 'justify-center' : 'gap-2.5'}`}
            aria-label={`${BRAND.name} storefront`}
            title={`${BRAND.name} storefront`}
          >
            <BrandMark className="h-8 w-8 shrink-0" />
            {narrow ? (
              <span className="sr-only">
                {BRAND.name} storefront
              </span>
            ) : (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium tracking-[0.02em]">{BRAND.name}</span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-accent">{ws.label}</span>
              </span>
            )}
          </Link>
        </div>

        <nav className="sidebar-nav min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2">
          {workspace !== 'customer' && workspaces.length > 1 ? (
            <div className="mb-3">
              {narrow ? null : (
                <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-fg/45">Workspaces</p>
              )}
              <ul className="space-y-0.5">
                {workspaces.map((item) => {
                  const active = item.id === workspace;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        title={`${item.label} · ${item.eyebrow}`}
                        className={`flex min-h-11 items-center gap-3 rounded-md text-sm no-underline transition-colors duration-200 ${narrow ? 'justify-center px-0' : 'px-2.5'} ${active ? 'bg-sidebar-fg/15 text-sidebar-fg' : 'text-sidebar-fg/65 hover:bg-sidebar-fg/10 hover:text-sidebar-fg'}`}
                      >
                        <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                        {narrow ? (
                          <span className="sr-only">{item.label}</span>
                        ) : (
                          <span className="min-w-0">
                            <span className="block truncate">{item.label}</span>
                            <span className="block truncate text-[11px] text-sidebar-fg/45">{item.eyebrow}</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {sections.map((section) => (
            <div key={section.name} className="mb-2 last:mb-0">
              {narrow ? null : (
                <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-fg/45">{section.name}</p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = navActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={`flex min-h-11 items-center gap-3 rounded-md text-sm no-underline transition-colors duration-200 ${narrow ? 'justify-center px-0' : 'px-2.5'} ${active ? 'bg-sidebar-fg/15 text-sidebar-fg' : 'text-sidebar-fg/65 hover:bg-sidebar-fg/10 hover:text-sidebar-fg'}`}
                      >
                        <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                        {narrow ? <span className="sr-only">{item.label}</span> : item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col print:overflow-visible">
        <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-ink/10 bg-white px-3 py-3 print:hidden md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/15 bg-white"
              aria-label={mobileOpen || !narrow ? 'Hide navigation' : 'Show navigation'}
              aria-expanded={mobileOpen || !narrow}
              onClick={toggleNav}
            >
              <MenuGlyph mobileOpen={mobileOpen} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-ink/45">
                {ws.label} · {ws.eyebrow}
              </p>
              <p className="truncate text-sm font-medium">{current?.label ?? ws.label}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-3">
            {workspace === 'customer' || till ? null : <ConsoleSearch />}
            <ProfileMenu variant="console" currentWorkspace={workspace} />
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:h-auto print:overflow-visible">
          <div
            className={
              till
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4'
                : 'flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 print:overflow-visible md:px-8'
            }
          >
            {children}
          </div>
          {till ? null : (
            <div className="print:hidden">
              <ConsoleFooter />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
