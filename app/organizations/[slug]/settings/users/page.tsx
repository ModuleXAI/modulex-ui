"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MoreHorizontal } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import * as React from 'react'

type UsersResponse = {
  success: boolean
  organization_id: string
  users: Array<{
    id: string
    email: string | null
    username: string | null
    avatar: string | null
    role: 'owner' | 'admin' | 'member'
    is_active: boolean
    created_at: string
    updated_at?: string | null
    last_active_at?: string | null
    tool_count?: number
    active_tool_count?: number
    total_logins?: number
    period_credit_used?: number
    is_invitation?: boolean
    invitation_id?: string | null
    invitation_status?: string | null
    invitation_expires_at?: string | null
    invited_user_id?: string | null
    invited_at?: string | null
  }>
  invitation_count?: number
  max_seats?: number
  top_member?: any
  total: number
  total_pages: number
  current_page: number
  limit: number
  has_next: boolean
  has_previous: boolean
}

function getSelectedOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem('modulex_selected_organization')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string }
    return parsed?.id ?? null
  } catch {
    return null
  }
}

export default function Page() {
  const router = useRouter()
  const params = useParams<{ slug?: string }>()
  const slug = params?.slug ?? ''
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(10)
  const [query, setQuery] = React.useState('')
  const [resp, setResp] = React.useState<UsersResponse | null>(null)
  const [menuOpenFor, setMenuOpenFor] = React.useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = React.useState<{ left: number; top: number } | null>(null)
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<'member' | 'admin'>('member')
  const [inviteMessage, setInviteMessage] = React.useState('')
  const [inviting, setInviting] = React.useState(false)

  const inviteLabel = React.useMemo(() => {
    if (!resp || typeof resp.total !== 'number' || typeof resp.max_seats !== 'number') return '+Invite User'
    return resp.total < resp.max_seats ? '+Invite User' : '+ Invite User (Upgrade Required)'
  }, [resp])

  const upgradeRequired = React.useMemo(() => {
    if (!resp || typeof resp.total !== 'number' || typeof resp.max_seats !== 'number') return false
    return resp.total >= resp.max_seats
  }, [resp])

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (!target) return
      const inMenu = target.closest('[data-user-actions-menu]')
      const inTrigger = target.closest('[data-user-actions-trigger]')
      if (!inMenu && !inTrigger) {
        setMenuOpenFor(null)
        setMenuAnchor(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const qs = new URLSearchParams()
      qs.set('page', String(page))
      qs.set('limit', String(limit))
      if (orgId) qs.set('organization_id', orgId)
      qs.set('status', 'active')
      const res = await fetch(`/api/users?${qs.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const json = (await res.json()) as UsersResponse
      setResp(json)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  async function handleInvitationAction(invitationId: string, action: 'cancel' | 'reinvite') {
    try {
      setMenuOpenFor(null)
      const orgId = getSelectedOrganizationId()
      const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : ''
      const res = await fetch(`/api/invitations/${encodeURIComponent(invitationId)}/${action}${qs}`, { method: 'POST' })
      if (!res.ok) {
        // Silently fail for now; can add toast if project uses it here
        return
      }
      await fetchUsers()
    } catch {}
  }

  async function handleUserRole(userId: string, makeAdmin: boolean) {
    try {
      setMenuOpenFor(null)
      const orgId = getSelectedOrganizationId()
      if (!orgId) return
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/role?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: makeAdmin ? 'admin' : 'member' })
      })
      if (res.ok) await fetchUsers()
    } catch {}
  }

  async function handleUserRemove(userId: string) {
    try {
      setMenuOpenFor(null)
      const orgId = getSelectedOrganizationId()
      if (!orgId) return
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}?organization_id=${encodeURIComponent(orgId)}`, { method: 'DELETE' })
      if (res.ok) await fetchUsers()
    } catch {}
  }

  React.useEffect(() => {
    fetchUsers()
    const onOrgChanged = async () => { setPage(1); await fetchUsers() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchUsers])

  const users = React.useMemo(() => {
    const list = resp?.users ?? []
    if (!query) return list
    const q = query.toLowerCase()
    return list.filter(u => (u.email || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
  }, [resp, query])

  const total = resp?.total ?? 0
  const totalPages = resp?.total_pages ?? 1

  return (
    <div className="pl-3 pr-3 pt-20 pb-3 space-y-6 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-base text-muted-foreground mt-1">Manage members and invitations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => fetchUsers()}>Refresh</Button>
          <Button variant="outline" className={`bg-transparent border border-border ${upgradeRequired ? 'text-foreground' : 'text-[#67E9AB]'} hover:bg-accent`} onClick={() => {
            if (upgradeRequired) {
              router.push(`/organizations/${slug}/settings/settings/billing`)
              return
            }
            setInviteOpen(true)
          }}>{inviteLabel.replace(/^\+\s?/, '')}</Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="w-64">
          <Input placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="text-xs text-muted-foreground">{total} total</div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card text-card-foreground overflow-hidden flex-1 flex flex-col">
          <div className="h-10 border-b"><Skeleton className="h-10 w-full" /></div>
          <div className="flex-1"><Skeleton className="h-full w-full" /></div>
        </div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-sm text-muted-foreground">No users found.</div>
      ) : (
        <div className="rounded-lg border bg-card text-card-foreground overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3 text-xs text-muted-foreground border-b">
            <div className="text-left">User</div>
            <div className="text-left">Role</div>
            <div className="text-left">Status</div>
            <div className="text-left pl-2">Tools</div>
            <div className="text-center">Last Active</div>
            <div className="text-left pl-8">Credit Used</div>
            <div></div>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
            {users.map(u => {
              const statusText = u.is_invitation ? (u.invitation_status || 'pending') : (u.is_active ? 'active' : 'inactive')
              const roleColor = (u.role || '').toLowerCase() === 'owner' ? 'text-amber-600 dark:text-amber-300' : (u.role || '').toLowerCase() === 'admin' ? 'text-blue-600 dark:text-blue-300' : 'text-foreground/80'
              const isOwner = (u.role || '').toLowerCase() === 'owner'
              return (
                <div key={u.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_40px] items-center gap-4 px-4 py-3 relative">
                  <div className="min-w-0 text-left">
                    <div className="text-sm text-foreground truncate">{u.email || u.username || '-'}</div>
                    {u.is_invitation ? (
                      <div className="text-xs text-muted-foreground truncate">Invitation • Expires {u.invitation_expires_at ? new Date(u.invitation_expires_at).toLocaleDateString() : '-'}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground truncate">Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</div>
                    )}
                  </div>
                  <div className="text-left text-xs">
                    <span className={`px-2 py-1 rounded border border-border uppercase ${roleColor}`}>{u.role ?? '-'}</span>
                  </div>
                  <div className="text-left text-xs">
                    <span className={`px-2 py-1 rounded border border-border ${statusText==='active' ? 'text-green-600 dark:text-green-400' : statusText==='inactive' ? 'text-yellow-600 dark:text-yellow-300' : 'text-blue-600 dark:text-blue-400'}`}>{statusText}</span>
                  </div>
                  <div className="text-left pl-2 text-sm text-foreground font-mono tabular-nums">{typeof u.tool_count === 'number' ? u.tool_count : 0}</div>
                  <div className="text-center text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">{u.last_active_at ? new Date(u.last_active_at).toLocaleString() : '-'}</div>
                  <div className="text-left pl-12 text-sm text-foreground font-mono tabular-nums">{typeof u.period_credit_used === 'number' ? u.period_credit_used : 0}</div>
                  <div className="flex justify-end relative">
                    {!isOwner ? (
                      <button data-user-actions-trigger aria-label="More actions" className="p-1 rounded hover:bg-accent" onClick={(e) => {
                        e.stopPropagation()
                        const el = e.currentTarget as HTMLElement
                        const rect = el.getBoundingClientRect()
                        const menuWidth = 176
                        const estimatedMenuHeight = 140
                        const offsetY = 10
                        const spaceBelow = window.innerHeight - rect.bottom
                        const top = spaceBelow < estimatedMenuHeight
                          ? Math.max(8, rect.top - offsetY - estimatedMenuHeight)
                          : Math.min(window.innerHeight - 8 - estimatedMenuHeight, rect.bottom - Math.max(0, offsetY - 2))
                        const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - 8 - menuWidth))
                        setMenuAnchor({ left, top })
                        setMenuOpenFor(curr => curr === u.id ? null : u.id)
                      }}>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        </div>
      )}

      {menuOpenFor ? (
        (() => {
          const current = (users || []).find(x => x.id === menuOpenFor)
          if (!current || !menuAnchor) return null
          const isPending = !!current.is_invitation && (current.invitation_status || '') === 'pending'
          const isAdmin = (current.role || '').toLowerCase() === 'admin'
          return (
            <div data-user-actions-menu className="fixed z-50 w-44 rounded-md border bg-popover text-popover-foreground shadow-lg" style={{ left: `${menuAnchor.left}px`, top: `${menuAnchor.top}px` }}>
              {isPending ? (
                <div className="py-1 text-sm">
                  <button className="w-full text-left px-3 py-2 hover:bg-accent text-destructive" onClick={() => handleInvitationAction((current.invitation_id || current.id), 'cancel')}>Cancel Invitation</button>
                  <button className="w-full text-left px-3 py-2 hover:bg-accent" onClick={() => handleInvitationAction((current.invitation_id || current.id), 'reinvite')}>Reinvite</button>
                </div>
              ) : (
                <div className="py-1 text-sm">
                  {isAdmin ? (
                    <button className="w-full text-left px-3 py-2 hover:bg-accent" onClick={() => handleUserRole(current.id, false)}>Remove Admin</button>
                  ) : (
                    <button className="w-full text-left px-3 py-2 hover:bg-accent" onClick={() => handleUserRole(current.id, true)}>Make Admin</button>
                  )}
                  <button className="w-full text-left px-3 py-2 hover:bg-accent text-destructive" onClick={() => handleUserRemove(current.id)}>Remove from Organization</button>
                </div>
              )}
            </div>
          )
        })()
      ) : null}

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setInviteOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border bg-background text-foreground p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-base font-semibold">Invite User</h3>
              <p className="text-xs text-muted-foreground mt-1">Send an invitation to join your organization.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <input type="email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Role</label>
                <div className="flex gap-2">
                  {(['member','admin'] as const).map(r => (
                    <button key={r} type="button" className={`px-3 py-2 rounded-md border ${inviteRole===r ? 'border-border text-foreground' : 'border-border text-muted-foreground'} bg-transparent`} onClick={() => setInviteRole(r)}>{r[0].toUpperCase()+r.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Message (optional)</label>
                <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Would you like to join our organization?" value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="outline" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button disabled={inviting || !inviteEmail} className="bg-[#67E9AB] text-black hover:bg-[#58D99C]" onClick={async () => {
                try {
                  setInviting(true)
                  const orgId = getSelectedOrganizationId()
                  const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : ''
                  const res = await fetch(`/api/invitations/invite${qs}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invited_email: inviteEmail, role: inviteRole, invitation_message: inviteMessage || undefined })
                  })
                  if (res.ok) {
                    setInviteOpen(false)
                    setInviteEmail('')
                    setInviteMessage('')
                    setInviteRole('member')
                    await fetchUsers()
                  }
                } finally {
                  setInviting(false)
                }
              }}>{inviting ? 'Inviting...' : 'Send Invite'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}



