'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type User = { username: string; avatar_emoji: string; avatar_color: string; bio: string; status: string; last_ip: string | null; is_banned: boolean; created_at?: string }
type Ban = { id: string; username: string | null; ip_address: string | null; reason: string | null; banned_by: string; created_at: string }
type Report = { id: string; reporter: string; reported: string; message_id: string | null; reason: string | null; status: string; created_at: string }
type Message = { id: string; username: string; content: string | null; msg_type: string; created_at: string; deleted_at: string | null }

const ADMIN_PASSWORD = 'raph2024admin'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [tab, setTab] = useState<'users' | 'bans' | 'messages' | 'reports' | 'stats'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [bans, setBans] = useState<Ban[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [banModal, setBanModal] = useState<User | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banIp, setBanIp] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadAll = async () => {
    setLoading(true)
    const [usersRes, bansRes, reportsRes, msgsRes] = await Promise.all([
      supabase.from('profiles').select('username,avatar_emoji,avatar_color,bio,status,last_ip,is_banned').order('username'),
      supabase.from('bans').select('*').order('created_at', { ascending: false }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('id,username,content,msg_type,created_at,deleted_at').order('created_at', { ascending: false }).limit(200),
    ])
    setUsers(usersRes.data || [])
    setBans(bansRes.data || [])
    setReports(reportsRes.data || [])
    setMessages(msgsRes.data || [])

    // Stats
    const { count: totalMsgs } = await supabase.from('messages').select('*', { count: 'exact', head: true })
    const { count: totalDms } = await supabase.from('dms').select('*', { count: 'exact', head: true })
    const { data: onlineData } = await supabase.from('presence').select('username').eq('is_online', true).gte('last_seen', new Date(Date.now() - 60000).toISOString())
    setStats({ totalUsers: usersRes.data?.length || 0, totalMsgs, totalDms, online: onlineData?.length || 0, totalBans: bansRes.data?.length || 0, pendingReports: reportsRes.data?.filter((r: Report) => r.status === 'pending').length || 0 })
    setLoading(false)
  }

  useEffect(() => { if (authed) loadAll() }, [authed])

  const banUser = async () => {
    if (!banModal) return
    // Bannir par username
    await supabase.from('bans').insert({ username: banModal.username, ip_address: banIp || banModal.last_ip || null, reason: banReason || 'Violation des règles', banned_by: 'raph' })
    // Marquer le profil comme banni
    await supabase.from('profiles').update({ is_banned: true }).eq('username', banModal.username)
    // Supprimer tous ses messages
    await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: '[Message supprimé - Utilisateur banni]' }).eq('username', banModal.username).is('deleted_at', null)
    setBanModal(null); setBanReason(''); setBanIp('')
    showToast(`🚫 ${banModal.username} banni !`)
    loadAll()
  }

  const unbanUser = async (ban: Ban) => {
    await supabase.from('bans').delete().eq('id', ban.id)
    if (ban.username) await supabase.from('profiles').update({ is_banned: false }).eq('username', ban.username)
    showToast(`✅ ${ban.username || ban.ip_address} débanni`)
    loadAll()
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: '[Supprimé par admin]' }).eq('id', id)
    showToast('🗑️ Message supprimé')
    loadAll()
  }

  const resolveReport = async (id: string) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', id)
    showToast('✅ Signalement résolu')
    loadAll()
  }

  const addAdmin = async (username: string) => {
    await supabase.from('admins').insert({ username })
    showToast(`⭐ ${username} est maintenant admin`)
  }

  if (!authed) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d12', fontFamily: 'system-ui' }}>
      <div style={{ background: '#15151d', border: '1px solid rgba(124,106,247,.3)', borderRadius: 20, padding: '40px 36px', width: 360, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 30px 80px rgba(0,0,0,.7)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e4e2f0' }}>Admin Panel</div>
          <div style={{ fontSize: 12, color: '#7a7891', marginTop: 4 }}>Accès restreint</div>
        </div>
        <input
          value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && pass === ADMIN_PASSWORD && setAuthed(true)}
          type="password" placeholder="Mot de passe admin..."
          style={{ background: '#1c1c27', border: '1px solid rgba(124,106,247,.3)', borderRadius: 10, padding: '12px 14px', color: '#e4e2f0', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
        />
        <button onClick={() => pass === ADMIN_PASSWORD ? setAuthed(true) : showToast('❌ Mauvais mot de passe')}
          style={{ background: 'linear-gradient(135deg,#7c6af7,#a78bfa)', color: 'white', border: 'none', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Connexion →
        </button>
        {toast && <div style={{ background: 'rgba(248,113,113,.15)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: '#f87171', textAlign: 'center' }}>{toast}</div>}
      </div>
    </div>
  )

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQ.toLowerCase()))

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d0d12', fontFamily: 'system-ui', color: '#e4e2f0', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <div style={{ width: 220, background: '#15151d', borderRight: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 4 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa' }}>Admin Panel</div>
          <div style={{ fontSize: 10, color: '#7a7891' }}>Chat App</div>
        </div>
        {[
          { id: 'stats', label: '📊 Statistiques' },
          { id: 'users', label: '👥 Utilisateurs' },
          { id: 'bans', label: '🚫 Bans' },
          { id: 'messages', label: '💬 Messages' },
          { id: 'reports', label: '🚨 Signalements', badge: stats?.pendingReports },
        ].map(({ id, label, badge }: any) => (
          <button key={id} onClick={() => setTab(id as any)}
            style={{ padding: '9px 12px', borderRadius: 9, border: 'none', background: tab === id ? 'rgba(124,106,247,.2)' : 'transparent', color: tab === id ? '#a78bfa' : '#7a7891', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === id ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {label}
            {badge > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{badge}</span>}
          </button>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button onClick={loadAll} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(124,106,247,.3)', background: 'transparent', color: '#a78bfa', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
            🔄 Actualiser
          </button>
          <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 11, color: '#7a7891', textDecoration: 'none' }}>← Retour au chat</a>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#7a7891' }}>Chargement...</div>}

        {/* STATS */}
        {tab === 'stats' && stats && (
          <div>
            <h2 style={{ marginBottom: 20, fontSize: 20 }}>📊 Statistiques</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Utilisateurs', value: stats.totalUsers, icon: '👥', color: '#7c6af7' },
                { label: 'En ligne', value: stats.online, icon: '🟢', color: '#34d399' },
                { label: 'Messages', value: stats.totalMsgs, icon: '💬', color: '#60a5fa' },
                { label: 'DMs', value: stats.totalDms, icon: '🔒', color: '#f59e0b' },
                { label: 'Bans actifs', value: stats.totalBans, icon: '🚫', color: '#f87171' },
                { label: 'Signalements', value: stats.pendingReports, icon: '🚨', color: '#fb923c' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: '#15151d', border: `1px solid ${color}33`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color }}>{value ?? '...'}</div>
                  <div style={{ fontSize: 12, color: '#7a7891' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#15151d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🚫 Utilisateurs bannis</div>
              {users.filter(u => u.is_banned).length === 0
                ? <div style={{ color: '#7a7891', fontSize: 13 }}>Aucun utilisateur banni</div>
                : users.filter(u => u.is_banned).map(u => (
                  <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{u.avatar_emoji}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{u.username}</div><div style={{ fontSize: 11, color: '#7a7891' }}>{u.last_ip || 'IP inconnue'}</div></div>
                    <span style={{ background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 20, padding: '2px 9px', fontSize: 11 }}>Banni</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>👥 Utilisateurs ({filteredUsers.length})</h2>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="🔍 Rechercher..."
                style={{ background: '#15151d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '7px 12px', color: '#e4e2f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: 200 }} />
            </div>
            <div style={{ background: '#15151d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: 11, color: '#7a7891', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Utilisateur</span><span>Statut</span><span>IP</span><span>État</span><span>Actions</span>
              </div>
              {filteredUsers.map(u => (
                <div key={u.username} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.04)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{u.avatar_emoji}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</div>
                      <div style={{ fontSize: 11, color: '#7a7891' }}>{u.bio?.slice(0, 30) || 'Pas de bio'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12 }}>{u.status || 'online'}</div>
                  <div style={{ fontSize: 11, color: '#7a7891', fontFamily: 'monospace' }}>{u.last_ip || 'Inconnue'}</div>
                  <div>
                    {u.is_banned
                      ? <span style={{ background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 20, padding: '3px 9px', fontSize: 11 }}>🚫 Banni</span>
                      : <span style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.2)', borderRadius: 20, padding: '3px 9px', fontSize: 11 }}>✅ Actif</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {!u.is_banned
                      ? <button onClick={() => { setBanModal(u); setBanIp(u.last_ip || '') }}
                          style={{ background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                          🚫 Bannir
                        </button>
                      : <button onClick={() => { const ban = bans.find(b => b.username === u.username); if (ban) unbanUser(ban) }}
                          style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                          ✅ Débannir
                        </button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BANS */}
        {tab === 'bans' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>🚫 Bans ({bans.length})</h2>
              <button onClick={() => setBanModal({ username: '', avatar_emoji: '😊', avatar_color: '#7c6af7', bio: '', status: 'online', last_ip: '', is_banned: false })}
                style={{ background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 9, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                + Ban manuel
              </button>
            </div>
            {bans.length === 0
              ? <div style={{ background: '#15151d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: 30, textAlign: 'center', color: '#7a7891' }}>Aucun ban actif</div>
              : <div style={{ background: '#15151d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: 11, color: '#7a7891', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Utilisateur</span><span>IP Bannie</span><span>Raison</span><span>Date</span><span>Action</span>
                  </div>
                  {bans.map(ban => (
                    <div key={ban.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.04)', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>{ban.username || '—'}</div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#f59e0b', background: 'rgba(245,158,11,.1)', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>{ban.ip_address || '—'}</div>
                      <div style={{ fontSize: 12, color: '#7a7891' }}>{ban.reason || 'Sans raison'}</div>
                      <div style={{ fontSize: 11, color: '#7a7891' }}>{new Date(ban.created_at).toLocaleDateString('fr-FR')}</div>
                      <button onClick={() => unbanUser(ban)}
                        style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                        ✅ Lever
                      </button>
                    </div>
                  ))}
                </div>}
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>💬 Messages récents</h2>
            <div style={{ background: '#15151d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' }}>
              {messages.slice(0, 100).map(msg => (
                <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.04)', opacity: msg.deleted_at ? 0.4 : 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', minWidth: 100 }}>{msg.username}</div>
                  <div style={{ flex: 1, fontSize: 13, color: msg.deleted_at ? '#7a7891' : '#e4e2f0', fontStyle: msg.deleted_at ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.content || '🎤 Audio / 📎 Fichier'}</div>
                  <div style={{ fontSize: 11, color: '#7a7891', minWidth: 80 }}>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  {!msg.deleted_at && <button onClick={() => deleteMessage(msg.id)}
                    style={{ background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 7, padding: '4px 9px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', flexShrink: 0 }}>
                    🗑️
                  </button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab === 'reports' && (
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>🚨 Signalements ({reports.filter(r => r.status === 'pending').length} en attente)</h2>
            {reports.length === 0
              ? <div style={{ background: '#15151d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: 30, textAlign: 'center', color: '#7a7891' }}>Aucun signalement</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reports.map(r => (
                    <div key={r.id} style={{ background: '#15151d', border: `1px solid ${r.status === 'pending' ? 'rgba(251,146,60,.3)' : 'rgba(255,255,255,.07)'}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: r.status === 'resolved' ? 0.5 : 1 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: '#a78bfa', fontWeight: 600 }}>{r.reporter}</span>
                          <span style={{ color: '#7a7891' }}> a signalé </span>
                          <span style={{ color: '#f87171', fontWeight: 600 }}>{r.reported}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#7a7891' }}>{r.reason || 'Sans raison spécifiée'}</div>
                        <div style={{ fontSize: 11, color: '#7a7891', marginTop: 4 }}>{new Date(r.created_at).toLocaleString('fr-FR')}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {r.status === 'pending' && <>
                          <button onClick={() => { const u = users.find(u => u.username === r.reported); if (u) setBanModal(u); resolveReport(r.id) }}
                            style={{ background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            🚫 Bannir
                          </button>
                          <button onClick={() => resolveReport(r.id)}
                            style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                            ✅ Ignorer
                          </button>
                        </>}
                        {r.status === 'resolved' && <span style={{ fontSize: 11, color: '#34d399' }}>✅ Résolu</span>}
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
        )}
      </div>

      {/* BAN MODAL */}
      {banModal && (
        <div onClick={() => setBanModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#15151d', border: '1px solid rgba(248,113,113,.3)', borderRadius: 20, padding: 28, width: 380, boxShadow: '0 30px 80px rgba(0,0,0,.8)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🚫</div>
            <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>Bannir {banModal.username || 'utilisateur'}</div>
            <div style={{ fontSize: 12, color: '#7a7891', textAlign: 'center', marginBottom: 20 }}>L'utilisateur et son IP seront bloqués</div>

            {banModal.username && <div style={{ background: 'rgba(124,106,247,.1)', border: '1px solid rgba(124,106,247,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: banModal.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{banModal.avatar_emoji}</div>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{banModal.username}</div><div style={{ fontSize: 11, color: '#7a7891' }}>IP : {banModal.last_ip || 'Non enregistrée'}</div></div>
            </div>}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#7a7891', marginBottom: 6 }}>Adresse IP à bannir</div>
              <input value={banIp} onChange={e => setBanIp(e.target.value)} placeholder={banModal.last_ip || 'ex: 192.168.1.1'}
                style={{ width: '100%', background: '#1c1c27', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '10px 13px', color: '#e4e2f0', fontFamily: 'monospace', fontSize: 13, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#7a7891', marginBottom: 6 }}>Raison du ban</div>
              <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Spam, harcèlement, contenu inapproprié..."
                style={{ width: '100%', background: '#1c1c27', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '10px 13px', color: '#e4e2f0', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            </div>

            <div style={{ background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 9, padding: '10px 13px', fontSize: 12, color: '#f87171', marginBottom: 16 }}>
              ⚠️ Cette action va :<br />
              • Marquer le compte comme banni<br />
              • Bloquer l'adresse IP<br />
              • Supprimer tous ses messages
            </div>

            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={banUser}
                style={{ flex: 1, background: 'linear-gradient(135deg,#ef4444,#f87171)', color: 'white', border: 'none', borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                🚫 Confirmer le ban
              </button>
              <button onClick={() => setBanModal(null)}
                style={{ background: '#1c1c27', color: '#7a7891', border: '1px solid rgba(255,255,255,.1)', borderRadius: 11, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1c1c27', border: '1px solid rgba(124,106,247,.4)', borderRadius: 10, padding: '10px 18px', fontSize: 13, color: '#e4e2f0', zIndex: 200, boxShadow: '0 8px 30px rgba(0,0,0,.5)' }}>{toast}</div>}
    </div>
  )
}
