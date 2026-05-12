import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  size: number;
  vy: number; vx: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse     = useRef({ x: -999, y: -999 });
  const target    = useRef({ x: -999, y: -999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    /* ── Floating white star particles ── */
    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x            : Math.random() * window.innerWidth,
        y            : Math.random() * window.innerHeight,
        size         : Math.random() * 1.0 + 0.2,
        vy           : -(Math.random() * 0.25 + 0.08),
        vx           : (Math.random() - 0.5) * 0.1,
        opacity      : Math.random() * 0.4 + 0.1,
        twinkleSpeed : Math.random() * 0.02 + 0.008,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.012;

      /* Smooth mouse lerp */
      mouse.current.x += (target.current.x - mouse.current.x) * 0.08;
      mouse.current.y += (target.current.y - mouse.current.y) * 0.08;
      const mx = mouse.current.x, my = mouse.current.y;

      /* ── Dot grid — brightens near cursor ── */
      const GRID = 38;
      for (let gx = GRID / 2; gx < W; gx += GRID) {
        for (let gy = GRID / 2; gy < H; gy += GRID) {
          const dx    = gx - mx, dy = gy - my;
          const dist  = Math.sqrt(dx * dx + dy * dy);
          const boost = Math.max(0, 1 - dist / 200);
          const alpha = 0.08 + boost * 0.55;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(gx, gy, 0.9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,1)';
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      /* ── Ambient white orb — top center, breathing ── */
      const ambGrad = ctx.createRadialGradient(W * 0.5, -H * 0.05, 0, W * 0.5, -H * 0.05, W * 0.5);
      ambGrad.addColorStop(0,   'rgba(200,220,255, 0.07)');
      ambGrad.addColorStop(0.5, 'rgba(160,180,255, 0.025)');
      ambGrad.addColorStop(1,   'rgba(0,0,0, 0)');
      ctx.fillStyle = ambGrad;
      ctx.fillRect(0, 0, W, H);

      /* ── Mouse spotlight ── */
      if (mx > 0) {
        // Outer wide halo
        const outerGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 320);
        outerGrad.addColorStop(0,   'rgba(200,220,255, 0.06)');
        outerGrad.addColorStop(0.5, 'rgba(180,200,255, 0.025)');
        outerGrad.addColorStop(1,   'rgba(0,0,0, 0)');
        ctx.fillStyle = outerGrad;
        ctx.fillRect(0, 0, W, H);

        // Inner bright core
        const innerGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 100);
        innerGrad.addColorStop(0,   'rgba(255,255,255, 0.10)');
        innerGrad.addColorStop(0.4, 'rgba(200,220,255, 0.05)');
        innerGrad.addColorStop(1,   'rgba(0,0,0, 0)');
        ctx.fillStyle = innerGrad;
        ctx.fillRect(0, 0, W, H);
      }

      /* ── Floating white star particles ── */
      particles.forEach((p, i) => {
        p.y += p.vy;
        p.x += p.vx;

        const dx    = p.x - mx, dy = p.y - my;
        const dist  = Math.sqrt(dx * dx + dy * dy);
        const boost = Math.max(0, 1 - dist / 180) * 0.5;
        const tw    = (Math.sin(t * p.twinkleSpeed * 80 + p.twinkleOffset) + 1) / 2;
        const alpha = Math.min(0.85, (p.opacity + boost) * (0.5 + tw * 0.5));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + boost, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,230,255, ${alpha})`;
        ctx.fill();

        if (p.y < -5) {
          particles[i] = {
            x: Math.random() * W, y: H + 5,
            size         : Math.random() * 1.0 + 0.2,
            vy           : -(Math.random() * 0.25 + 0.08),
            vx           : (Math.random() - 0.5) * 0.1,
            opacity      : Math.random() * 0.4 + 0.1,
            twinkleSpeed : Math.random() * 0.02 + 0.008,
            twinkleOffset: Math.random() * Math.PI * 2,
          };
        }
      });

      /* ── Film grain ── */
      ctx.globalAlpha = 0.018;
      for (let i = 0; i < 600; i++) {
        const v = Math.floor(Math.random() * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position     : 'fixed',
        inset        : 0,
        width        : '100%',
        height       : '100%',
        pointerEvents: 'none',
        zIndex       : 0,
      }}
    />
  );
}
