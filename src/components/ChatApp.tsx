'use client'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { supabase } from '@/lib/supabase'

type Msg = { id:string; seq_id:number; username:string; content:string|null; file_url:string|null; file_name:string|null; audio_url:string|null; is_sticker:boolean; is_custom_sticker?:boolean; msg_type:string; created_at:string; reply_to?:string|null; reply_preview?:string|null; reply_author?:string|null; deleted_at?:string|null }
type DM  = { id:string; seq_id:number; from_user:string; to_user:string; content:string|null; file_url:string|null; file_name:string|null; audio_url:string|null; is_sticker:boolean; created_at:string; reply_to?:string|null; reply_preview?:string|null; reply_author?:string|null }
type Profile = { username:string; avatar_color:string; avatar_emoji:string; bio:string; theme:string; status:string; avatar_url?:string|null; location_lat?:number|null; location_lng?:number|null; location_name?:string|null }
type Reaction = { id:string; message_id:string; username:string; emoji:string }
type CustomSticker = { id:string; creator:string; content:string; bg_color:string; text_color:string }
type UserPoints = { username:string; points:number; total_earned:number; last_daily_claim:string|null; streak_days:number }
type Game = { id:string; game_type:string; player1:string; player2:string|null; status:string; state:any; winner:string|null; bet_points:number }
type Comment = { id:string; message_id:string; username:string; content:string; created_at:string }

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
const STICKERS = ['🔥💯','💀👀','😭🙏','🤯🤯','🫡✅','😈🔥','🥶❄️','💪🏆','🫶❤️','🎉🎊','😂💀','🤡🎪','😏👀','🙃💅','😤✋','🤓☝️','😩😭','🤪🎉','😜💫','🫠🌀']
const COD_STICKERS  = ['🪖💀','🔫💥','🎯✅','💣🔥','⚔️🛡️','🎖️🏆','☠️👊','🚁💣','🌑🔪','🎮💀','🦅🪖','💥🔥','🧨💥','👊☠️','🏴🔫']
const FILE_ICONS:Record<string,string> = {pdf:'📄',zip:'🗜️',mp3:'🎵',mp4:'🎬',doc:'📝',docx:'📝',xls:'📊',txt:'📋',rar:'🗜️'}
const DANGER_WORDS = ['kill','mort','tuer','suicide','bombe','explosif','drogue','cocaine','arme','gun','weapon','menace']
const GAMES_LIST = [
  {id:'tictactoe',name:'Morpion',emoji:'⭕',desc:'Tour par tour'},
  {id:'rps',name:'Pierre Feuille Ciseaux',emoji:'✊',desc:'Premier à 3'},
  {id:'quiz',name:'Quiz',emoji:'🧠',desc:'5 questions'},
  {id:'hangman',name:'Pendu',emoji:'🎭',desc:'Devinez le mot'},
  {id:'wordle',name:'Wordle',emoji:'📝',desc:'Mot en 6 essais'},
]
const QUIZ_QS = [
  {q:'Capitale du Bénin ?',a:'Porto-Novo',o:['Cotonou','Porto-Novo','Abomey','Parakou']},
  {q:'Monnaie UEMOA ?',a:'FCFA',o:['FCFA','Cedi','Naira','Shilling']},
  {q:'Pays en Afrique ?',a:'54',o:['48','54','57','60']},
  {q:'Plus haute montagne ?',a:'Everest',o:['Kilimandjaro','Mont Blanc','Everest','Aconcagua']},
  {q:'Inventeur du téléphone ?',a:'Bell',o:['Edison','Bell','Tesla','Marconi']},
]
const WORDS = ['SPORT','BLANC','ROUGE','CRANE','SOLEIL','NUIT','MONDE','PLACE','FORET','ECOLE']

const colorForName=(n:string)=>{let h=0;for(const c of n)h=c.charCodeAt(0)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]}
const statusEmoji=(s:string)=>({online:'🟢',away:'🌙',busy:'🔴',gaming:'🎮'}[s]||'🟢')
const ptsFCFA=(pts:number)=>`${Math.floor(pts/10)*5} FCFA`

// ── AVATAR COMPONENT (mémoïsé) ────────────────────────
const Avatar=memo(({p,size=34,online,onClick}:{p:Profile;size?:number;online?:boolean;onClick?:()=>void})=>(
  <div onClick={onClick} style={{position:'relative',width:size,height:size,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.44,flexShrink:0,cursor:onClick?'pointer':'default'}}>
    {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy"/>:p.avatar_emoji}
    {online&&<div style={{position:'absolute',bottom:1,right:1,width:size*.3,height:size*.3,borderRadius:'50%',background:'#34d399',border:`${size*.06}px solid var(--bg2)`}}/>}
  </div>
))
Avatar.displayName='Avatar'

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
  // Stocker toutes les réactions dans une map pour perf
  const [rxnMap,setRxnMap]=useState<Record<string,Reaction[]>>({})
  const [onlineSet,setOnlineSet]=useState<Set<string>>(new Set())
  const [profiles,setProfiles]=useState<Record<string,Profile>>({})
  const [allProfiles,setAllProfiles]=useState<Profile[]>([])
  const [customStickers,setCustomStickers]=useState<CustomSticker[]>([])
  const [pinnedConvos,setPinnedConvos]=useState<{owner:string;target:string;custom_name:string|null}[]>([])
  const [dmConvos,setDmConvos]=useState<string[]>([])
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
  const [text,setText]=useState('')
  const [connStatus,setConnStatus]=useState('Connexion...')
  const [pickerOpen,setPickerOpen]=useState(false)
  const [pickerTab,setPickerTab]=useState<'emoji'|'sticker'|'cod'|'custom'|'create'>('emoji')
  const [selectedFile,setSelectedFile]=useState<File|null>(null)
  const [toastMsg,setToastMsg]=useState('');const [toastOn,setToastOn]=useState(false)
  const [sending,setSending]=useState(false)
  const [hoverMsgId,setHoverMsgId]=useState<string|null>(null)
  const [viewProfile,setViewProfile]=useState<Profile|null>(null)
  const [replyTo,setReplyTo]=useState<{id:string;content:string|null;author:string}|null>(null)
  const [showThemes,setShowThemes]=useState(false)
  const [pinModal,setPinModal]=useState<string|null>(null)
  const [pinName,setPinName]=useState('')
  const [csText,setCsText]=useState('');const [csBg,setCsBg]=useState('#7c6af7');const [csColor,setCsColor]=useState('#ffffff')
  const [isRecording,setIsRecording]=useState(false)
  const [recTime,setRecTime]=useState(0)
  const [commentTarget,setCommentTarget]=useState<string|null>(null)
  const [comments,setComments]=useState<Comment[]>([])
  const [commentText,setCommentText]=useState('')
  const [avatarFile,setAvatarFile]=useState<File|null>(null)
  const [wordleGuess,setWordleGuess]=useState('')

  const msgsRef=useRef<HTMLDivElement>(null)
  const inputRef=useRef<HTMLTextAreaElement>(null)
  const fileRef=useRef<HTMLInputElement>(null)
  const avatarRef=useRef<HTMLInputElement>(null)
  const toastTimer=useRef<NodeJS.Timeout>()
  const presTimer=useRef<NodeJS.Timeout>()
  const mediaRef=useRef<MediaRecorder|null>(null)
  const audioChunks=useRef<Blob[]>([])
  const recTimer=useRef<NodeJS.Timeout>()
  const pointsQueue=useRef<{amount:number;reason:string}[]>([])
  const pointsTimer=useRef<NodeJS.Timeout>()

  // ── THEME ─────────────────────────────────────────────
  useEffect(()=>{
    const v=THEMES[theme]||THEMES.dark
    Object.entries(v).forEach(([k,val])=>document.documentElement.style.setProperty(k,val))
  },[theme])

  const toast$=useCallback((msg:string)=>{
    setToastMsg(msg);setToastOn(true)
    clearTimeout(toastTimer.current)
    toastTimer.current=setTimeout(()=>setToastOn(false),3500)
  },[])

  const scrollBottom=useCallback(()=>{
    requestAnimationFrame(()=>{if(msgsRef.current)msgsRef.current.scrollTop=msgsRef.current.scrollHeight})
  },[])

  const getP=useCallback((u:string):Profile=>{
    return profiles[u]||{username:u,avatar_color:colorForName(u),avatar_emoji:'😊',bio:'',theme:'dark',status:'online'}
  },[profiles])

  // ── POINTS BATCHÉ (évite trop d'appels DB) ────────────
  const queuePoints=useCallback((amount:number,reason:string)=>{
    pointsQueue.current.push({amount,reason})
    clearTimeout(pointsTimer.current)
    pointsTimer.current=setTimeout(async()=>{
      const q=pointsQueue.current.splice(0)
      if(!q.length)return
      const total=q.reduce((s,x)=>s+x.amount,0)
      try{await supabase.rpc('increment_points',{p_username:user,p_amount:total})}catch{}
      setUserPoints(p=>p?{...p,points:Math.max(0,(p.points||0)+total)}:p)
    },5000) // Batch toutes les 5s
  },[user])

  // ── PRÉSENCE (moins fréquente) ────────────────────────
  const ping=useCallback(async()=>{
    await supabase.from('presence').upsert({username:user,last_seen:new Date().toISOString(),is_online:true},{onConflict:'username'})
  },[user])

  const loadOnline=useCallback(async()=>{
    const since=new Date(Date.now()-60000).toISOString() // 60s au lieu de 30s
    const{data}=await supabase.from('presence').select('username').eq('is_online',true).gte('last_seen',since)
    setOnlineSet(new Set((data||[]).map((x:any)=>x.username)))
  },[])

  // ── INIT ──────────────────────────────────────────────
  useEffect(()=>{
    const saved=localStorage.getItem('chat_user')
    const savedTheme=localStorage.getItem('chat_theme')
    if(savedTheme)setTheme(savedTheme)
    if(saved)setPseudo(saved)
  },[])

  const handleLogin=async()=>{
    const name=pseudo.trim();if(!name)return
    const saved=localStorage.getItem('chat_user')
    const target=saved||name
    const{data:p}=await supabase.from('profiles').select('*').eq('username',target).single()
    if(p){setUser(target);setProfile(p);setAvatarColor(p.avatar_color);setAvatarEmoji(p.avatar_emoji);setBio(p.bio);setTheme(p.theme||'dark');setUserStatus(p.status||'online');localStorage.setItem('chat_user',target);setStep('app')}
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
    if(navigator.geolocation){
      await new Promise<void>(res=>navigator.geolocation.getCurrentPosition(pos=>{location_lat=pos.coords.latitude;location_lng=pos.coords.longitude;location_name=`${pos.coords.latitude.toFixed(2)},${pos.coords.longitude.toFixed(2)}`;res()},()=>res(),{timeout:3000}))
    }
    const p:Profile={username:user,avatar_color:avatarColor,avatar_emoji:avatarEmoji,bio,theme,status:userStatus,avatar_url,location_lat,location_lng,location_name}
    await supabase.from('profiles').upsert(p,{onConflict:'username'})
    setProfile(p);localStorage.setItem('chat_user',user);localStorage.setItem('chat_theme',theme);setStep('app')
  }

  // ── APP INIT ──────────────────────────────────────────
  useEffect(()=>{
    if(step!=='app')return

    const init=async()=>{
      // Charger en parallèle
      const [msgsRes,rxnsRes,csRes,pinsRes,profsRes,ptsRes]=await Promise.all([
        supabase.from('messages').select('id,seq_id,username,content,file_url,file_name,audio_url,is_sticker,is_custom_sticker,msg_type,created_at,reply_to,reply_preview,reply_author,deleted_at').eq('msg_type','message').order('seq_id',{ascending:true}).limit(100),
        supabase.from('reactions').select('id,message_id,username,emoji'),
        supabase.from('custom_stickers').select('*').order('created_at',{ascending:false}).limit(30),
        supabase.from('pinned_convos').select('owner,target,custom_name').eq('owner',user),
        supabase.from('profiles').select('username,avatar_color,avatar_emoji,bio,theme,status,avatar_url,location_lat,location_lng,location_name'),
        supabase.from('user_points').select('*').eq('username',user).single(),
      ])

      setMessages(msgsRes.data||[])

      // Construire rxnMap
      const rm:Record<string,Reaction[]>={}
      ;(rxnsRes.data||[]).forEach((r:Reaction)=>{if(!rm[r.message_id])rm[r.message_id]=[];rm[r.message_id].push(r)})
      setRxnMap(rm)

      setCustomStickers(csRes.data||[])
      setPinnedConvos(pinsRes.data||[])

      if(profsRes.data){
        const m:Record<string,Profile>={}
        profsRes.data.forEach((p:Profile)=>{m[p.username]=p})
        setProfiles(m);setAllProfiles(profsRes.data)
      }

      if(ptsRes.data)setUserPoints(ptsRes.data)
      else{await supabase.from('user_points').insert({username:user,points:0,total_earned:0,streak_days:0});setUserPoints({username:user,points:0,total_earned:0,last_daily_claim:null,streak_days:0})}

      // Claim daily points
      const today=new Date().toISOString().split('T')[0]
      if(ptsRes.data&&ptsRes.data.last_daily_claim!==today){
        const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0]
        const streak=ptsRes.data.last_daily_claim===yesterday?(ptsRes.data.streak_days||0)+1:1
        const bonus=streak>=7?20:streak>=3?15:10
        await supabase.from('user_points').update({points:(ptsRes.data.points||0)+bonus,total_earned:(ptsRes.data.total_earned||0)+bonus,last_daily_claim:today,streak_days:streak}).eq('username',user)
        setUserPoints(p=>p?{...p,points:(p.points||0)+bonus,streak_days:streak,last_daily_claim:today}:p)
        setTimeout(()=>toast$(`🎉 +${bonus} pts ! Série ${streak} jour${streak>1?'s':''}`),1000)
      }

      // DM convos
      const{data:dmsData}=await supabase.from('dms').select('from_user,to_user').or(`from_user.eq.${user},to_user.eq.${user}`)
      if(dmsData){const s=new Set<string>();dmsData.forEach((d:any)=>s.add(d.from_user===user?d.to_user:d.from_user));setDmConvos(Array.from(s))}

      await ping();await loadOnline()
      setConnStatus('🟢 Connecté')
      scrollBottom()
      if(Notification.permission==='default')Notification.requestPermission()
    }
    init()

    // Présence toutes les 30s (au lieu de 15s)
    presTimer.current=setInterval(()=>{ping();loadOnline()},30000)

    // ── UN SEUL CANAL pour tous les changements ──────────
    const mainCh=supabase.channel('main-v6')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{
        const msg=p.new as Msg
        if(msg.msg_type!=='message')return
        setMessages(prev=>[...prev,msg])
        scrollBottom()
        if(document.hidden&&msg.username!==user&&Notification.permission==='granted')
          new Notification(`💬 ${msg.username}`,{body:msg.content||'📎 Media'})
        if(msg.content){
          const low=msg.content.toLowerCase()
          if(DANGER_WORDS.some(w=>low.includes(w)))supabase.from('warnings').insert({username:msg.username,message_id:msg.id,reason:'Mot dangereux'})
        }
        if(msg.username===user)queuePoints(1,'Message')
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},p=>{
        setMessages(prev=>prev.map(m=>m.id===p.new.id?{...m,...p.new}:m))
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'dms'},p=>{
        const dm=p.new as DM
        if(dm.from_user!==user&&dm.to_user!==user)return
        const other=dm.from_user===user?dm.to_user:dm.from_user
        setDmConvos(prev=>prev.includes(other)?prev:[...prev,other])
        setDms(prev=>[...prev,dm])
        scrollBottom()
        if(document.hidden&&dm.from_user!==user&&Notification.permission==='granted')
          new Notification(`🔒 ${dm.from_user}`,{body:dm.content||'📎'})
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'reactions'},p=>{
        const r=p.new as Reaction
        setRxnMap(prev=>({...prev,[r.message_id]:[...(prev[r.message_id]||[]),r]}))
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'reactions'},p=>{
        const r=p.old as Reaction
        setRxnMap(prev=>({...prev,[r.message_id]:(prev[r.message_id]||[]).filter(x=>x.id!==r.id)}))
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'custom_stickers'},p=>{
        setCustomStickers(prev=>[p.new as CustomSticker,...prev.slice(0,29)])
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'user_points'},p=>{
        if((p.new as UserPoints).username===user)setUserPoints(p.new as UserPoints)
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'games'},p=>{
        const g=p.new as Game
        if(g.player2===user&&g.status==='waiting')setGameInvite(g)
        if(g.player1===user||g.player2===user)setActiveGame(g)
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'presence'},()=>loadOnline())
      .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},p=>{
        const pr=p.new as Profile
        setProfiles(prev=>({...prev,[pr.username]:pr}))
      })
      .subscribe(st=>{if(st==='SUBSCRIBED')setConnStatus('🟢 Connecté')})

    const bye=()=>{supabase.from('presence').upsert({username:user,last_seen:new Date().toISOString(),is_online:false},{onConflict:'username'})}
    window.addEventListener('beforeunload',bye)
    return()=>{
      supabase.removeChannel(mainCh)
      clearInterval(presTimer.current)
      clearTimeout(pointsTimer.current)
      window.removeEventListener('beforeunload',bye)
    }
  },[step,user,scrollBottom,ping,loadOnline,queuePoints,toast$])

  // ── DM LOAD ───────────────────────────────────────────
  useEffect(()=>{
    if(!dmTarget||!user)return
    supabase.from('dms').select('*').or(`and(from_user.eq.${user},to_user.eq.${dmTarget}),and(from_user.eq.${dmTarget},to_user.eq.${user})`).order('seq_id',{ascending:true}).limit(100).then(({data})=>{setDms(data||[]);scrollBottom()})
  },[dmTarget,user,scrollBottom])

  // ── ACTIONS ───────────────────────────────────────────
  const deleteMsg=async(id:string)=>{
    await supabase.from('messages').update({deleted_at:new Date().toISOString(),content:'Ce message a été supprimé.'}).eq('id',id)
  }

  const upload=async(file:File)=>{
    const path=`${Date.now()}_${file.name.replace(/[^\w._-]/g,'_')}`
    const{error}=await supabase.storage.from('chat-files').upload(path,file,{upsert:false})
    if(error)return null
    return{url:supabase.storage.from('chat-files').getPublicUrl(path).data.publicUrl,name:file.name}
  }

  const send=async()=>{
    if(!text.trim()&&!selectedFile)return
    setSending(true)
    let file_url=null,file_name=null
    if(selectedFile){const r=await upload(selectedFile);if(r){file_url=r.url;file_name=r.name}else{toast$('Erreur upload');setSending(false);return}}
    const rd=replyTo?{reply_to:replyTo.id,reply_preview:replyTo.content?.slice(0,60)||'📎',reply_author:replyTo.author}:{}
    if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content:text.trim()||null,file_url,file_name,is_sticker:false,...rd})
    else await supabase.from('messages').insert({username:user,content:text.trim()||null,file_url,file_name,is_sticker:false,msg_type:'message',...rd})
    setText('');setSelectedFile(null);setPickerOpen(false);setReplyTo(null)
    if(inputRef.current)inputRef.current.style.height='40px'
    setSending(false)
  }

  const sendSticker=async(content:string,isCustom=false)=>{
    setPickerOpen(false)
    const rd=replyTo?{reply_to:replyTo.id,reply_preview:replyTo.content?.slice(0,60)||'📎',reply_author:replyTo.author}:{}
    if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content,is_sticker:true,...rd})
    else await supabase.from('messages').insert({username:user,content,is_sticker:true,is_custom_sticker:isCustom,msg_type:'message',...rd})
    setReplyTo(null);queuePoints(2,'Sticker')
  }

  const toggleRxn=async(msgId:string,emoji:string)=>{
    setHoverMsgId(null)
    const existing=(rxnMap[msgId]||[]).find(r=>r.username===user&&r.emoji===emoji)
    if(existing)await supabase.from('reactions').delete().eq('id',existing.id)
    else{await supabase.from('reactions').insert({message_id:msgId,username:user,emoji});queuePoints(1,'Réaction')}
  }

  const startRec=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const mr=new MediaRecorder(stream);mediaRef.current=mr;audioChunks.current=[]
      mr.ondataavailable=e=>{if(e.data.size>0)audioChunks.current.push(e.data)}
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop())
        const blob=new Blob(audioChunks.current,{type:'audio/webm'})
        const path=`audio_${Date.now()}.webm`
        const{error}=await supabase.storage.from('chat-files').upload(path,blob,{contentType:'audio/webm',upsert:false})
        if(error){toast$('Erreur audio');return}
        const url=supabase.storage.from('chat-files').getPublicUrl(path).data.publicUrl
        const rd=replyTo?{reply_to:replyTo.id,reply_preview:'🎤',reply_author:replyTo.author}:{}
        if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,audio_url:url,is_sticker:false,...rd})
        else await supabase.from('messages').insert({username:user,audio_url:url,is_sticker:false,msg_type:'message',...rd})
        setReplyTo(null)
      }
      mr.start();setIsRecording(true);setRecTime(0)
      recTimer.current=setInterval(()=>setRecTime(t=>t+1),1000)
    }catch{toast$('Micro non disponible')}
  }

  const stopRec=()=>{
    if(mediaRef.current&&isRecording){mediaRef.current.stop();setIsRecording(false);clearInterval(recTimer.current)}
  }

  const loadComments=async(msgId:string)=>{
    setCommentTarget(msgId)
    const{data}=await supabase.from('message_comments').select('*').eq('message_id',msgId).order('created_at',{ascending:true})
    setComments(data||[])
  }

  const sendComment=async()=>{
    if(!commentText.trim()||!commentTarget)return
    await supabase.from('message_comments').insert({message_id:commentTarget,username:user,content:commentText.trim()})
    setCommentText('')
    loadComments(commentTarget)
  }

  const requestWithdraw=async()=>{
    if(!userPoints||userPoints.points<1000){toast$('❌ Minimum 1000 pts requis');return}
    if(!withdrawPhone.trim()){toast$('Entre ton numéro');return}
    const ptsTouse=Math.floor(userPoints.points/10)*10
    const fcfa=Math.floor(ptsTouse/10)*5
    await supabase.from('withdrawal_requests').insert({username:user,points:ptsTouse,amount_fcfa:fcfa,phone:withdrawPhone,country:withdrawCountry,network:withdrawNetwork,status:'pending'})
    await supabase.from('user_points').update({points:userPoints.points%10}).eq('username',user)
    setUserPoints(p=>p?{...p,points:p.points%10}:p)
    toast$(`✅ ${fcfa} FCFA en route !`);setShowWithdraw(false)
  }

  // ── GAMES ─────────────────────────────────────────────
  const inviteGame=async(type:string,opp:string,bet:number)=>{
    if(bet>(userPoints?.points||0)){toast$('Pas assez de points');return}
    const initState=type==='tictactoe'?{board:Array(9).fill(null),turn:'X',moves:0}
      :type==='rps'?{p1:null,p2:null,round:1,s:{p1:0,p2:0}}
      :type==='quiz'?{q:0,s1:0,s2:0,a1:null,a2:null,question:QUIZ_QS[0]}
      :type==='hangman'?{word:WORDS[Math.floor(Math.random()*WORDS.length)],g:[],wrong:0}
      :{word:WORDS[Math.floor(Math.random()*WORDS.length)].slice(0,5),guesses:[]}
    const{data}=await supabase.from('games').insert({game_type:type,player1:user,player2:opp,status:'waiting',state:initState,bet_points:bet}).select().single()
    if(data){setActiveGame(data);setShowGames(false);toast$(`🎮 Invitation envoyée !`)}
  }

  const makeMove=async(move:any)=>{
    if(!activeGame||activeGame.status!=='active')return
    const s={...activeGame.state}
    const isP1=activeGame.player1===user
    let status='active',winner=null as string|null

    if(activeGame.game_type==='tictactoe'){
      s.board=s.board.map((v:any,i:number)=>i===move.i?(isP1?'X':'O'):v)
      s.turn=s.turn==='X'?'O':'X';s.moves++
      const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
      for(const[a,b,c]of lines)if(s.board[a]&&s.board[a]===s.board[b]&&s.board[a]===s.board[c]){winner=s.board[a]==='X'?activeGame.player1:activeGame.player2!;status='finished';break}
      if(!winner&&s.moves===9)status='draw'
    }else if(activeGame.game_type==='rps'){
      if(isP1)s.p1=move.c;else s.p2=move.c
      if(s.p1&&s.p2){
        const w=[['rock','scissors'],['scissors','paper'],['paper','rock']].some(([a,b]:string[])=>s.p1===a&&s.p2===b)?'p1':s.p1===s.p2?'draw':'p2'
        if(w!=='draw')s.s[w as 'p1'|'p2']++
        if(s.s.p1>=3){winner=activeGame.player1;status='finished'}
        else if(s.s.p2>=3){winner=activeGame.player2!;status='finished'}
        else{s.round++;s.p1=null;s.p2=null}
      }
    }else if(activeGame.game_type==='quiz'){
      if(isP1)s.a1=move.a;else s.a2=move.a
      if(s.a1&&s.a2){
        if(s.a1===s.question.a)s.s1++;if(s.a2===s.question.a)s.s2++
        s.q++;if(s.q>=QUIZ_QS.length){status='finished';winner=s.s1>s.s2?activeGame.player1:s.s2>s.s1?activeGame.player2!:null}
        else{s.question=QUIZ_QS[s.q];s.a1=null;s.a2=null}
      }
    }else if(activeGame.game_type==='hangman'){
      if(!s.g.includes(move.l))s.g=[...s.g,move.l]
      if(!s.word.includes(move.l))s.wrong++
      if(s.word.split('').every((c:string)=>s.g.includes(c))){winner=user;status='finished'}
      else if(s.wrong>=6)status='finished'
    }else if(activeGame.game_type==='wordle'){
      s.guesses=[...s.guesses,move.guess.toUpperCase().slice(0,5)]
      if(move.guess.toUpperCase()===s.word){winner=user;status='finished'}
      else if(s.guesses.length>=6)status='finished'
      setWordleGuess('')
    }

    await supabase.from('games').update({state:s,status,winner,updated_at:new Date().toISOString()}).eq('id',activeGame.id)
    setActiveGame(g=>g?{...g,state:s,status,winner}:g)
    if(status==='finished'||status==='draw'){
      if(winner===user){queuePoints(15+(activeGame.bet_points||0)*2,'Victoire');toast$(`🏆 +${15+(activeGame.bet_points||0)*2} pts !`)}
      else if(winner&&winner!==user&&activeGame.bet_points>0){queuePoints(-activeGame.bet_points,'Défaite');toast$(`😔 -${activeGame.bet_points} pts`)}
    }
  }

  const handleKey=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}
  const autoResize=(el:HTMLTextAreaElement)=>{el.style.height='40px';el.style.height=Math.min(el.scrollHeight,110)+'px'}
  const insertEmoji=(e:string)=>{if(!inputRef.current)return;const el=inputRef.current,s=el.selectionStart??0;setText(el.value.slice(0,s)+e+el.value.slice(el.selectionEnd??0));setTimeout(()=>{el.selectionStart=el.selectionEnd=s+e.length;el.focus()},0)}
  const openDM=(username:string)=>{if(username===user)return;setDmTarget(username);setView('dm');setViewProfile(null)}

  // ── MEMOIZED LISTS ────────────────────────────────────
  const allConvos=useMemo(()=>Array.from(new Set([...pinnedConvos.map(p=>p.target),...dmConvos,...Array.from(onlineSet).filter(u=>u!==user)])),[pinnedConvos,dmConvos,onlineSet,user])

  // ── MSG ITEM (mémoïsé) ────────────────────────────────
  const MsgItem=useCallback(({msg,isHovered}:{msg:Msg;isHovered:boolean})=>{
    const isMe=msg.username===user
    const p=getP(msg.username)
    const rxns=rxnMap[msg.id]||[]
    const rxnGroups=rxns.reduce((acc:Record<string,string[]>,r)=>{if(!acc[r.emoji])acc[r.emoji]=[];acc[r.emoji].push(r.username);return acc},{})
    const ext=(msg.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage=['jpg','jpeg','png','gif','webp'].includes(ext)
    const isDeleted=!!msg.deleted_at
    const cs=msg.is_custom_sticker?customStickers.find(s=>s.content===msg.content):null

    return(
      <div style={{display:'flex',alignItems:'flex-start',gap:8,flexDirection:isMe?'row-reverse':'row'}}
        onMouseEnter={()=>setHoverMsgId(msg.id)} onMouseLeave={()=>setHoverMsgId(null)}>
        <Avatar p={p} size={32} online={onlineSet.has(msg.username)} onClick={()=>setViewProfile(p)}/>
        <div style={{display:'flex',flexDirection:'column',gap:3,maxWidth:'66%',alignItems:isMe?'flex-end':'flex-start'}}>
          {!isMe&&<div style={{fontSize:11,color:'var(--muted)',padding:'0 4px',fontWeight:500,cursor:'pointer'}} onClick={()=>setViewProfile(p)}>{msg.username}</div>}
          {msg.reply_author&&<div style={{background:'var(--bg3)',borderLeft:'3px solid var(--accent)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--muted)'}}><div style={{fontWeight:600,fontSize:11,color:'var(--accent2)',marginBottom:1}}>↩️ {msg.reply_author}</div><div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{msg.reply_preview}</div></div>}
          <div style={{position:'relative'}}>
            {isDeleted
              ?<div style={{padding:'8px 14px',borderRadius:18,fontSize:13,fontStyle:'italic',color:'var(--muted)',background:'var(--bg3)',border:'1px solid var(--border)'}}>🗑 Supprimé</div>
              :<>
                {msg.audio_url&&<AudioPlayer url={msg.audio_url} isMe={isMe}/>}
                {msg.file_url&&(isImage?<img src={msg.file_url} alt="" style={{maxWidth:240,maxHeight:180,borderRadius:14,cursor:'pointer',display:'block'}} onClick={()=>window.open(msg.file_url!,'_blank')} loading="lazy"/>:<a href={msg.file_url} target="_blank" rel="noreferrer" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,textDecoration:'none',color:'var(--text)'}}><span style={{fontSize:22}}>{FILE_ICONS[ext]||'📎'}</span><div><div style={{fontSize:13,fontWeight:500}}>{msg.file_name}</div></div></a>)}
                {msg.content&&(msg.is_sticker
                  ?<div style={{fontSize:cs?16:50,lineHeight:1,padding:cs?'10px 16px':4,background:cs?.bg_color,borderRadius:cs?14:0,color:cs?.text_color,fontWeight:cs?700:undefined}}>{msg.content}</div>
                  :<div style={{padding:'10px 14px',borderRadius:18,fontSize:14,lineHeight:1.55,wordBreak:'break-word',background:isMe?'var(--me-bubble)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'var(--me-text)':'var(--text)'}}>{msg.content}</div>
                )}
                {isHovered&&<div style={{position:'absolute',[isMe?'right':'left']:0,bottom:'100%',marginBottom:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:30,padding:'5px 8px',display:'flex',gap:2,zIndex:10,boxShadow:'0 6px 20px rgba(0,0,0,.5)',whiteSpace:'nowrap'}}>
                  {QUICK_REACTIONS.map(e=><button key={e} onClick={()=>toggleRxn(msg.id,e)} style={{fontSize:18,background:'none',border:'none',cursor:'pointer',padding:'2px 3px',borderRadius:8}}>{e}</button>)}
                  <button onClick={()=>setReplyTo({id:msg.id,content:msg.content,author:msg.username})} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:'2px 5px',color:'var(--muted)'}}>↩️</button>
                  <button onClick={()=>loadComments(msg.id)} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:'2px 5px',color:'var(--muted)'}}>💬</button>
                  {isMe&&<button onClick={()=>deleteMsg(msg.id)} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:'2px 5px',color:'#f87171'}}>🗑</button>}
                </div>}
              </>
            }
          </div>
          {Object.keys(rxnGroups).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:3,padding:'0 4px'}}>{Object.entries(rxnGroups).map(([e,u])=><button key={e} onClick={()=>toggleRxn(msg.id,e)} title={(u as string[]).join(', ')} style={{background:(u as string[]).includes(user)?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${(u as string[]).includes(user)?'rgba(124,106,247,.5)':'var(--border)'}`,borderRadius:20,padding:'2px 7px',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>{e} <span style={{fontSize:10,color:'var(--muted)'}}>{(u as string[]).length}</span></button>)}</div>}
          {commentTarget===msg.id&&(
            <div style={{background:'var(--bg3)',borderRadius:12,padding:10,minWidth:200}}>
              {comments.map(c=><div key={c.id} style={{display:'flex',gap:6,marginBottom:6}}><Avatar p={getP(c.username)} size={22}/><div style={{background:'var(--bg2)',borderRadius:10,padding:'5px 9px',flex:1}}><div style={{fontSize:10,fontWeight:600,color:'var(--accent2)',marginBottom:1}}>{c.username}</div><div style={{fontSize:12}}>{c.content}</div></div></div>)}
              <div style={{display:'flex',gap:5,marginTop:6}}>
                <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendComment()} placeholder="Commenter..." style={{flex:1,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:'5px 11px',color:'var(--text)',fontFamily:'inherit',fontSize:12,outline:'none'}}/>
                <button onClick={sendComment} style={{background:'var(--accent)',border:'none',borderRadius:20,padding:'5px 10px',color:'white',cursor:'pointer',fontSize:12}}>↵</button>
                <button onClick={()=>{setCommentTarget(null);setComments([])}} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:20,padding:'5px 9px',color:'var(--muted)',cursor:'pointer',fontSize:12}}>✕</button>
              </div>
            </div>
          )}
          <div style={{fontSize:10,color:'var(--muted)',padding:'0 4px'}}>{new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
  },[user,getP,rxnMap,customStickers,onlineSet,toggleRxn,replyTo,commentTarget,comments,commentText])

  // ── LOGIN ──────────────────────────────────────────────
  if(step==='login')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)'}}>
      <div style={{background:'var(--bg2)',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'44px 40px',width:380,display:'flex',flexDirection:'column',gap:20,boxShadow:'0 30px 80px rgba(0,0,0,.6)'}}>
        <div style={{fontSize:52,textAlign:'center'}}>💬</div>
        <div style={{fontSize:24,fontWeight:700,textAlign:'center'}}>Chat App</div>
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Ton pseudo..." maxLength={20} autoFocus style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:'13px 16px',color:'var(--text)',fontFamily:'inherit',fontSize:15,outline:'none'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
        <button onClick={handleLogin} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,fontFamily:'inherit',cursor:'pointer',boxShadow:'0 4px 20px rgba(124,106,247,.4)'}}>Rejoindre →</button>
      </div>
    </div>
  )

  if(step==='setup')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)',padding:20,overflowY:'auto'}}>
      <div style={{background:'var(--bg2)',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'36px 32px',width:440,display:'flex',flexDirection:'column',gap:18,boxShadow:'0 30px 80px rgba(0,0,0,.6)'}}>
        <div style={{fontSize:22,fontWeight:700}}>Crée ton profil 🎨</div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div onClick={()=>avatarRef.current?.click()} style={{width:72,height:72,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,cursor:'pointer',overflow:'hidden',border:'3px solid var(--accent)',position:'relative'}}>
            {avatarFile?<img src={URL.createObjectURL(avatarFile)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:avatarEmoji}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&setAvatarFile(e.target.files[0])}/>
          <div><div style={{fontWeight:700,fontSize:16}}>{user}</div><div style={{fontSize:12,color:'var(--muted)'}}>📷 Clique pour photo</div></div>
        </div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Couleur</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>setAvatarColor(c)} style={{width:30,height:30,borderRadius:'50%',background:c,border:avatarColor===c?'3px solid white':'3px solid transparent',cursor:'pointer',transform:avatarColor===c?'scale(1.15)':'scale(1)'}}/>)}</div></div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>Emoji</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:3}}>{EMOJIS_NORMAL.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:19,padding:3,background:avatarEmoji===e?'rgba(124,106,247,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:6}}>{e}</button>)}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3}}>{EMOJIS_COD.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:19,padding:3,background:avatarEmoji===e?'rgba(200,162,0,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:6}}>{e}</button>)}</div>
        </div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>Thème</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>{Object.entries(THEME_LABELS).map(([k,v])=><button key={k} onClick={()=>setTheme(k)} style={{padding:'7px 4px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:10,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11,fontWeight:theme===k?600:400}}>{v}</button>)}</div></div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>Statut</div><div style={{display:'flex',gap:5}}>{(['online','away','busy','gaming'] as const).map(s=><button key={s} onClick={()=>setUserStatus(s)} style={{flex:1,padding:'6px 3px',background:userStatus===s?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${userStatus===s?'var(--accent)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11}}>{statusEmoji(s)}</button>)}</div></div>
        <input value={bio} onChange={e=>setBio(e.target.value)} placeholder="Ta bio..." maxLength={80} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 16px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none'}}/>
        <button onClick={handleSetup} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Commencer 🚀</button>
      </div>
    </div>
  )

  const myProfile=profile||getP(user)

  return(
    <div style={{display:'flex',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>

      {/* SIDEBAR */}
      <div style={{width:250,background:'var(--bg2)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setViewProfile(myProfile)}>
          <Avatar p={myProfile} size={38} online={true}/>
          <div style={{flex:1,overflow:'hidden'}}>
            <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{statusEmoji(userStatus)}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();setShowThemes(p=>!p)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)',padding:4,borderRadius:8}}>🎨</button>
        </div>

        {showThemes&&(
          <div style={{padding:'8px 10px',borderBottom:'1px solid var(--border)',background:'var(--bg3)'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:3}}>
              {Object.entries(THEME_LABELS).map(([k,v])=><button key={k} onClick={()=>{setTheme(k);localStorage.setItem('chat_theme',k)}} style={{padding:'5px 3px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg2)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:10,fontWeight:theme===k?600:400}}>{v}</button>)}
            </div>
          </div>
        )}

        <div style={{padding:'5px 7px',display:'flex',flexDirection:'column',gap:1}}>
          {[{v:'chat',l:'💬 Chat'},{v:'members',l:'👥 Membres'},{v:'map',l:'🗺️ Carte'}].map(({v,l})=>(
            <button key={v} onClick={()=>{setView(v as any);setDmTarget(null)}} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'none',background:view===v?'rgba(124,106,247,.2)':'transparent',color:view===v?'var(--accent2)':'var(--muted)',cursor:'pointer',textAlign:'left',fontSize:13,fontFamily:'inherit',fontWeight:view===v?600:400,display:'flex',alignItems:'center',gap:7}}>
              {l}{v==='chat'&&<span style={{marginLeft:'auto',fontSize:10,background:'var(--accent)',color:'white',borderRadius:10,padding:'1px 6px'}}>{onlineSet.size}</span>}
            </button>
          ))}
        </div>

        <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',padding:'3px 12px'}}>DMs</div>
        <div style={{flex:1,overflowY:'auto',padding:'0 7px 7px'}}>
          {allConvos.map(username=>{
            const p=getP(username)
            const isOnline=onlineSet.has(username)
            const pin=pinnedConvos.find(x=>x.target===username)
            const isActive=view==='dm'&&dmTarget===username
            return(
              <div key={username} style={{display:'flex',alignItems:'center',gap:2}}>
                <button onClick={()=>openDM(username)} style={{flex:1,padding:'6px 8px',borderRadius:8,border:'none',background:isActive?'rgba(124,106,247,.2)':'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
                  <Avatar p={p} size={30} online={isOnline}/>
                  <div style={{overflow:'hidden',flex:1}}>
                    <div style={{fontSize:12,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pin?'📌 ':''}{pin?.custom_name||username}</div>
                    <div style={{fontSize:10,color:isOnline?'#34d399':'var(--muted)'}}>{isOnline?'En ligne':'Hors ligne'}</div>
                  </div>
                </button>
                <button onClick={()=>{if(pin){supabase.from('pinned_convos').delete().eq('owner',user).eq('target',username).then(()=>setPinnedConvos(p=>p.filter(x=>x.target!==username)))}else{setPinModal(username);setPinName('')}}} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--muted)',padding:3,opacity:.5}}>{pin?'📌':'📍'}</button>
              </div>
            )
          })}
        </div>
        <div style={{padding:'7px 12px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#34d399',justifyContent:'center'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block'}}/>{onlineSet.size} en ligne
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{padding:'10px 18px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#34d399',boxShadow:'0 0 6px #34d39977'}}/>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{view==='dm'&&dmTarget?`${getP(dmTarget).avatar_emoji} ${pinnedConvos.find(x=>x.target===dmTarget)?.custom_name||dmTarget}`:view==='members'?'👥 Membres':view==='map'?'🗺️ Carte':'🌐 Chat général'}</div>
              <div style={{fontSize:10,color:'var(--muted)'}}>{connStatus}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <button onClick={()=>setShowPoints(true)} style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:20,padding:'4px 11px',fontSize:12,color:'#fbbf24',fontWeight:600,cursor:'pointer'}}>⭐ {userPoints?.points||0} • {ptsFCFA(userPoints?.points||0)}</button>
            {view==='dm'&&dmTarget&&<button onClick={()=>setShowGames(true)} style={{background:'rgba(124,106,247,.15)',border:'1px solid rgba(124,106,247,.3)',borderRadius:20,padding:'4px 11px',fontSize:12,color:'var(--accent2)',cursor:'pointer'}}>🎮</button>}
          </div>
        </header>

        {/* MEMBERS */}
        {view==='members'&&(
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>{allProfiles.length} inscrits • {onlineSet.size} en ligne</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
              {allProfiles.map(p=>{
                const isOnline=onlineSet.has(p.username)
                return(
                  <div key={p.username} onClick={()=>setViewProfile(p)} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:14,cursor:'pointer',transition:'border-color .15s'}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                    <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:8}}>
                      <Avatar p={p} size={38} online={isOnline}/>
                      <div style={{overflow:'hidden'}}>
                        <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.username}</div>
                        <div style={{fontSize:10,color:isOnline?'#34d399':'var(--muted)'}}>{isOnline?'🟢 En ligne':'⚫ Hors ligne'}</div>
                      </div>
                    </div>
                    {p.bio&&<div style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.bio}</div>}
                    {p.location_name&&<div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>📍 {p.location_name}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MAP */}
        {view==='map'&&(
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>🗺️ Membres avec localisation</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
              {allProfiles.filter(p=>p.location_lat).map(p=>(
                <div key={p.username} onClick={()=>setViewProfile(p)} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                  <Avatar p={p} size={30} online={onlineSet.has(p.username)}/>
                  <div><div style={{fontSize:13,fontWeight:500}}>{p.username}</div><div style={{fontSize:11,color:'var(--muted)'}}>📍 {p.location_name}</div></div>
                </div>
              ))}
              {allProfiles.filter(p=>p.location_lat).length===0&&<div style={{color:'var(--muted)',fontSize:13}}>Aucun membre n'a partagé sa localisation</div>}
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {(view==='chat'||view==='dm')&&(
          <>
            <div ref={msgsRef} style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:8}}>
              {(view==='chat'?messages:dms).map((msg:any)=>(
                <MsgItem key={msg.id} msg={msg} isHovered={hoverMsgId===msg.id}/>
              ))}
            </div>

            {replyTo&&(
              <div style={{padding:'7px 14px',background:'var(--bg3)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                <div style={{borderLeft:'3px solid var(--accent)',paddingLeft:8,flex:1}}>
                  <div style={{fontSize:10,color:'var(--accent2)',fontWeight:600,marginBottom:1}}>↩️ {replyTo.author}</div>
                  <div style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{replyTo.content||'📎'}</div>
                </div>
                <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:16}}>✕</button>
              </div>
            )}

            <div style={{padding:'10px 14px 14px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:7,flexShrink:0,position:'relative'}}>
              {selectedFile&&<div style={{background:'var(--bg3)',border:'1px solid rgba(124,106,247,.4)',borderRadius:9,padding:'7px 12px',fontSize:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span>📎 {selectedFile.name}</span><button onClick={()=>setSelectedFile(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14}}>✕</button></div>}
              {isRecording&&<div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:9,padding:'7px 12px',fontSize:12,display:'flex',alignItems:'center',gap:8,color:'#f87171'}}><span style={{width:7,height:7,borderRadius:'50%',background:'#f87171',display:'inline-block'}}/>🎤 {recTime}s<button onClick={stopRec} style={{marginLeft:'auto',background:'#f87171',border:'none',borderRadius:7,padding:'3px 9px',color:'white',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>Envoyer ✓</button><button onClick={()=>{mediaRef.current?.stream?.getTracks().forEach(t=>t.stop());setIsRecording(false);clearInterval(recTimer.current)}} style={{background:'none',border:'none',cursor:'pointer',color:'#f87171',fontSize:13}}>✕</button></div>}

              {pickerOpen&&(
                <div style={{position:'absolute',bottom:68,left:14,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,padding:10,width:310,maxHeight:340,overflowY:'auto',boxShadow:'0 16px 40px rgba(0,0,0,.6)',zIndex:50}}>
                  <div style={{display:'flex',gap:3,marginBottom:8,position:'sticky',top:0,background:'var(--bg2)',paddingBottom:5}}>
                    {(['emoji','sticker','cod','custom','create'] as const).map(t=><button key={t} onClick={()=>setPickerTab(t)} style={{flex:1,padding:'4px 2px',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:10,background:pickerTab===t?'rgba(124,106,247,.2)':'transparent',color:pickerTab===t?'var(--accent2)':'var(--muted)',fontWeight:pickerTab===t?600:400}}>{t==='emoji'?'😊':t==='sticker'?'✨':t==='cod'?'🎮':t==='custom'?'⭐':'➕'}</button>)}
                  </div>
                  {pickerTab==='emoji'&&<div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:1}}>{ALL_EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} style={{fontSize:21,padding:3,border:'none',background:'transparent',cursor:'pointer',borderRadius:7,lineHeight:1}}>{e}</button>)}</div>}
                  {pickerTab==='sticker'&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:3}}>{STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:30,padding:5,border:'none',background:'transparent',cursor:'pointer',borderRadius:9,lineHeight:1}}>{s}</button>)}</div>}
                  {pickerTab==='cod'&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:3}}>{COD_STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:26,padding:5,border:'1px solid rgba(200,162,0,.2)',background:'rgba(200,162,0,.08)',cursor:'pointer',borderRadius:9,lineHeight:1}}>{s}</button>)}</div>}
                  {pickerTab==='custom'&&<div>{customStickers.length===0?<div style={{color:'var(--muted)',fontSize:12,textAlign:'center',padding:12}}>Crée un sticker ➕</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>{customStickers.map(s=><button key={s.id} onClick={()=>sendSticker(s.content,true)} style={{background:s.bg_color,color:s.text_color,border:'none',borderRadius:10,padding:'8px 6px',cursor:'pointer',fontWeight:700,fontSize:12,lineHeight:1.3,wordBreak:'break-word'}}>{s.content}<div style={{fontSize:9,opacity:.6,marginTop:2}}>par {s.creator}</div></button>)}</div>}</div>}
                  {pickerTab==='create'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{fontSize:12,fontWeight:600}}>Crée ton sticker ✨</div>
                    <textarea value={csText} onChange={e=>setCsText(e.target.value)} placeholder="Texte..." maxLength={40} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:9,padding:9,color:'var(--text)',fontFamily:'inherit',fontSize:13,outline:'none',height:55,resize:'none'}}/>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>setCsBg(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:csBg===c?'3px solid white':'2px solid transparent',cursor:'pointer'}}/>)}</div>
                    <div style={{display:'flex',gap:5}}>{['#fff','#000','#fbbf24','#34d399','#f87171'].map(c=><button key={c} onClick={()=>setCsColor(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:csColor===c?'3px solid var(--accent)':'2px solid var(--border)',cursor:'pointer'}}/>)}</div>
                    {csText&&<div style={{background:csBg,color:csColor,borderRadius:10,padding:'8px 12px',fontWeight:700,fontSize:14,textAlign:'center'}}>{csText}</div>}
                    <button onClick={async()=>{if(!csText.trim())return;await supabase.from('custom_stickers').insert({creator:user,content:csText.trim(),bg_color:csBg,text_color:csColor});toast$('✅ Sticker créé !');setCsText('');queuePoints(5,'Sticker créé')}} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:9,padding:9,fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Créer ✨</button>
                  </div>}
                </div>
              )}

              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <button onClick={()=>setPickerOpen(p=>!p)} style={{width:36,height:36,borderRadius:9,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>😊</button>
                <button onClick={()=>fileRef.current?.click()} style={{width:36,height:36,borderRadius:9,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>📎</button>
                <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>25*1024*1024){toast$('Max 25 Mo');return}setSelectedFile(f)}}}/>
                <button onMouseDown={startRec} onMouseUp={stopRec} onTouchStart={startRec} onTouchEnd={stopRec} style={{width:36,height:36,borderRadius:9,background:isRecording?'rgba(248,113,113,.2)':'var(--bg3)',border:`1px solid ${isRecording?'rgba(248,113,113,.5)':'var(--border)'}`,color:isRecording?'#f87171':'var(--muted)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🎤</button>
                <textarea ref={inputRef} value={text} onChange={e=>{setText(e.target.value);autoResize(e.target)}} onKeyDown={handleKey} placeholder="Message..." style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:13,padding:'9px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',resize:'none',height:38,maxHeight:110,lineHeight:1.4}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
                <button onClick={send} disabled={sending} style={{width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',color:'white',cursor:sending?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sending?.5:1,boxShadow:'0 3px 12px rgba(124,106,247,.4)'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* GAME PANEL */}
      {activeGame&&activeGame.status==='active'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(8px)'}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:22,padding:24,width:380,maxHeight:'80vh',overflowY:'auto',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:17}}>{GAMES_LIST.find(g=>g.id===activeGame.game_type)?.emoji} {GAMES_LIST.find(g=>g.id===activeGame.game_type)?.name}</div>
              <div style={{display:'flex',gap:7,alignItems:'center'}}>
                {activeGame.bet_points>0&&<div style={{background:'rgba(251,191,36,.2)',border:'1px solid rgba(251,191,36,.4)',borderRadius:20,padding:'3px 9px',fontSize:11,color:'#fbbf24'}}>🎲 {activeGame.bet_points}pts</div>}
                <button onClick={()=>setActiveGame(null)} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,padding:'3px 9px',cursor:'pointer',color:'var(--muted)',fontFamily:'inherit',fontSize:12}}>✕</button>
              </div>
            </div>
            {(() => {
              const isP1=activeGame.player1===user
              const s=activeGame.state
              if(activeGame.game_type==='tictactoe')return(
                <div>
                  <div style={{textAlign:'center',marginBottom:10,fontSize:12,color:s.turn===(isP1?'X':'O')?'var(--accent2)':'var(--muted)'}}>{s.turn===(isP1?'X':'O')?'🎯 Ton tour !':'⏳ Attente...'}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
                    {s.board.map((cell:any,i:number)=><button key={i} onClick={()=>s.turn===(isP1?'X':'O')&&!cell&&makeMove({i})} style={{height:75,borderRadius:11,border:`2px solid ${cell?'rgba(124,106,247,.4)':'var(--border)'}`,background:cell?'rgba(124,106,247,.1)':'var(--bg3)',fontSize:34,cursor:s.turn===(isP1?'X':'O')&&!cell?'pointer':'default',color:cell==='X'?'var(--accent2)':'#f87171',fontWeight:700}}>{cell||''}</button>)}
                  </div>
                </div>
              )
              if(activeGame.game_type==='rps')return(
                <div>
                  <div style={{textAlign:'center',marginBottom:10,fontSize:12,color:'var(--muted)'}}>Manche {s.round} • {isP1?s.s.p1:s.s.p2}-{isP1?s.s.p2:s.s.p1}</div>
                  {!(isP1?s.p1:s.p2)?<div style={{display:'flex',gap:9}}>{[{k:'rock',e:'✊'},{k:'paper',e:'🖐️'},{k:'scissors',e:'✌️'}].map(({k,e})=><button key={k} onClick={()=>makeMove({c:k})} style={{flex:1,padding:14,borderRadius:13,border:'1px solid var(--border)',background:'var(--bg3)',fontSize:30,cursor:'pointer'}}>{e}</button>)}</div>:<div style={{textAlign:'center',padding:16,fontSize:16}}>✅ En attente...</div>}
                </div>
              )
              if(activeGame.game_type==='quiz'&&s.question)return(
                <div>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:7}}>Q{s.q+1}/5 • {isP1?s.s1:s.s2}-{isP1?s.s2:s.s1}</div>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:12,padding:'10px 14px',background:'var(--bg3)',borderRadius:11}}>{s.question.q}</div>
                  {!(isP1?s.a1:s.a2)?<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>{s.question.o.map((opt:string)=><button key={opt} onClick={()=>makeMove({a:opt})} style={{padding:'9px 7px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg3)',cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:12}}>{opt}</button>)}</div>:<div style={{textAlign:'center',padding:14,fontSize:13,color:'var(--accent2)'}}>✅ En attente...</div>}
                </div>
              )
              if(activeGame.game_type==='hangman')return(
                <div>
                  <div style={{textAlign:'center',marginBottom:14}}>
                    <div style={{fontSize:28,letterSpacing:6,fontFamily:'monospace',marginBottom:6}}>{(s.word as string).split('').map((l:string)=>s.g.includes(l)?l:'_').join(' ')}</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>Erreurs {s.wrong}/6 • {s.g.join(' ')}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=><button key={l} onClick={()=>!s.g.includes(l)&&makeMove({l})} disabled={s.g.includes(l)} style={{padding:'6px 3px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg3)',cursor:s.g.includes(l)?'default':'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11,opacity:s.g.includes(l)?0.3:1}}>{l}</button>)}
                  </div>
                </div>
              )
              if(activeGame.game_type==='wordle')return(
                <div>
                  <div style={{marginBottom:10}}>
                    {(s.guesses as string[]).map((g:string,gi:number)=>(
                      <div key={gi} style={{display:'flex',gap:3,marginBottom:3,justifyContent:'center'}}>
                        {g.split('').map((l,li)=>{const ok=s.word[li]===l;const pres=!ok&&s.word.includes(l);return<div key={li} style={{width:40,height:40,borderRadius:7,background:ok?'#34d399':pres?'#f59e0b':'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,color:ok||pres?'white':'var(--text)'}}>{l}</div>})}
                      </div>
                    ))}
                    {s.guesses.length<6&&<div style={{display:'flex',gap:3,justifyContent:'center'}}>{Array(5).fill(0).map((_,i)=><div key={i} style={{width:40,height:40,borderRadius:7,background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16}}>{wordleGuess[i]||''}</div>)}</div>}
                  </div>
                  <input value={wordleGuess} onChange={e=>setWordleGuess(e.target.value.toUpperCase().slice(0,5))} onKeyDown={e=>e.key==='Enter'&&wordleGuess.length===5&&makeMove({guess:wordleGuess})} placeholder="5 lettres puis Entrée" maxLength={5} style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 13px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',textTransform:'uppercase'}}/>
                </div>
              )
              return null
            })()}
          </div>
        </div>
      )}

      {activeGame&&(activeGame.status==='finished'||activeGame.status==='draw')&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(8px)'}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:22,padding:32,width:320,textAlign:'center',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            <div style={{fontSize:56,marginBottom:10}}>{activeGame.winner===user?'🏆':activeGame.status==='draw'?'🤝':'😢'}</div>
            <div style={{fontSize:22,fontWeight:700,color:activeGame.winner===user?'#34d399':activeGame.status==='draw'?'var(--muted)':'#f87171'}}>{activeGame.winner===user?'Victoire !':activeGame.status==='draw'?'Égalité !':'Défaite'}</div>
            {activeGame.winner===user&&<div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>+{15+(activeGame.bet_points||0)*2} pts</div>}
            <button onClick={()=>setActiveGame(null)} style={{marginTop:16,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:11,padding:'10px 20px',cursor:'pointer',fontFamily:'inherit',fontSize:14}}>Fermer</button>
          </div>
        </div>
      )}

      {/* GAME INVITE */}
      {gameInvite&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:24,width:300,textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
            <div style={{fontSize:36,marginBottom:10}}>🎮</div>
            <div style={{fontWeight:700,fontSize:17,marginBottom:6}}>{gameInvite.player1} t'invite !</div>
            <div style={{color:'var(--muted)',fontSize:13,marginBottom:8}}>{GAMES_LIST.find(g=>g.id===gameInvite.game_type)?.name}</div>
            {gameInvite.bet_points>0&&<div style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:9,padding:'5px 10px',marginBottom:12,fontSize:12,color:'#fbbf24'}}>🎲 Mise: {gameInvite.bet_points} pts</div>}
            <div style={{display:'flex',gap:9}}>
              <button onClick={async()=>{if(gameInvite.bet_points>(userPoints?.points||0)){toast$('Pas assez de points');setGameInvite(null);return}await supabase.from('games').update({status:'active'}).eq('id',gameInvite.id);setActiveGame({...gameInvite,status:'active'});setGameInvite(null)}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:11,padding:11,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>✅ Accepter</button>
              <button onClick={()=>{supabase.from('games').update({status:'declined'}).eq('id',gameInvite.id);setGameInvite(null)}} style={{flex:1,background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:11,padding:11,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>❌ Refuser</button>
            </div>
          </div>
        </div>
      )}

      {/* GAMES MODAL */}
      {showGames&&dmTarget&&(
        <div onClick={()=>setShowGames(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:24,width:340,boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:5}}>🎮 Inviter {dmTarget}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Tes points: {userPoints?.points||0} ({ptsFCFA(userPoints?.points||0)})</div>
            <div style={{display:'flex',gap:5,marginBottom:14}}>
              {[0,10,50,100].map(b=><button key={b} onClick={()=>setGameBet(b)} style={{flex:1,padding:'6px 3px',background:gameBet===b?'rgba(251,191,36,.2)':'var(--bg3)',border:`1px solid ${gameBet===b?'rgba(251,191,36,.5)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:gameBet===b?'#fbbf24':'var(--text)',fontFamily:'inherit',fontSize:11}}>{b===0?'0pt':`${b}pts`}</button>)}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {GAMES_LIST.map(g=>(
                <button key={g.id} onClick={()=>inviteGame(g.id,dmTarget,gameBet)} style={{padding:'12px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',textAlign:'left',display:'flex',alignItems:'center',gap:10}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                  <span style={{fontSize:24}}>{g.emoji}</span>
                  <div><div style={{fontWeight:600,fontSize:13}}>{g.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{g.desc}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POINTS MODAL */}
      {showPoints&&(
        <div onClick={()=>setShowPoints(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:22,padding:24,width:340,boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            <div style={{fontWeight:700,fontSize:19,marginBottom:3}}>⭐ Mes Points</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>10 pts = 5 FCFA • Min. 1000 pts pour retrait</div>
            <div style={{background:'linear-gradient(135deg,rgba(251,191,36,.12),rgba(251,191,36,.05))',border:'1px solid rgba(251,191,36,.3)',borderRadius:14,padding:18,textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:38,fontWeight:700,color:'#fbbf24'}}>{userPoints?.points||0}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>points disponibles</div>
              <div style={{fontSize:18,color:'#fbbf24',marginTop:5,fontWeight:600}}>{ptsFCFA(userPoints?.points||0)}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:14,fontSize:11}}>
              <div style={{background:'var(--bg3)',borderRadius:11,padding:11,textAlign:'center'}}><div style={{fontWeight:700,fontSize:17,color:'var(--accent2)'}}>{userPoints?.total_earned||0}</div><div style={{color:'var(--muted)'}}>Total gagné</div></div>
              <div style={{background:'var(--bg3)',borderRadius:11,padding:11,textAlign:'center'}}><div style={{fontWeight:700,fontSize:17,color:'#f97316'}}>🔥 {userPoints?.streak_days||0}</div><div style={{color:'var(--muted)'}}>Jours suite</div></div>
            </div>
            <div style={{background:'var(--bg3)',borderRadius:11,padding:11,marginBottom:14,fontSize:11,color:'var(--muted)'}}>
              <div style={{fontWeight:600,color:'var(--text)',marginBottom:5}}>Comment gagner</div>
              <div>🌅 Connexion : +10 pts (+15 si 3j, +20 si 7j)</div>
              <div>💬 Message : +1pt • Sticker : +2pts</div>
              <div>🎮 Victoire : +15pts + mise×2</div>
              <div>😔 Défaite : -mise pts</div>
            </div>
            <button onClick={()=>{setShowPoints(false);setShowWithdraw(true)}} style={{width:'100%',background:(userPoints?.points||0)>=1000?'linear-gradient(135deg,#f59e0b,#fbbf24)':'var(--bg3)',color:(userPoints?.points||0)>=1000?'#000':'var(--muted)',border:(userPoints?.points||0)<1000?'1px solid var(--border)':'none',borderRadius:11,padding:12,fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:(userPoints?.points||0)>=1000?'pointer':'not-allowed'}}>
              {(userPoints?.points||0)>=1000?`💰 Retirer ${ptsFCFA(userPoints?.points||0)}`:`⛔ Encore ${1000-(userPoints?.points||0)} pts`}
            </button>
          </div>
        </div>
      )}

      {/* WITHDRAW */}
      {showWithdraw&&(
        <div onClick={()=>setShowWithdraw(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:160,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:24,width:320,boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:14}}>💰 Retrait Mobile Money</div>
            <div style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:11,padding:11,marginBottom:14,textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:700,color:'#fbbf24'}}>{ptsFCFA(userPoints?.points||0)}</div>
            </div>
            <div style={{display:'flex',gap:5,marginBottom:9,flexWrap:'wrap'}}>
              {['Bénin','Togo','Côte d\'Ivoire','Sénégal'].map(c=><button key={c} onClick={()=>setWithdrawCountry(c)} style={{flex:1,padding:'5px 3px',background:withdrawCountry===c?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${withdrawCountry===c?'var(--accent)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:10}}>{c}</button>)}
            </div>
            <div style={{display:'flex',gap:5,marginBottom:9}}>
              {['MTN','Moov','Orange','Wave'].map(n=><button key={n} onClick={()=>setWithdrawNetwork(n)} style={{flex:1,padding:'5px 3px',background:withdrawNetwork===n?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${withdrawNetwork===n?'var(--accent)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11}}>{n}</button>)}
            </div>
            <input value={withdrawPhone} onChange={e=>setWithdrawPhone(e.target.value)} placeholder="Numéro Mobile Money" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:11,padding:'11px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',width:'100%',marginBottom:11}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            <div style={{display:'flex',gap:7}}>
              <button onClick={requestWithdraw} style={{flex:1,background:'linear-gradient(135deg,#f59e0b,#fbbf24)',color:'#000',border:'none',borderRadius:11,padding:11,fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>Confirmer 💰</button>
              <button onClick={()=>setShowWithdraw(false)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:11,padding:'11px 13px',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {viewProfile&&(
        <div onClick={()=>setViewProfile(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:22,padding:0,width:320,overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            <div style={{height:72,background:`linear-gradient(135deg,${viewProfile.avatar_color},${viewProfile.avatar_color}66)`,position:'relative'}}>
              <div style={{position:'absolute',bottom:-22,left:16,width:52,height:52,borderRadius:'50%',overflow:'hidden',background:viewProfile.avatar_color,border:'3px solid var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
                {viewProfile.avatar_url?<img src={viewProfile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:viewProfile.avatar_emoji}
              </div>
            </div>
            <div style={{padding:'28px 18px 18px'}}>
              <div style={{fontWeight:700,fontSize:19,marginBottom:3}}>{viewProfile.username}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:3}}>{statusEmoji(viewProfile.status||'online')} {viewProfile.status||'online'}</div>
              {viewProfile.bio&&<div style={{fontSize:13,marginBottom:7}}>{viewProfile.bio}</div>}
              {viewProfile.location_name&&<div style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>📍 {viewProfile.location_name}</div>}
              {onlineSet.has(viewProfile.username)&&<div style={{background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.3)',borderRadius:20,padding:'3px 10px',fontSize:11,color:'#34d399',display:'inline-block',marginBottom:10}}>🟢 En ligne</div>}
              <div style={{display:'flex',gap:7}}>
                {viewProfile.username!==user&&<button onClick={()=>{openDM(viewProfile.username);setViewProfile(null)}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:11,padding:9,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>💬 DM</button>}
                {viewProfile.username===user&&<button onClick={()=>{setStep('setup');setViewProfile(null)}} style={{flex:1,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:11,padding:9,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>✏️ Modifier</button>}
                <button onClick={()=>setViewProfile(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:11,padding:'9px 13px',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN MODAL */}
      {pinModal&&(
        <div onClick={()=>setPinModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:18,padding:22,width:290,display:'flex',flexDirection:'column',gap:12}}>
            <div style={{fontWeight:700,fontSize:15}}>📌 Épingler {pinModal}</div>
            <input value={pinName} onChange={e=>setPinName(e.target.value)} placeholder="Nom perso (optionnel)" maxLength={30} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 13px',color:'var(--text)',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
            <div style={{display:'flex',gap:7}}>
              <button onClick={async()=>{await supabase.from('pinned_convos').upsert({id:Math.random().toString(36).slice(2),owner:user,target:pinModal,custom_name:pinName||null},{onConflict:'owner,target'});const{data}=await supabase.from('pinned_convos').select('*').eq('owner',user);setPinnedConvos(data||[]);setPinModal(null);toast$('📌 Épinglé !')}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:9,padding:9,fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>📌 Épingler</button>
              <button onClick={()=>setPinModal(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 13px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div style={{position:'fixed',bottom:70,left:'50%',transform:`translateX(-50%) translateY(${toastOn?0:12}px)`,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 16px',fontSize:12,opacity:toastOn?1:0,transition:'all .22s',pointerEvents:'none',zIndex:200,whiteSpace:'nowrap',color:'var(--text)'}}>{toastMsg}</div>

      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{scrollbar-width:thin;scrollbar-color:var(--border) transparent}
        *::-webkit-scrollbar{width:3px}
        *::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      `}</style>
    </div>
  )
}

const AudioPlayer=memo(({url,isMe}:{url:string;isMe:boolean})=>{
  const [playing,setPlaying]=useState(false)
  const [progress,setProgress]=useState(0)
  const [duration,setDuration]=useState(0)
  const ref=useRef<HTMLAudioElement>(null)
  const toggle=()=>{if(!ref.current)return;if(playing){ref.current.pause();setPlaying(false)}else{ref.current.play();setPlaying(true)}}
  return(
    <div style={{display:'flex',alignItems:'center',gap:9,background:isMe?'rgba(255,255,255,.1)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderRadius:50,padding:'7px 13px',minWidth:170,maxWidth:230}}>
      <audio ref={ref} src={url} onTimeUpdate={()=>{if(ref.current)setProgress(ref.current.currentTime/ref.current.duration*100||0)}} onLoadedMetadata={()=>{if(ref.current)setDuration(ref.current.duration)}} onEnded={()=>setPlaying(false)}/>
      <button onClick={toggle} style={{width:30,height:30,borderRadius:'50%',background:isMe?'rgba(255,255,255,.2)':'rgba(124,106,247,.2)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>{playing?'⏸️':'▶️'}</button>
      <div style={{flex:1}}>
        <div style={{height:3,background:isMe?'rgba(255,255,255,.2)':'var(--border)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',background:isMe?'white':'var(--accent)',borderRadius:2,width:progress+'%',transition:'width .1s'}}/>
        </div>
        <div style={{fontSize:9,color:isMe?'rgba(255,255,255,.7)':'var(--muted)',marginTop:2}}>{duration?`${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}`:'🎤'}</div>
      </div>
    </div>
  )
})
AudioPlayer.displayName='AudioPlayer'
