import { useState, useEffect, useRef } from 'react'
import './index.css'

const UndertaleGame = ({ onWin, isIOS }) => {
    const [phase, setPhase] = useState('menu') // menu, attack_select, defense, result, gameover
    const [dialogText, setDialogText] = useState('')
    const [displayedText, setDisplayedText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [mochiHP, setMochiHP] = useState(100)
    const [lovePoints, setLovePoints] = useState(0)
    const [floatingEffects, setFloatingEffects] = useState([])
    const [inventory, setInventory] = useState(['❤️ Chocolate', '🍪 Galleta', '🍦 Helado'])
    const [turnCount, setTurnCount] = useState(0)

    // Estadísticas del Jugador
    const [playerHP, setPlayerHP] = useState(20)
    const [maxPlayerHP] = useState(20)

    // Estado del Modo Defensa (Bullet Hell)
    const [soulPos, setSoulPos] = useState({ x: 50, y: 50 }) // % relativo al recuadro
    const [projectiles, setProjectiles] = useState([])
    const [isInvincible, setIsInvincible] = useState(false)
    const boxRef = useRef(null)
    const gameLoopRef = useRef(null)

    // Mini-juego de Ataque
    const [sliderPos, setSliderPos] = useState(0)
    const [isSliding, setIsSliding] = useState(false)
    const sliderRequestRef = useRef(null)

    // Smooth Movement Refs
    const keysPressed = useRef({})
    const lastTimeRef = useRef(0)
    const touchStartRef = useRef(null)

    const typeIntervalRef = useRef(null)
    const lastIntroRef = useRef(null)

    const dialogs = {
        intros: [
            "* ¡MOCHI dice :3!",
            "* MOCHI te mira con ojitos brillantes.",
            "* MOCHI está haciendo la croqueta.",
            "* Un aura de ternura te rodea. Es MOCHI.",
            "* MOCHI bosteza de forma adorable.",
            "* ¡MOCHI quiere jugar!",
            "* MOCHI te juzga silenciosamente."
        ],
        flirt: "* Le dices a MOCHI que es linda.\n* Se sonroja pixeladamente.\n* ¡El ATQ aumenta!",
        pet: "* Acaricias a MOCHI.\n* ¡Es súper efectivo!\n* MOCHI está ronroneando.",
        treat: "* Le das un premio.\n* MOCHI come felizmente.",
        wait: "* Esperas...\n* MOCHI te devuelve la mirada intensamente.",
        mercy: "* Perdonaste a MOCHI.\n* ¡Mejores amigos por siempre!",
        enemy_turn: "* ¡MOCHI está preparando un ataque de ternura!"
    }

    const getRandomIntro = () => {
        let available = dialogs.intros.filter(i => i !== lastIntroRef.current)
        const choice = available[Math.floor(Math.random() * available.length)]
        lastIntroRef.current = choice
        return choice
    }

    const resetGame = () => {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
        if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
        if (sliderRequestRef.current) cancelAnimationFrame(sliderRequestRef.current)

        setPhase('menu')
        setMochiHP(100)
        setLovePoints(0)
        setPlayerHP(maxPlayerHP)
        setSoulPos({ x: 50, y: 50 })
        setProjectiles([])
        setIsInvincible(false)
        setFloatingEffects([])
        setInventory(['❤️ Chocolate', '🍪 Galleta', '🍦 Helado'])
        setSliderPos(0)
        setIsSliding(false)
        setTurnCount(0)

        setTimeout(() => {
            typeText(getRandomIntro())
        }, 10)
    }

    // Configuración inicial
    useEffect(() => {
        typeText(getRandomIntro())
    }, [])

    const typeText = (text) => {
        if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
        setDialogText(text)
        setDisplayedText('')
        setIsTyping(true)
        let i = 0
        typeIntervalRef.current = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text.charAt(i))
                i++
            } else {
                setIsTyping(false)
                clearInterval(typeIntervalRef.current)
                typeIntervalRef.current = null
            }
        }, 30)
    }

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                resetGame()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
            if (sliderRequestRef.current) cancelAnimationFrame(sliderRequestRef.current)
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    const addFloatingEffect = (text, type = 'love') => {
        const id = Date.now()
        setFloatingEffects(prev => [...prev, { id, text, type }])
        setTimeout(() => {
            setFloatingEffects(prev => prev.filter(e => e.id !== id))
        }, 1500)
    }

    const handleAction = (action) => {
        if (phase !== 'menu') return

        if (action === 'fight') {
            setPhase('attack_select')
            setSliderPos(0)
            setIsSliding(true)
        } else if (action === 'act') {
            const acts = ['flirt', 'pet', 'treat']
            const act = acts[Math.floor(Math.random() * acts.length)]
            typeText(dialogs[act])

            let points = 25
            let hpDrain = 10
            if (act === 'flirt') points = 20
            if (act === 'pet') { points = 30; hpDrain = 20; }

            addFloatingEffect(`+${points} LOVE`, "love")
            setLovePoints(prev => Math.min(prev + points, 100))

            // ACT también reduce la "resistencia" (HP) de Mochi de forma pacífica
            setMochiHP(prev => {
                const next = Math.max(0, prev - hpDrain)
                if (next === 0) {
                    setTimeout(() => setPhase('result'), 2000)
                }
                return next
            })

            if (mochiHP - hpDrain > 0) {
                startEnemyTurn()
            }
        } else if (action === 'item') {
            if (inventory.length > 0) {
                const item = inventory[0]
                setInventory(prev => prev.slice(1))
                typeText(`* Usaste el ${item}.\n* ¡Tus HP se restauraron!`)
                addFloatingEffect("HP MAX", "heal")
                setPlayerHP(maxPlayerHP)
                startEnemyTurn()
            } else {
                typeText("* No te quedan objetos...")
            }
        } else if (action === 'mercy') {
            if (turnCount >= 3) {
                typeText(dialogs.mercy)
                setPhase('result')
            } else {
                typeText("* ¡MOCHI aún no está lista para ser perdonada!")
                startEnemyTurn()
            }
        }
    }

    // Mini-juego de Ataque (Slider)
    useEffect(() => {
        if (phase !== 'attack_select' || !isSliding) return

        let start = null
        const duration = 1000 // Velocidad

        const animateSlider = (timestamp) => {
            if (!start) start = timestamp
            const progress = (timestamp - start) / duration
            const pos = (progress * 100) % 200
            const actualPos = pos > 100 ? 200 - pos : pos

            setSliderPos(actualPos)
            sliderRequestRef.current = requestAnimationFrame(animateSlider)
        }

        sliderRequestRef.current = requestAnimationFrame(animateSlider)
        return () => cancelAnimationFrame(sliderRequestRef.current)
    }, [phase, isSliding])

    const handleStrike = () => {
        if (phase !== 'attack_select' || !isSliding) return
        setIsSliding(false)
        cancelAnimationFrame(sliderRequestRef.current)

        const dist = Math.abs(50 - sliderPos)
        let dmg = 0
        let msg = ""

        if (dist < 5) {
            dmg = 35
            msg = "* ¡GOLPE CRÍTICO!"
        } else if (dist < 15) {
            dmg = 20 + Math.floor(Math.random() * 5)
            msg = "* ¡Un buen tajo!"
        } else if (dist < 35) {
            dmg = 10 + Math.floor(Math.random() * 5)
            msg = "* Golpe débil..."
        } else {
            dmg = 0
            msg = "* ¡FALLASTE!"
        }

        if (mochiHP - dmg <= 0 && dmg > 0) {
            setMochiHP(0)
            addFloatingEffect(`-${dmg}`, "damage")
            typeText(`* Derrotaste a MOCHI...`)
            setTimeout(() => setPhase('result'), 2000)
        } else {
            typeText(`${msg}\n* ¡${dmg} de daño!`)
            if (dmg > 0) {
                addFloatingEffect(`-${dmg}`, "damage")
                setMochiHP(prev => Math.max(0, prev - dmg))
            }
            startEnemyTurn()
        }
    }

    // Ref para acceder a la última versión de handleStrike desde el listener
    const handleStrikeRef = useRef(handleStrike)
    useEffect(() => {
        handleStrikeRef.current = handleStrike
    })

    // Listener para la tecla Espacio
    useEffect(() => {
        if (phase !== 'attack_select' || !isSliding) return

        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault()
                handleStrikeRef.current()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [phase, isSliding])

    const startEnemyTurn = () => {
        setTurnCount(prev => prev + 1)
        setTimeout(() => {
            setPhase('defense')
            setSoulPos({ x: 50, y: 50 })
            setProjectiles([])
            let timeLeft = 5000
            let lastProjectileTime = 0

            const loop = (time) => {
                if (!lastProjectileTime) lastProjectileTime = time
                if (timeLeft <= 0) {
                    setPhase('menu')
                    typeText(getRandomIntro())
                    cancelAnimationFrame(gameLoopRef.current)
                    return
                }

                timeLeft -= 16

                if (Math.random() < 0.05) {
                    setProjectiles(prev => [...prev, {
                        id: Math.random(),
                        x: Math.random() * 100,
                        y: -10,
                        vx: (Math.random() - 0.5) * 1,
                        vy: 1 + Math.random() * 1,
                        type: Math.random() > 0.5 ? 'mochi' : 'berry'
                    }])
                }

                setProjectiles(prev => prev.map(p => ({
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy
                })).filter(p => p.y < 110 && p.x > -10 && p.x < 110))

                // Smooth Soul Movement Logic
                setSoulPos(prev => {
                    let { x, y } = prev
                    const speed = 0.8 // Velocidad ajustada para 60fps

                    if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['W']) y -= speed
                    if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['S']) y += speed
                    if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) x -= speed
                    if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) x += speed

                    return {
                        x: Math.max(0, Math.min(100, x)),
                        y: Math.max(0, Math.min(100, y))
                    }
                })

                lastProjectileTime = time
                gameLoopRef.current = requestAnimationFrame(loop)
            }
            gameLoopRef.current = requestAnimationFrame(loop)
        }, 2000)
    }

    useEffect(() => {
        if (phase !== 'defense') return

        const handleKeyDown = (e) => { keysPressed.current[e.key] = true }
        const handleKeyUp = (e) => { keysPressed.current[e.key] = false }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // Limpiar keys al terminar fase
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            keysPressed.current = {}
        }
    }, [phase])

    // Touch Controls Logic
    const handleTouchStart = (e) => {
        if (phase !== 'defense') return
        const touch = e.touches[0]
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchMove = (e) => {
        if (phase !== 'defense' || !touchStartRef.current) return
        // Prevent default scroling inside the game box
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y

        // Mover alma basado en el desplazamiento del dedo (Joystick relativo)
        setSoulPos(prev => {
            const sensitivity = 0.2
            return {
                x: Math.max(0, Math.min(100, prev.x + deltaX * sensitivity)),
                y: Math.max(0, Math.min(100, prev.y + deltaY * sensitivity))
            }
        })

        // Actualizar referencia para movimiento continuo suave
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = () => {
        touchStartRef.current = null
    }

    useEffect(() => {
        if (phase !== 'defense' || isInvincible) return
        const hit = projectiles.some(p => {
            const dx = p.x - soulPos.x
            const dy = p.y - soulPos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            return dist < 5
        })

        if (hit) {
            const newHP = Math.max(0, playerHP - 4)
            setPlayerHP(newHP)
            setIsInvincible(true)
            setTimeout(() => setIsInvincible(false), 1000)

            if (newHP <= 0) {
                setPhase('gameover')
                if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
            }
        }
    }, [soulPos, projectiles, phase, isInvincible, playerHP])

    return (
        <div className="undertale-game-container">
            {floatingEffects.map(effect => (
                <div key={effect.id} className="float-text" style={{
                    color: effect.type === 'love' ? '#ff69b4' : effect.type === 'damage' ? '#ff0000' : '#00ff00'
                }}>
                    {effect.text}
                </div>
            ))}

            <div className="undertale-battle-area">
                <div className="enemy-section">
                    <img
                        src="/pics/mochi_undertale.png"
                        className={`enemy-sprite-pixel ${phase === 'defense' ? 'attacking' : ''}`}
                        alt="Mochi Enemigo"
                    />
                    <div className="enemy-hp-bar">
                        <div className="enemy-hp-fill" style={{ width: `${mochiHP}%` }}></div>
                    </div>
                </div>

                <div
                    className="dialog-box-container"
                    ref={boxRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {phase === 'defense' ? (
                        <div className="bullet-hell-box">
                            <div
                                className={`player-soul ${isInvincible ? 'blink' : ''}`}
                                style={{
                                    left: `${soulPos.x}%`,
                                    top: `${soulPos.y}%`
                                }}
                            >♥</div>
                            {projectiles.map(p => (
                                <div
                                    key={p.id}
                                    className="projectile"
                                    style={{
                                        left: `${p.x}%`,
                                        top: `${p.y}%`
                                    }}
                                >
                                    {p.type === 'mochi' ? '🍡' : '🍓'}
                                </div>
                            ))}
                        </div>
                    ) : phase === 'attack_select' ? (
                        <div
                            className="attack-slider-box"
                            onClick={handleStrike}
                            onTouchStart={(e) => {
                                e.preventDefault() // Evitar doble disparo con click
                                handleStrike()
                            }}
                        >
                            <div className="strike-target"></div>
                            <div className="strike-bar" style={{ left: `${sliderPos}%` }}></div>
                            <div className="strike-hint">* PULSA [ESPACIO] O TOCA PARA ATACAR *</div>
                        </div>
                    ) : (
                        <div className="dialog-text-pixel">
                            {displayedText}
                        </div>
                    )}
                </div>
            </div>

            <div className="player-stats-row">
                <span className="stat-hp-label">HP</span>
                <div className="player-hp-bar">
                    <div className="player-hp-fill" style={{ width: `${(playerHP / maxPlayerHP) * 100}%` }}></div>
                </div>
                <span className="stat-hp-text">{playerHP} / {maxPlayerHP}</span>
            </div>

            <div className="undertale-actions-row">
                <button className="action-btn fight-btn" onClick={() => handleAction('fight')}>
                    <span className="btn-icon">⚔️</span> FIGHT
                </button>
                <button className="action-btn act-btn" onClick={() => handleAction('act')}>
                    <span className="btn-icon">💬</span> ACT
                </button>
                <button className="action-btn item-btn" onClick={() => handleAction('item')}>
                    <span className="btn-icon">🍫</span> ITEM
                </button>
                <button
                    className={`action-btn mercy-btn ${turnCount < 3 ? 'disabled' : ''}`}
                    onClick={() => handleAction('mercy')}
                    disabled={turnCount < 3}
                    style={{ opacity: turnCount < 3 ? 0.5 : 1, cursor: turnCount < 3 ? 'not-allowed' : 'pointer' }}
                >
                    <span className="btn-icon">✖️</span> MERCY
                </button>
            </div>

            {phase === 'gameover' && (
                <div className="undertale-overlay">
                    <h1 className="gameover-text">FIN DEL JUEGO</h1>
                    <div className="soul-broken">💔</div>
                    <p>¡No pierdas la esperanza!</p>
                    <button className="undertale-big-btn" onClick={resetGame}>TRY AGAIN</button>
                </div>
            )}

            {phase === 'result' && (
                <div className="undertale-overlay">
                    {mochiHP <= 0 ? (
                        <>
                            <h1 style={{ color: '#ff4444', textShadow: '2px 2px #880000' }}>te pasaste de fuerza... 😿</h1>
                            <div style={{ fontSize: '64px', margin: '20px 0' }}>🩹</div>
                            <p style={{ fontSize: '16px', color: '#fff', textAlign: 'center' }}>
                                mochi necesita mimitos ahora
                                <br />
                                (:3)
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 style={{ color: '#ff69b4', textShadow: '2px 2px #ff1493' }}>feliz san valentín:3</h1>
                            <div style={{ fontSize: '64px', margin: '20px 0' }}>💌</div>
                            <p style={{ fontSize: '16px', color: '#fff', textAlign: 'center' }}>
                                eres mi persona favorita en el mundo
                                <br />
                                tkm sandra🩷
                            </p>
                        </>
                    )}
                    <button className="undertale-big-btn" onClick={resetGame} style={{ marginTop: '20px' }}>PLAY AGAIN</button>
                </div>
            )}
        </div>
    )
}

export default UndertaleGame
