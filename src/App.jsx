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

    return () => { supabase.removeChannel(channelVals) }
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
      const { error: dbError } = await supabase.from('pics').insert([{ url: publicUrl }])
      if (dbError) throw dbError
      setShowUpload(false)
      alert("SUCCESS!")
    } catch (error) { alert(error.message) }
    finally { setUploading(false) }
  }

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme])

  // Separate content
  const videos = pics.filter(p => {
    const src = p.url || `/pics/${p}`
    return src.match(/\.(mp4)$/i) // ONLY MP4
  })
  const photos = pics.filter(p => {
    const src = p.url || `/pics/${p}`
    return !src.match(/\.(mp4|mov|webm)$/i)
  })

  return (
    <div style={{
      display: 'flex',
      width: '1000px',
      height: '90vh',
      gap: '10px',
      margin: '0 auto'
    }}>

      {/* Sidebar (Left Frame) */}
      <aside className="container-retro" style={{
        width: '250px',
        display: 'flex',
        flexDirection: 'column',
        padding: '2px'
      }}>
        <div className="box-title">:: MENU ::</div>
        <div style={{ padding: '15px', textAlign: 'center', height: '100%', overflowY: 'auto' }}>
          <div style={{
            border: '1px solid var(--border-color)',
            padding: '5px',
            background: 'var(--sidebar-bg)',
            marginBottom: '15px'
          }}>
            <img
              src="/pics/mochi1.jpg"
              alt="profile"
              style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid var(--border-color)' }}
            />
            <div style={{ marginTop: '5px', fontSize: '10px', fontFamily: 'var(--font-pixel)', textAlign: 'left', paddingLeft: '10px' }}>
              Name: Mochi<br />
              Type: Cat<br />
              Nature: Cutie<br />
              Gender:<span style={{ color: '#ff69b4', fontSize: '12px' }}>♀</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => setCurrentPage('home')}
              className="simple-hover"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: currentPage === 'home' ? 'var(--accent-pink)' : 'inherit',
                textShadow: currentPage === 'home' ? '1px 1px 0px #fff' : 'none'
              }}
            >
              {currentPage === 'home' ? '♥ HOME' : 'HOME'}
            </button>
            <button
              onClick={() => setCurrentPage('about')}
              className="simple-hover"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: currentPage === 'about' ? 'var(--accent-pink)' : 'inherit',
                textShadow: currentPage === 'about' ? '1px 1px 0px #fff' : 'none'
              }}
            >
              {currentPage === 'about' ? '♥ ABOUT' : 'ABOUT'}
            </button>
            <button onClick={() => setShowUpload(true)} className="pixel-btn" style={{ marginTop: '10px' }}>
              + UPLOAD
            </button>

            <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', marginBottom: '5px' }}>THEME:</div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => setTheme('cute')} className="pixel-btn" style={{ background: theme === 'cute' ? 'var(--accent-pink)' : '' }}>🌸</button>
                <button onClick={() => setTheme('papyrus')} className="pixel-btn" style={{ background: theme === 'papyrus' ? 'var(--accent-pink)' : '', fontFamily: 'Papyrus, Comic Sans MS' }}>📜</button>
                <button onClick={() => setTheme('ascii')} className="pixel-btn" style={{ background: theme === 'ascii' ? 'var(--accent-pink)' : '', fontFamily: 'monospace' }}>📟</button>
              </div>
            </div>
          </nav>

          <div style={{ marginTop: 'auto', fontSize: '12px', color: 'var(--text-dim)' }}>
            <img
              src="/mochi_pixel.png"
              alt="pixel mochi"
              style={{
                display: 'block',
                margin: '0 auto 5px auto',
                imageRendering: 'pixelated',
                width: '64px',
                animation: 'pixel-bounce 2s infinite'
              }}
            />
            Total Views:<br />
            <span style={{
              fontFamily: 'var(--font-pixel)',
              color: 'var(--accent-pink)',
              fontSize: '14px',
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: 'scale(1)',
              key: views
            }}>
              {String(views).padStart(6, '0')}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content (Right Frame) */}
      <main className="container-retro" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '2px'
      }}>
        <div className="box-title">
          <span>:: MOCHI.CAT - {currentPage === 'home' ? 'GALLERY' : 'PROFILE'} ::</span>
          <span className="blink">● ONLINE</span>
        </div>

        <div style={{
          padding: '10px',
          overflowY: 'scroll',
          height: '100%',
          background: 'var(--card-bg)'
        }}>

          {currentPage === 'home' && (
            <>
              {/* Photos Section */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{
                  marginBottom: '10px',
                  borderBottom: '1px dashed var(--border-color)',
                  paddingBottom: '5px'
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '16px',
                    margin: '0',
                    color: 'var(--accent-pink)'
                  }}>
                    ♥ PHOTOS ({photos.length})
                  </h2>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '8px'
                }}>
                  {photos.map((pic, i) => {
                    const src = pic.url || `/pics/${pic}`
                    return (
                      <div key={pic.id || i} style={{
                        border: '1px solid var(--border-color)',
                        padding: '3px',
                        boxShadow: 'var(--box-shadow)'
                      }}>
                        <div
                          onClick={() => setSelectedPic(src)}
                          style={{
                            aspectRatio: '1/1',
                            width: '100%',
                            background: 'var(--bg-color)',
                            cursor: 'pointer',
                            overflow: 'hidden'
                          }}
                        >
                          <img
                            src={src}
                            alt="mochi"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.1)' } }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Videos Section */}
              <div>
                <div style={{
                  marginBottom: '10px',
                  borderBottom: '1px dashed var(--border-color)',
                  paddingBottom: '5px'
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '16px',
                    margin: '0',
                    color: 'var(--accent-pink)'
                  }}>
                    ♥ VIDEOS ({videos.length})
                  </h2>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '8px'
                }}>
                  {videos.map((pic, i) => {
                    const src = pic.url || `/pics/${pic}`
                    return (
                      <div key={pic.id || i} style={{
                        border: '1px solid var(--border-color)',
                        padding: '3px',
                        boxShadow: 'var(--box-shadow)'
                      }}>
                        <div
                          onClick={() => setSelectedPic(src)}
                          style={{
                            aspectRatio: '1/1',
                            width: '100%',
                            background: '#000',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <video
                            src={src + "#t=0.1"}
                            preload="metadata"
                            muted
                            playsInline
                            onMouseOver={e => e.target.play()}
                            onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
              </div>
            </>
          )}

          {currentPage === 'about' && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{
                border: '2px dashed var(--border-color)',
                padding: '20px',
                background: 'var(--sidebar-bg)',
                display: 'inline-block',
                maxWidth: '600px'
              }}>
                <h1 style={{ fontFamily: 'var(--font-pixel)', color: 'var(--accent-pink)', marginBottom: '20px' }}>Who is Mochi?</h1>
                <img src="/pics/mochi3.jpg" style={{ width: '200px', border: '5px solid var(--card-bg)', boxShadow: 'var(--box-shadow)' }} />
                <p style={{
                  marginTop: '20px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '18px',
                  lineHeight: '1.5',
                  color: 'var(--text-main)'
                }}>
                  t amo mochi:3
                  <br /><br />
                  (｡♥‿♥｡)
                </p>
                <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '12px', color: 'var(--text-dim)' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <a href="https://github.com/idsib/mochi.cat" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-pink)', textDecoration: 'none', fontFamily: 'var(--font-pixel)', fontSize: '10px' }}>
                      ★ GitHub Repository ★
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
                    <div style={{ fontSize: '9px', marginTop: '3px', color: 'var(--text-dim)' }}>2 / 3 years</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modals */}
      {showUpload && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="container-retro" style={{ width: '300px', background: 'var(--bg-color)' }}>
            <div className="box-title" style={{ justifyContent: 'space-between' }}>
              <span>UPLOAD FILE</span>
              <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="file" onChange={handleUpload} disabled={uploading} style={{ fontFamily: 'var(--font-ui)' }} />
              {uploading && <div style={{ textAlign: 'center', color: 'var(--accent-pink)' }}>UPLOADING...</div>}
            </div>
          </div>
        </div>
      )}

      {selectedPic && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="container-retro" style={{
            maxWidth: '90%',
            maxHeight: '95vh',
            background: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative' // For absolute arrow positioning
          }}>
            <div className="box-title" style={{ justifyContent: 'space-between' }}>
              <span>VIEWER.EXE</span>
              <button onClick={() => setSelectedPic(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
            </div>

            <div style={{ padding: '5px', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>

              {/* Navigation Arrows */}
              {(() => {
                const allItems = [...photos, ...videos];
                const currentIndex = allItems.findIndex(p => (p.url || `/pics/${p}`) === selectedPic);
                const prevItem = allItems[currentIndex - 1];
                const nextItem = allItems[currentIndex + 1];

                return (
                  <>
                    {prevItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPic(prevItem.url || `/pics/${prevItem}`);
                        }}
                        className="simple-hover"
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'var(--card-bg)',
                          border: '2px solid var(--border-color)',
                          borderRadius: '50%',
                          width: '45px',
                          height: '45px',
                          fontSize: '12px',
                          color: 'var(--accent-pink)',
                          cursor: 'pointer',
                          zIndex: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif",
                          boxShadow: '0 0 10px rgba(255, 105, 180, 0.5)'
                        }}
                      >
                        :3
                        <span style={{ position: 'absolute', left: '2px', fontSize: '10px' }}>◀</span>
                      </button>
                    )}

                    {nextItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPic(nextItem.url || `/pics/${nextItem}`);
                        }}
                        className="simple-hover"
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'var(--card-bg)',
                          border: '2px solid var(--border-color)',
                          borderRadius: '50%',
                          width: '45px',
                          height: '45px',
                          fontSize: '12px',
                          color: 'var(--accent-pink)',
                          cursor: 'pointer',
                          zIndex: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif",
                          boxShadow: '0 0 10px rgba(255, 105, 180, 0.5)'
                        }}
                      >
                        :3
                        <span style={{ position: 'absolute', right: '2px', fontSize: '10px' }}>▶</span>
                      </button>
                    )}
                  </>
                );
              })()}

              {selectedPic.match(/\.(mp4|mov|webm)$/i) ? (
                <video
                  key={selectedPic} // Force re-render on change
                  src={selectedPic}
                  controls
                  autoPlay
                  style={{ maxWidth: '100%', maxHeight: '80vh' }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'block'
                  }}
                />
              ) : (
                <img src={selectedPic} style={{ maxWidth: '100%', maxHeight: '80vh' }} />
              )}
              {/* Fallback for video error */}
              <div style={{ display: 'none', color: '#ff0000', padding: '20px', textAlign: 'center' }}>
                <p>⚠ VIDEO FORMAT ERROR ⚠</p>
                <p style={{ fontSize: '12px' }}>Try downloading it to view locally.</p>
              </div>

              <a href={selectedPic} download className="pixel-btn" style={{ marginTop: '10px', width: '100%', textAlign: 'center' }}>DOWNLOAD</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
