'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ── TYPES ─────────────────────────────────────────────
type Msg = { id:string; seq_id:number; username:string; content:string|null; file_url:string|null; file_name:string|null; audio_url:string|null; is_sticker:boolean; is_custom_sticker?:boolean; msg_type:string; created_at:string; reply_to?:string|null; reply_preview?:string|null; reply_author?:string|null; deleted_at?:string|null; ephemeral_seconds?:number|null }
type DM  = { id:string; seq_id:number; from_user:string; to_user:string; content:string|null; file_url:string|null; file_name:string|null; audio_url:string|null; is_sticker:boolean; created_at:string; reply_to?:string|null; reply_preview?:string|null; reply_author?:string|null; ephemeral_seconds?:number|null }
type Profile = { username:string; avatar_color:string; avatar_emoji:string; bio:string; theme:string; status:string; avatar_url?:string|null; location_lat?:number|null; location_lng?:number|null; location_name?:string|null }
type Reaction = { id:string; message_id:string; username:string; emoji:string }
type CustomSticker = { id:string; creator:string; content:string; bg_color:string; text_color:string }
type Presence = { username:string; is_online:boolean; last_seen:string }
type UserPoints = { username:string; points:number; total_earned:number; last_daily_claim:string|null; streak_days:number }
type Game = { id:string; game_type:string; player1:string; player2:string|null; status:string; state:any; winner:string|null; bet_points:number }
type Comment = { id:string; message_id:string; username:string; content:string; created_at:string }

// ── THEMES ────────────────────────────────────────────
const THEMES:Record<string,Record<string,string>> = {
  dark:   {'--bg':'#0d0d12','--bg2':'#15151d','--bg3':'#1c1c27','--border':'rgba(255,255,255,0.07)','--text':'#e4e2f0','--muted':'#7a7891','--accent':'#7c6af7','--accent2':'#a78bfa','--me-bubble':'linear-gradient(135deg,#6c5ce7,#a78bfa)','--me-text':'#fff'},
  light:  {'--bg':'#f0f2f5','--bg2':'#ffffff','--bg3':'#e9ebee','--border':'rgba(0,0,0,0.08)','--text':'#1c1e21','--muted':'#65676b','--accent':'#1877f2','--accent2':'#2d88ff','--me-bubble':'linear-gradient(135deg,#1877f2,#2d88ff)','--me-text':'#fff'},
  cod:    {'--bg':'#0a0c08','--bg2':'#111410','--bg3':'#1a1d16','--border':'rgba(180,140,0,0.2)','--text':'#e8ddb5','--muted':'#8a7a50','--accent':'#c8a200','--accent2':'#f0c400','--me-bubble':'linear-gradient(135deg,#5a4500,#c8a200)','--me-text':'#fff'},
  neon:   {'--bg':'#050510','--bg2':'#0a0a1a','--bg3':'#0f0f25','--border':'rgba(0,255,200,0.15)','--text':'#e0fff8','--muted':'#4a8a7a','--accent':'#00ffc8','--accent2':'#00e5b4','--me-bubble':'linear-gradient(135deg,#004d3d,#00ffc8)','--me-text':'#000'},
  purple: {'--bg':'#0e0816','--bg2':'#160e22','--bg3':'#1e1430','--border':'rgba(180,0,255,0.15)','--text':'#f0e6ff','--muted':'#8060aa','--accent':'#b400ff','--accent2':'#d060ff','--me-bubble':'linear-gradient(135deg,#6600aa,#b400ff)','--me-text':'#fff'},
  sunset: {'--bg':'#120808','--bg2':'#1e0e0e','--bg3':'#2a1414','--border':'rgba(255,80,0,0.15)','--text':'#ffe8d6','--muted':'#9a5a40','--accent':'#ff5500','--accent2':'#ff7733','--me-bubble':'linear-gradient(135deg,#8a2200,#ff5500)','--me-text':'#fff'},
}
const THEME_LABELS:Record<string,string> = {dark:'🌙 Sombre',light:'☀️ Clair',cod:'🎮 CoD',neon:'⚡ Neon',purple:'💜 Violet',sunset:'🌅 Sunset'}
const AVATAR_COLORS = ['#7c6af7','#f97316','#06b6d4','#10b981','#ec4899','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#84cc16']
const EMOJIS_NORMAL = ['😊','😎','🤩','🥳','😏','🤓','😈','👻','🦁','🐯','🦊','🐺','🦋','🎭','🎪','🎨','🚀','⚡','🌟','💎']
const EMOJIS_COD    = ['🪖','💀','🔫','🎯','💣','🧨','🛡️','⚔️','🎖️','🔪','💥','🚁','🎮','👊','🦅','🌑','☠️','🔱','🏴','🧱']
const QUICK_REACTIONS = ['❤️','😂','😮','😢','😡','👍','🔥','💯']
const ALL_EMOJIS = ['😀','😂','🥹','😊','😍','🥰','😎','🤩','😏','😢','😭','🥺','😡','🤬','😱','🤯','🥳','😴','🤗','🫡','😌','😋','🤓','😈','👻','💀','🤡','🫠','🙄','😤','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💝','✨','⭐','🌟','💫','🔥','💥','🎵','🎶','💯','✅','❌','⚡','🌈','🎯','💎','🎉','🎊','🥳','🎈','🎁','🏆','🥇','🎂','🍕','🍔','🎮','⚽','🏀','🎸','🎤','🎬','🍾','🥂','🍻','👍','👎','👏','🙌','🤝','🫶','🤙','👋','✋','💪','🦾','🙏','🫂','💁','🤷','🤦','🧑‍💻','👀','❤️‍🔥']
const STICKERS = ['🔥💯','💀👀','😭🙏','🤯🤯','🫡✅','😈🔥','🥶❄️','💪🏆','🫶❤️','🎉🎊','😂💀','🤡🎪','😏👀','🙃💅','😤✋','🤓☝️','😩😭','🤪🎉','😜💫','🫠🌀','❤️🥰','💕💖','😍✨','🫶💗','💌💝','🌹❤️','😘💋','🥺👉👈','💞🌸','💑🌺','📚💡','☕📖','🧑‍💻💻','✏️📝','🎓🏆','⏰📅','🧠💭','😤📚','🔬🧪','💾🖥️']
const COD_STICKERS  = ['🪖💀','🔫💥','🎯✅','💣🔥','⚔️🛡️','🎖️🏆','☠️👊','🚁💣','🌑🔪','🎮💀','🦅🪖','💥🔥','🧨💥','👊☠️','🏴🔫','🎯🔥','💀🎖️','⚔️💥','🪃🎯','🛡️💪']
const FILE_ICONS:Record<string,string> = {pdf:'📄',zip:'🗜️',mp3:'🎵',mp4:'🎬',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',txt:'📋',rar:'🗜️',pptx:'📊'}
const DANGER_WORDS = ['kill','mort','tuer','suicide','bombe','explosif','drogue','cocaine','heroine','attaque','violence','menace','threat','arme','gun','weapon']
const GAMES_LIST = [
  {id:'tictactoe',name:'Morpion',emoji:'⭕',desc:'Tour par tour • 2 joueurs'},
  {id:'rps',name:'Pierre Feuille Ciseaux',emoji:'✊',desc:'Premier à 3 • 2 joueurs'},
  {id:'quiz',name:'Quiz Culture G',emoji:'🧠',desc:'5 questions • 2 joueurs'},
  {id:'hangman',name:'Pendu',emoji:'🎭',desc:'Devinez le mot'},
  {id:'wordle',name:'Wordle',emoji:'📝',desc:'Mot en 6 essais'},
]
const QUIZ_QS = [
  {q:'Capitale du Bénin ?',a:'Porto-Novo',opts:['Cotonou','Porto-Novo','Abomey','Parakou']},
  {q:'Monnaie de la zone UEMOA ?',a:'FCFA',opts:['FCFA','Cedi','Naira','Shilling']},
  {q:'Combien de pays en Afrique ?',a:'54',opts:['48','54','57','60']},
  {q:'Plus haute montagne du monde ?',a:'Everest',opts:['Kilimandjaro','Mont Blanc','Everest','Aconcagua']},
  {q:'Inventeur du téléphone ?',a:'Bell',opts:['Edison','Bell','Tesla','Marconi']},
]
const HANGMAN_WORDS = ['JAVASCRIPT','SUPABASE','VERCEL','NEXTJS','REACTION','DISCORD','WHATSAPP','BENIN','AFRIQUE','FOOTBALL']

function colorForName(n:string){let h=0;for(const c of n)h=c.charCodeAt(0)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]}
function statusEmoji(s:string){return{online:'🟢',away:'🌙',busy:'🔴',gaming:'🎮'}[s]||'🟢'}
function timeAgo(d:string){const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return 'maintenant';if(s<3600)return `${Math.floor(s/60)}min`;if(s<86400)return `${Math.floor(s/3600)}h`;return `${Math.floor(s/86400)}j`}

// ══════════════════════════════════════════════════════
export default function ChatApp() {
  const [step,setStep]=useState<'login'|'setup'|'app'>('login')
  const [user,setUser]=useState('')
  const [profile,setProfile]=useState<Profile|null>(null)
  const [pseudo,setPseudo]=useState('')
  const [avatarColor,setAvatarColor]=useState(AVATAR_COLORS[0])
  const [avatarEmoji,setAvatarEmoji]=useState('😊')
  const [bio,setBio]=useState('')
  const [theme,setTheme]=useState('dark')
  const [userStatus,setUserStatus]=useState('online')

  const [view,setView]=useState<'chat'|'dm'|'members'|'map'>('chat')
  const [dmTarget,setDmTarget]=useState<string|null>(null)
  const [messages,setMessages]=useState<Msg[]>([])
  const [dms,setDms]=useState<DM[]>([])
  const [reactions,setReactions]=useState<Reaction[]>([])
  const [onlineUsers,setOnlineUsers]=useState<Presence[]>([])
  const [profiles,setProfiles]=useState<Record<string,Profile>>({})
  const [customStickers,setCustomStickers]=useState<CustomSticker[]>([])
  const [pinnedConvos,setPinnedConvos]=useState<{owner:string;target:string;custom_name:string|null}[]>([])
  const [dmConvos,setDmConvos]=useState<string[]>([])
  const [blockedUsers,setBlockedUsers]=useState<string[]>([])
  const [userPoints,setUserPoints]=useState<UserPoints|null>(null)
  const [activeGame,setActiveGame]=useState<Game|null>(null)
  const [gameInvite,setGameInvite]=useState<Game|null>(null)
  const [showGames,setShowGames]=useState(false)
  const [showPoints,setShowPoints]=useState(false)
  const [showWithdraw,setShowWithdraw]=useState(false)
  const [withdrawPhone,setWithdrawPhone]=useState('')
  const [withdrawCountry,setWithdrawCountry]=useState('Bénin')
  const [withdrawNetwork,setWithdrawNetwork]=useState('MTN')
  const [gameBet,setGameBet]=useState(0)
  const [ephemeralMode,setEphemeralMode]=useState(false)
  const [ephemeralSecs,setEphemeralSecs]=useState(30)

  const [text,setText]=useState('')
  const [connStatus,setConnStatus]=useState('Connexion...')
  const [pickerOpen,setPickerOpen]=useState(false)
  const [pickerTab,setPickerTab]=useState<'emoji'|'sticker'|'cod'|'custom'|'create'>('emoji')
  const [selectedFile,setSelectedFile]=useState<File|null>(null)
  const [toast,setToast]=useState('');const [toastOn,setToastOn]=useState(false)
  const [sending,setSending]=useState(false)
  const [hoverMsgId,setHoverMsgId]=useState<string|null>(null)
  const [viewProfile,setViewProfile]=useState<Profile|null>(null)
  const [replyTo,setReplyTo]=useState<{id:string;content:string|null;author:string}|null>(null)
  const [showThemes,setShowThemes]=useState(false)
  const [pinModal,setPinModal]=useState<string|null>(null)
  const [pinName,setPinName]=useState('')
  const [csText,setCsText]=useState('');const [csBg,setCsBg]=useState('#7c6af7');const [csColor,setCsColor]=useState('#ffffff')
  const [isRecording,setIsRecording]=useState(false)
  const [recordingTime,setRecordingTime]=useState(0)
  const [commentTarget,setCommentTarget]=useState<string|null>(null)
  const [comments,setComments]=useState<Record<string,Comment[]>>({})
  const [commentText,setCommentText]=useState('')
  const [avatarFile,setAvatarFile]=useState<File|null>(null)
  const [wordleGuess,setWordleGuess]=useState('')
  const [userLoc,setUserLoc]=useState<{lat:number;lng:number}|null>(null)
  const [mapLoaded,setMapLoaded]=useState(false)

  const messagesRef=useRef<HTMLDivElement>(null)
  const inputRef=useRef<HTMLTextAreaElement>(null)
  const fileRef=useRef<HTMLInputElement>(null)
  const avatarRef=useRef<HTMLInputElement>(null)
  const toastTimer=useRef<NodeJS.Timeout>()
  const presTimer=useRef<NodeJS.Timeout>()
  const mediaRecorderRef=useRef<MediaRecorder|null>(null)
  const audioChunksRef=useRef<Blob[]>([])
  const recordingTimerRef=useRef<NodeJS.Timeout>()
  const ephemeralTimers=useRef<Record<string,NodeJS.Timeout>>({})
  const mapRef=useRef<HTMLDivElement>(null)
  const leafletMap=useRef<any>(null)

  // ── THEME ─────────────────────────────────────────────
  useEffect(()=>{
    const vars=THEMES[theme]||THEMES.dark
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v))
  },[theme])

  const toast$=useCallback((msg:string)=>{
    setToast(msg);setToastOn(true)
    clearTimeout(toastTimer.current)
    toastTimer.current=setTimeout(()=>setToastOn(false),3500)
  },[])

  const scrollBottom=useCallback(()=>{
    requestAnimationFrame(()=>{if(messagesRef.current)messagesRef.current.scrollTop=messagesRef.current.scrollHeight})
  },[])

  // ── PROFILES CACHE ────────────────────────────────────
  const getProfile=useCallback((username:string):Profile=>{
    return profiles[username]||{username,avatar_color:colorForName(username),avatar_emoji:'😊',bio:'',theme:'dark',status:'online'}
  },[profiles])

  // ── PRESENCE (throttled) ─────────────────────────────
  const loadOnline=useCallback(async()=>{
    const since=new Date(Date.now()-35000).toISOString()
    const{data}=await supabase.from('presence').select('username,is_online,last_seen').eq('is_online',true).gte('last_seen',since)
    setOnlineUsers(data||[])
  },[])

  const ping=useCallback(async(username:string)=>{
    await supabase.from('presence').upsert({username,last_seen:new Date().toISOString(),is_online:true},{onConflict:'username'})
  },[])

  // ── PROFILES (batch load once) ────────────────────────
  const loadAllProfiles=useCallback(async()=>{
    const{data}=await supabase.from('profiles').select('username,avatar_color,avatar_emoji,bio,theme,status,avatar_url,location_lat,location_lng,location_name')
    if(data){const m:Record<string,Profile>={};data.forEach((p:Profile)=>{m[p.username]=p});setProfiles(m)}
  },[])

  // ── POINTS ────────────────────────────────────────────
  const loadPoints=useCallback(async(username:string)=>{
    const{data}=await supabase.from('user_points').select('*').eq('username',username).single()
    if(data)setUserPoints(data)
    else{
      await supabase.from('user_points').insert({username,points:0,total_earned:0,streak_days:0})
      setUserPoints({username,points:0,total_earned:0,last_daily_claim:null,streak_days:0})
    }
  },[])

  const claimDaily=useCallback(async(username:string)=>{
    const today=new Date().toISOString().split('T')[0]
    const{data}=await supabase.from('user_points').select('*').eq('username',username).single()
    if(!data||data.last_daily_claim===today)return
    const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0]
    const streak=data.last_daily_claim===yesterday?(data.streak_days||0)+1:1
    const bonus=streak>=7?20:streak>=3?15:10
    const pts=(data.points||0)+bonus
    await supabase.from('user_points').update({points:pts,total_earned:(data.total_earned||0)+bonus,last_daily_claim:today,streak_days:streak}).eq('username',username)
    setUserPoints(p=>p?{...p,points:pts,streak_days:streak}:p)
    toast$(`🎉 +${bonus} pts ! Série ${streak}j`)
  },[toast$])

  const addPts=useCallback(async(username:string,delta:number,reason:string)=>{
    // Fire and forget — don't block UI
    supabase.rpc('increment_points',{p_username:username,p_amount:delta}).then()
    supabase.from('points_history').insert({username,amount:delta,reason}).then()
    setUserPoints(p=>p?{...p,points:Math.max(0,(p.points||0)+delta)}:p)
  },[])

  // ── BLOCK ─────────────────────────────────────────────
  const loadBlocked=useCallback(async(username:string)=>{
    const{data}=await supabase.from('blocked_users').select('blocked').eq('blocker',username)
    setBlockedUsers((data||[]).map((b:any)=>b.blocked))
  },[])

  const toggleBlock=async(target:string)=>{
    if(blockedUsers.includes(target)){
      await supabase.from('blocked_users').delete().eq('blocker',user).eq('blocked',target)
      setBlockedUsers(prev=>prev.filter(u=>u!==target))
      toast$(`✅ ${target} débloqué`)
    } else {
      await supabase.from('blocked_users').insert({blocker:user,blocked:target})
      setBlockedUsers(prev=>[...prev,target])
      toast$(`🚫 ${target} bloqué`)
    }
    setViewProfile(null)
  }

  // ── EPHEMERAL ─────────────────────────────────────────
  const scheduleEphemeral=useCallback((msgId:string,secs:number)=>{
    if(ephemeralTimers.current[msgId])clearTimeout(ephemeralTimers.current[msgId])
    ephemeralTimers.current[msgId]=setTimeout(()=>{
      setMessages(prev=>prev.filter(m=>m.id!==msgId))
      setDms(prev=>prev.filter(m=>m.id!==msgId))
    },secs*1000)
  },[])

  // ── MAP (Leaflet) ─────────────────────────────────────
  useEffect(()=>{
    if(view!=='map'||mapLoaded)return
    const load=async()=>{
      if(typeof window==='undefined')return
      // Dynamically load Leaflet
      const L=(window as any).L
      if(!L){
        const link=document.createElement('link')
        link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
        await new Promise<void>(res=>{
          const script=document.createElement('script')
          script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.onload=()=>res();document.head.appendChild(script)
        })
      }
      if(!mapRef.current)return
      const Lf=(window as any).L
      if(leafletMap.current){leafletMap.current.remove();leafletMap.current=null}

      // Get user location
      navigator.geolocation.getCurrentPosition(pos=>{
        const{latitude:lat,longitude:lng}=pos.coords
        setUserLoc({lat,lng})
        const map=Lf.map(mapRef.current!,{zoomControl:true}).setView([lat,lng],13)
        Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map)
        leafletMap.current=map

        // My marker
        const myIcon=Lf.divIcon({html:`<div style="background:var(--accent);color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)">${getProfile(user).avatar_emoji}</div>`,className:'',iconSize:[36,36]})
        Lf.marker([lat,lng],{icon:myIcon}).addTo(map).bindPopup(`<b>${user}</b><br>Ma position`).openPopup()

        // Other members
        const memberProfiles=Object.values(profiles).filter(p=>p.location_lat&&p.location_lng&&p.username!==user)
        memberProfiles.forEach(p=>{
          const icon=Lf.divIcon({html:`<div style="background:${p.avatar_color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">${p.avatar_emoji}</div>`,className:'',iconSize:[32,32]})
          const isOnline=onlineUsers.some(u=>u.username===p.username)
          Lf.marker([p.location_lat!,p.location_lng!],{icon}).addTo(map).bindPopup(`<b>${p.username}</b><br>${isOnline?'🟢 En ligne':'⚫ Hors ligne'}<br>${p.location_name||''}`)
        })
        setMapLoaded(true)
      },()=>{
        // Fallback: world map
        const map=Lf.map(mapRef.current!).setView([6.3703,2.3912],10)
        Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map)
        leafletMap.current=map
        const memberProfiles=Object.values(profiles).filter(p=>p.location_lat&&p.location_lng)
        memberProfiles.forEach(p=>{
          const icon=(window as any).L.divIcon({html:`<div style="background:${p.avatar_color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white">${p.avatar_emoji}</div>`,className:'',iconSize:[32,32]})
          Lf.marker([p.location_lat!,p.location_lng!],{icon}).addTo(map).bindPopup(`<b>${p.username}</b>`)
        })
        setMapLoaded(true)
        toast$('📍 Active la localisation pour te voir sur la carte')
      })
    }
    load()
    return()=>{if(leafletMap.current){leafletMap.current.remove();leafletMap.current=null;setMapLoaded(false)}}
  },[view,profiles,onlineUsers,user,getProfile,mapLoaded,toast$])

  // ── AUTO LOGIN ────────────────────────────────────────
  useEffect(()=>{
    const saved=localStorage.getItem('chat_user')
    const savedTheme=localStorage.getItem('chat_theme')
    if(savedTheme)setTheme(savedTheme)
    if(saved)setPseudo(saved)
  },[])

  // ── LOGIN / SETUP ─────────────────────────────────────
  const handleLogin=async()=>{
    const name=pseudo.trim();if(!name)return
    const saved=localStorage.getItem('chat_user');const target=saved||name
    const{data:p}=await supabase.from('profiles').select('*').eq('username',target).single()
    if(p){setUser(target);setProfile(p);setAvatarColor(p.avatar_color);setAvatarEmoji(p.avatar_emoji);setBio(p.bio);setTheme(p.theme||'dark');setUserStatus(p.status||'online');localStorage.setItem('chat_user',target);localStorage.setItem('chat_theme',p.theme||'dark');setStep('app')}
    else{setUser(name);setStep('setup')}
  }

  const handleSetup=async()=>{
    let avatar_url=null
    if(avatarFile){
      const ext=avatarFile.name.split('.').pop()
      const{error}=await supabase.storage.from('chat-files').upload(`avatars/${user}_${Date.now()}.${ext}`,avatarFile,{upsert:true})
      if(!error){const{data}=supabase.storage.from('chat-files').getPublicUrl(`avatars/${user}_${Date.now()}.${ext}`);avatar_url=data.publicUrl}
    }
    let location_lat=null,location_lng=null,location_name=null
    await new Promise<void>(res=>navigator.geolocation?.getCurrentPosition(pos=>{location_lat=pos.coords.latitude;location_lng=pos.coords.longitude;location_name=`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;res()},()=>res(),{timeout:4000}))
    const p:Profile={username:user,avatar_color:avatarColor,avatar_emoji:avatarEmoji,bio,theme,status:userStatus,avatar_url,location_lat,location_lng,location_name}
    await supabase.from('profiles').upsert(p,{onConflict:'username'})
    setProfile(p);localStorage.setItem('chat_user',user);localStorage.setItem('chat_theme',theme);setStep('app')
  }

  // ── INIT APP (optimized: parallel loads) ──────────────
  useEffect(()=>{
    if(step!=='app')return
    let mounted=true

    const init=async()=>{
      setConnStatus('Chargement...')
      // Parallel loading — much faster
      const [,,[msgs],[rxns],[cs],[pins],[dmsData]]=await Promise.all([
        ping(user),
        loadAllProfiles(),
        supabase.from('messages').select('id,seq_id,username,content,file_url,file_name,audio_url,is_sticker,is_custom_sticker,msg_type,created_at,reply_to,reply_preview,reply_author,deleted_at,ephemeral_seconds').eq('msg_type','message').order('seq_id',{ascending:true}).limit(100).then(r=>[r.data||[]]),
        supabase.from('reactions').select('id,message_id,username,emoji').then(r=>[r.data||[]]),
        supabase.from('custom_stickers').select('*').order('created_at',{ascending:false}).limit(50).then(r=>[r.data||[]]),
        supabase.from('pinned_convos').select('owner,target,custom_name').eq('owner',user).then(r=>[r.data||[]]),
        supabase.from('dms').select('from_user,to_user').or(`from_user.eq.${user},to_user.eq.${user}`).then(r=>[r.data||[]]),
      ])
      if(!mounted)return
      setMessages(msgs);setReactions(rxns);setCustomStickers(cs);setPinnedConvos(pins)
      const s=new Set<string>();(dmsData as any[]).forEach((d:any)=>{s.add(d.from_user===user?d.to_user:d.from_user)});setDmConvos(Array.from(s))
      scrollBottom()

      // Non-blocking secondary loads
      loadOnline()
      loadPoints(user).then(()=>claimDaily(user))
      loadBlocked(user)

      // Schedule ephemeral messages
      msgs.filter((m:Msg)=>m.ephemeral_seconds).forEach((m:Msg)=>{
        const age=(Date.now()-new Date(m.created_at).getTime())/1000
        const remaining=m.ephemeral_seconds!-age
        if(remaining>0)scheduleEphemeral(m.id,remaining)
        else setMessages(prev=>prev.filter(x=>x.id!==m.id))
      })

      setConnStatus('🟢 Connecté')
      if(Notification.permission==='default')Notification.requestPermission()
    }
    init()

    // Ping every 20s (was 15s)
    presTimer.current=setInterval(()=>{ping(user);loadOnline()},20000)

    // ── REALTIME SUBSCRIPTIONS (minimal) ─────────────────
    const msgCh=supabase.channel('msgs-v6')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},({new:n})=>{
        const msg=n as Msg
        if(msg.msg_type!=='message')return
        if(blockedUsers.includes(msg.username))return
        setMessages(prev=>[...prev,msg]);scrollBottom()
        if(msg.ephemeral_seconds)scheduleEphemeral(msg.id,msg.ephemeral_seconds)
        if(document.hidden&&msg.username!==user&&Notification.permission==='granted')
          new Notification(`💬 ${msg.username}`,{body:msg.content||'📎 Media'})
        if(msg.content){const lo=msg.content.toLowerCase();if(DANGER_WORDS.some(w=>lo.includes(w))){supabase.from('warnings').insert({username:msg.username,message_id:msg.id,reason:'Mot dangereux'});toast$('⚠️ Message signalé')}}
        if(msg.username===user)addPts(user,1,'Message')
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},({new:n})=>{
        setMessages(prev=>prev.map(m=>m.id===n.id?{...m,...n}:m))
      })
      .subscribe(st=>{if(st==='SUBSCRIBED')setConnStatus('🟢 Connecté')})

    const dmCh=supabase.channel('dms-v6')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'dms'},({new:n})=>{
        const dm=n as DM
        if(dm.from_user!==user&&dm.to_user!==user)return
        if(blockedUsers.includes(dm.from_user))return
        const other=dm.from_user===user?dm.to_user:dm.from_user
        setDmConvos(prev=>prev.includes(other)?prev:[...prev,other])
        setDms(prev=>[...prev,dm]);scrollBottom()
        if(dm.ephemeral_seconds)scheduleEphemeral(dm.id,dm.ephemeral_seconds)
        if(document.hidden&&dm.from_user!==user&&Notification.permission==='granted')
          new Notification(`🔒 ${dm.from_user}`,{body:dm.content||'📎'})
      }).subscribe()

    const rxCh=supabase.channel('rx-v6')
      .on('postgres_changes',{event:'*',schema:'public',table:'reactions'},()=>{
        supabase.from('reactions').select('id,message_id,username,emoji').then(({data})=>{if(data)setReactions(data)})
      }).subscribe()

    const gameCh=supabase.channel('game-v6')
      .on('postgres_changes',{event:'*',schema:'public',table:'games'},({new:n})=>{
        const g=n as Game
        if(g.player2===user&&g.status==='waiting')setGameInvite(g)
        if(g.player1===user||g.player2===user)setActiveGame(g)
      }).subscribe()

    const cmtCh=supabase.channel('cmt-v6')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'message_comments'},({new:n})=>{
        const c=n as Comment
        setComments(prev=>({...prev,[c.message_id]:[...(prev[c.message_id]||[]),c]}))
      }).subscribe()

    const presCh=supabase.channel('pres-v6')
      .on('postgres_changes',{event:'*',schema:'public',table:'presence'},()=>loadOnline()).subscribe()

    const profCh=supabase.channel('prof-v6')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'profiles'},()=>loadAllProfiles())
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},({new:n})=>{
        setProfiles(prev=>({...prev,[n.username]:n as Profile}))
      }).subscribe()

    const csCh=supabase.channel('cs-v6')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'custom_stickers'},({new:n})=>{
        setCustomStickers(prev=>[n as CustomSticker,...prev])
      }).subscribe()

    const ptsCh=supabase.channel('pts-v6')
      .on('postgres_changes',{event:'*',schema:'public',table:'user_points'},({new:n})=>{
        if((n as UserPoints).username===user)setUserPoints(n as UserPoints)
      }).subscribe()

    window.addEventListener('beforeunload',()=>{
      supabase.from('presence').upsert({username:user,last_seen:new Date().toISOString(),is_online:false},{onConflict:'username'})
    })

    return()=>{
      mounted=false
      ;[msgCh,dmCh,rxCh,gameCh,cmtCh,presCh,profCh,csCh,ptsCh].forEach(c=>supabase.removeChannel(c))
      clearInterval(presTimer.current)
      Object.values(ephemeralTimers.current).forEach(t=>clearTimeout(t))
    }
  },[step,user])

  useEffect(()=>{
    if(!dmTarget||!user)return
    supabase.from('dms').select('*').or(`and(from_user.eq.${user},to_user.eq.${dmTarget}),and(from_user.eq.${dmTarget},to_user.eq.${user})`).order('seq_id',{ascending:true}).then(({data})=>{setDms(data||[]);scrollBottom()})
  },[dmTarget,user,scrollBottom])

  // ── SEND ──────────────────────────────────────────────
  const send=async()=>{
    if(!text.trim()&&!selectedFile)return
    setSending(true)
    let file_url=null,file_name=null
    if(selectedFile){
      toast$('⏫ Upload...')
      const path=`${Date.now()}_${selectedFile.name.replace(/[^\w._-]/g,'_')}`
      const{error}=await supabase.storage.from('chat-files').upload(path,selectedFile,{upsert:false})
      if(error){toast$('Erreur: '+error.message);setSending(false);return}
      const{data}=supabase.storage.from('chat-files').getPublicUrl(path)
      file_url=data.publicUrl;file_name=selectedFile.name;toast$('✅ Envoyé !')
    }
    const rd=replyTo?{reply_to:replyTo.id,reply_preview:replyTo.content?.slice(0,60)||'📎',reply_author:replyTo.author}:{}
    const ep=ephemeralMode?{ephemeral_seconds:ephemeralSecs}:{}
    if(view==='dm'&&dmTarget)
      await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content:text.trim()||null,file_url,file_name,is_sticker:false,...rd,...ep})
    else
      await supabase.from('messages').insert({username:user,content:text.trim()||null,file_url,file_name,is_sticker:false,msg_type:'message',...rd,...ep})
    setText('');setSelectedFile(null);setPickerOpen(false);setReplyTo(null)
    if(inputRef.current)inputRef.current.style.height='40px'
    setSending(false);inputRef.current?.focus()
  }

  const sendSticker=async(content:string,isCustom=false)=>{
    setPickerOpen(false)
    const rd=replyTo?{reply_to:replyTo.id,reply_preview:replyTo.content?.slice(0,60)||'📎',reply_author:replyTo.author}:{}
    const ep=ephemeralMode?{ephemeral_seconds:ephemeralSecs}:{}
    if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content,is_sticker:true,...rd,...ep})
    else await supabase.from('messages').insert({username:user,content,is_sticker:true,is_custom_sticker:isCustom,msg_type:'message',...rd,...ep})
    setReplyTo(null);addPts(user,2,'Sticker')
  }

  const deleteMessage=async(msgId:string)=>{
    await supabase.from('messages').update({deleted_at:new Date().toISOString(),deleted_by:user,content:'Ce message a été supprimé.'}).eq('id',msgId)
    toast$('🗑 Supprimé')
  }

  const loadComments=async(msgId:string)=>{
    if(commentTarget===msgId){setCommentTarget(null);return}
    const{data}=await supabase.from('message_comments').select('*').eq('message_id',msgId).order('created_at',{ascending:true})
    setComments(prev=>({...prev,[msgId]:data||[]}))
    setCommentTarget(msgId)
  }

  const sendComment=async()=>{
    if(!commentText.trim()||!commentTarget)return
    await supabase.from('message_comments').insert({message_id:commentTarget,username:user,content:commentText.trim()})
    setCommentText('')
  }

  const startRecording=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const mr=new MediaRecorder(stream)
      mediaRecorderRef.current=mr;audioChunksRef.current=[]
      mr.ondataavailable=e=>{if(e.data.size>0)audioChunksRef.current.push(e.data)}
      mr.onstop=async()=>{
        const blob=new Blob(audioChunksRef.current,{type:'audio/webm'})
        stream.getTracks().forEach(t=>t.stop())
        toast$('⏫ Envoi vocal...')
        const path=`audio_${Date.now()}.webm`
        const{error}=await supabase.storage.from('chat-files').upload(path,blob,{contentType:'audio/webm',upsert:false})
        if(error){toast$('Erreur: '+error.message);return}
        const{data}=supabase.storage.from('chat-files').getPublicUrl(path)
        const ep=ephemeralMode?{ephemeral_seconds:ephemeralSecs}:{}
        const rd=replyTo?{reply_to:replyTo.id,reply_preview:'🎤 Audio',reply_author:replyTo.author}:{}
        if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,audio_url:data.publicUrl,is_sticker:false,...rd,...ep})
        else await supabase.from('messages').insert({username:user,audio_url:data.publicUrl,is_sticker:false,msg_type:'message',...rd,...ep})
        setReplyTo(null);toast$('✅ Vocal envoyé !')
      }
      mr.start();setIsRecording(true);setRecordingTime(0)
      recordingTimerRef.current=setInterval(()=>setRecordingTime(t=>t+1),1000)
    }catch{toast$('Microphone non disponible')}
  }

  const stopRecording=()=>{
    if(mediaRecorderRef.current&&isRecording){mediaRecorderRef.current.stop();setIsRecording(false);clearInterval(recordingTimerRef.current)}
  }

  const makeGameMove=async(move:any)=>{
    if(!activeGame||activeGame.status!=='active')return
    const s={...activeGame.state}
    let newStatus='active',winner=null as string|null
    const isP1=activeGame.player1===user

    if(activeGame.game_type==='tictactoe'){
      const sym=isP1?'X':'O'
      s.board=s.board.map((v:any,i:number)=>i===move.index?sym:v)
      s.currentTurn=s.currentTurn==='X'?'O':'X';s.moves=(s.moves||0)+1
      const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
      for(const[a,b,c]of lines)if(s.board[a]&&s.board[a]===s.board[b]&&s.board[a]===s.board[c]){winner=s.board[a]==='X'?activeGame.player1:activeGame.player2!;newStatus='finished';break}
      if(!winner&&s.moves===9)newStatus='draw'
    } else if(activeGame.game_type==='rps'){
      if(isP1)s.player1Choice=move.choice;else s.player2Choice=move.choice
      if(s.player1Choice&&s.player2Choice){
        const beats:Record<string,string>={rock:'scissors',scissors:'paper',paper:'rock'}
        const w=beats[s.player1Choice]===s.player2Choice?'p1':s.player1Choice===s.player2Choice?'draw':'p2'
        if(w==='p1')s.scores.p1++;else if(w==='p2')s.scores.p2++
        if(s.scores.p1>=3){winner=activeGame.player1;newStatus='finished'}
        else if(s.scores.p2>=3){winner=activeGame.player2!;newStatus='finished'}
        else{s.round++;s.player1Choice=null;s.player2Choice=null}
      }
    } else if(activeGame.game_type==='quiz'){
      if(isP1)s.p1Answer=move.answer;else s.p2Answer=move.answer
      if(s.p1Answer&&s.p2Answer){
        if(s.p1Answer===s.question.a)s.p1Score++
        if(s.p2Answer===s.question.a)s.p2Score++
        s.currentQ++;s.p1Answer=null;s.p2Answer=null
        if(s.currentQ>=QUIZ_QS.length){newStatus='finished';winner=s.p1Score>s.p2Score?activeGame.player1:s.p2Score>s.p1Score?activeGame.player2!:null}
        else s.question=QUIZ_QS[s.currentQ]
      }
    } else if(activeGame.game_type==='hangman'){
      s.guesses=[...s.guesses,move.letter]
      if(!s.word.includes(move.letter))s.wrong++
      if(s.word.split('').every((l:string)=>s.guesses.includes(l))){winner=user;newStatus='finished'}
      else if(s.wrong>=6)newStatus='finished'
    } else if(activeGame.game_type==='wordle'){
      s.guesses=[...s.guesses,move.guess.toUpperCase().slice(0,5)]
      if(move.guess.toUpperCase()===s.word){winner=user;newStatus='finished'}
      else if(s.guesses.length>=6)newStatus='finished'
    }

    await supabase.from('games').update({state:s,status:newStatus,winner,updated_at:new Date().toISOString()}).eq('id',activeGame.id)
    setActiveGame(g=>g?{...g,state:s,status:newStatus,winner}:g)
    if(newStatus==='finished'||newStatus==='draw'){
      const bet=activeGame.bet_points||0
      if(winner===user){addPts(user,15+bet*2,'Victoire');toast$(`🏆 +${15+bet*2} pts !`)}
      else if(winner&&winner!==user){addPts(user,Math.max(-bet,-5),'Défaite')}
      else toast$('🤝 Égalité !')
    }
  }

  const inviteToGame=async(gameType:string,opponent:string,bet:number)=>{
    if(bet>(userPoints?.points||0)){toast$('Pas assez de points !');return}
    const word=HANGMAN_WORDS[Math.floor(Math.random()*HANGMAN_WORDS.length)]
    const initState=gameType==='tictactoe'?{board:Array(9).fill(null),currentTurn:'X',moves:0}
      :gameType==='rps'?{player1Choice:null,player2Choice:null,round:1,scores:{p1:0,p2:0}}
      :gameType==='quiz'?{currentQ:0,p1Score:0,p2Score:0,question:QUIZ_QS[0],p1Answer:null,p2Answer:null}
      :gameType==='hangman'?{word,guesses:[],wrong:0}
      :{word:word.slice(0,5),guesses:[]}
    const{data}=await supabase.from('games').insert({game_type:gameType,player1:user,player2:opponent,status:'waiting',state:initState,bet_points:bet}).select().single()
    if(data){setActiveGame(data);setShowGames(false);toast$(`🎮 Invitation → ${opponent}`)}
  }

  const requestWithdraw=async()=>{
    const pts=userPoints?.points||0
    if(pts<1000){toast$('❌ Minimum 1000 pts requis');return}
    if(!withdrawPhone.trim()){toast$('Entre ton numéro');return}
    const ptsTouse=Math.floor(pts/10)*10
    const fcfa=Math.floor(ptsTouse/10)*5
    await supabase.from('withdrawal_requests').insert({username:user,points:ptsTouse,amount_fcfa:fcfa,phone:withdrawPhone,country:withdrawCountry,network:withdrawNetwork,status:'pending'})
    await supabase.from('user_points').update({points:pts%10}).eq('username',user)
    setUserPoints(p=>p?{...p,points:pts%10}:p)
    toast$(`✅ ${fcfa} FCFA en route !`);setShowWithdraw(false)
  }

  // ── UTILS ─────────────────────────────────────────────
  const handleKey=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}
  const autoResize=(el:HTMLTextAreaElement)=>{el.style.height='40px';el.style.height=Math.min(el.scrollHeight,110)+'px'}
  const insertEmoji=(e:string)=>{if(!inputRef.current)return;const el=inputRef.current,s=el.selectionStart??el.value.length;setText(el.value.slice(0,s)+e+el.value.slice(s));setTimeout(()=>{el.selectionStart=el.selectionEnd=s+e.length;el.focus()},0)}
  const openDM=(username:string)=>{if(username===user||blockedUsers.includes(username))return;setDmTarget(username);setView('dm');setViewProfile(null)}
  const ptsFCFA=(p:number)=>`${Math.floor(p/10)*5} FCFA`

  // ── FILTERED MESSAGES (memoized) ─────────────────────
  const filteredMessages=useMemo(()=>messages.filter(m=>!blockedUsers.includes(m.username)),[messages,blockedUsers])

  // ── RENDER MESSAGES ───────────────────────────────────
  let lastDate=''
  const renderMsgs=(msgs:Msg[])=>msgs.map((msg,i)=>{
    const date=new Date(msg.created_at)
    const dStr=date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
    const isMe=msg.username===user
    const rxns:Record<string,string[]>={}
    reactions.filter(r=>r.message_id===msg.id).forEach(r=>{if(!rxns[r.emoji])rxns[r.emoji]=[];rxns[r.emoji].push(r.username)})
    const ext=(msg.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage=['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    const cs=customStickers.find(s=>s.content===msg.content)
    const msgComments=comments[msg.id]||[]
    const isDeleted=!!msg.deleted_at
    const p=getProfile(msg.username)
    const items:React.ReactNode[]=[]
    if(dStr!==lastDate){lastDate=dStr;items.push(<div key={`d${i}`} style={{display:'flex',alignItems:'center',gap:10,color:'var(--muted)',fontSize:11,margin:'10px 0'}}><div style={{flex:1,height:1,background:'var(--border)'}}/>  {dStr}<div style={{flex:1,height:1,background:'var(--border)'}}/></div>)}

    items.push(
      <div key={msg.id} style={{display:'flex',alignItems:'flex-start',gap:8,flexDirection:isMe?'row-reverse':'row',animation:'slideUp .2s ease',opacity:isDeleted?.6:1}}
        onMouseEnter={()=>setHoverMsgId(msg.id)} onMouseLeave={()=>setHoverMsgId(null)}>
        <div onClick={()=>setViewProfile(p)} style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0,cursor:'pointer'}}>
          {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:p.avatar_emoji}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3,maxWidth:'66%',alignItems:isMe?'flex-end':'flex-start'}}>
          {!isMe&&<div style={{fontSize:11,color:'var(--muted)',padding:'0 4px',fontWeight:500,cursor:'pointer'}} onClick={()=>setViewProfile(p)}>{msg.username} <span style={{fontSize:10}}>{timeAgo(msg.created_at)}</span></div>}
          {msg.reply_author&&<div style={{background:'var(--bg3)',borderLeft:'3px solid var(--accent)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--muted)',marginBottom:2}}><div style={{fontWeight:600,fontSize:11,color:'var(--accent2)',marginBottom:2}}>↩️ {msg.reply_author}</div><div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{msg.reply_preview}</div></div>}
          {msg.ephemeral_seconds&&!isDeleted&&<div style={{fontSize:10,color:'#f59e0b',padding:'0 4px'}}>⏳ éphémère</div>}
          <div style={{position:'relative'}}>
            {isDeleted
              ?<div style={{padding:'8px 14px',borderRadius:18,fontSize:13,fontStyle:'italic',color:'var(--muted)',background:'var(--bg3)',border:'1px dashed var(--border)'}}>🗑 Supprimé</div>
              :<>
                {msg.file_url&&(isImage
                  ?<img src={msg.file_url} alt="" style={{maxWidth:260,maxHeight:200,borderRadius:14,cursor:'pointer',display:'block'}} onClick={()=>window.open(msg.file_url!,'_blank')}/>
                  :<a href={msg.file_url} target="_blank" rel="noreferrer" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'11px 15px',display:'flex',alignItems:'center',gap:11,textDecoration:'none',color:'var(--text)'}}><div style={{width:34,height:34,borderRadius:8,background:'rgba(124,106,247,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{FILE_ICONS[ext]||'📎'}</div><div><div style={{fontSize:13,fontWeight:500}}>{msg.file_name}</div></div></a>
                )}
                {msg.audio_url&&<AudioPlayer url={msg.audio_url} isMe={isMe}/>}
                {msg.content&&(msg.is_sticker
                  ?<div style={{fontSize:msg.is_custom_sticker?16:52,lineHeight:1,padding:msg.is_custom_sticker?'10px 16px':4,background:msg.is_custom_sticker?(cs?.bg_color||'#7c6af7'):'transparent',borderRadius:msg.is_custom_sticker?14:0,color:msg.is_custom_sticker?(cs?.text_color||'white'):undefined,fontWeight:msg.is_custom_sticker?700:undefined}}>{msg.content}</div>
                  :<div style={{padding:'10px 14px',borderRadius:18,fontSize:14,lineHeight:1.6,wordBreak:'break-word',background:isMe?'var(--me-bubble)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'var(--me-text)':'var(--text)'}}>{msg.content}</div>
                )}
                {/* Action bar on hover */}
                {hoverMsgId===msg.id&&<div style={{position:'absolute',[isMe?'right':'left']:0,bottom:'100%',marginBottom:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:30,padding:'4px 8px',display:'flex',gap:2,zIndex:10,boxShadow:'0 6px 20px rgba(0,0,0,.5)',whiteSpace:'nowrap'}}>
                  {QUICK_REACTIONS.map(e=><button key={e} onClick={()=>{const ex=reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e);if(ex)supabase.from('reactions').delete().eq('id',ex.id);else{supabase.from('reactions').insert({message_id:msg.id,username:user,emoji:e});addPts(user,1,'Réaction')};setHoverMsgId(null)}} style={{fontSize:18,background:'none',border:'none',cursor:'pointer',padding:'2px 3px',borderRadius:6,transform:reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e)?'scale(1.3)':'scale(1)'}}>{e}</button>)}
                  <button onClick={()=>{setReplyTo({id:msg.id,content:msg.content,author:msg.username});inputRef.current?.focus()}} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:6,color:'var(--muted)'}}>↩️</button>
                  <button onClick={()=>loadComments(msg.id)} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:6,color:'var(--muted)'}}>💬</button>
                  {isMe&&<button onClick={()=>deleteMessage(msg.id)} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:6,color:'#f87171'}}>🗑</button>}
                </div>}
              </>
            }
          </div>
          {Object.keys(rxns).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,padding:'0 4px'}}>{Object.entries(rxns).map(([e,u])=><button key={e} onClick={()=>{const ex=reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e);if(ex)supabase.from('reactions').delete().eq('id',ex.id);else supabase.from('reactions').insert({message_id:msg.id,username:user,emoji:e})}} style={{background:u.includes(user)?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${u.includes(user)?'rgba(124,106,247,.5)':'var(--border)'}`,borderRadius:20,padding:'2px 8px',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>{e}<span style={{fontSize:10,color:'var(--muted)'}}>{u.length}</span></button>)}</div>}
          {msgComments.length>0&&!isDeleted&&<button onClick={()=>loadComments(msg.id)} style={{fontSize:11,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',padding:'0 4px'}}>💬 {msgComments.length} commentaire{msgComments.length>1?'s':''}</button>}
          <div style={{fontSize:10,color:'var(--muted)',padding:'0 4px'}}>{date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
    if(commentTarget===msg.id)items.push(
      <div key={`cmt-${msg.id}`} style={{marginLeft:42,background:'var(--bg3)',borderRadius:14,padding:12,marginTop:2,marginBottom:4}}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:'var(--muted)'}}>💬 Commentaires</div>
        {(comments[msg.id]||[]).map(c=>(
          <div key={c.id} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
            <div style={{width:24,height:24,borderRadius:'50%',background:getProfile(c.username).avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>{getProfile(c.username).avatar_emoji}</div>
            <div style={{background:'var(--bg2)',borderRadius:10,padding:'6px 10px',flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--accent2)',marginBottom:2}}>{c.username}</div>
              <div style={{fontSize:13}}>{c.content}</div>
            </div>
          </div>
        ))}
        <div style={{display:'flex',gap:6,marginTop:8}}>
          <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendComment()} placeholder="Commenter..." style={{flex:1,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:'6px 12px',color:'var(--text)',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
          <button onClick={sendComment} style={{background:'var(--accent)',border:'none',borderRadius:20,padding:'6px 12px',color:'white',cursor:'pointer',fontSize:12}}>↵</button>
          <button onClick={()=>setCommentTarget(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:15}}>✕</button>
        </div>
      </div>
    )
    return items
  })

  const renderDMs=(dms:DM[])=>dms.map(dm=>{
    const isMe=dm.from_user===user
    const ext=(dm.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage=['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    const p=getProfile(dm.from_user)
    return(
      <div key={dm.id} style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:isMe?'row-reverse':'row',animation:'slideUp .2s ease'}}>
        <div style={{width:30,height:30,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>
          {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:p.avatar_emoji}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3,maxWidth:'65%',alignItems:isMe?'flex-end':'flex-start'}}>
          {dm.reply_author&&<div style={{background:'var(--bg3)',borderLeft:'3px solid var(--accent)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--muted)',marginBottom:2}}><div style={{fontWeight:600,fontSize:11,color:'var(--accent2)',marginBottom:2}}>↩️ {dm.reply_author}</div><div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{dm.reply_preview}</div></div>}
          {dm.ephemeral_seconds&&<div style={{fontSize:10,color:'#f59e0b',padding:'0 4px'}}>⏳ éphémère</div>}
          {dm.file_url&&(isImage?<img src={dm.file_url} alt="" style={{maxWidth:240,borderRadius:14,cursor:'pointer'}} onClick={()=>window.open(dm.file_url!,'_blank')}/>:<a href={dm.file_url} target="_blank" rel="noreferrer" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,textDecoration:'none',color:'var(--text)'}}><div style={{width:28,height:28,borderRadius:6,background:'rgba(124,106,247,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{FILE_ICONS[ext]||'📎'}</div><div style={{fontSize:13,fontWeight:500}}>{dm.file_name}</div></a>)}
          {dm.audio_url&&<AudioPlayer url={dm.audio_url} isMe={isMe}/>}
          {dm.content&&(dm.is_sticker?<div style={{fontSize:46,lineHeight:1}}>{dm.content}</div>:<div style={{padding:'10px 14px',borderRadius:18,fontSize:14,background:isMe?'var(--me-bubble)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'var(--me-text)':'var(--text)'}}>{dm.content}</div>)}
          <div style={{fontSize:10,color:'var(--muted)',padding:'0 4px'}}>{new Date(dm.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
  })

  // ── GAME PANEL ────────────────────────────────────────
  const GamePanel=()=>{
    if(!activeGame||activeGame.status==='waiting')return null
    const isP1=activeGame.player1===user
    const opp=isP1?activeGame.player2:activeGame.player1
    const s=activeGame.state
    const isMyTurn=(activeGame.game_type==='tictactoe'&&s.currentTurn===(isP1?'X':'O'))||(activeGame.game_type==='rps'&&!(isP1?s.player1Choice:s.player2Choice))||(activeGame.game_type==='quiz'&&!(isP1?s.p1Answer:s.p2Answer))
    return(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(8px)'}}>
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:24,padding:24,width:400,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:17}}>{GAMES_LIST.find(g=>g.id===activeGame.game_type)?.emoji} {GAMES_LIST.find(g=>g.id===activeGame.game_type)?.name}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {activeGame.bet_points>0&&<div style={{background:'rgba(251,191,36,.2)',border:'1px solid rgba(251,191,36,.4)',borderRadius:20,padding:'3px 10px',fontSize:12,color:'#fbbf24'}}>🎲 {activeGame.bet_points} pts</div>}
              <button onClick={()=>setActiveGame(null)} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'var(--muted)',fontFamily:'inherit'}}>✕</button>
            </div>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:12,textAlign:'center'}}>vs <strong style={{color:'var(--text)'}}>{opp}</strong> {activeGame.status==='active'&&(isMyTurn?<span style={{color:'var(--accent2)'}}> • Ton tour !</span>:<span> • Tour de {opp}</span>)}</div>

          {(activeGame.status==='finished'||activeGame.status==='draw')&&(
            <div style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:44,marginBottom:8}}>{activeGame.winner===user?'🏆':activeGame.status==='draw'?'🤝':'😢'}</div>
              <div style={{fontSize:20,fontWeight:700,color:activeGame.winner===user?'#34d399':activeGame.status==='draw'?'var(--muted)':'#f87171'}}>{activeGame.winner===user?'Victoire !':activeGame.status==='draw'?'Égalité !':'Défaite'}</div>
              {activeGame.winner===user&&<div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>+{15+(activeGame.bet_points||0)*2} pts</div>}
              <button onClick={()=>{supabase.from('games').update({status:'finished'}).eq('id',activeGame.id);setActiveGame(null)}} style={{marginTop:16,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:'10px 20px',cursor:'pointer',fontFamily:'inherit',fontSize:14}}>Fermer</button>
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='tictactoe'&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {s.board.map((cell:any,i:number)=>(
                <button key={i} onClick={()=>isMyTurn&&!cell&&makeGameMove({index:i})} style={{height:76,borderRadius:12,border:`2px solid ${cell?'rgba(124,106,247,.4)':'var(--border)'}`,background:cell?'rgba(124,106,247,.1)':'var(--bg3)',fontSize:34,cursor:isMyTurn&&!cell?'pointer':'default',color:cell==='X'?'var(--accent2)':'#f87171',fontWeight:700,transition:'all .1s'}}>{cell||''}</button>
              ))}
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='rps'&&(
            <div>
              <div style={{textAlign:'center',marginBottom:12,fontSize:13,color:'var(--muted)'}}>Manche {s.round} • {isP1?s.scores.p1:s.scores.p2} – {isP1?s.scores.p2:s.scores.p1}</div>
              {isMyTurn?<div style={{display:'flex',gap:10}}>{[{k:'rock',e:'✊'},{k:'paper',e:'🖐️'},{k:'scissors',e:'✌️'}].map(({k,e})=><button key={k} onClick={()=>makeGameMove({choice:k})} style={{flex:1,padding:'14px 8px',borderRadius:12,border:'1px solid var(--border)',background:'var(--bg3)',fontSize:30,cursor:'pointer',transition:'all .1s'}} onMouseEnter={ev=>(ev.currentTarget as HTMLElement).style.background='rgba(124,106,247,.2)'} onMouseLeave={ev=>(ev.currentTarget as HTMLElement).style.background='var(--bg3)'}>{e}</button>)}</div>:<div style={{textAlign:'center',padding:16,fontSize:14,color:'var(--muted)'}}>⏳ En attente de {opp}...</div>}
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='quiz'&&s.question&&(
            <div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Q{s.currentQ+1}/5 • {isP1?s.p1Score:s.p2Score}–{isP1?s.p2Score:s.p1Score}</div>
              <div style={{fontWeight:600,fontSize:15,marginBottom:12,padding:'12px',background:'var(--bg3)',borderRadius:12}}>{s.question.q}</div>
              {isMyTurn?<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{s.question.opts.map((opt:string)=><button key={opt} onClick={()=>makeGameMove({answer:opt})} style={{padding:'10px 8px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg3)',cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:13}}>{opt}</button>)}</div>:<div style={{textAlign:'center',padding:12,fontSize:13,color:'var(--accent2)'}}>✅ En attente de {opp}...</div>}
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='hangman'&&(
            <div>
              <div style={{textAlign:'center',marginBottom:14}}>
                <div style={{fontSize:26,letterSpacing:8,fontFamily:'monospace',marginBottom:8}}>{(s.word as string).split('').map((l:string)=>s.guesses.includes(l)?l:'_').join(' ')}</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>{'💀'.repeat(s.wrong)}{'⬜'.repeat(6-s.wrong)} {s.wrong}/6</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=><button key={l} disabled={s.guesses.includes(l)} onClick={()=>makeGameMove({letter:l})} style={{padding:'7px 3px',borderRadius:6,border:'1px solid var(--border)',background:s.guesses.includes(l)?'var(--bg3)':'var(--bg2)',cursor:s.guesses.includes(l)?'default':'pointer',color:s.guesses.includes(l)?'var(--muted)':'var(--text)',fontFamily:'inherit',fontSize:11,opacity:s.guesses.includes(l)?0.4:1}}>{l}</button>)}
              </div>
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='wordle'&&(
            <div>
              <div style={{marginBottom:12}}>
                {(s.guesses as string[]).map((g:string,gi:number)=>(
                  <div key={gi} style={{display:'flex',gap:4,marginBottom:4,justifyContent:'center'}}>
                    {g.split('').map((l,li)=>{const ok=s.word[li]===l;const has=!ok&&s.word.includes(l);return<div key={li} style={{width:42,height:42,borderRadius:8,background:ok?'#34d399':has?'#f59e0b':'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:17,color:ok||has?'white':'var(--text)'}}>{l}</div>})}
                  </div>
                ))}
                {s.guesses.length<6&&<div style={{display:'flex',gap:4,justifyContent:'center'}}>
                  {Array(5).fill(0).map((_,i)=><div key={i} style={{width:42,height:42,borderRadius:8,background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:17}}>{wordleGuess[i]||''}</div>)}
                </div>}
              </div>
              <input value={wordleGuess} onChange={e=>setWordleGuess(e.target.value.toUpperCase().slice(0,5))} onKeyDown={e=>e.key==='Enter'&&wordleGuess.length===5&&makeGameMove({guess:wordleGuess})} placeholder="Mot de 5 lettres..." maxLength={5} style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',textTransform:'uppercase'}}/>
              <button onClick={()=>wordleGuess.length===5&&makeGameMove({guess:wordleGuess})} style={{width:'100%',marginTop:8,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:10,padding:10,cursor:'pointer',fontFamily:'inherit',fontSize:14}}>Valider ↵</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LOGIN ─────────────────────────────────────────────
  if(step==='login')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)'}}>
      <div style={{background:'#15151d',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'44px 40px',width:360,display:'flex',flexDirection:'column',gap:20,boxShadow:'0 30px 80px rgba(0,0,0,.8)'}}>
        <div style={{fontSize:52,textAlign:'center'}}>💬</div>
        <div style={{fontSize:24,fontWeight:700,textAlign:'center',color:'#e4e2f0'}}>Chat App</div>
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Ton pseudo..." maxLength={20} autoFocus style={{background:'#1c1c27',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'13px 16px',color:'#e4e2f0',fontFamily:'inherit',fontSize:15,outline:'none'}} onFocus={e=>(e.target.style.borderColor='#7c6af7')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.07)')}/>
        <button onClick={handleLogin} style={{background:'linear-gradient(135deg,#7c6af7,#a78bfa)',color:'white',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,fontFamily:'inherit',cursor:'pointer',boxShadow:'0 4px 20px rgba(124,106,247,.4)'}}>Rejoindre →</button>
      </div>
    </div>
  )

  if(step==='setup')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)',padding:20,overflowY:'auto'}}>
      <div style={{background:'var(--bg2)',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'32px',width:440,display:'flex',flexDirection:'column',gap:16,boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
        <div style={{fontSize:20,fontWeight:700}}>Crée ton profil 🎨</div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div onClick={()=>avatarRef.current?.click()} style={{width:68,height:68,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,cursor:'pointer',overflow:'hidden',border:'3px solid var(--accent)',position:'relative'}}>
            {avatarFile?<img src={URL.createObjectURL(avatarFile)} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:avatarEmoji}
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'.2s'}} onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>📷</div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&setAvatarFile(e.target.files[0])}/>
          <div><div style={{fontWeight:600,fontSize:16}}>{user}</div><div style={{fontSize:12,color:'var(--muted)'}}>Clique pour changer la photo</div></div>
        </div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6,fontWeight:500}}>Couleur</div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>setAvatarColor(c)} style={{width:30,height:30,borderRadius:'50%',background:c,border:avatarColor===c?'3px solid white':'3px solid transparent',cursor:'pointer',transform:avatarColor===c?'scale(1.15)':'scale(1)',transition:'transform .1s'}}/>)}</div></div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:5,fontWeight:500}}>Emoji</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:4}}>{EMOJIS_NORMAL.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:19,padding:4,background:avatarEmoji===e?'rgba(124,106,247,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:7}}>{e}</button>)}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3}}>{EMOJIS_COD.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:19,padding:4,background:avatarEmoji===e?'rgba(200,162,0,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:7}}>{e}</button>)}</div>
        </div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6,fontWeight:500}}>Thème</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>{Object.entries(THEME_LABELS).map(([k,v])=><button key={k} onClick={()=>setTheme(k)} style={{padding:'7px 4px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:9,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11,fontWeight:theme===k?600:400}}>{v}</button>)}</div></div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6,fontWeight:500}}>Statut</div><div style={{display:'flex',gap:5}}>{(['online','away','busy','gaming'] as const).map(s=><button key={s} onClick={()=>setUserStatus(s)} style={{flex:1,padding:'7px 4px',background:userStatus===s?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${userStatus===s?'var(--accent)':'var(--border)'}`,borderRadius:9,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11}}>{statusEmoji(s)} {s}</button>)}</div></div>
        <input value={bio} onChange={e=>setBio(e.target.value)} placeholder="Ta bio..." maxLength={80} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:11,padding:'11px 15px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none'}}/>
        <button onClick={handleSetup} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:13,fontSize:14,fontWeight:600,fontFamily:'inherit',cursor:'pointer',boxShadow:'0 4px 20px rgba(124,106,247,.35)'}}>Commencer 🚀</button>
      </div>
    </div>
  )

  // ── MAIN APP ──────────────────────────────────────────
  const myProfile=profile||getProfile(user)
  const allConvosArr=Array.from(new Set([...pinnedConvos.map(p=>p.target),...dmConvos,...onlineUsers.filter(u=>u.username!==user).map(u=>u.username)]))

  return(
    <div style={{display:'flex',height:'100vh',background:'var(--bg)',overflow:'hidden',color:'var(--text)'}}>
      {/* SIDEBAR */}
      <div style={{width:255,background:'var(--bg2)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setViewProfile(myProfile)}>
          <div style={{position:'relative',width:38,height:38,borderRadius:'50%',overflow:'hidden',background:myProfile.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>
            {myProfile.avatar_url?<img src={myProfile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:myProfile.avatar_emoji}
            <div style={{position:'absolute',bottom:0,right:0,width:11,height:11,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)'}}/>
          </div>
          <div style={{flex:1,overflow:'hidden'}}>
            <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{statusEmoji(userStatus)} {userStatus}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();setShowThemes(p=>!p)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,color:'var(--muted)',padding:4,borderRadius:7}}>🎨</button>
        </div>

        {showThemes&&(
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg3)'}}>
            <div style={{fontSize:10,color:'var(--muted)',marginBottom:5,fontWeight:700,letterSpacing:'1px'}}>THÈME</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:4}}>
              {Object.entries(THEME_LABELS).map(([k,v])=><button key={k} onClick={()=>{setTheme(k);localStorage.setItem('chat_theme',k)}} style={{padding:'6px 4px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg2)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:10,fontWeight:theme===k?600:400}}>{v}</button>)}
            </div>
          </div>
        )}

        <div style={{padding:'5px 7px',display:'flex',flexDirection:'column',gap:1}}>
          {[{v:'chat',l:'💬 Chat',badge:onlineUsers.length},{v:'members',l:'👥 Membres'},{v:'map',l:'🗺️ Carte'}].map(({v,l,badge})=>(
            <button key={v} onClick={()=>{setView(v as any);setDmTarget(null)}} style={{width:'100%',padding:'8px 11px',borderRadius:9,border:'none',background:view===v?'rgba(124,106,247,.2)':'transparent',color:view===v?'var(--accent2)':'var(--muted)',cursor:'pointer',textAlign:'left',fontSize:13,fontFamily:'inherit',fontWeight:view===v?600:400,display:'flex',alignItems:'center',gap:7,transition:'all .15s'}}>
              {l}{badge&&<span style={{marginLeft:'auto',fontSize:10,background:'var(--accent)',color:'white',borderRadius:10,padding:'1px 6px'}}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* Ephemeral toggle */}
        <div style={{padding:'6px 12px',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setEphemeralMode(p=>!p)} style={{flex:1,padding:'6px 10px',borderRadius:9,border:`1px solid ${ephemeralMode?'rgba(245,158,11,.5)':'var(--border)'}`,background:ephemeralMode?'rgba(245,158,11,.1)':'transparent',color:ephemeralMode?'#f59e0b':'var(--muted)',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:ephemeralMode?600:400,display:'flex',alignItems:'center',gap:6}}>
              ⏳ {ephemeralMode?`Éphémère ${ephemeralSecs}s`:'Mode éphémère'}
            </button>
            {ephemeralMode&&<select value={ephemeralSecs} onChange={e=>setEphemeralSecs(Number(e.target.value))} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:7,padding:'5px 7px',color:'var(--text)',fontFamily:'inherit',fontSize:11,outline:'none'}}>
              {[10,30,60,300].map(s=><option key={s} value={s}>{s<60?`${s}s`:`${s/60}min`}</option>)}
            </select>}
          </div>
        </div>

        <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',padding:'6px 14px 3px'}}>Messages privés</div>
        <div style={{flex:1,overflowY:'auto',padding:'0 7px 8px'}}>
          {allConvosArr.map(username=>{
            const p=getProfile(username)
            const pres=onlineUsers.find(u=>u.username===username)
            const pin=pinnedConvos.find(x=>x.target===username)
            const isActive=view==='dm'&&dmTarget===username
            const isBlocked=blockedUsers.includes(username)
            return(
              <div key={username} style={{display:'flex',alignItems:'center',gap:2,opacity:isBlocked?.5:1}}>
                <button onClick={()=>openDM(username)} style={{flex:1,padding:'7px 9px',borderRadius:9,border:'none',background:isActive?'rgba(124,106,247,.2)':'transparent',cursor:isBlocked?'not-allowed':'pointer',textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8,transition:'background .15s'}}>
                  <div style={{position:'relative',width:30,height:30,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>
                    {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:p.avatar_emoji}
                    {pres&&!isBlocked&&<div style={{position:'absolute',bottom:0,right:0,width:9,height:9,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)'}}/>}
                    {isBlocked&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🚫</div>}
                  </div>
                  <div style={{overflow:'hidden',flex:1}}>
                    <div style={{fontSize:12,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pin?'📌 ':''}{pin?.custom_name||username}</div>
                    <div style={{fontSize:10,color:isBlocked?'#f87171':pres?'#34d399':'var(--muted)'}}>{isBlocked?'Bloqué':pres?'En ligne':'Hors ligne'}</div>
                  </div>
                </button>
                <button onClick={()=>{const pinExists=pinnedConvos.find(x=>x.target===username);if(pinExists){supabase.from('pinned_convos').delete().eq('owner',user).eq('target',username).then(()=>setPinnedConvos(p=>p.filter(x=>x.target!==username)));toast$('Désépinglé')}else{setPinModal(username);setPinName('')}}} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--muted)',padding:4,opacity:.6}}>{pinnedConvos.find(x=>x.target===username)?'📌':'📍'}</button>
              </div>
            )
          })}
        </div>
        <div style={{padding:'8px 14px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#34d399',justifyContent:'center'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block'}}/>{onlineUsers.length} en ligne
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{padding:'11px 18px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#34d399',boxShadow:'0 0 6px #34d39977'}}/>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{view==='dm'&&dmTarget?`${getProfile(dmTarget).avatar_emoji} ${pinnedConvos.find(x=>x.target===dmTarget)?.custom_name||dmTarget}`:view==='members'?'👥 Membres':view==='map'?'🗺️ Carte':'🌐 Chat général'}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{connStatus}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <button onClick={()=>setShowPoints(true)} style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:20,padding:'5px 11px',fontSize:12,color:'#fbbf24',fontWeight:600,cursor:'pointer'}}>⭐ {userPoints?.points||0} pts</button>
            {view==='dm'&&dmTarget&&<button onClick={()=>setShowGames(true)} style={{background:'rgba(124,106,247,.15)',border:'1px solid rgba(124,106,247,.3)',borderRadius:20,padding:'5px 11px',fontSize:12,color:'var(--accent2)',cursor:'pointer'}}>🎮 Jouer</button>}
          </div>
        </header>

        {/* MEMBERS */}
        {view==='members'&&(
          <div style={{flex:1,overflowY:'auto',padding:18}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>{Object.keys(profiles).length} membres • {onlineUsers.length} en ligne</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:10}}>
              {Object.values(profiles).map(p=>{
                const isOnline=onlineUsers.some(u=>u.username===p.username)
                const isBlocked=blockedUsers.includes(p.username)
                return(
                  <div key={p.username} onClick={()=>setViewProfile(p)} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:14,cursor:'pointer',transition:'border-color .2s',opacity:isBlocked?.5:1}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                    <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:8}}>
                      <div style={{position:'relative',width:40,height:40,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                        {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:p.avatar_emoji}
                        {isOnline&&<div style={{position:'absolute',bottom:1,right:1,width:10,height:10,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)'}}/>}
                      </div>
                      <div style={{overflow:'hidden'}}>
                        <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.username}</div>
                        <div style={{fontSize:10,color:isOnline?'#34d399':'var(--muted)'}}>{isOnline?'🟢 En ligne':'⚫ Hors ligne'}</div>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.bio||'Pas de bio'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MAP */}
        {view==='map'&&(
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div ref={mapRef} style={{flex:1}}/>
            {!mapLoaded&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',flexDirection:'column',gap:12}}>
              <div style={{fontSize:32}}>🗺️</div>
              <div style={{fontSize:14,color:'var(--muted)'}}>Chargement de la carte...</div>
            </div>}
          </div>
        )}

        {/* MESSAGES */}
        {(view==='chat'||view==='dm')&&(
          <>
            <div ref={messagesRef} style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:7}}>
              {view==='chat'?renderMsgs(filteredMessages).flat():renderDMs(dms)}
            </div>

            {replyTo&&(
              <div style={{padding:'7px 14px',background:'var(--bg3)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                <div style={{borderLeft:'3px solid var(--accent)',paddingLeft:10,flex:1}}>
                  <div style={{fontSize:11,color:'var(--accent2)',fontWeight:600,marginBottom:2}}>↩️ {replyTo.author}</div>
                  <div style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{replyTo.content||'📎'}</div>
                </div>
                <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:17}}>✕</button>
              </div>
            )}

            <div style={{padding:'10px 14px 14px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:7,flexShrink:0,position:'relative'}}>
              {selectedFile&&<div style={{background:'var(--bg3)',border:'1px solid rgba(124,106,247,.4)',borderRadius:9,padding:'8px 12px',fontSize:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span>📎 {selectedFile.name}</span><button onClick={()=>setSelectedFile(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14}}>✕</button></div>}
              {isRecording&&<div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:9,padding:'8px 12px',fontSize:12,display:'flex',alignItems:'center',gap:8,color:'#f87171'}}><span style={{width:7,height:7,borderRadius:'50%',background:'#f87171',display:'inline-block'}}/>🎤 {recordingTime}s<button onClick={stopRecording} style={{marginLeft:'auto',background:'#f87171',border:'none',borderRadius:7,padding:'3px 10px',color:'white',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>Envoyer ✓</button><button onClick={()=>{if(mediaRecorderRef.current)mediaRecorderRef.current.stream?.getTracks().forEach(t=>t.stop());setIsRecording(false);clearInterval(recordingTimerRef.current)}} style={{background:'none',border:'none',cursor:'pointer',color:'#f87171',fontSize:14}}>✕</button></div>}

              {pickerOpen&&(
                <div style={{position:'absolute',bottom:72,left:14,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,padding:11,width:315,maxHeight:350,overflowY:'auto',boxShadow:'0 20px 50px rgba(0,0,0,.7)',zIndex:50}}>
                  <div style={{display:'flex',gap:3,marginBottom:9,position:'sticky',top:0,background:'var(--bg2)',paddingBottom:5}}>
                    {(['emoji','sticker','cod','custom','create'] as const).map(t=><button key={t} onClick={()=>setPickerTab(t)} style={{flex:1,padding:'5px 2px',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:10,background:pickerTab===t?'rgba(124,106,247,.2)':'transparent',color:pickerTab===t?'var(--accent2)':'var(--muted)',fontWeight:pickerTab===t?600:400}}>{t==='emoji'?'😊':t==='sticker'?'✨':t==='cod'?'🎮':t==='custom'?'⭐':'➕'}</button>)}
                  </div>
                  {pickerTab==='emoji'&&<div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:2}}>{ALL_EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} style={{fontSize:21,padding:4,border:'none',background:'transparent',cursor:'pointer',borderRadius:7,lineHeight:1}}>{e}</button>)}</div>}
                  {pickerTab==='sticker'&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>{STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:30,padding:5,border:'none',background:'transparent',cursor:'pointer',borderRadius:9,lineHeight:1}}>{s}</button>)}</div>}
                  {pickerTab==='cod'&&<><div style={{fontSize:10,color:'var(--muted)',marginBottom:5,fontWeight:600}}>🎮 CoD Pack</div><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>{COD_STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:26,padding:5,border:'1px solid rgba(200,162,0,.2)',background:'rgba(200,162,0,.1)',cursor:'pointer',borderRadius:9,lineHeight:1}}>{s}</button>)}</div></>}
                  {pickerTab==='custom'&&<div>{customStickers.length===0?<div style={{color:'var(--muted)',fontSize:12,textAlign:'center',padding:14}}>Aucun sticker perso. Crée-en un ➕</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>{customStickers.map(s=><button key={s.id} onClick={()=>sendSticker(s.content,true)} style={{background:s.bg_color,color:s.text_color,border:'none',borderRadius:10,padding:'8px',cursor:'pointer',fontWeight:700,fontSize:12,lineHeight:1.3,wordBreak:'break-word'}}>{s.content}<div style={{fontSize:9,opacity:.7,marginTop:2}}>par {s.creator}</div></button>)}</div>}</div>}
                  {pickerTab==='create'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <textarea value={csText} onChange={e=>setCsText(e.target.value)} placeholder="Texte du sticker..." maxLength={40} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:9,padding:9,color:'var(--text)',fontFamily:'inherit',fontSize:13,outline:'none',height:56,resize:'none'}}/>
                    <div><div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>Fond</div><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>setCsBg(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:csBg===c?'3px solid white':'2px solid transparent',cursor:'pointer'}}/>)}</div></div>
                    <div><div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>Texte</div><div style={{display:'flex',gap:5}}>{['#ffffff','#000000','#fbbf24','#34d399','#f87171'].map(c=><button key={c} onClick={()=>setCsColor(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:csColor===c?'3px solid var(--accent)':'2px solid var(--border)',cursor:'pointer'}}/>)}</div></div>
                    {csText&&<div style={{background:csBg,color:csColor,borderRadius:10,padding:'9px 12px',fontWeight:700,fontSize:14,textAlign:'center'}}>{csText}</div>}
                    <button onClick={async()=>{if(!csText.trim())return;await supabase.from('custom_stickers').insert({creator:user,content:csText.trim(),bg_color:csBg,text_color:csColor});toast$('✅ Sticker créé !');setCsText('');addPts(user,5,'Sticker créé')}} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:9,padding:'9px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Créer (+5 pts) ✨</button>
                  </div>}
                </div>
              )}

              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <button onClick={()=>setPickerOpen(p=>!p)} style={{width:36,height:36,borderRadius:9,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>😊</button>
                <button onClick={()=>fileRef.current?.click()} style={{width:36,height:36,borderRadius:9,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>📎</button>
                <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>25*1024*1024){toast$('Max 25 Mo');return}setSelectedFile(f)}}}/>
                <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} style={{width:36,height:36,borderRadius:9,background:isRecording?'rgba(248,113,113,.2)':'var(--bg3)',border:`1px solid ${isRecording?'rgba(248,113,113,.5)':'var(--border)'}`,color:isRecording?'#f87171':'var(--muted)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🎤</button>
                <textarea ref={inputRef} value={text} onChange={e=>{setText(e.target.value);autoResize(e.target)}} onKeyDown={handleKey} placeholder={view==='dm'&&dmTarget?`Message à ${dmTarget}...`:'Message...'} style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:13,padding:'9px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',resize:'none',height:40,maxHeight:110,lineHeight:1.4}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
                <button onClick={send} disabled={sending} style={{width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',color:'white',cursor:sending?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sending?.5:1,boxShadow:'0 4px 12px rgba(124,106,247,.35)'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* GAME PANEL */}
      {activeGame&&activeGame.status!=='waiting'&&<GamePanel/>}

      {/* GAME INVITE */}
      {gameInvite&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(8px)'}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:26,width:310,textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.7)'}}>
            <div style={{fontSize:38,marginBottom:10}}>🎮</div>
            <div style={{fontWeight:700,fontSize:17,marginBottom:6}}>{gameInvite.player1} t'invite !</div>
            <div style={{color:'var(--muted)',fontSize:13,marginBottom:8}}>{GAMES_LIST.find(g=>g.id===gameInvite.game_type)?.name}</div>
            {gameInvite.bet_points>0&&<div style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:9,padding:'5px 12px',marginBottom:12,fontSize:12,color:'#fbbf24'}}>🎲 Mise: {gameInvite.bet_points} pts</div>}
            <div style={{display:'flex',gap:9}}>
              <button onClick={async()=>{if(gameInvite.bet_points>(userPoints?.points||0)){toast$('Pas assez de pts !');return};await supabase.from('games').update({status:'active'}).eq('id',gameInvite.id);setActiveGame({...gameInvite,status:'active'});setGameInvite(null)}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:11,padding:11,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>✅ Accepter</button>
              <button onClick={()=>{supabase.from('games').update({status:'declined'}).eq('id',gameInvite.id);setGameInvite(null)}} style={{flex:1,background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:11,padding:11,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>❌ Refuser</button>
            </div>
          </div>
        </div>
      )}

      {/* GAMES MODAL */}
      {showGames&&dmTarget&&(
        <div onClick={()=>setShowGames(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:24,width:340,boxShadow:'0 20px 60px rgba(0,0,0,.7)'}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:5}}>🎮 Jouer avec {dmTarget}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Tes pts: {userPoints?.points||0} • {ptsFCFA(userPoints?.points||0)}</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:7}}>Mise de points (optionnel)</div>
              <div style={{display:'flex',gap:5}}>{[0,10,50,100].map(b=><button key={b} onClick={()=>setGameBet(b)} style={{flex:1,padding:'6px 4px',background:gameBet===b?'rgba(251,191,36,.2)':'var(--bg3)',border:`1px solid ${gameBet===b?'rgba(251,191,36,.5)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:gameBet===b?'#fbbf24':'var(--text)',fontFamily:'inherit',fontSize:11}}>{b===0?'0':b+' pts'}</button>)}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {GAMES_LIST.map(g=><button key={g.id} onClick={()=>inviteToGame(g.id,dmTarget,gameBet)} style={{padding:'12px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',textAlign:'left',display:'flex',alignItems:'center',gap:10}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}><span style={{fontSize:24}}>{g.emoji}</span><div><div style={{fontWeight:600,fontSize:13}}>{g.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{g.desc}</div></div></button>)}
            </div>
          </div>
        </div>
      )}

      {/* POINTS MODAL */}
      {showPoints&&(
        <div onClick={()=>setShowPoints(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:22,padding:26,width:340,boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            <div style={{fontWeight:700,fontSize:19,marginBottom:4}}>⭐ Mes Points</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>10 pts = 5 FCFA • Min. 1000 pts pour retirer</div>
            <div style={{background:'linear-gradient(135deg,rgba(251,191,36,.12),rgba(251,191,36,.05))',border:'1px solid rgba(251,191,36,.3)',borderRadius:14,padding:18,textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:38,fontWeight:700,color:'#fbbf24'}}>{userPoints?.points||0}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>points</div>
              <div style={{fontSize:16,color:'#fbbf24',marginTop:5,fontWeight:600}}>{ptsFCFA(userPoints?.points||0)}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              <div style={{background:'var(--bg3)',borderRadius:10,padding:11,textAlign:'center'}}><div style={{fontWeight:700,fontSize:16,color:'var(--accent2)'}}>{userPoints?.total_earned||0}</div><div style={{fontSize:11,color:'var(--muted)'}}>Total gagné</div></div>
              <div style={{background:'var(--bg3)',borderRadius:10,padding:11,textAlign:'center'}}><div style={{fontWeight:700,fontSize:16,color:'#f97316'}}>🔥 {userPoints?.streak_days||0}j</div><div style={{fontSize:11,color:'var(--muted)'}}>Série</div></div>
            </div>
            <div style={{background:'var(--bg3)',borderRadius:10,padding:11,marginBottom:14,fontSize:11,color:'var(--muted)',lineHeight:1.7}}>
              <div style={{fontWeight:600,color:'var(--text)',marginBottom:4}}>Gagner des points</div>
              <div>🌅 Connexion: +10 pts (série +15/+20)</div>
              <div>💬 Message: +1 • Sticker: +2 • Créer: +5</div>
              <div>🎮 Victoire: +15 + mise×2 • Défaite: -mise</div>
            </div>
            <button onClick={()=>{setShowPoints(false);setShowWithdraw(true)}} style={{width:'100%',background:(userPoints?.points||0)>=1000?'linear-gradient(135deg,#f59e0b,#fbbf24)':'var(--bg3)',color:(userPoints?.points||0)>=1000?'#000':'var(--muted)',border:(userPoints?.points||0)<1000?'1px solid var(--border)':'none',borderRadius:11,padding:12,fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:(userPoints?.points||0)>=1000?'pointer':'not-allowed'}}>
              {(userPoints?.points||0)>=1000?`💰 Retirer ${ptsFCFA(userPoints?.points||0)}`:`⛔ Encore ${1000-(userPoints?.points||0)} pts`}
            </button>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdraw&&(
        <div onClick={()=>setShowWithdraw(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:160,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:18,padding:24,width:320,boxShadow:'0 20px 60px rgba(0,0,0,.7)'}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:14}}>💰 Retrait Mobile Money</div>
            <div style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:10,padding:10,marginBottom:14,textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:700,color:'#fbbf24'}}>{ptsFCFA(userPoints?.points||0)}</div>
            </div>
            <div style={{display:'flex',gap:5,marginBottom:9}}>
              {['Bénin','Togo','Côte d\'Ivoire','Sénégal'].map(c=><button key={c} onClick={()=>setWithdrawCountry(c)} style={{flex:1,padding:'6px 3px',background:withdrawCountry===c?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${withdrawCountry===c?'var(--accent)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:9}}>{c}</button>)}
            </div>
            <div style={{display:'flex',gap:5,marginBottom:9}}>
              {['MTN','Moov','Orange','Wave'].map(n=><button key={n} onClick={()=>setWithdrawNetwork(n)} style={{flex:1,padding:'6px 4px',background:withdrawNetwork===n?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${withdrawNetwork===n?'var(--accent)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11}}>{n}</button>)}
            </div>
            <input value={withdrawPhone} onChange={e=>setWithdrawPhone(e.target.value)} placeholder="Numéro Mobile Money" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'11px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:13,outline:'none',width:'100%',marginBottom:11}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            <div style={{display:'flex',gap:7}}>
              <button onClick={requestWithdraw} style={{flex:1,background:'linear-gradient(135deg,#f59e0b,#fbbf24)',color:'#000',border:'none',borderRadius:10,padding:11,fontSize:12,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>Confirmer 💰</button>
              <button onClick={()=>setShowWithdraw(false)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:10,padding:'11px 13px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {viewProfile&&(
        <div onClick={()=>setViewProfile(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:22,padding:0,width:320,overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            <div style={{height:72,background:`linear-gradient(135deg,${viewProfile.avatar_color},${viewProfile.avatar_color}66)`,position:'relative'}}>
              <div style={{position:'absolute',bottom:-22,left:18,width:52,height:52,borderRadius:'50%',overflow:'hidden',background:viewProfile.avatar_color,border:'3px solid var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
                {viewProfile.avatar_url?<img src={viewProfile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:viewProfile.avatar_emoji}
              </div>
            </div>
            <div style={{padding:'28px 18px 18px'}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:3}}>{viewProfile.username}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{statusEmoji(viewProfile.status||'online')} {viewProfile.status||'online'}</div>
              {viewProfile.bio&&<div style={{fontSize:13,marginBottom:8}}>{viewProfile.bio}</div>}
              {viewProfile.location_name&&<div style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>📍 {viewProfile.location_name}</div>}
              {onlineUsers.some(u=>u.username===viewProfile.username)&&<div style={{display:'inline-block',background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.3)',borderRadius:20,padding:'3px 10px',fontSize:11,color:'#34d399',marginBottom:12}}>🟢 En ligne</div>}
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {viewProfile.username!==user&&<button onClick={()=>{openDM(viewProfile.username);setViewProfile(null)}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:10,padding:'9px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>💬 DM</button>}
                {viewProfile.username!==user&&<button onClick={()=>toggleBlock(viewProfile.username)} style={{background:blockedUsers.includes(viewProfile.username)?'rgba(248,113,113,.2)':'var(--bg3)',color:blockedUsers.includes(viewProfile.username)?'#f87171':'var(--muted)',border:`1px solid ${blockedUsers.includes(viewProfile.username)?'rgba(248,113,113,.4)':'var(--border)'}`,borderRadius:10,padding:'9px 12px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>{blockedUsers.includes(viewProfile.username)?'🔓 Débloquer':'🚫 Bloquer'}</button>}
                {viewProfile.username===user&&<button onClick={()=>{setStep('setup');setViewProfile(null)}} style={{flex:1,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:10,padding:'9px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>✏️ Modifier</button>}
                <button onClick={()=>setViewProfile(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 12px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN MODAL */}
      {pinModal&&(
        <div onClick={()=>setPinModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:18,padding:22,width:290,display:'flex',flexDirection:'column',gap:12,boxShadow:'0 20px 60px rgba(0,0,0,.7)'}}>
            <div style={{fontWeight:700,fontSize:15}}>📌 Épingler {pinModal}</div>
            <input value={pinName} onChange={e=>setPinName(e.target.value)} placeholder="Nom perso (optionnel)" maxLength={30} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:9,padding:'10px 13px',color:'var(--text)',fontFamily:'inherit',fontSize:13,outline:'none'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            <div style={{display:'flex',gap:7}}>
              <button onClick={async()=>{const id=Math.random().toString(36).slice(2);await supabase.from('pinned_convos').upsert({id,owner:user,target:pinModal,custom_name:pinName||null},{onConflict:'owner,target'});const{data}=await supabase.from('pinned_convos').select('owner,target,custom_name').eq('owner',user);setPinnedConvos(data||[]);setPinModal(null);toast$('📌 Épinglé !')}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:9,padding:'9px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>📌 Épingler</button>
              <button onClick={()=>setPinModal(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 13px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div style={{position:'fixed',bottom:76,left:'50%',transform:`translateX(-50%) translateY(${toastOn?0:12}px)`,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:9,padding:'8px 16px',fontSize:12,opacity:toastOn?1:0,transition:'all .22s',pointerEvents:'none',zIndex:200,whiteSpace:'nowrap',color:'var(--text)',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>{toast}</div>

      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{scrollbar-width:thin;scrollbar-color:var(--border) transparent}
        *::-webkit-scrollbar{width:3px}*::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .leaflet-container{background:var(--bg)!important}
      `}</style>
    </div>
  )
}

function AudioPlayer({url,isMe}:{url:string;isMe:boolean}){
  const [playing,setPlaying]=useState(false)
  const [progress,setProgress]=useState(0)
  const [duration,setDuration]=useState(0)
  const ref=useRef<HTMLAudioElement>(null)
  const toggle=()=>{if(!ref.current)return;if(playing){ref.current.pause();setPlaying(false)}else{ref.current.play();setPlaying(true)}}
  return(
    <div style={{display:'flex',alignItems:'center',gap:9,background:isMe?'rgba(255,255,255,.1)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderRadius:40,padding:'7px 13px',minWidth:170,maxWidth:230}}>
      <audio ref={ref} src={url} onTimeUpdate={()=>{if(ref.current)setProgress(ref.current.currentTime/ref.current.duration*100||0)}} onLoadedMetadata={()=>{if(ref.current)setDuration(ref.current.duration)}} onEnded={()=>setPlaying(false)}/>
      <button onClick={toggle} style={{width:30,height:30,borderRadius:'50%',background:isMe?'rgba(255,255,255,.2)':'rgba(124,106,247,.2)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>{playing?'⏸️':'▶️'}</button>
      <div style={{flex:1}}>
        <div style={{height:3,background:isMe?'rgba(255,255,255,.2)':'var(--border)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',background:isMe?'white':'var(--accent)',borderRadius:2,width:progress+'%',transition:'width .1s'}}/>
        </div>
        <div style={{fontSize:10,color:isMe?'rgba(255,255,255,.65)':'var(--muted)',marginTop:3}}>{duration?`${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}`:'🎤 Audio'}</div>
      </div>
    </div>
  )
}
