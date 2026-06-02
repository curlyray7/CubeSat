/* ============================================================
   login-scene.js — Scène Three.js professionnelle
   Terre réaliste · Satellites en orbite · Étoiles sobres
   ============================================================ */

(function () {
  'use strict';

  const T = window.THREE;
  if (!T) return;

  const canvas = document.getElementById('login-canvas');
  if (!canvas) return;

  // ── Renderer ──────────────────────────────────────────────
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene  = new T.Scene();
  const camera = new T.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(-6, 3, 22);
  camera.lookAt(-1, 0, 0);

  // ── Lighting ──────────────────────────────────────────────
  scene.add(new T.AmbientLight(0x08080f, 1.0));

  const sun = new T.DirectionalLight(0xfff5e8, 2.4);
  sun.position.set(18, 6, 10);
  scene.add(sun);

  const fill = new T.DirectionalLight(0x202840, 0.4);
  fill.position.set(-15, -4, -8);
  scene.add(fill);

  // ── ÉTOILES (sobres, pas de couleurs criades) ─────────────
  (function buildStars() {
    const N   = 10000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {
      const r   = 350 + Math.random() * 300;
      const phi = Math.acos(2 * Math.random() - 1);
      const th  = Math.random() * Math.PI * 2;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(th);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(th);
      pos[i*3+2] = r * Math.cos(phi);

      // Blanc pur avec légère variation de luminosité
      const lum = 0.5 + Math.random() * 0.5;
      col[i*3] = col[i*3+1] = col[i*3+2] = lum;
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new T.BufferAttribute(col, 3));

    scene.add(new T.Points(geo, new T.PointsMaterial({
      size: 0.7, vertexColors: true, sizeAttenuation: true,
      transparent: true, opacity: 0.85,
    })));
  })();

  // ── TERRE ─────────────────────────────────────────────────
  const earthGroup = new T.Group();
  scene.add(earthGroup);

  const loader = new T.TextureLoader();
  const BASE   = 'https://unpkg.com/three-globe/example/img/';

  // Shader day/night avec terminateur réaliste
  const uEarth = {
    uDay:   { value: new T.DataTexture(new Uint8Array([20, 45, 80, 255]), 1, 1, T.RGBAFormat) },
    uNight: { value: new T.DataTexture(new Uint8Array([4, 4, 10, 255]),   1, 1, T.RGBAFormat) },
    uSun:   { value: sun.position.clone().normalize() },
    uTime:  { value: 0.0 },
  };
  uEarth.uDay.value.needsUpdate = uEarth.uNight.value.needsUpdate = true;

  // earth-clouds.png n'est plus disponible sur unpkg — on charge seulement day+night
  loader.load(BASE + 'earth-blue-marble.jpg', t => { uEarth.uDay.value   = t; });
  loader.load(BASE + 'earth-night.jpg',        t => { uEarth.uNight.value = t; });

  const earthMat = new T.ShaderMaterial({
    uniforms: uEarth,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vUv    = uv;
        vNormal= normalize(normalMatrix * normal);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uDay;
      uniform sampler2D uNight;
      uniform vec3  uSun;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec4 day   = texture2D(uDay,   vUv);
        vec4 night = texture2D(uNight, vUv);

        float NdotL = dot(vNormal, normalize(uSun));
        float blend = smoothstep(-0.20, 0.30, NdotL);

        // Reflet spéculaire sur les océans
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 halfV   = normalize(normalize(uSun) + viewDir);
        float spec   = pow(max(dot(vNormal, halfV), 0.0), 100.0);
        float ocean  = clamp(1.0 - (day.g - day.r) * 3.0, 0.0, 1.0);
        vec3 dayFinal = day.rgb + spec * 0.22 * blend * ocean;

        // Lumières des villes (côté nuit)
        vec3 nightFinal = night.rgb * 1.8 * (1.0 - blend);

        gl_FragColor = vec4(dayFinal * blend + nightFinal, 1.0);
      }`,
  });

  const earth = new T.Mesh(new T.SphereGeometry(5, 72, 72), earthMat);
  earthGroup.add(earth);

  // Atmosphère Fresnel (fine et discrète)
  earthGroup.add(new T.Mesh(
    new T.SphereGeometry(5.22, 64, 64),
    new T.ShaderMaterial({
      transparent: true, side: T.FrontSide,
      blending: T.AdditiveBlending, depthWrite: false,
      uniforms: { uSun: { value: sun.position.clone().normalize() } },
      vertexShader: /* glsl */`
        varying vec3 vN; varying vec3 vW;
        void main() {
          vN = normalize(normalMatrix * normal);
          vW = (modelMatrix * vec4(position,1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSun;
        varying vec3 vN; varying vec3 vW;
        void main() {
          vec3  v  = normalize(cameraPosition - vW);
          float f  = pow(1.0 - dot(vN, v), 4.0);
          float s  = max(dot(vN, normalize(uSun)), 0.0);
          vec3  c  = mix(vec3(0.08, 0.18, 0.55), vec3(0.25, 0.50, 0.90), s);
          gl_FragColor = vec4(c, f * 0.65);
        }`,
    })
  ));

  // Halo externe (BackSide)
  earthGroup.add(new T.Mesh(
    new T.SphereGeometry(5.8, 48, 48),
    new T.ShaderMaterial({
      transparent: true, side: T.BackSide,
      blending: T.AdditiveBlending, depthWrite: false,
      vertexShader: /* glsl */`
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vN;
        void main() {
          float i = pow(0.6 - dot(vN, vec3(0,0,1)), 3.5);
          gl_FragColor = vec4(0.12, 0.30, 0.65, i * 0.35);
        }`,
    })
  ));

  // ── ORBITES ───────────────────────────────────────────────
  // 4 satellites : paramètres basés sur la vraie BDD
  const ORBITS = [
    { r: 7.5,  inc: 97.4, speed: 0.0040, phase:   0, label: 'SAT-001' },
    { r: 8.4,  inc: 97.4, speed: 0.0031, phase: 130, label: 'SAT-002' },
    { r: 7.0,  inc: 51.6, speed: 0.0022, phase:  60, label: 'SAT-003' },
    { r: 9.0,  inc: 97.8, speed: 0.0048, phase: 240, label: 'SAT-004' },
  ];

  // Anneaux orbitaux (très discrets)
  ORBITS.forEach(o => {
    const pts = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      pts.push(new T.Vector3(o.r * Math.cos(a), 0, o.r * Math.sin(a)));
    }
    const ring = new T.Line(
      new T.BufferGeometry().setFromPoints(pts),
      new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 })
    );
    ring.rotation.x = o.inc * Math.PI / 180;
    scene.add(ring);
  });

  // ── SATELLITES ────────────────────────────────────────────
  function makeSat() {
    const g = new T.Group();

    // Corps — argent mat
    g.add(new T.Mesh(
      new T.BoxGeometry(0.20, 0.20, 0.34),
      new T.MeshPhongMaterial({ color: 0xc8ccd8, emissive: 0x080810, shininess: 60 })
    ));

    // Panneaux solaires — bleu nuit
    const pMat = new T.MeshPhongMaterial({ color: 0x1a2e4a, emissive: 0x0a1520, shininess: 80 });
    [-0.42, 0.42].forEach(x => {
      const p = new T.Mesh(new T.BoxGeometry(0.55, 0.18, 0.018), pMat);
      p.position.x = x;
      g.add(p);
    });

    // Antenne
    const ant = new T.Mesh(
      new T.CylinderGeometry(0.006, 0.006, 0.18, 5),
      new T.MeshBasicMaterial({ color: 0xe0e4f0 })
    );
    ant.position.y = 0.18;
    g.add(ant);

    return g;
  }

  const TRAIL_LEN = 70;
  const tmpV   = new T.Vector3();
  const tmpEul = new T.Euler();

  const satellites = ORBITS.map(o => {
    const sat = makeSat();
    scene.add(sat);

    // Trail pré-alloué
    const geo  = new T.BufferGeometry();
    const tPos = new Float32Array(TRAIL_LEN * 3);
    const tCol = new Float32Array(TRAIL_LEN * 3);
    geo.setAttribute('position', new T.BufferAttribute(tPos, 3));
    geo.setAttribute('color',    new T.BufferAttribute(tCol, 3));
    geo.setDrawRange(0, 0);

    scene.add(new T.Line(geo, new T.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.55,
      blending: T.AdditiveBlending, depthWrite: false,
    })));

    return {
      sat, geo, tPos, tCol,
      buf: new Float32Array(TRAIL_LEN * 3),
      head: 0, count: 0,
      ...o, incRad: o.inc * Math.PI / 180,
      angle: o.phase * Math.PI / 180,
    };
  });

  // ── CAMERA ────────────────────────────────────────────────
  let camAngle = 0.3;
  const CAM_R = 22, CAM_Y = 3;

  // ── BOUCLE ────────────────────────────────────────────────
  let time = 0, raf;

  function animate() {
    raf = requestAnimationFrame(animate);
    time += 0.016;

    // Terre
    earth.rotation.y += 0.00075;
    uEarth.uTime.value = time;

    // Caméra : orbite très lente (sens horaire)
    camAngle += 0.00018;
    camera.position.x = -1 + Math.sin(camAngle) * CAM_R;
    camera.position.z = Math.cos(camAngle) * CAM_R;
    camera.position.y = CAM_Y + Math.sin(time * 0.07) * 0.4;
    camera.lookAt(-1, 0, 0);

    // Satellites + trails
    satellites.forEach(sd => {
      sd.angle += sd.speed;

      // Position sur orbite inclinée
      tmpEul.set(sd.incRad, 0, 0);
      tmpV.set(sd.r * Math.cos(sd.angle), 0, sd.r * Math.sin(sd.angle)).applyEuler(tmpEul);
      sd.sat.position.copy(tmpV);

      // Orientation satellite (tangent à l'orbite)
      tmpEul.set(sd.incRad, 0, 0);
      const nx = sd.r * Math.cos(sd.angle + 0.02);
      const nz = sd.r * Math.sin(sd.angle + 0.02);
      tmpV.set(nx, 0, nz).applyEuler(tmpEul);
      sd.sat.lookAt(tmpV);

      // Circular buffer
      const h = sd.head % TRAIL_LEN;
      sd.buf[h*3]   = sd.sat.position.x;
      sd.buf[h*3+1] = sd.sat.position.y;
      sd.buf[h*3+2] = sd.sat.position.z;
      sd.head++;
      sd.count = Math.min(sd.count + 1, TRAIL_LEN);

      // Écriture du trail ordonné avec fondu
      const pA = sd.geo.attributes.position;
      const cA = sd.geo.attributes.color;
      for (let i = 0; i < sd.count; i++) {
        const idx  = ((sd.head - 1 - i + TRAIL_LEN * 100) % TRAIL_LEN) * 3;
        const fade = (1 - i / sd.count) * 0.5;   // trail discret, max 50% blanc
        pA.setXYZ(i, sd.buf[idx], sd.buf[idx+1], sd.buf[idx+2]);
        cA.setXYZ(i, fade, fade, fade);           // trail blanc/gris — pas de couleurs vives
      }
      pA.needsUpdate = cA.needsUpdate = true;
      sd.geo.setDrawRange(0, sd.count);
    });

    renderer.render(scene, camera);
  }

  // ── Resize ────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ── API publique ──────────────────────────────────────────
  window.loginScene = {
    stop() { cancelAnimationFrame(raf); raf = null; renderer.dispose(); },
  };

  animate();
})();
