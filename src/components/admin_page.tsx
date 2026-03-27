'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type User = { username: string; avatar_emoji: string; avatar_color: string; bio: string; status: string; last_ip: string | null; is_banned: boolean }
type Ban = { id: string; username: string | null; ip_address: string | null; fingerprint: string | null; reason: string | null; banned_by: string; created_at: string }
type Report = { id: string; reporter: string; reported: string; reason: string | null; status: string; created_at: string }
type Message = { id: string; username: string; content: string | null; created_at: string; deleted_at: string | null }
type Bot = { id: string; name: string; gender: string; avatar_emoji: string; avatar_color: string; personality: string; is_active: boolean; delay_min: number; delay_max: number }

const ADMIN_PASSWORD = 'raph2024admin'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [tab, setTab] = useState<'stats'|'users'|'bans'|'messages'|'reports'|'bots'>('stats')
  const [users, setUsers] = useState<User[]>([])
  const [bans, setBans] = useState<Ban[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [banModal, setBanModal] = useState<User|null>(null)
  const [banReason, setBanReason] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [toast, setToast] = useState('')
  const [botTestModal, setBotTestModal] = useState<Bot|null>(null)
  const [testMsg, setTestMsg] = useState('')
  const [testReply, setTestReply] = useState('')
  const [testLoading, setTestLoading] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadAll = async () => {
    setLoading(true)
    const [usersRes, bansRes, reportsRes, msgsRes, botsRes] = await Promise.all([
      supabase.from('profiles').select('username,avatar_emoji,avatar_color,bio,status,last_ip,is_banned').order('username'),
      supabase.from('bans').select('*').order('created_at', { ascending: false }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('id,username,content,created_at,deleted_at').order('created_at', { ascending: false }).limit(150),
      supabase.from('bots').select('*').order('name'),
    ])
    setUsers(usersRes.data || [])
    setBans(bansRes.data || [])
    setReports(reportsRes.data || [])
    setMessages(msgsRes.data || [])
    setBots(botsRes.data || [])

    const { count: totalMsgs } = await supabase.from('messages').select('*', { count: 'exact', head: true })
    const { data: onlineData } = await supabase.from('presence').select('username').eq('is_online', true).gte('last_seen', new Date(Date.now() - 60000).toISOString())
    setStats({
      totalUsers: usersRes.data?.length || 0,
      totalMsgs,
      online: onlineData?.length || 0,
      totalBans: bansRes.data?.length || 0,
      pendingReports: reportsRes.data?.filter((r:any) => r.status === 'pending').length || 0,
      activeBots: botsRes.data?.filter((b:any) => b.is_active).length || 0,
    })
    setLoading(false)
  }

  useEffect(() => { if (authed) loadAll() }, [authed])

  const banUser = async () => {
    if (!banModal) return
    // Récupérer toutes les fingerprints de cet utilisateur
    const { data: fps } = await supabase.from('user_fingerprints').select('fingerprint,ip_address,user_agent').eq('username', banModal.username)
    // Créer un ban pour chaque fingerprint connue
    const banEntries = []
    // Ban principal
    banEntries.push({ username: banModal.username, ip_address: banModal.last_ip || null, fingerprint: null, reason: banReason || 'Violation des règles', banned_by: 'raph', ban_type: 'full' })
    // Ban de toutes les fingerprints connues
    if (fps && fps.length > 0) {
      fps.forEach((fp: any) => {
        if (fp.fingerprint) banEntries.push({ username: banModal.username, ip_address: fp.ip_address || null, fingerprint: fp.fingerprint, reason: banReason || 'Violation des règles', banned_by: 'raph', ban_type: 'full' })
      })
    }
    await supabase.from('bans').insert(banEntries)
    await supabase.from('profiles').update({ is_banned: true }).eq('username', banModal.username)
    await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: '[Message supprimé - Utilisateur banni]' }).eq('username', banModal.username).is('deleted_at', null)
    setBanModal(null); setBanReason('')
    showToast(`🚫 ${banModal.username} banni sur tous ses appareils !`)
    loadAll()
  }

  const unbanUser = async (ban: Ban) => {
    // Supprimer tous les bans liés à cet utilisateur
    if (ban.username) {
      await supabase.from('bans').delete().eq('username', ban.username)
      await supabase.from('profiles').update({ is_banned: false }).eq('username', ban.username)
    } else {
      await supabase.from('bans').delete().eq('id', ban.id)
    }
    showToast(`✅ ${ban.username || ban.ip_address} débanni`)
    loadAll()
  }

  const toggleBot = async (bot: Bot) => {
    await supabase.from('bots').update({ is_active: !bot.is_active }).eq('id', bot.id)
    showToast(bot.is_active ? `🔴 ${bot.name} arrêté` : `🟢 ${bot.name} activé`)
    loadAll()
  }

  const updateBotDelay = async (bot: Bot, min: number, max: number) => {
    await supabase.from('bots').update({ delay_min: min, delay_max: max }).eq('id', bot.id)
    showToast(`⏱️ Délai de ${bot.name} mis à jour`)
    loadAll()
  }

  const testBot = async () => {
    if (!botTestModal || !testMsg) return
    setTestLoading(true)
    try {
      const res = await fetch('/api/bot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botPersonality: botTestModal.personality, botName: botTestModal.name, message: testMsg, history: [] })
      })
      const data = await res.json()
      setTestReply(data.reply || 'Pas de réponse')
    } catch { setTestReply('Erreur API') }
    setTestLoading(false)
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: '[Supprimé par admin]' }).eq('id', id)
    showToast('🗑️ Message supprimé'); loadAll()
  }

  const resolveReport = async (id: string, action: 'resolve'|'ban') => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', id)
    if (action === 'ban') {
      const r = reports.find(r => r.id === id)
      if (r) { const u = users.find(u => u.username === r.reported); if (u) setBanModal(u) }
    }
    showToast('✅ Signalement traité'); loadAll()
  }

  if (!authed) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d0d12', fontFamily:'system-ui' }}>
      <div style={{ background:'#15151d', border:'1px solid rgba(124,106,247,.3)', borderRadius:20, padding:'40px 36px', width:360, display:'flex', flexDirection:'column', gap:16, boxShadow:'0 30px 80px rgba(0,0,0,.7)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🛡️</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#e4e2f0' }}>Admin Panel</div>
          <div style={{ fontSize:12, color:'#7a7891', marginTop:4 }}>Accès restreint</div>
        </div>
        <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pass===ADMIN_PASSWORD&&setAuthed(true)}
          type="password" placeholder="Mot de passe..." style={{ background:'#1c1c27', border:'1px solid rgba(124,106,247,.3)', borderRadius:10, padding:'12px 14px', color:'#e4e2f0', fontFamily:'inherit', fontSize:14, outline:'none' }}/>
        <button onClick={()=>pass===ADMIN_PASSWORD?setAuthed(true):showToast('❌ Mauvais mot de passe')}
          style={{ background:'linear-gradient(135deg,#7c6af7,#a78bfa)', color:'white', border:'none', borderRadius:10, padding:13, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          Connexion →
        </button>
        {toast&&<div style={{ background:'rgba(248,113,113,.15)', border:'1px solid rgba(248,113,113,.3)', borderRadius:9, padding:'8px 12px', fontSize:12, color:'#f87171', textAlign:'center' }}>{toast}</div>}
      </div>
    </div>
  )

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQ.toLowerCase()))

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0d0d12', fontFamily:'system-ui', color:'#e4e2f0', overflow:'hidden' }}>

      {/* SIDEBAR */}
      <div style={{ width:220, background:'#15151d', borderRight:'1px solid rgba(255,255,255,.07)', display:'flex', flexDirection:'column', padding:'20px 12px', gap:4, flexShrink:0 }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:32 }}>🛡️</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#a78bfa' }}>Admin Panel</div>
          <div style={{ fontSize:10, color:'#7a7891' }}>Chat App</div>
        </div>
        {[
          { id:'stats', label:'📊 Statistiques' },
          { id:'users', label:'👥 Utilisateurs' },
          { id:'bans', label:'🚫 Bans', badge: stats?.totalBans },
          { id:'messages', label:'💬 Messages' },
          { id:'reports', label:'🚨 Signalements', badge: stats?.pendingReports },
          { id:'bots', label:'🤖 Bots IA', badge: stats?.activeBots > 0 ? `${stats.activeBots} ON` : null, badgeColor:'#34d399' },
        ].map(({ id, label, badge, badgeColor }:any) => (
          <button key={id} onClick={()=>setTab(id as any)}
            style={{ padding:'9px 12px', borderRadius:9, border:'none', background:tab===id?'rgba(124,106,247,.2)':'transparent', color:tab===id?'#a78bfa':'#7a7891', cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:13, fontWeight:tab===id?600:400, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {label}
            {badge&&<span style={{ background:badgeColor||'#ef4444', color:'white', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{badge}</span>}
          </button>
        ))}
        <div style={{ marginTop:'auto' }}>
          <button onClick={loadAll} style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid rgba(124,106,247,.3)', background:'transparent', color:'#a78bfa', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>🔄 Actualiser</button>
          <a href="/" style={{ display:'block', textAlign:'center', marginTop:8, fontSize:11, color:'#7a7891', textDecoration:'none' }}>← Retour au chat</a>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, overflowY:'auto', padding:24 }}>
        {loading&&<div style={{ textAlign:'center', padding:40, color:'#7a7891' }}>Chargement...</div>}

        {/* STATS */}
        {tab==='stats'&&stats&&(
          <div>
            <h2 style={{ marginBottom:20, fontSize:20, margin:'0 0 20px' }}>📊 Statistiques</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
              {[
                { label:'Utilisateurs', value:stats.totalUsers, icon:'👥', color:'#7c6af7' },
                { label:'En ligne', value:stats.online, icon:'🟢', color:'#34d399' },
                { label:'Messages', value:stats.totalMsgs, icon:'💬', color:'#60a5fa' },
                { label:'Bans actifs', value:stats.totalBans, icon:'🚫', color:'#f87171' },
                { label:'Signalements', value:stats.pendingReports, icon:'🚨', color:'#fb923c' },
                { label:'Bots actifs', value:stats.activeBots, icon:'🤖', color:'#34d399' },
              ].map(({label,value,icon,color})=>(
                <div key={label} style={{ background:'#15151d', border:`1px solid ${color}33`, borderRadius:14, padding:18 }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>{icon}</div>
                  <div style={{ fontSize:28, fontWeight:700, color }}>{value??'...'}</div>
                  <div style={{ fontSize:12, color:'#7a7891' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'#15151d', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:18 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>🚫 Bannis récents</div>
              {bans.slice(0,5).map(b=>(
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:13 }}>
                  <span style={{ color:'#f87171', fontWeight:600 }}>{b.username||'IP seulement'}</span>
                  <span style={{ color:'#7a7891', fontFamily:'monospace', fontSize:11 }}>{b.ip_address||'—'}</span>
                  <span style={{ color:'#7a7891', fontSize:11 }}>{new Date(b.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab==='users'&&(
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:20, margin:0 }}>👥 Utilisateurs ({filteredUsers.length})</h2>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Rechercher..."
                style={{ background:'#15151d', border:'1px solid rgba(255,255,255,.1)', borderRadius:9, padding:'7px 12px', color:'#e4e2f0', fontFamily:'inherit', fontSize:13, outline:'none', width:200 }}/>
            </div>
            <div style={{ background:'#15151d', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.5fr 1fr auto', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.07)', fontSize:11, color:'#7a7891', fontWeight:600, textTransform:'uppercase' }}>
                <span>Utilisateur</span><span>Statut</span><span>Dernière IP</span><span>État</span><span>Actions</span>
              </div>
              {filteredUsers.map(u=>(
                <div key={u.username} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.5fr 1fr auto', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:u.avatar_color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{u.avatar_emoji}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{u.username}</div>
                      <div style={{ fontSize:11, color:'#7a7891' }}>{u.bio?.slice(0,25)||'—'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#7a7891' }}>{u.status||'online'}</div>
                  <div style={{ fontSize:11, color:'#f59e0b', fontFamily:'monospace', background:'rgba(245,158,11,.08)', padding:'2px 7px', borderRadius:5 }}>{u.last_ip||'Inconnue'}</div>
                  <div>
                    {u.is_banned
                      ?<span style={{ background:'rgba(248,113,113,.15)', color:'#f87171', border:'1px solid rgba(248,113,113,.3)', borderRadius:20, padding:'3px 9px', fontSize:11 }}>🚫 Banni</span>
                      :<span style={{ background:'rgba(52,211,153,.1)', color:'#34d399', border:'1px solid rgba(52,211,153,.2)', borderRadius:20, padding:'3px 9px', fontSize:11 }}>✅ Actif</span>}
                  </div>
                  <div style={{ display:'flex', gap:5 }}>
                    {!u.is_banned
                      ?<button onClick={()=>setBanModal(u)} style={{ background:'rgba(248,113,113,.15)', color:'#f87171', border:'1px solid rgba(248,113,113,.3)', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap' }}>🚫 Bannir</button>
                      :<button onClick={()=>{const ban=bans.find(b=>b.username===u.username);if(ban)unbanUser(ban)}} style={{ background:'rgba(52,211,153,.1)', color:'#34d399', border:'1px solid rgba(52,211,153,.3)', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap' }}>✅ Débannir</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BANS */}
        {tab==='bans'&&(
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:20, margin:0 }}>🚫 Bans ({bans.length})</h2>
              <div style={{ fontSize:12, color:'#7a7891', background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.2)', borderRadius:9, padding:'6px 12px' }}>
                🔒 Ban multi-couches : username + IP + fingerprint
              </div>
            </div>
            {bans.length===0
              ?<div style={{ background:'#15151d', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:30, textAlign:'center', color:'#7a7891' }}>Aucun ban actif</div>
              :<div style={{ background:'#15151d', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 1fr auto', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.07)', fontSize:11, color:'#7a7891', fontWeight:600, textTransform:'uppercase' }}>
                  <span>Username</span><span>IP Bannie</span><span>Fingerprint</span><span>Raison</span><span>Action</span>
                </div>
                {bans.map(ban=>(
                  <div key={ban.id} style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 1fr auto', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', alignItems:'center', gap:8 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#f87171' }}>{ban.username||'—'}</div>
                    <div style={{ fontSize:11, fontFamily:'monospace', color:'#f59e0b', background:'rgba(245,158,11,.1)', padding:'2px 7px', borderRadius:5, overflow:'hidden', textOverflow:'ellipsis' }}>{ban.ip_address||'—'}</div>
                    <div style={{ fontSize:10, fontFamily:'monospace', color:'#7a7891', overflow:'hidden', textOverflow:'ellipsis' }}>{ban.fingerprint?ban.fingerprint.slice(0,12)+'...':'—'}</div>
                    <div style={{ fontSize:12, color:'#7a7891' }}>{ban.reason?.slice(0,20)||'—'}</div>
                    <button onClick={()=>unbanUser(ban)} style={{ background:'rgba(52,211,153,.1)', color:'#34d399', border:'1px solid rgba(52,211,153,.3)', borderRadius:7, padding:'5px 9px', cursor:'pointer', fontSize:11, fontFamily:'inherit', whiteSpace:'nowrap' }}>✅ Lever</button>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* MESSAGES */}
        {tab==='messages'&&(
          <div>
            <h2 style={{ fontSize:20, marginBottom:16 }}>💬 Messages ({messages.length})</h2>
            <div style={{ background:'#15151d', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, overflow:'hidden' }}>
              {messages.map(msg=>(
                <div key={msg.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', opacity:msg.deleted_at?0.4:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#a78bfa', minWidth:100, flexShrink:0 }}>{msg.username}</div>
                  <div style={{ flex:1, fontSize:13, color:msg.deleted_at?'#7a7891':'#e4e2f0', fontStyle:msg.deleted_at?'italic':'normal', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{msg.content||'🎤 Audio'}</div>
                  <div style={{ fontSize:11, color:'#7a7891', flexShrink:0 }}>{new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                  {!msg.deleted_at&&<button onClick={()=>deleteMessage(msg.id)} style={{ background:'rgba(248,113,113,.15)', color:'#f87171', border:'1px solid rgba(248,113,113,.3)', borderRadius:7, padding:'4px 9px', cursor:'pointer', fontSize:12, fontFamily:'inherit', flexShrink:0 }}>🗑️</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab==='reports'&&(
          <div>
            <h2 style={{ fontSize:20, marginBottom:16 }}>🚨 Signalements</h2>
            {reports.length===0
              ?<div style={{ background:'#15151d', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:30, textAlign:'center', color:'#7a7891' }}>Aucun signalement</div>
              :<div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {reports.map(r=>(
                  <div key={r.id} style={{ background:'#15151d', border:`1px solid ${r.status==='pending'?'rgba(251,146,60,.3)':'rgba(255,255,255,.07)'}`, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, opacity:r.status==='resolved'?0.5:1 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, marginBottom:4 }}>
                        <span style={{ color:'#a78bfa', fontWeight:600 }}>{r.reporter}</span>
                        <span style={{ color:'#7a7891' }}> a signalé </span>
                        <span style={{ color:'#f87171', fontWeight:600 }}>{r.reported}</span>
                      </div>
                      <div style={{ fontSize:12, color:'#7a7891' }}>{r.reason||'Sans raison'}</div>
                    </div>
                    {r.status==='pending'&&<div style={{ display:'flex', gap:7 }}>
                      <button onClick={()=>resolveReport(r.id,'ban')} style={{ background:'rgba(248,113,113,.15)', color:'#f87171', border:'1px solid rgba(248,113,113,.3)', borderRadius:7, padding:'6px 11px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>🚫 Bannir</button>
                      <button onClick={()=>resolveReport(r.id,'resolve')} style={{ background:'rgba(52,211,153,.1)', color:'#34d399', border:'1px solid rgba(52,211,153,.3)', borderRadius:7, padding:'6px 11px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>✅ Ignorer</button>
                    </div>}
                    {r.status==='resolved'&&<span style={{ fontSize:11, color:'#34d399' }}>✅ Résolu</span>}
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* BOTS */}
        {tab==='bots'&&(
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:20, margin:0 }}>🤖 Bots IA</h2>
              <div style={{ fontSize:12, color:'#7a7891', background:'rgba(124,106,247,.1)', border:'1px solid rgba(124,106,247,.2)', borderRadius:9, padding:'6px 12px' }}>
                Les bots répondent automatiquement en DM via Claude AI
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
              {bots.map(bot=>(
                <div key={bot.id} style={{ background:'#15151d', border:`1px solid ${bot.is_active?'rgba(52,211,153,.3)':'rgba(255,255,255,.07)'}`, borderRadius:16, padding:20, transition:'border-color .2s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                    <div style={{ width:50, height:50, borderRadius:'50%', background:bot.avatar_color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0, border:`2px solid ${bot.is_active?'#34d399':'rgba(255,255,255,.1)'}` }}>{bot.avatar_emoji}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:16 }}>{bot.name}</div>
                      <div style={{ fontSize:12, color:'#7a7891' }}>{bot.gender==='female'?'👩 Féminin':'👨 Masculin'}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                      <button onClick={()=>toggleBot(bot)}
                        style={{ background:bot.is_active?'rgba(52,211,153,.15)':'rgba(248,113,113,.15)', color:bot.is_active?'#34d399':'#f87171', border:`1px solid ${bot.is_active?'rgba(52,211,153,.4)':'rgba(248,113,113,.4)'}`, borderRadius:20, padding:'6px 14px', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', minWidth:80, textAlign:'center' }}>
                        {bot.is_active?'🟢 ON':'🔴 OFF'}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#7a7891', lineHeight:1.5, marginBottom:14, background:'rgba(255,255,255,.03)', borderRadius:9, padding:'10px 12px', maxHeight:80, overflow:'hidden' }}>
                    {bot.personality.slice(0,120)}...
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:'#7a7891', marginBottom:6 }}>⏱️ Délai de réponse</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:11, color:'#7a7891' }}>Min</span>
                        <input type="number" defaultValue={bot.delay_min} min={5} max={300}
                          style={{ width:60, background:'#1c1c27', border:'1px solid rgba(255,255,255,.1)', borderRadius:7, padding:'5px 8px', color:'#e4e2f0', fontFamily:'inherit', fontSize:12, outline:'none', textAlign:'center' }}
                          onChange={e=>updateBotDelay(bot, parseInt(e.target.value)||10, bot.delay_max)}/>
                        <span style={{ fontSize:11, color:'#7a7891' }}>s</span>
                      </div>
                      <span style={{ color:'#7a7891' }}>—</span>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:11, color:'#7a7891' }}>Max</span>
                        <input type="number" defaultValue={bot.delay_max} min={10} max={600}
                          style={{ width:60, background:'#1c1c27', border:'1px solid rgba(255,255,255,.1)', borderRadius:7, padding:'5px 8px', color:'#e4e2f0', fontFamily:'inherit', fontSize:12, outline:'none', textAlign:'center' }}
                          onChange={e=>updateBotDelay(bot, bot.delay_min, parseInt(e.target.value)||40)}/>
                        <span style={{ fontSize:11, color:'#7a7891' }}>s</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>{setBotTestModal(bot);setTestMsg('');setTestReply('')}}
                    style={{ width:'100%', background:'rgba(124,106,247,.15)', color:'#a78bfa', border:'1px solid rgba(124,106,247,.3)', borderRadius:9, padding:'8px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                    💬 Tester le bot
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16, background:'rgba(124,106,247,.07)', border:'1px solid rgba(124,106,247,.2)', borderRadius:12, padding:'14px 16px', fontSize:12, color:'#7a7891' }}>
              <div style={{ fontWeight:600, color:'#a78bfa', marginBottom:6 }}>ℹ️ Comment fonctionnent les bots ?</div>
              Quand un bot est <span style={{ color:'#34d399' }}>ON</span>, il envoie automatiquement un DM de bienvenue aux nouveaux utilisateurs après leur première connexion. Il répond ensuite à chaque message dans ce DM avec un délai aléatoire entre Min et Max secondes. Les réponses sont générées par l'IA Claude.
            </div>
          </div>
        )}
      </div>

      {/* BAN MODAL */}
      {banModal&&(
        <div onClick={()=>setBanModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(8px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#15151d', border:'1px solid rgba(248,113,113,.3)', borderRadius:20, padding:28, width:400, boxShadow:'0 30px 80px rgba(0,0,0,.8)' }}>
            <div style={{ fontSize:36, textAlign:'center', marginBottom:8 }}>🚫</div>
            <div style={{ fontSize:18, fontWeight:700, textAlign:'center', marginBottom:4 }}>Bannir {banModal.username}</div>
            <div style={{ fontSize:12, color:'#7a7891', textAlign:'center', marginBottom:20 }}>Ban multi-couches : username + IP + fingerprint de navigateur</div>
            {banModal.username&&<div style={{ background:'rgba(124,106,247,.1)', border:'1px solid rgba(124,106,247,.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:banModal.avatar_color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{banModal.avatar_emoji}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{banModal.username}</div>
                <div style={{ fontSize:11, color:'#7a7891' }}>IP : {banModal.last_ip||'Non enregistrée'}</div>
              </div>
            </div>}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:'#7a7891', marginBottom:6 }}>Raison du ban</div>
              <input value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="Spam, harcèlement, contenu inapproprié..."
                style={{ width:'100%', background:'#1c1c27', border:'1px solid rgba(255,255,255,.1)', borderRadius:9, padding:'10px 13px', color:'#e4e2f0', fontFamily:'inherit', fontSize:13, outline:'none' }}/>
            </div>
            <div style={{ background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.2)', borderRadius:9, padding:'10px 13px', fontSize:12, color:'#f87171', marginBottom:16 }}>
              ⚠️ Cette action va :<br/>
              • Bannir le compte par username<br/>
              • Bloquer toutes les IPs connues<br/>
              • Bloquer toutes les fingerprints du navigateur<br/>
              • Supprimer tous ses messages<br/>
              • Empêcher l'accès même en changeant de navigateur
            </div>
            <div style={{ display:'flex', gap:9 }}>
              <button onClick={banUser} style={{ flex:1, background:'linear-gradient(135deg,#ef4444,#f87171)', color:'white', border:'none', borderRadius:11, padding:12, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>🚫 Bannir</button>
              <button onClick={()=>setBanModal(null)} style={{ background:'#1c1c27', color:'#7a7891', border:'1px solid rgba(255,255,255,.1)', borderRadius:11, padding:'12px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* BOT TEST MODAL */}
      {botTestModal&&(
        <div onClick={()=>setBotTestModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(8px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#15151d', border:'1px solid rgba(124,106,247,.3)', borderRadius:20, padding:28, width:420, boxShadow:'0 30px 80px rgba(0,0,0,.8)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:46, height:46, borderRadius:'50%', background:botTestModal.avatar_color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{botTestModal.avatar_emoji}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:17 }}>Tester {botTestModal.name}</div>
                <div style={{ fontSize:12, color:'#7a7891' }}>Simuler une conversation</div>
              </div>
            </div>
            <input value={testMsg} onChange={e=>setTestMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&testBot()}
              placeholder={`Écrire à ${botTestModal.name}...`}
              style={{ width:'100%', background:'#1c1c27', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'11px 14px', color:'#e4e2f0', fontFamily:'inherit', fontSize:13, outline:'none', marginBottom:10 }}/>
            <button onClick={testBot} disabled={testLoading||!testMsg}
              style={{ width:'100%', background:'linear-gradient(135deg,#7c6af7,#a78bfa)', color:'white', border:'none', borderRadius:10, padding:11, fontSize:13, fontWeight:600, cursor:testLoading?'wait':'pointer', fontFamily:'inherit', marginBottom:12, opacity:!testMsg?0.5:1 }}>
              {testLoading?'⏳ En cours...':'Envoyer →'}
            </button>
            {testReply&&(
              <div style={{ background:'rgba(124,106,247,.1)', border:'1px solid rgba(124,106,247,.2)', borderRadius:12, padding:'12px 14px' }}>
                <div style={{ fontSize:11, color:'#a78bfa', fontWeight:600, marginBottom:6 }}>{botTestModal.name} répond :</div>
                <div style={{ fontSize:13, lineHeight:1.6 }}>{testReply}</div>
              </div>
            )}
            <button onClick={()=>setBotTestModal(null)} style={{ width:'100%', background:'transparent', border:'none', color:'#7a7891', cursor:'pointer', fontSize:12, marginTop:10, fontFamily:'inherit' }}>Fermer</button>
          </div>
        </div>
      )}

      {toast&&<div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#1c1c27', border:'1px solid rgba(124,106,247,.4)', borderRadius:10, padding:'10px 18px', fontSize:13, zIndex:200, boxShadow:'0 8px 30px rgba(0,0,0,.5)' }}>{toast}</div>}
    </div>
  )
}
