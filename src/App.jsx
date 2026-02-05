import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function App() {
  const [pics, setPics] = useState([])
  const [selectedPic, setSelectedPic] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [views, setViews] = useState(0)
  const [theme, setTheme] = useState('cute')
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isVideoPaused, setIsVideoPaused] = useState(false)

  // Touch/swipe state for lightbox and menu
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [menuTouchStart, setMenuTouchStart] = useState(null)
  const minSwipeDistance = 50

  // Valentine Undertale-style states
  const [valentinePhase, setValentinePhase] = useState('intro') // intro, battle, result
  const [dialogText, setDialentText] = useState('')
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedAction, setSelectedAction] = useState(null)
  const [heartPosition, setHeartPosition] = useState({ x: 50, y: 50 })
  const [floatingHearts, setFloatingHearts] = useState([])
  const [valentineResult, setValentineResult] = useState(null)
  const [mochiHP, setMochiHP] = useState(100)
  const [lovePoints, setLovePoints] = useState(0)
  const [shakeScreen, setShakeScreen] = useState(false)

  // Valentine dialog messages
  const valentineDialogs = {
    intro: "* MOCHI aparece!\n* Parece que quiere algo...\n* ¿Qué harás?",
    flirt: "* Le dices a MOCHI que es muy linda...\n* MOCHI ronronea felizmente!\n* +20 LOVE POINTS!",
    pet: "* Acaricias suavemente a MOCHI...\n* ¡Sus ojos brillan con amor!\n* +30 LOVE POINTS!",
    treat: "* Le das un treat a MOCHI...\n* ¡MOCHI está encantada!\n* +25 LOVE POINTS!",
    mercy: "* Decides quedarte con MOCHI para siempre...\n* ¡MOCHI te acepta!\n* ♥ TRUE LOVE ENDING ♥",
    attack: "* No puedes atacar a algo tan adorable...\n* MOCHI te mira con ojos tiernos.\n* Tu SOUL se derrite...",
    win: "* ¡Feliz San Valentín!\n* MOCHI te quiere mucho!\n* ♥ LOVE WINS ♥"
  }

  // Typewriter effect for dialog
  useEffect(() => {
    if (!dialogText) return
    setIsTyping(true)
    setDisplayedText('')
    let i = 0
    const interval = setInterval(() => {
      if (i < dialogText.length) {
        setDisplayedText(prev => prev + dialogText[i])
        i++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 30)
    return () => clearInterval(interval)
  }, [dialogText])

  // Start valentine dialog
  useEffect(() => {
    if (currentPage === 'valentine') {
      setValentinePhase('intro')
      setDialentText(valentineDialogs.intro)
      setLovePoints(0)
      setMochiHP(100)
      setValentineResult(null)
      startFloatingHearts()
    }
  }, [currentPage])

  // Floating hearts animation
  const startFloatingHearts = () => {
    const hearts = []
    for (let i = 0; i < 15; i++) {
      hearts.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
        size: 10 + Math.random() * 20
      })
    }
    setFloatingHearts(hearts)
  }

  // Component to handle Video Control (Play/Pause)
  const VideoControl = ({ isPaused }) => (
    <div className={`video-control-hint ${isPaused ? 'show' : ''}`}>
      <div className="control-circle">
        {isPaused ? '▶' : '||'}
      </div>
    </div>
  )

  // Handle Valentine action
  const handleValentineAction = (action) => {
    setSelectedAction(action)
    setShakeScreen(true)
    setTimeout(() => setShakeScreen(false), 300)

    if (action === 'fight') {
      setDialentText(valentineDialogs.attack)
      setMochiHP(prev => Math.max(prev - 0, prev))
    } else if (action === 'act') {
      const actOptions = ['flirt', 'pet', 'treat']
      const randomAct = actOptions[Math.floor(Math.random() * actOptions.length)]
      setDialentText(valentineDialogs[randomAct])
      setLovePoints(prev => {
        const newPoints = prev + (randomAct === 'pet' ? 30 : randomAct === 'flirt' ? 20 : 25)
        if (newPoints >= 100) {
          setTimeout(() => {
            setValentinePhase('result')
            setDialentText(valentineDialogs.win)
            setValentineResult('love')
          }, 2000)
        }
        return Math.min(newPoints, 100)
      })
    } else if (action === 'item') {
      setDialentText("* Usas un ❤️ Chocolate...\n* MOCHI está muy feliz!\n* +15 LOVE POINTS!")
      setLovePoints(prev => Math.min(prev + 15, 100))
    } else if (action === 'mercy') {
      setDialentText(valentineDialogs.mercy)
      setTimeout(() => {
        setValentinePhase('result')
        setValentineResult('mercy')
      }, 3000)
    }
  }

  useEffect(() => {
    // 1. Load Gallery
    const loadGallery = async () => {
      let localPics = []
      try {
        const res = await fetch('/pics.json')
        if (res.ok) {
          const files = await res.json()
          localPics = files.map(file => ({ id: file, url: `/pics/${file}`, isLocal: true, created_at: '2000-01-01' }))
        }
      } catch (e) { console.error(e) }

      let cloudPics = []
      const { data, error } = await supabase.from('pics').select('*').order('created_at', { ascending: false })
      if (!error && data) cloudPics = data

      setPics([...cloudPics, ...localPics])
    }
    loadGallery()

    // 2. Hit Counter Logic
    const initCounter = async () => {
      // Increment views safely via RPC
      try { await supabase.rpc('increment_views') } catch (e) { console.error(e) }

      // Fetch current views
      const { data } = await supabase.from('site_stats').select('views').eq('id', 1).single()
      if (data) setViews(data.views)
    }
    initCounter()

    // 3. Realtime Subscriptions
    const channelVals = supabase.channel('public:db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pics' }, payload => {
        setPics(current => [payload.new, ...current])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_stats' }, payload => {
        if (payload.new && payload.new.views) setViews(payload.new.views)
      })
      .subscribe()

    // 4. Auth State Listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      supabase.removeChannel(channelVals)
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`

    try {
      const { error: uploadError } = await supabase.storage.from('mochi-uploads').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('mochi-uploads').getPublicUrl(filePath)
      const { data, error: dbError } = await supabase.from('pics').insert([{ url: publicUrl }]).select()
      if (dbError) throw dbError

      // Add to local state immediately
      if (data && data[0]) {
        setPics(current => [data[0], ...current])
      }

      setShowUpload(false)
      alert("SUCCESS!")
    } catch (error) { alert(error.message) }
    finally { setUploading(false) }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword
    })

    if (error) {
      setLoginError(error.message)
    } else {
      setShowLogin(false)
      setLoginEmail('')
      setLoginPassword('')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleDelete = async (pic) => {
    if (!window.confirm('¿Seguro que quieres eliminar este archivo?')) return

    try {
      // Delete from database
      if (pic.id) {
        const { error: dbError } = await supabase.from('pics').delete().eq('id', pic.id)
        if (dbError) throw dbError
      }

      // Delete from storage (if it's a cloud file)
      if (pic.url && pic.url.includes('supabase')) {
        const fileName = pic.url.split('/').pop()
        const { error: storageError } = await supabase.storage.from('mochi-uploads').remove([fileName])
        if (storageError) throw storageError
      }

      // Remove from local state immediately
      setPics(current => current.filter(p => p.id !== pic.id))

      alert('¡Eliminado!')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme])

  // Helper to detect iOS
  const isIOS = () => {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
      // Account for iOS 13+ 
      || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  }

  // Handle media opening
  const openMedia = (src) => {
    const isVideo = src.match(/\.(mp4|mov|webm|avi)$/i);

    if (isIOS() && isVideo) {
      // On iOS, try to use native behavior for videos to avoid duplication
      // We'll find the video element and attempt to play/fullscreen it
      // or just open the lightbox but with even MORE minimal UI
      setSelectedPic(src);
    } else {
      setSelectedPic(src);
    }
  }

  // Separate content
  const videos = pics.filter(p => {
    const src = p.url || `/pics/${p}`
    return src.match(/\.(mp4|mov|webm|avi)$/i) // Multiple video formats
  })
  const photos = pics.filter(p => {
    const src = p.url || `/pics/${p}`
    return !src.match(/\.(mp4|mov|webm|avi)$/i)
  })

  return (
    <div className="app-container">

      {/* Mobile Header with Hamburger */}
      <div className="mobile-header">
        <div className="mobile-brand">
          <img src="/pics/mochi1.jpg" alt="Mochi" className="mobile-avatar" />
          <span className="mobile-title">MOCHI.CAT</span>
        </div>
        <button
          className={`hamburger-btn ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Sidebar (Left Frame) */}
      <aside
        className={`container-retro sidebar sidebar-mobile ${mobileMenuOpen ? 'mobile-open' : ''}`}
        onTouchStart={(e) => setMenuTouchStart(e.targetTouches[0].clientY)}
        onTouchMove={(e) => {
          const touchMove = e.targetTouches[0].clientY;
          if (menuTouchStart && menuTouchStart - touchMove > minSwipeDistance) {
            setMobileMenuOpen(false);
            setMenuTouchStart(null);
          }
        }}
        onTouchEnd={() => setMenuTouchStart(null)}
      >
        <div className="box-title desktop-only">:: MENU ::</div>
        <div className="mobile-swipe-indicator"></div>
        <div className="sidebar-content">
          <div className="profile-box desktop-only">
            <img
              src="/pics/mochi1.jpg"
              alt="profile"
              className="profile-img"
            />
            <div className="profile-info">
              Name: Mochi<br />
              Type: Cat<br />
              Nature: Cutie<br />
              Gender:<span style={{ color: '#ff69b4', fontSize: '12px' }}>♀</span>
            </div>
          </div>

          <nav className="nav-list">
            <button
              onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}
              className={`nav-link simple-hover ${currentPage === 'home' ? 'active' : ''}`}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-text">{currentPage === 'home' ? '♥ HOME' : 'HOME'}</span>
            </button>
            <button
              onClick={() => { setCurrentPage('about'); setMobileMenuOpen(false); }}
              className={`nav-link simple-hover ${currentPage === 'about' ? 'active' : ''}`}
            >
              <span className="nav-icon">ℹ️</span>
              <span className="nav-text">{currentPage === 'about' ? '♥ ABOUT' : 'ABOUT'}</span>
            </button>
            <button
              onClick={() => { setCurrentPage('valentine'); setMobileMenuOpen(false); }}
              className={`nav-link simple-hover valentine-btn ${currentPage === 'valentine' ? 'active' : ''}`}
            >
              <span className="nav-icon">💝</span>
              <span className="nav-text">{currentPage === 'valentine' ? '💕 VALENTINE' : 'VALENTINE'}</span>
            </button>
            <button
              onClick={() => { user ? setShowUpload(true) : setShowLogin(true); setMobileMenuOpen(false); }}
              className="nav-link upload-btn"
            >
              <span className="nav-icon">📤</span>
              <span className="nav-text">UPLOAD</span>
            </button>

            {user && (
              <div className="mobile-user-info">
                <div className="user-email">👤 {user.email}</div>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="nav-link logout-btn">
                  <span className="nav-icon">🚪</span>
                  <span className="nav-text">LOGOUT</span>
                </button>
              </div>
            )}

            <div className="theme-selector">
              <div className="theme-label">THEME</div>
              <div className="theme-buttons">
                <button onClick={() => setTheme('cute')} className={`theme-btn ${theme === 'cute' ? 'active' : ''}`} title="Cute">
                  🌸
                </button>
                <button onClick={() => setTheme('papyrus')} className={`theme-btn ${theme === 'papyrus' ? 'active' : ''}`} title="Papyrus">
                  📜
                </button>
                <button onClick={() => setTheme('ascii')} className={`theme-btn ${theme === 'ascii' ? 'active' : ''}`} title="ASCII">
                  📟
                </button>
              </div>
            </div>
          </nav>

          <div className="views-counter">
            <div className="sidebar-gifs">
              <img
                src="/mochi_pixel.png"
                alt="pixel mochi"
                className="pixel-mochi-img"
              />
            </div>
            <div className="counter-label">Total Views:</div>
            <span className="views-number" key={views}>
              {String(views).padStart(6, '0')}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button
          onClick={() => setCurrentPage('home')}
          className={`mobile-nav-btn ${currentPage === 'home' ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon">🏠</span>
          <span className="mobile-nav-label">Home</span>
        </button>
        <button
          onClick={() => setCurrentPage('valentine')}
          className={`mobile-nav-btn ${currentPage === 'valentine' ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon">💝</span>
          <span className="mobile-nav-label">Love</span>
        </button>
        <button
          onClick={() => user ? setShowUpload(true) : setShowLogin(true)}
          className="mobile-nav-btn mobile-upload-btn"
        >
          <span className="mobile-nav-icon">+</span>
          <span className="mobile-nav-label">Add</span>
        </button>
        <button
          onClick={() => setCurrentPage('about')}
          className={`mobile-nav-btn ${currentPage === 'about' ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon">ℹ️</span>
          <span className="mobile-nav-label">Info</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`mobile-nav-btn ${mobileMenuOpen ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon">☰</span>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </nav>

      {/* Main Content (Right Frame) */}
      <main className="container-retro main-content main-mobile">
        <div className="box-title">
          <span>:: MOCHI.CAT - {currentPage === 'home' ? 'GALLERY' : 'PROFILE'} ::</span>
          <span className="blink">● ONLINE</span>
        </div>

        <div className="content-scrollable">

          {currentPage === 'home' && (
            <>
              {/* Photos Section */}
              <div className="section-title">
                <h2>♥ PHOTOS ({photos.length})</h2>
              </div>

              <div className="gallery-grid">
                {photos.map((pic, i) => {
                  const src = pic.url || `/pics/${pic}`
                  return (
                    <div key={pic.id || i} className="gallery-item">
                      {user && pic.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(pic)
                          }}
                          className="delete-btn-glass"
                        >
                          🗑️
                        </button>
                      )}
                      <div onClick={() => openMedia(src)} className="gallery-img-container">
                        <img
                          src={src}
                          alt="mochi"
                          loading="lazy"
                          decoding="async"
                          fetchpriority={i < 4 ? "high" : "auto"}
                          className="gallery-img"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Videos Section */}
              <div className="section-title" style={{ marginTop: '30px' }}>
                <h2>♥ VIDEOS ({videos.length})</h2>
              </div>

              <div className="gallery-grid">
                {videos.map((pic, i) => {
                  const src = pic.url || `/pics/${pic}`
                  return (
                    <div key={pic.id || i} className="gallery-item">
                      {user && pic.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(pic)
                          }}
                          className="delete-btn-glass"
                        >
                          🗑️
                        </button>
                      )}
                      <div onClick={() => openMedia(src)} className="gallery-img-container" style={{ background: '#000' }}>
                        <video
                          src={src + "#t=0.1"}
                          preload="metadata"
                          muted
                          playsInline
                          onMouseOver={e => { if (!isIOS()) e.target.play() }}
                          onMouseOut={e => { if (!isIOS()) { e.target.pause(); e.target.currentTime = 0; } }}
                          className="gallery-img"
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '5px',
                          right: '5px',
                          color: '#fff',
                          fontSize: '10px',
                          background: 'rgba(0,0,0,0.5)',
                          padding: '2px'
                        }}>▶</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {currentPage === 'about' && (
            <div className="about-card">
              <div className="about-inner">
                <h1 className="about-title">Who is Mochi?</h1>
                <img src="/pics/mochi3.jpg" className="about-img" />
                <p className="about-text">
                  most cute cat 4ever mochi🥺 💕
                  <br /><br />
                  t amo sandra ♡
                  <br /><br />
                  (｡♥‿♥｡)
                </p>
                <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '12px', color: 'var(--text-dim)' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <a href="https://github.com/idsib/mochi.cat" target="_blank" rel="noopener noreferrer" style={{
                      color: 'var(--text-main)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'transform 0.2s'
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                      </svg>
                    </a>
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ fontSize: '10px', marginBottom: '5px', fontFamily: 'var(--font-pixel)' }}>LEVEL 2</div>
                    <div style={{
                      width: '100%',
                      height: '12px',
                      background: 'var(--bg-color)',
                      border: '2px solid var(--border-color)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: '66%',
                        height: '100%',
                        background: 'linear-gradient(to right, var(--accent-pink), var(--accent-light))',
                        transition: 'width 0.5s'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Valentine Undertale-Style Section */}
          {currentPage === 'valentine' && (
            <div className={`valentine-container ${shakeScreen ? 'shake' : ''}`}>
              {/* Floating Hearts Background */}
              <div className="floating-hearts">
                {floatingHearts.map(heart => (
                  <div
                    key={heart.id}
                    className="floating-heart"
                    style={{
                      left: `${heart.x}%`,
                      animationDelay: `${heart.delay}s`,
                      animationDuration: `${heart.duration}s`,
                      fontSize: `${heart.size}px`
                    }}
                  >
                    ♥
                  </div>
                ))}
              </div>

              {/* Battle Arena */}
              <div className="undertale-battle">
                {/* Enemy Display */}
                <div className="enemy-display">
                  <div className="enemy-sprite">
                    <img
                      src="/pics/mochi1.jpg"
                      alt="Mochi"
                      className={`enemy-img ${selectedAction ? 'enemy-react' : ''}`}
                    />
                    <div className="enemy-hearts">
                      {[...Array(3)].map((_, i) => (
                        <span key={i} className="pixel-heart">♥</span>
                      ))}
                    </div>
                  </div>
                  <div className="enemy-name">★ MOCHI ★</div>
                  <div className="enemy-subtitle">LV 99 - The Cutest Cat</div>
                </div>

                {/* Dialog Box - Undertale Style */}
                <div className="undertale-dialog">
                  <div className="dialog-border">
                    <div className="dialog-inner">
                      <div className="dialog-text">
                        {displayedText.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                        {isTyping && <span className="cursor-blink">▌</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="stats-container">
                  <div className="stat-row">
                    <span className="stat-label">MOCHI HP</span>
                    <div className="hp-bar">
                      <div className="hp-fill" style={{ width: `${mochiHP}%` }}></div>
                    </div>
                    <span className="hp-text">{mochiHP}/100</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label love-label">♥ LOVE</span>
                    <div className="love-bar">
                      <div className="love-fill" style={{ width: `${lovePoints}%` }}></div>
                    </div>
                    <span className="love-text">{lovePoints}/100</span>
                  </div>
                </div>

                {/* Action Buttons - Undertale Style */}
                {valentinePhase !== 'result' && (
                  <div className="action-buttons">
                    <button
                      className="action-btn fight-btn"
                      onClick={() => handleValentineAction('fight')}
                      disabled={isTyping}
                    >
                      <span className="btn-icon">⚔️</span>
                      <span className="btn-text">FIGHT</span>
                    </button>
                    <button
                      className="action-btn act-btn"
                      onClick={() => handleValentineAction('act')}
                      disabled={isTyping}
                    >
                      <span className="btn-icon">💕</span>
                      <span className="btn-text">ACT</span>
                    </button>
                    <button
                      className="action-btn item-btn"
                      onClick={() => handleValentineAction('item')}
                      disabled={isTyping}
                    >
                      <span className="btn-icon">🍫</span>
                      <span className="btn-text">ITEM</span>
                    </button>
                    <button
                      className="action-btn mercy-btn"
                      onClick={() => handleValentineAction('mercy')}
                      disabled={isTyping}
                    >
                      <span className="btn-icon">💝</span>
                      <span className="btn-text">MERCY</span>
                    </button>
                  </div>
                )}

                {/* Win Screen */}
                {valentinePhase === 'result' && (
                  <div className="valentine-result">
                    <div className="result-hearts">
                      {[...Array(7)].map((_, i) => (
                        <span key={i} className="result-heart" style={{ animationDelay: `${i * 0.1}s` }}>♥</span>
                      ))}
                    </div>
                    <h2 className="result-title">
                      {valentineResult === 'mercy' ? '♥ TRUE LOVE ♥' : '♥ LOVE WINS ♥'}
                    </h2>
                    <p className="result-text">
                      {valentineResult === 'mercy'
                        ? '¡Has elegido a MOCHI para siempre!'
                        : '¡MOCHI te ha conquistado con su amor!'}
                    </p>
                    <p className="result-message">Feliz San Valentín 💕</p>
                    <button
                      className="pixel-btn restart-btn"
                      onClick={() => {
                        setValentinePhase('intro')
                        setDialentText(valentineDialogs.intro)
                        setLovePoints(0)
                        setMochiHP(100)
                        setValentineResult(null)
                      }}
                    >
                      ♥ PLAY AGAIN ♥
                    </button>
                  </div>
                )}

                {/* Player Soul Heart */}
                <div className="soul-container">
                  <div className="player-soul">♥</div>
                  <span className="soul-label">TU ALMA</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modals */}
      {showLogin && (
        <div className="login-overlay glass-overlay" onClick={() => setShowLogin(false)}>
          <div className="login-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="login-header">
              <span className="login-title">ADMIN ACCESS</span>
              <button
                onClick={() => { setShowLogin(false); setLoginError('') }}
                className="login-close"
              >✕</button>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              {loginError && <div className="login-error">{loginError}</div>}

              <button type="submit" className="login-submit-btn">
                <span>UNLOCK</span>
                <span className="btn-shine"></span>
              </button>
            </form>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="upload-overlay glass-overlay" onClick={() => setShowUpload(false)}>
          <div className="upload-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="upload-header">
              <span className="upload-title">NEW TREASURE</span>
              <button
                onClick={() => setShowUpload(false)}
                className="upload-close"
              >✕</button>
            </div>

            <div className="upload-body">
              <div className="upload-zone">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden-input"
                />
                <label htmlFor="file-upload" className={`upload-label ${uploading ? 'disabled' : ''}`}>
                  <div className="upload-icon">☁️</div>
                  <div className="upload-text">
                    {uploading ? 'SENDING TO CLOUD...' : 'CLICK TO SELECT FILE'}
                  </div>
                  <div className="upload-subtext">Images or Videos allowed</div>
                </label>
              </div>

              {uploading && (
                <div className="upload-progress-container">
                  <div className="upload-progress-bar">
                    <div className="upload-progress-fill"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPic && (
        <div className="lightbox-overlay" onClick={() => setSelectedPic(null)}>
          {(() => {
            const allItems = [...photos, ...videos];
            const currentIndex = allItems.findIndex(p => (p.url || `/pics/${p}`) === selectedPic);
            const prevItem = allItems[currentIndex - 1];
            const nextItem = allItems[currentIndex + 1];

            return (
              <div className="lightbox-content-wrapper" onClick={(e) => e.stopPropagation()}>

                {/* Header Controls */}
                <div className="lightbox-header">
                  <div className="lightbox-bg-blur"></div>
                  <span className="lightbox-count">
                    {currentIndex + 1} / {allItems.length}
                  </span>
                  <div className="lightbox-toggles">
                    <a
                      href={selectedPic}
                      download
                      className="lightbox-icon-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ⬇
                    </a>
                    <button
                      className="lightbox-icon-btn close-btn"
                      onClick={() => setSelectedPic(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Main Media Area */}
                <div className="lightbox-media-area">
                  {/* Previous Button (Hidden on Mobile touch, visible on Desktop) */}
                  {prevItem && (
                    <button
                      className="lightbox-nav-btn prev desktop-only"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPic(prevItem.url || `/pics/${prevItem}`);
                      }}
                    >
                      ❮
                    </button>
                  )}

                  {/* Media Content */}
                  <div className="lightbox-media-box">
                    {selectedPic.match(/\.(mp4|mov|webm|avi)$/i) ? (
                      <div
                        className="lightbox-video-container"
                        onClick={(e) => {
                          e.stopPropagation();
                          const v = e.currentTarget.querySelector('video');
                          if (v.paused) {
                            v.play();
                            setIsVideoPaused(false);
                          } else {
                            v.pause();
                            setIsVideoPaused(true);
                          }
                        }}
                      >
                        <video
                          src={selectedPic}
                          autoPlay
                          loop
                          playsInline
                          className="lightbox-video native-video"
                          onPlay={() => setIsVideoPaused(false)}
                          onPause={() => setIsVideoPaused(true)}
                        />
                        <VideoControl isPaused={isVideoPaused} />
                      </div>
                    ) : (
                      <img
                        src={selectedPic}
                        alt="Full view"
                        className="lightbox-image"
                        draggable={false}
                        onClick={(e) => {
                          // In mobile, tap image to go next
                          if (window.innerWidth <= 768 && nextItem) {
                            e.stopPropagation();
                            setSelectedPic(nextItem.url || `/pics/${nextItem}`);
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Next Button */}
                  {nextItem && (
                    <button
                      className="lightbox-nav-btn next desktop-only"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPic(nextItem.url || `/pics/${nextItem}`);
                      }}
                    >
                      ❯
                    </button>
                  )}
                </div>

                {/* Mobile Tap Zones for Navigation */}
                <div className="mobile-tap-zones">
                  {prevItem && (
                    <div
                      className="tap-zone left"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPic(prevItem.url || `/pics/${prevItem}`);
                      }}
                    />
                  )}
                  {nextItem && (
                    <div
                      className="tap-zone right"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPic(nextItem.url || `/pics/${nextItem}`);
                      }}
                    />
                  )}
                </div>

                {/* Bottom Strip (Optional, hidden on small screens) */}
                <div className="lightbox-strip">
                  {allItems.map((item, idx) => {
                    const itemUrl = item.url || `/pics/${item}`;
                    // Only show items around current index
                    if (Math.abs(currentIndex - idx) > 4) return null;

                    return (
                      <div
                        key={idx}
                        className={`strip-thumb ${idx === currentIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPic(itemUrl);
                        }}
                      >
                        {itemUrl.match(/\.(mp4|mov|webm|avi)$/i) ? (
                          <div className="strip-video-marker">▶</div>
                        ) : (
                          <img src={itemUrl} alt="" />
                        )}
                      </div>
                    )
                  })}
                </div>

              </div>
            );
          })()}
        </div>
      )}
    </div>
  )
}

export default App
