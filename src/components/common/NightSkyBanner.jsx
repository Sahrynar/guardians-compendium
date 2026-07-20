import { useRef, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════
//  NightSkyBanner — Guardians of Lajen Compendium
//  ☾ silver moon = Lila · ☀ gold sun = Martyn · stars = Astae
//  Shooting stars run the locked rainbow cycle IN ORDER.
//
//  PRODUCTION USE (in the Compendium):
//    import { NightSkyBanner } from './components/common/NightSkyBanner'
//    <NightSkyBanner showTree />        // tree version
//    <NightSkyBanner />                 // pure sky
//    <NightSkyBanner treeSrc="/banner-tree.png" />   // your own tree art
//  The demo wrapper at the bottom is only for previewing — delete it.
// ═══════════════════════════════════════════════════════════════

const RAINBOW = ['#ff69b4','#ff7f6e','#ff3b3b','#ff5a2b','#ff7f27','#ffb52e','#ffe135','#b6e34b',
  '#4cd964','#2fd6b0','#28d5e8','#4aa8ff','#2f6bff','#5a4fff','#8a5cff','#a64cf5','#e04cf0','#ff4fd8']

// deterministic RNG so the tree never jitters between renders
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// tapered, curving limb — a filled shape, not a stick
function taperCurve(g, x1, y1, w1, cxp, cyp, x2, y2, w2) {
  const a1 = Math.atan2(cyp - y1, cxp - x1), a2 = Math.atan2(y2 - cyp, x2 - cxp), am = (a1 + a2) / 2
  const n1x = Math.cos(a1 + Math.PI / 2) * w1 / 2, n1y = Math.sin(a1 + Math.PI / 2) * w1 / 2
  const n2x = Math.cos(a2 + Math.PI / 2) * w2 / 2, n2y = Math.sin(a2 + Math.PI / 2) * w2 / 2
  const ncx = Math.cos(am + Math.PI / 2) * (w1 + w2) / 4, ncy = Math.sin(am + Math.PI / 2) * (w1 + w2) / 4
  g.beginPath()
  g.moveTo(x1 + n1x, y1 + n1y)
  g.quadraticCurveTo(cxp + ncx, cyp + ncy, x2 + n2x, y2 + n2y)
  g.lineTo(x2 - n2x, y2 - n2y)
  g.quadraticCurveTo(cxp - ncx, cyp - ncy, x1 - n1x, y1 - n1y)
  g.closePath(); g.fill()
}

export function NightSkyBanner({
  showTree = false,
  treeSrc = null,
  treeLights = true,
  starCount = 3370,
  height = '100%',
  title = ['The Guardians', 'of Lajen'],
  subtitle = 'WORLDBUILDING COMPENDIUM',
  caption = '3,370 stars, a hundred words each · twenty-six years',
}) {
  const wrapRef = useRef(null)
  const cvRef = useRef(null)
  const treeRef = useRef(null)
  const imgRef = useRef(null)
  const stateRef = useRef({ stars: [], bright: [], shooters: [], idx: 0, mouse: { x: -9e9, y: -9e9 }, W: 0, H: 0 })

  // optional custom tree art
  useEffect(() => {
    if (!treeSrc) { imgRef.current = null; return }
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => { imgRef.current = im }
    im.src = treeSrc
  }, [treeSrc])

  useEffect(() => {
    const cv = cvRef.current, wrap = wrapRef.current
    if (!cv || !wrap) return
    const cx = cv.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const S = stateRef.current
    let raf = 0, shootTimer = 0, alive = true

    // ── WORLD TREE: tapered curving limbs, buttressed roots, ragged canopy,
    //    moonlight rim, rainbow lanterns. Drawn once per resize. ──
    let lightPts = []
    function paintTree(W, H) {
      const off = document.createElement('canvas')
      off.width = W; off.height = H
      const g = off.getContext('2d')
      const rnd = mulberry32(20260714)
      const TAU = Math.PI * 2
      const BLACK = '#03030a', RIM = 'rgba(184,202,228,0.13)'
      lightPts = []

      function limb(x1, y1, ang, len, w, depth) {
        if (depth <= 0 || len < 3.5) return
        const bend = (rnd() - 0.5) * len * 0.5
        const mx = x1 + Math.cos(ang) * len * 0.5, my = y1 + Math.sin(ang) * len * 0.5
        const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2)
        const cxp = mx + px * bend, cyp = my + py * bend
        const x2 = x1 + Math.cos(ang) * len, y2 = y1 + Math.sin(ang) * len
        const w2 = w * (0.60 + rnd() * 0.10)
        g.fillStyle = RIM; taperCurve(g, x1 - 1.6, y1 - 1.2, w, cxp - 1.6, cyp - 1.2, x2 - 1.6, y2 - 1.2, w2)
        g.fillStyle = BLACK; taperCurve(g, x1, y1, w, cxp, cyp, x2, y2, w2)
        const nAng = Math.atan2(y2 - cyp, x2 - cxp)
        if (depth <= 3 && rnd() < 0.55) lightPts.push({ x: x2, y: y2, c: RAINBOW[lightPts.length % RAINBOW.length], ph: rnd() * TAU, r: 0.9 + rnd() * 1.2 })
        if (depth <= 2) {
          g.fillStyle = BLACK
          for (let i = 0; i < 4; i++) {
            const rr = len * (0.34 + rnd() * 0.46)
            g.beginPath(); g.arc(x2 + (rnd() - 0.5) * len * 0.9, y2 + (rnd() - 0.5) * len * 0.8, rr, 0, TAU); g.fill()
          }
        }
        const n = depth > 5 ? 2 : (rnd() < 0.34 ? 3 : 2)
        for (let i = 0; i < n; i++) {
          const spread = 0.36 + rnd() * 0.40
          const a = nAng + (i - (n - 1) / 2) * spread + (rnd() - 0.5) * 0.2
          limb(x2, y2, a, len * (0.70 + rnd() * 0.14), w2, depth - 1)
        }
      }

      const baseY = H * 1.06, cxx = W / 2, trunkLen = H * 0.34, trunkW = H * 0.085
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.16 + i * (Math.PI * 0.68 / 6) + (rnd() - 0.5) * 0.08
        limb(cxx + Math.cos(a) * trunkW * 0.3, baseY - H * 0.03, a, H * (0.075 + rnd() * 0.05), trunkW * (0.30 + rnd() * 0.18), 3)
      }
      const tTopY = baseY - trunkLen
      g.fillStyle = RIM
      taperCurve(g, cxx - 1.6, baseY - 1.2, trunkW, cxx - 1.6 - H * 0.012, baseY - trunkLen * 0.5, cxx - 1.6, tTopY, trunkW * 0.55)
      g.fillStyle = BLACK
      taperCurve(g, cxx, baseY, trunkW, cxx - H * 0.012, baseY - trunkLen * 0.5, cxx, tTopY, trunkW * 0.55)
      const mains = 5
      for (let i = 0; i < mains; i++) {
        const a = -Math.PI * 0.88 + i * (Math.PI * 0.76 / (mains - 1)) + (rnd() - 0.5) * 0.1
        limb(cxx, tTopY + H * 0.01, a, H * 0.20 * (0.86 + rnd() * 0.28), trunkW * 0.5, 7)
      }
      treeRef.current = off
    }

    function paintLights(t) {
      const TAU = Math.PI * 2
      for (const L of lightPts) {
        const pulse = 0.45 + 0.55 * Math.sin(L.ph + t * 0.0013)
        const g = cx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 7)
        g.addColorStop(0, L.c); g.addColorStop(1, 'rgba(0,0,0,0)')
        cx.globalAlpha = 0.30 * pulse; cx.fillStyle = g
        cx.beginPath(); cx.arc(L.x, L.y, L.r * 7, 0, TAU); cx.fill()
        cx.globalAlpha = 0.55 + 0.45 * pulse; cx.fillStyle = L.c
        cx.beginPath(); cx.arc(L.x, L.y, L.r, 0, TAU); cx.fill()
      }
      cx.globalAlpha = 1
    }

    function build() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = wrap.clientWidth, H = wrap.clientHeight
      cv.width = W * dpr; cv.height = H * dpr
      cv.style.width = W + 'px'; cv.style.height = H + 'px'
      cx.setTransform(dpr, 0, 0, dpr, 0, 0)
      S.W = W; S.H = H
      S.stars = []
      for (let i = 0; i < starCount; i++) {
        const z = 0.35 + Math.random() * 0.65
        S.stars.push({
          x: Math.random() * W, y: Math.random() * H, z,
          r: (0.28 + Math.random() * 1.0) * z,
          ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.2,
        })
      }
      S.bright = S.stars.filter(s => s.z > 0.74)
      paintTree(W, H)
    }
    build()
    const ro = new ResizeObserver(build); ro.observe(wrap)

    const onMove = e => {
      const r = cv.getBoundingClientRect()
      S.mouse.x = e.clientX - r.left; S.mouse.y = e.clientY - r.top
    }
    const onLeave = () => { S.mouse.x = -9e9 }
    wrap.addEventListener('mousemove', onMove)
    wrap.addEventListener('mouseleave', onLeave)

    function spawn() {
      if (!alive) return
      const fromLeft = Math.random() < 0.5
      S.shooters.push({
        x: fromLeft ? -40 : S.W + 40, y: S.H * (0.05 + Math.random() * 0.4),
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 4.5), vy: 1.6 + Math.random() * 1.8,
        color: RAINBOW[S.idx++ % RAINBOW.length], trail: [], life: 1,
      })
      shootTimer = setTimeout(spawn, 2000 + Math.random() * 2400)
    }
    if (!reduce) shootTimer = setTimeout(spawn, 900)

    // MOON — full lunation every ~34s: full → gibbous → quarter → crescent → new → back
    const PHASE_MS = 34000
    function moon(t) {
      const TAU = Math.PI * 2
      const p = ((t / PHASE_MS) + 0.5) % 1
      const lit = (1 - Math.cos(p * TAU)) / 2
      const x = S.W * 0.1, y = S.H * 0.3, R = S.H * 0.11
      const breath = 0.85 + 0.15 * Math.sin(t * 0.0006)
      let g = cx.createRadialGradient(x, y, R * 0.3, x, y, R * 4.4)
      g.addColorStop(0, `rgba(186,202,224,${0.26 * breath * (0.12 + 0.88 * lit)})`)
      g.addColorStop(1, 'rgba(186,202,224,0)')
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, R * 4.4, 0, TAU); cx.fill()
      g = cx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R)
      g.addColorStop(0, '#e9eef5'); g.addColorStop(0.62, '#c3ceda'); g.addColorStop(1, '#8a97a9')
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, R, 0, TAU); cx.fill()
      cx.save(); cx.beginPath(); cx.arc(x, y, R, 0, TAU); cx.clip()
      cx.fillStyle = 'rgba(126,140,158,.30)'
      cx.beginPath(); cx.arc(x - R * .28, y - R * .22, R * .30, 0, TAU); cx.fill()
      cx.beginPath(); cx.arc(x + R * .22, y + R * .12, R * .24, 0, TAU); cx.fill()
      cx.beginPath(); cx.arc(x - R * .10, y + R * .38, R * .17, 0, TAU); cx.fill()
      cx.restore()
      const a = R * Math.cos(p * TAU)
      cx.fillStyle = '#050507'; cx.beginPath()
      if (p < 0.5) {
        cx.arc(x, y, R, Math.PI / 2, Math.PI * 1.5, false)
        cx.ellipse(x, y, Math.abs(a), R, 0, Math.PI * 1.5, Math.PI / 2, a < 0)
      } else {
        cx.arc(x, y, R, Math.PI * 1.5, Math.PI / 2, false)
        cx.ellipse(x, y, Math.abs(a), R, 0, Math.PI / 2, Math.PI * 1.5, a < 0)
      }
      cx.closePath(); cx.fill()
      cx.strokeStyle = 'rgba(150,168,192,.20)'; cx.lineWidth = 1
      cx.beginPath(); cx.arc(x, y, R, 0, TAU); cx.stroke()
    }
    function sun(t) {
      const x = S.W * 0.9, y = S.H * 0.66, R = S.H * 0.08
      let g = cx.createRadialGradient(x, y, R * 0.2, x, y, R * 6)
      g.addColorStop(0, 'rgba(255,196,90,.45)'); g.addColorStop(0.4, 'rgba(216,140,40,.14)'); g.addColorStop(1, 'rgba(216,140,40,0)')
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, R * 6, 0, 6.283); cx.fill()
      cx.save(); cx.translate(x, y); cx.rotate(t * 0.00004)
      cx.strokeStyle = 'rgba(240,180,90,.2)'; cx.lineWidth = 1
      for (let i = 0; i < 12; i++) {
        cx.rotate(Math.PI / 6)
        cx.beginPath(); cx.moveTo(R * 1.5, 0); cx.lineTo(R * (2.4 + 0.5 * Math.sin(t * 0.001 + i)), 0); cx.stroke()
      }
      cx.restore()
      g = cx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R)
      g.addColorStop(0, '#ffe9b8'); g.addColorStop(0.6, '#f2c264'); g.addColorStop(1, '#c98c2e')
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, R, 0, 6.283); cx.fill()
    }
    // CONSTELLATIONS — organic morphing reach, never a tell-tale circle
    const BASE = 105, LINK2 = 3000
    function reachAt(ang, t) {
      return BASE * (1
        + 0.30 * Math.sin(ang * 2 + t * 0.00040)
        + 0.19 * Math.sin(ang * 3 - t * 0.00062)
        + 0.12 * Math.sin(ang * 5 + t * 0.00031))
    }
    function constellate(t) {
      if (S.mouse.x < -1e8) return
      const near = []
      for (const s of S.bright) {
        const dx = s.x - S.mouse.x, dy = s.y - S.mouse.y, d = Math.hypot(dx, dy)
        if (d < reachAt(Math.atan2(dy, dx), t)) near.push(s)
      }
      cx.lineWidth = 0.8; cx.strokeStyle = '#cfdae8'
      for (let i = 0; i < near.length; i++) {
        const a = near[i], cand = []
        for (let j = 0; j < near.length; j++) {
          if (i === j) continue
          const b = near[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy
          if (d2 < LINK2) cand.push([d2, b])
        }
        cand.sort((p, q) => p[0] - q[0])
        for (let k = 0; k < Math.min(3, cand.length); k++) {
          const [d2, b] = cand[k]
          cx.globalAlpha = (1 - d2 / LINK2) * 0.62
          cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke()
        }
      }
      cx.globalAlpha = 1
    }

    function frame(t) {
      if (!alive) return
      cx.fillStyle = '#050507'; cx.fillRect(0, 0, S.W, S.H)
      const px = (S.mouse.x - S.W / 2) * 0.005, py = (S.mouse.y - S.H / 2) * 0.005
      for (const s of S.stars) {
        const tw = reduce ? 0.8 : 0.45 + 0.55 * Math.sin(s.ph + t * 0.001 * s.sp)
        cx.globalAlpha = tw * (0.45 + 0.55 * s.z)
        cx.fillStyle = s.z > 0.74 ? '#e4ebf4' : '#aeb9c9'
        cx.beginPath(); cx.arc(s.x - px * s.z * 6, s.y - py * s.z * 6, s.r, 0, 6.283); cx.fill()
      }
      cx.globalAlpha = 1
      constellate(t)
      for (const sh of S.shooters) {
        sh.x += sh.vx; sh.y += sh.vy; sh.trail.push([sh.x, sh.y])
        if (sh.trail.length > 24) sh.trail.shift()
        if (sh.x < -80 || sh.x > S.W + 80 || sh.y > S.H + 80) sh.life = 0
        for (let i = 1; i < sh.trail.length; i++) {
          cx.globalAlpha = (i / sh.trail.length) * 0.85
          cx.strokeStyle = sh.color; cx.lineWidth = 0.8 + 2 * (i / sh.trail.length)
          cx.beginPath(); cx.moveTo(...sh.trail[i - 1]); cx.lineTo(...sh.trail[i]); cx.stroke()
        }
        cx.globalAlpha = 1; cx.fillStyle = '#eef2f7'
        cx.beginPath(); cx.arc(sh.x, sh.y, 1.8, 0, 6.283); cx.fill()
      }
      S.shooters = S.shooters.filter(s => s.life > 0)
      moon(t); sun(t)
      if (showTree) {
        if (imgRef.current) {
          const im = imgRef.current, sc = S.H / im.height
          cx.globalAlpha = 1
          cx.drawImage(im, (S.W - im.width * sc) / 2, 0, im.width * sc, S.H)
        } else if (treeRef.current) {
          cx.drawImage(treeRef.current, 0, 0, S.W, S.H)
          if (treeLights) paintLights(t)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      alive = false; cancelAnimationFrame(raf); clearTimeout(shootTimer); ro.disconnect()
      wrap.removeEventListener('mousemove', onMove); wrap.removeEventListener('mouseleave', onLeave)
    }
  }, [showTree, starCount, treeSrc, treeLights])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height, overflow: 'hidden', background: '#050507' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cormorant+Garamond:ital@1&display=swap');
        @keyframes lajenGleam { 0% { background-position: 130% 0 } 100% { background-position: -30% 0 } }
        .lajen-title {
          margin: 0; font-family: 'Cinzel Decorative', Georgia, serif; font-weight: 700;
          font-size: clamp(24px, 4.2vw, 58px); letter-spacing: .045em; line-height: 1.06;
          background: linear-gradient(100deg, #dbe2ec 0%, #9fabbd 26%, #d8b24a 44%, #f6e6ac 50%, #d8b24a 56%, #9fabbd 74%, #dbe2ec 100%);
          background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
          filter: drop-shadow(0 0 16px rgba(178,196,220,.32)) drop-shadow(0 2px 6px rgba(0,0,0,.9));
          animation: lajenGleam 11s ease-in-out infinite;
        }
        .lajen-sub {
          margin: .5em 0 0; font-family: 'Cinzel Decorative', Georgia, serif; font-weight: 700;
          font-size: clamp(9px, 1.1vw, 14px); letter-spacing: .4em; text-indent: .4em; color: #b9a877;
          text-shadow: 0 0 10px rgba(216,178,74,.3), 0 1px 4px #000;
        }
        .lajen-cap {
          position: absolute; left: 0; right: 0; bottom: 8px; text-align: center;
          font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic;
          font-size: clamp(10px, 1vw, 13px); color: #8b95a3; letter-spacing: .05em; text-shadow: 0 1px 4px #000;
        }
        @media (prefers-reduced-motion: reduce) { .lajen-title { animation: none } }
      `}</style>
      <canvas ref={cvRef} style={{ display: 'block', position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none',
        paddingBottom: showTree ? '4%' : 0,
      }}>
        <h1 className="lajen-title" style={{ textAlign: 'center' }}>
          {title[0]}<br />{title[1]}
        </h1>
        <div className="lajen-sub">{subtitle}</div>
      </div>
      <div className="lajen-cap">☀ for him · ☾ for her · {caption}</div>
    </div>
  )
}

export default NightSkyBanner
