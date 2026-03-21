import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import { useEffect, useRef } from 'react'

export default function LandingPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const assetCountRef = useRef(null)
  const alertCountRef = useRef(null)
  const termLiveRef = useRef(null)
  const mapRef = useRef(null)
  const mapTextRef = useRef(null)

  if (accessToken) return <Navigate to="/dashboard" replace />

  useEffect(() => {
    // Asset counter
    let count = 2341
    const assetInterval = setInterval(() => {
      count += Math.floor(Math.random() * 3) - 1
      count = Math.max(2330, Math.min(2350, count))
      if (assetCountRef.current) assetCountRef.current.textContent = count.toLocaleString()
    }, 3000)

    // Alert counter
    const alertTimeout1 = setTimeout(() => {
      if (alertCountRef.current) {
        alertCountRef.current.textContent = '1'
        alertCountRef.current.style.color = '#DC2626'
      }
    }, 8000)
    const alertTimeout2 = setTimeout(() => {
      if (alertCountRef.current) {
        alertCountRef.current.textContent = '0'
        alertCountRef.current.style.color = '#fff'
      }
    }, 14000)

    // Terminal messages
    const liveMessages = [
      'Monitoring // all 2,341 assets nominal',
      'FT-0773 position updated // sector clear',
      'Geofence check passed // SECTOR-7',
      'FT-1182 battery: 87% // nominal',
      'Audit log flushed // 0 anomalies',
      'FT-0041 movement detected // tracking',
    ]
    let msgIdx = 0
    const termInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % liveMessages.length
      if (termLiveRef.current) termLiveRef.current.textContent = ' ' + liveMessages[msgIdx]
    }, 2500)

    // Map dots
    const mapEl = mapRef.current
    if (mapEl) {
      const positions = [
        { x: 20, y: 30, c: '' }, { x: 45, y: 55, c: 'green' }, { x: 70, y: 25, c: '' },
        { x: 30, y: 70, c: 'blue' }, { x: 60, y: 65, c: '' }, { x: 80, y: 40, c: 'blue' },
        { x: 15, y: 80, c: 'green' }, { x: 55, y: 15, c: '' }, { x: 85, y: 75, c: '' },
        { x: 40, y: 45, c: '' }, { x: 25, y: 50, c: 'blue' }, { x: 75, y: 55, c: 'green' },
      ]
      const dots = []
      positions.forEach((p) => {
        const d = document.createElement('div')
        d.className = 'ft-map-dot' + (p.c ? ' ' + p.c : '')
        d.style.left = p.x + '%'
        d.style.top = p.y + '%'
        d.style.animationDelay = Math.random() * 2 + 's'
        mapEl.appendChild(d)
        dots.push(d)
      })

      let mx = 45, my = 55, dmx = 0.3, dmy = 0.2
      const movingDot = dots[1]
      const moveInterval = setInterval(() => {
        mx += dmx + (Math.random() - 0.5) * 0.2
        my += dmy + (Math.random() - 0.5) * 0.2
        if (mx > 90 || mx < 10) dmx *= -1
        if (my > 90 || my < 10) dmy *= -1
        if (movingDot) { movingDot.style.left = mx + '%'; movingDot.style.top = my + '%' }
      }, 200)

      // Map text
      const mapTexts = [
        'TRACKING 2,341 ASSETS // SECTOR CLEAR',
        'FT-0099 MOVEMENT DETECTED // MONITORING',
        'GEOFENCE CHECK // ALL ZONES NOMINAL',
        'SIGNAL STRENGTH // 99.2% NOMINAL',
      ]
      let mapIdx = 0
      const mapInterval = setInterval(() => {
        mapIdx = (mapIdx + 1) % mapTexts.length
        if (mapTextRef.current) mapTextRef.current.textContent = mapTexts[mapIdx]
      }, 4000)

      return () => {
        clearInterval(assetInterval)
        clearInterval(termInterval)
        clearInterval(moveInterval)
        clearInterval(mapInterval)
        clearTimeout(alertTimeout1)
        clearTimeout(alertTimeout2)
        dots.forEach((d) => d.remove())
      }
    }

    return () => {
      clearInterval(assetInterval)
      clearInterval(termInterval)
      clearTimeout(alertTimeout1)
      clearTimeout(alertTimeout2)
    }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;900&display=swap');

        .ft-root {
          --red: #DC2626;
          --red-dim: #991B1B;
          --red-glow: rgba(220,38,38,0.15);
          --red-line: rgba(220,38,38,0.4);
          --bg: #050505;
          --bg2: #0A0A0A;
          --bg3: #111111;
          --border: rgba(255,255,255,0.06);
          --border-red: rgba(220,38,38,0.3);
          --text: #E8E6E0;
          --text-dim: #6B6860;
          --text-mid: #A09E98;
          --mono: 'Share Tech Mono', monospace;
          --display: 'Exo 2', sans-serif;
          --ui: 'Rajdhani', sans-serif;
          background: var(--bg);
          color: var(--text);
          font-family: var(--ui);
          overflow-x: hidden;
          line-height: 1;
          min-height: 100vh;
        }

        .ft-grid-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px);
          background-size: 80px 80px;
        }

        .ft-scanline {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(220,38,38,0.4), transparent);
          animation: ft-scan 8s linear infinite;
          pointer-events: none;
          z-index: 1;
        }
        @keyframes ft-scan { from { top: 0; } to { top: 100vh; } }

        .ft-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          background: rgba(5,5,5,0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }

        .ft-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ft-logo-icon {
          width: 32px; height: 32px;
          background: var(--red);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          animation: ft-pulse-logo 3s ease-in-out infinite;
        }
        @keyframes ft-pulse-logo {
          0%,100% { filter: drop-shadow(0 0 0px rgba(220,38,38,0)); }
          50% { filter: drop-shadow(0 0 8px rgba(220,38,38,0.6)); }
        }

        .ft-logo-text {
          font-family: var(--display);
          font-weight: 900;
          font-size: 20px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #fff;
        }
        .ft-logo-text span { color: var(--red); }

        .ft-nav-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-dim);
        }

        .ft-status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: ft-blink 2s ease-in-out infinite;
        }
        @keyframes ft-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .ft-nav-actions { display: flex; align-items: center; gap: 12px; }

        .ft-btn-ghost {
          font-family: var(--ui);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-mid);
          background: none;
          border: 1px solid var(--border);
          padding: 8px 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ft-btn-ghost:hover { color: #fff; border-color: rgba(255,255,255,0.2); }

        .ft-btn-primary {
          font-family: var(--ui);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #fff;
          background: var(--red);
          border: 1px solid var(--red);
          padding: 8px 24px;
          cursor: pointer;
          transition: all 0.2s;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
        }
        .ft-btn-primary:hover { background: #EF4444; transform: translateY(-1px); }

        .ft-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 40px 80px;
          overflow: hidden;
          z-index: 2;
        }

        .ft-hero-bg-glow {
          position: absolute;
          top: 20%; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 600px;
          background: radial-gradient(ellipse at center, rgba(220,38,38,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .ft-corner {
          position: absolute;
          width: 120px; height: 120px;
          border-color: var(--border-red);
          border-style: solid;
          pointer-events: none;
        }
        .ft-corner.tl { top: 80px; left: 40px; border-width: 1px 0 0 1px; }
        .ft-corner.tr { top: 80px; right: 40px; border-width: 1px 1px 0 0; }
        .ft-corner.bl { bottom: 40px; left: 40px; border-width: 0 0 1px 1px; }
        .ft-corner.br { bottom: 40px; right: 40px; border-width: 0 1px 1px 0; }

        .ft-eyebrow {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 48px;
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--red);
        }
        .ft-eyebrow-line { width: 40px; height: 1px; background: var(--red); }

        .ft-hero-title {
          font-family: var(--display);
          font-weight: 900;
          font-size: clamp(56px, 8vw, 110px);
          line-height: 0.92;
          text-align: center;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          max-width: 900px;
          margin-bottom: 40px;
        }
        .ft-hero-title .l1 { display: block; color: #fff; }
        .ft-hero-title .l2 { display: block; color: var(--red); }
        .ft-hero-title .l3 { display: block; color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,0.3); }

        .ft-hero-sub {
          font-family: var(--ui);
          font-size: 16px;
          font-weight: 400;
          line-height: 1.7;
          text-align: center;
          color: var(--text-mid);
          max-width: 560px;
          margin-bottom: 48px;
          letter-spacing: 0.02em;
        }

        .ft-ctas {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 80px;
        }

        .ft-btn-xl {
          font-family: var(--display);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #fff;
          background: var(--red);
          border: none;
          padding: 16px 40px;
          cursor: pointer;
          clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ft-btn-xl:hover { background: #EF4444; transform: translateY(-2px); }

        .ft-btn-xl-outline {
          font-family: var(--display);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-mid);
          background: transparent;
          border: 1px solid var(--border);
          padding: 16px 36px;
          cursor: pointer;
          transition: all 0.2s;
          clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
        }
        .ft-btn-xl-outline:hover { color: #fff; border-color: rgba(255,255,255,0.3); }

        .ft-stats-bar {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid var(--border);
          background: var(--bg2);
          position: relative;
        }
        .ft-stats-bar::before {
          content: '';
          position: absolute;
          top: -1px; left: 0; right: 0; height: 2px;
          background: var(--red);
        }

        .ft-stat-cell {
          padding: 20px 24px;
          border-right: 1px solid var(--border);
          text-align: center;
        }
        .ft-stat-cell:last-child { border-right: none; }

        .ft-stat-val {
          font-family: var(--display);
          font-size: 28px;
          font-weight: 900;
          color: #fff;
          display: block;
          letter-spacing: -0.02em;
        }
        .ft-stat-val.red { color: var(--red); }
        .ft-stat-label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-top: 4px;
          display: block;
        }

        .ft-ticker-wrap {
          background: var(--bg2);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 10px 0;
          overflow: hidden;
          position: relative;
          z-index: 2;
        }
        .ft-ticker-inner {
          display: flex;
          gap: 60px;
          animation: ft-ticker 30s linear infinite;
          white-space: nowrap;
        }
        @keyframes ft-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .ft-tick-item {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ft-tick-item .tag { color: var(--red); font-weight: 700; }
        .ft-tick-item .val { color: var(--text-mid); }

        .ft-section { padding: 100px 40px; position: relative; z-index: 2; }
        .ft-section-bordered { border-top: 1px solid var(--border); }

        .ft-section-header { text-align: center; margin-bottom: 64px; }
        .ft-section-eyebrow {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--red);
          margin-bottom: 16px;
        }
        .ft-section-title {
          font-family: var(--display);
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #fff;
          line-height: 1;
          margin-bottom: 16px;
        }
        .ft-section-desc {
          font-size: 15px;
          color: var(--text-mid);
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.6;
          font-weight: 400;
        }

        .ft-two-col {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .ft-threat-lead {
          font-family: var(--display);
          font-size: clamp(28px, 3vw, 44px);
          font-weight: 800;
          line-height: 1.1;
          color: #fff;
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .ft-threat-lead em { color: var(--red); font-style: normal; display: block; }

        .ft-threat-body {
          font-size: 15px;
          color: var(--text-mid);
          line-height: 1.7;
          margin-bottom: 32px;
          font-weight: 400;
        }

        .ft-threat-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 36px;
        }

        .ft-tstat {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-left: 3px solid var(--red);
          padding: 16px 20px;
        }
        .ft-tstat-num {
          font-family: var(--display);
          font-size: 32px;
          font-weight: 900;
          color: var(--red);
          display: block;
          letter-spacing: -0.02em;
        }
        .ft-tstat-label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-top: 4px;
          display: block;
        }

        .ft-map-panel {
          background: var(--bg2);
          border: 1px solid var(--border);
          overflow: hidden;
          aspect-ratio: 4/3;
        }
        .ft-map-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg3);
        }
        .ft-map-title {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.15em;
          color: var(--text-mid);
          text-transform: uppercase;
        }
        .ft-map-live {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-size: 10px;
          color: #22c55e;
          letter-spacing: 0.1em;
        }

        .ft-map-canvas {
          width: 100%;
          height: calc(100% - 40px);
          background: #060e0d;
          position: relative;
          overflow: hidden;
        }
        .ft-map-grid-lines {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background-image:
            linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .ft-map-overlay-text {
          position: absolute;
          bottom: 12px; left: 16px;
          font-family: var(--mono);
          font-size: 10px;
          color: rgba(34,197,94,0.5);
          letter-spacing: 0.1em;
        }

        .ft-map-dot {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #DC2626;
          transform: translate(-50%, -50%);
        }
        .ft-map-dot::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px solid #DC2626;
          opacity: 0.4;
          animation: ft-ripple 2s ease-out infinite;
        }
        @keyframes ft-ripple {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .ft-map-dot.blue { background: #3B82F6; }
        .ft-map-dot.blue::after { border-color: #3B82F6; }
        .ft-map-dot.green { background: #22c55e; }
        .ft-map-dot.green::after { border-color: #22c55e; }

        .ft-caps-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
        }

        .ft-cap-card {
          background: var(--bg);
          padding: 36px 32px;
          transition: background 0.2s;
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .ft-cap-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--red);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s;
        }
        .ft-cap-card:hover { background: var(--bg2); }
        .ft-cap-card:hover::before { transform: scaleX(1); }

        .ft-cap-number {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--red);
          letter-spacing: 0.2em;
          margin-bottom: 20px;
          display: block;
        }
        .ft-cap-icon {
          width: 44px; height: 44px;
          background: var(--red-glow);
          border: 1px solid var(--border-red);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
        }
        .ft-cap-title {
          font-family: var(--display);
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #fff;
          margin-bottom: 12px;
        }
        .ft-cap-desc {
          font-size: 14px;
          color: var(--text-mid);
          line-height: 1.65;
          font-weight: 400;
        }

        .ft-terminal {
          background: #030303;
          border: 1px solid var(--border);
          font-family: var(--mono);
          overflow: hidden;
        }
        .ft-term-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--bg3);
          border-bottom: 1px solid var(--border);
        }
        .ft-term-dot { width: 10px; height: 10px; border-radius: 50%; }
        .ft-term-body {
          padding: 20px;
          font-size: 12px;
          line-height: 1.8;
          color: var(--text-dim);
        }
        .ft-term-line { display: flex; gap: 10px; }
        .ft-term-line .ts { color: var(--text-dim); min-width: 80px; }
        .ft-term-line .ok { color: #22c55e; }
        .ft-term-line .warn { color: #F59E0B; }
        .ft-term-line .err { color: var(--red); }
        .ft-term-line .info { color: #60A5FA; }
        .ft-term-line .text { color: var(--text-mid); }
        .ft-cursor {
          display: inline-block;
          width: 8px; height: 14px;
          background: var(--red);
          animation: ft-cursor-blink 1s step-end infinite;
          vertical-align: middle;
          margin-left: 4px;
        }
        @keyframes ft-cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .ft-compliance-grid {
          max-width: 1100px;
          margin: 64px auto 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
        }
        .ft-comp-card {
          background: var(--bg);
          padding: 32px 28px;
          text-align: center;
          transition: background 0.2s;
        }
        .ft-comp-card:hover { background: var(--bg2); }
        .ft-comp-icon-wrap {
          width: 56px; height: 56px;
          margin: 0 auto 20px;
          background: var(--red-glow);
          border: 1px solid var(--border-red);
          display: flex;
          align-items: center;
          justify-content: center;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
        .ft-comp-title {
          font-family: var(--display);
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #fff;
          margin-bottom: 8px;
        }
        .ft-comp-desc { font-size: 13px; color: var(--text-dim); line-height: 1.5; font-weight: 400; }

        .ft-cta-section {
          padding: 120px 40px;
          border-top: 1px solid var(--border);
          text-align: center;
          position: relative;
          z-index: 2;
          overflow: hidden;
        }
        .ft-cta-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 50%, rgba(220,38,38,0.06) 0%, transparent 65%);
          pointer-events: none;
        }
        .ft-cta-title {
          font-family: var(--display);
          font-size: clamp(44px, 6vw, 84px);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          line-height: 0.95;
          margin-bottom: 32px;
          color: #fff;
        }
        .ft-cta-title span { color: var(--red); }
        .ft-cta-sub {
          font-size: 16px;
          color: var(--text-mid);
          max-width: 480px;
          margin: 0 auto 48px;
          line-height: 1.6;
          font-weight: 400;
        }

        .ft-footer {
          border-top: 1px solid var(--border);
          padding: 24px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 2;
        }
        .ft-footer-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .ft-footer-brand-dot {
          width: 8px; height: 8px;
          background: var(--red);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
        .ft-footer-copy { font-family: var(--mono); font-size: 11px; color: var(--text-dim); letter-spacing: 0.1em; }
        .ft-footer-links { display: flex; gap: 24px; }
        .ft-footer-links a {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.2s;
        }
        .ft-footer-links a:hover { color: var(--text-mid); }

        .ft-security-list { display: flex; flex-direction: column; gap: 16px; }
        .ft-security-item { display: flex; gap: 14px; align-items: flex-start; }
        .ft-security-bullet { width: 6px; height: 6px; background: var(--red); margin-top: 8px; flex-shrink: 0; }
        .ft-security-item-title {
          font-family: var(--ui);
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .ft-security-item-desc { font-size: 13px; color: var(--text-mid); line-height: 1.5; font-weight: 400; }
      `}</style>

      <div className="ft-root">
        <div className="ft-grid-overlay" />
        <div className="ft-scanline" />

        {/* NAV */}
        <nav className="ft-nav">
          <div className="ft-logo">
            <div className="ft-logo-icon" />
            <div className="ft-logo-text">Fire<span>Trek</span></div>
          </div>
          <div className="ft-nav-status">
            <div className="ft-status-dot" />
            SYSTEM ONLINE // 2,341 ASSETS TRACKED
          </div>
          <div className="ft-nav-actions">
            <button className="ft-btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="ft-btn-primary" onClick={() => navigate('/login')}>Request Access ›</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="ft-hero">
          <div className="ft-hero-bg-glow" />
          <div className="ft-corner tl" />
          <div className="ft-corner tr" />
          <div className="ft-corner bl" />
          <div className="ft-corner br" />

          <div className="ft-eyebrow">
            <div className="ft-eyebrow-line" />
            TACTICAL ASSET INTELLIGENCE PLATFORM
            <div className="ft-eyebrow-line" />
          </div>

          <h1 className="ft-hero-title">
            <span className="l1">Every Firearm.</span>
            <span className="l2">Every Second.</span>
            <span className="l3">Accounted For.</span>
          </h1>

          <p className="ft-hero-sub">
            FireTrek delivers military-grade GPS tracking, geofence enforcement, and chain-of-custody compliance for law enforcement, security operations, and regulated armories.
          </p>

          <div className="ft-ctas">
            <button className="ft-btn-xl" onClick={() => navigate('/login')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Access Platform
            </button>
            <button className="ft-btn-xl-outline">View Live Demo</button>
          </div>

          <div className="ft-stats-bar">
            <div className="ft-stat-cell">
              <span className="ft-stat-val" ref={assetCountRef}>2,341</span>
              <span className="ft-stat-label">Assets Tracked</span>
            </div>
            <div className="ft-stat-cell">
              <span className="ft-stat-val red">&lt;250ms</span>
              <span className="ft-stat-label">Update Latency</span>
            </div>
            <div className="ft-stat-cell">
              <span className="ft-stat-val">99.97%</span>
              <span className="ft-stat-label">Uptime SLA</span>
            </div>
            <div className="ft-stat-cell">
              <span className="ft-stat-val" ref={alertCountRef}>0</span>
              <span className="ft-stat-label">Active Alerts</span>
            </div>
          </div>
        </section>

        {/* TICKER */}
        <div className="ft-ticker-wrap">
          <div className="ft-ticker-inner">
            {[
              { tag: 'FT-0041', val: 'GLOCK-17 // SECTOR-7 // ACTIVE' },
              { tag: 'FT-1182', val: 'AR-15 // ARMORY-A // CHECKED IN' },
              { tag: 'ALERT', val: 'FT-0099 GEOFENCE BREACH // RESOLVED 00:04 AGO' },
              { tag: 'FT-0773', val: 'REMINGTON-870 // PATROL-3 // ACTIVE' },
              { tag: 'SYS', val: 'LAST AUDIT: 13 MINS AGO // 2,341/2,341 ACCOUNTED' },
              { tag: 'FT-0204', val: 'BERETTA-92 // UNIT-12 // ACTIVE' },
              { tag: 'FT-0517', val: 'SIG-P320 // RANGE-2 // CHECKED IN' },
              { tag: 'SEC', val: 'ALL ENCRYPTION CHECKS PASSED // AES-256 ACTIVE' },
              { tag: 'FT-0041', val: 'GLOCK-17 // SECTOR-7 // ACTIVE' },
              { tag: 'FT-1182', val: 'AR-15 // ARMORY-A // CHECKED IN' },
              { tag: 'ALERT', val: 'FT-0099 GEOFENCE BREACH // RESOLVED 00:04 AGO' },
              { tag: 'FT-0773', val: 'REMINGTON-870 // PATROL-3 // ACTIVE' },
              { tag: 'SYS', val: 'LAST AUDIT: 13 MINS AGO // 2,341/2,341 ACCOUNTED' },
              { tag: 'FT-0204', val: 'BERETTA-92 // UNIT-12 // ACTIVE' },
              { tag: 'FT-0517', val: 'SIG-P320 // RANGE-2 // CHECKED IN' },
              { tag: 'SEC', val: 'ALL ENCRYPTION CHECKS PASSED // AES-256 ACTIVE' },
            ].map((item, i) => (
              <span key={i} className="ft-tick-item">
                <span className="tag">{item.tag}</span>
                <span className="val">{item.val}</span>
              </span>
            ))}
          </div>
        </div>

        {/* THREAT SECTION */}
        <section className="ft-section">
          <div className="ft-two-col">
            <div>
              <div className="ft-section-eyebrow">The Problem We Solve</div>
              <h2 className="ft-threat-lead">
                Firearms Without Accountability
                <em>Are a Public Safety Crisis.</em>
              </h2>
              <p className="ft-threat-body">
                Every year, thousands of service weapons go missing from law enforcement and security operations — lost in the field, stolen from vehicles, or simply misplaced in high-tempo environments. FireTrek eliminates the gap between issuing a firearm and accounting for it.
              </p>
              <div className="ft-threat-stats">
                <div className="ft-tstat">
                  <span className="ft-tstat-num">~2,000</span>
                  <span className="ft-tstat-label">Police firearms lost annually (US)</span>
                </div>
                <div className="ft-tstat">
                  <span className="ft-tstat-num">62%</span>
                  <span className="ft-tstat-label">Of losses discovered hours later</span>
                </div>
                <div className="ft-tstat">
                  <span className="ft-tstat-num">R4.2M</span>
                  <span className="ft-tstat-label">Avg liability cost per incident</span>
                </div>
                <div className="ft-tstat">
                  <span className="ft-tstat-num">&lt;30s</span>
                  <span className="ft-tstat-label">FireTrek detection time</span>
                </div>
              </div>
              <button className="ft-btn-xl" onClick={() => navigate('/login')}>See How It Works ›</button>
            </div>

            <div className="ft-map-panel">
              <div className="ft-map-header">
                <span className="ft-map-title">Live Asset Grid // Region Alpha</span>
                <div className="ft-map-live">
                  <div className="ft-status-dot" />
                  LIVE
                </div>
              </div>
              <div className="ft-map-canvas" ref={mapRef}>
                <div className="ft-map-grid-lines" />
                <div className="ft-map-overlay-text" ref={mapTextRef}>
                  TRACKING 2,341 ASSETS // SECTOR CLEAR
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="ft-section ft-section-bordered">
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="ft-section-header">
              <div className="ft-section-eyebrow">Platform Capabilities</div>
              <h2 className="ft-section-title">Built for the Field</h2>
              <p className="ft-section-desc">Every feature engineered for high-stakes operational environments where a missing firearm is not an inconvenience — it is a liability.</p>
            </div>
            <div className="ft-caps-grid">
              {[
                { num: '01 // GPS TRACKING', title: 'Real-Time GPS Tracking', desc: 'Sub-250ms position updates via encrypted WebSocket streams. Know the exact location of every issued firearm, every second — on any terrain, in any weather.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" strokeDasharray="3 2"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg> },
                { num: '02 // GEOFENCING', title: 'Precision Geofencing', desc: 'Define operational zones down to the meter. Receive instant breach notifications with full asset identification, timestamp, and trajectory.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><polygon points="3,6 3,20 10,17 14,20 21,17 21,3 14,6 10,3"/><line x1="10" y1="3" x2="10" y2="17"/><line x1="14" y1="6" x2="14" y2="20"/></svg> },
                { num: '03 // CHAIN OF CUSTODY', title: 'Immutable Custody Log', desc: 'Every transfer, assignment, and return is cryptographically logged. Full chain-of-custody from armory issue to return — tamper-proof and court-admissible.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg> },
                { num: '04 // INSTANT ALERTS', title: 'Real-Time Alert Engine', desc: 'Signal loss, battery failure, geofence breach, unauthorized movement — delivered within seconds via push, SMS, or command-center dashboard with full context.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
                { num: '05 // INCIDENT COMMAND', title: 'Incident Management', desc: 'Log, escalate, and resolve incidents with full timeline, assignee tracking, and evidence chain. Every incident linked to the assets and personnel involved.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
                { num: '06 // COMPLIANCE', title: 'Automated Compliance', desc: 'Generate ATF-ready audit reports in one click. Automated inventory reconciliation, scheduled compliance checks, and anomaly detection built into every account.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
              ].map((cap) => (
                <div key={cap.num} className="ft-cap-card">
                  <span className="ft-cap-number">{cap.num}</span>
                  <div className="ft-cap-icon">{cap.icon}</div>
                  <div className="ft-cap-title">{cap.title}</div>
                  <div className="ft-cap-desc">{cap.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TERMINAL SECTION */}
        <section className="ft-section ft-section-bordered">
          <div className="ft-two-col">
            <div>
              <div className="ft-section-eyebrow">System Architecture</div>
              <h2 className="ft-section-title">Hardened at Every Layer</h2>
              <p className="ft-section-desc" style={{ textAlign: 'left', maxWidth: '100%', marginBottom: 32 }}>
                Zero-trust security from device to database. FireTrek was built for environments where a security breach isn't just an IT incident — it's a public safety event.
              </p>
              <div className="ft-security-list">
                {[
                  { title: 'AES-256 Telemetry Encryption', desc: 'Every GPS packet encrypted at the device before transmission. No plaintext location data ever on the wire.' },
                  { title: 'JWT Auth with Token Rotation', desc: 'Short-lived access tokens with automatic refresh. Compromised tokens invalidated within seconds across all sessions.' },
                  { title: 'Role-Based Access Control', desc: 'Granular RBAC across organizations, units, and asset classes. Officers see only what they are cleared for.' },
                  { title: 'Immutable Audit Trail', desc: 'Every API call, every login, every asset movement recorded with cryptographic integrity. Cannot be edited or deleted.' },
                ].map((item) => (
                  <div key={item.title} className="ft-security-item">
                    <div className="ft-security-bullet" />
                    <div>
                      <div className="ft-security-item-title">{item.title}</div>
                      <div className="ft-security-item-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ft-terminal">
              <div className="ft-term-bar">
                <div className="ft-term-dot" style={{ background: '#EF4444' }} />
                <div className="ft-term-dot" style={{ background: '#F59E0B' }} />
                <div className="ft-term-dot" style={{ background: '#22c55e' }} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}>
                  firetrek-sys // audit.log
                </span>
              </div>
              <div className="ft-term-body">
                {[
                  { ts: '06:42:01', cls: 'ok', tag: '[OK]', text: 'System boot // all services nominal' },
                  { ts: '06:42:03', cls: 'ok', tag: '[OK]', text: 'AES-256 encryption initialized' },
                  { ts: '06:42:04', cls: 'info', tag: '[INFO]', text: '2,341 devices registered on network' },
                  { ts: '06:42:05', cls: 'ok', tag: '[OK]', text: 'JWT auth service running' },
                  { ts: '06:42:07', cls: 'info', tag: '[AUTH]', text: 'User sgt.martinez logged in // RBAC: SUPERVISOR' },
                  { ts: '06:42:11', cls: 'ok', tag: '[TRACK]', text: 'FT-0041 position updated // 26.1224°N 28.0511°E' },
                  { ts: '06:42:14', cls: 'warn', tag: '[WARN]', text: 'FT-0099 battery: 18% // alert queued' },
                  { ts: '06:42:19', cls: 'err', tag: '[ALERT]', text: 'FT-0099 geofence breach // SECTOR-7 PERIMETER' },
                  { ts: '06:42:19', cls: 'info', tag: '[ACTION]', text: 'Incident #4821 auto-created // notifying cmd' },
                  { ts: '06:42:23', cls: 'ok', tag: '[RESOLVE]', text: 'FT-0099 returned to zone // incident closed' },
                  { ts: '06:42:31', cls: 'ok', tag: '[AUDIT]', text: 'Inventory check: 2,341/2,341 accounted ✓' },
                  { ts: '06:42:33', cls: 'ok', tag: '[OK]', text: 'Compliance report generated // ATF-ready' },
                ].map((line, i) => (
                  <div key={i} className="ft-term-line">
                    <span className="ts">{line.ts}</span>
                    <span className={line.cls}>{line.tag}</span>
                    <span className="text">{line.text}</span>
                  </div>
                ))}
                <div className="ft-term-line">
                  <span className="ts">NOW</span>
                  <span className="text" ref={termLiveRef} />
                  <span className="ft-cursor" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPLIANCE */}
        <section className="ft-section ft-section-bordered">
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="ft-section-header">
              <div className="ft-section-eyebrow">Compliance & Certification</div>
              <h2 className="ft-section-title">Meets Every Standard</h2>
              <p className="ft-section-desc">FireTrek satisfies federal, state, and international regulatory requirements for firearm accountability and data governance.</p>
            </div>
            <div className="ft-compliance-grid">
              {[
                { title: 'ATF Compliant', desc: 'Automated Form 4473 compatible logs and bound book equivalents', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                { title: 'ISO 27001', desc: 'Information security management aligned to international standard', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
                { title: 'NIST 800-53', desc: 'Federal security controls framework for law enforcement systems', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> },
                { title: 'SOC 2 Type II', desc: 'Annual third-party audit of security, availability, and confidentiality', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> },
              ].map((c) => (
                <div key={c.title} className="ft-comp-card">
                  <div className="ft-comp-icon-wrap">{c.icon}</div>
                  <div className="ft-comp-title">{c.title}</div>
                  <div className="ft-comp-desc">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ft-cta-section">
          <div className="ft-cta-bg" />
          <div className="ft-corner tl" style={{ top: 0, left: 0 }} />
          <div className="ft-corner tr" style={{ top: 0, right: 0 }} />
          <div className="ft-corner bl" style={{ bottom: 0, left: 0 }} />
          <div className="ft-corner br" style={{ bottom: 0, right: 0 }} />
          <div className="ft-eyebrow" style={{ justifyContent: 'center' }}>
            <div className="ft-eyebrow-line" />
            Ready to Deploy
            <div className="ft-eyebrow-line" />
          </div>
          <h2 className="ft-cta-title">
            Zero Unaccounted<br /><span>Firearms.</span>
          </h2>
          <p className="ft-cta-sub">
            FireTrek deploys in hours, not months. Connect your existing armory systems and start tracking every asset from day one.
          </p>
          <div className="ft-ctas" style={{ justifyContent: 'center' }}>
            <button className="ft-btn-xl" onClick={() => navigate('/login')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Access Platform
            </button>
            <button className="ft-btn-xl-outline" onClick={() => navigate('/login')}>Request Demo</button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="ft-footer">
          <div className="ft-footer-brand">
            <div className="ft-footer-brand-dot" />
            FireTrek
          </div>
          <div className="ft-footer-copy">© {new Date().getFullYear()} FireTrek. All rights reserved.</div>
          <div className="ft-footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="#">Contact</a>
          </div>
        </footer>
      </div>
    </>
  )
}