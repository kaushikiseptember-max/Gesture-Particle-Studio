(function () {
  'use strict';

  const VIBRANT_HEX = [0x22e8ff, 0xff2bd6, 0xff8a1e, 0xd6ff2b, 0x2bff8f, 0x9d6bff];
  function colorForFingerCount(count) {
    return new THREE.Color(VIBRANT_HEX[THREE.MathUtils.clamp(count, 0, 5)]);
  }

  const container = document.getElementById('three-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 300);
  camera.position.set(0, 0, 11);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  function makeGlowTexture() {
    const size = 128;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.25,'rgba(255,255,255,0.9)');
    g.addColorStop(0.55,'rgba(255,255,255,0.25)'); g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
    return new THREE.CanvasTexture(c);
  }
  const glowTexture = makeGlowTexture();

  const sphereGroup = new THREE.Group();
  scene.add(sphereGroup);

  const PARTICLE_COUNT = 3000;
  const BASE_RADIUS = 3.0;
  const BASE_POINT_SIZE = 0.11;

  const basePositions = new Float32Array(PARTICLE_COUNT*3);
  const positions = new Float32Array(PARTICLE_COUNT*3);
  const explodeTargets = new Float32Array(PARTICLE_COUNT*3);
  const explodeFrom = new Float32Array(PARTICLE_COUNT*3);

  (function buildSphere() {
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i/(PARTICLE_COUNT-1))*2;
      const radiusAtY = Math.sqrt(1-y*y);
      const theta = golden*i;
      const x = Math.cos(theta)*radiusAtY, z = Math.sin(theta)*radiusAtY;
      const jitter = 0.88 + Math.random()*0.16;
      const r = BASE_RADIUS*jitter;
      basePositions[i*3]=x*r; basePositions[i*3+1]=y*r; basePositions[i*3+2]=z*r;
      positions[i*3]=(Math.random()-0.5)*40; positions[i*3+1]=(Math.random()-0.5)*40; positions[i*3+2]=(Math.random()-0.5)*40;
    }
  })();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: BASE_POINT_SIZE, map: glowTexture, color: 0x22e8ff, transparent: true,
    opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const points = new THREE.Points(geometry, material);
  sphereGroup.add(points);

  const coreGeo = new THREE.SphereGeometry(BASE_RADIUS*0.32, 24, 24);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.1 });
  sphereGroup.add(new THREE.Mesh(coreGeo, coreMat));

  const STAR_COUNT = 900;
  const starPositions = new Float32Array(STAR_COUNT*3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 30 + Math.random()*55, theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
    starPositions[i*3]=r*Math.sin(phi)*Math.cos(theta); starPositions[i*3+1]=r*Math.sin(phi)*Math.sin(theta); starPositions[i*3+2]=r*Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ size: 0.05, map: glowTexture, color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const pulseRings = [];
  function spawnPulseRing() {
    const geo = new THREE.SphereGeometry(BASE_RADIUS, 20, 20);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.75 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(0.4);
    sphereGroup.add(mesh);
    pulseRings.push({ mesh, start: performance.now() });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const currentColor = new THREE.Color(0x22e8ff);
  const targetColor = new THREE.Color(0x22e8ff);

  const overlay = document.getElementById('overlay');
  const octx = overlay.getContext('2d');
  function fitCanvas(cv, ctx) {
    cv.width = window.innerWidth*window.devicePixelRatio; cv.height = window.innerHeight*window.devicePixelRatio;
    cv.style.width = window.innerWidth+'px'; cv.style.height = window.innerHeight+'px';
    ctx.setTransform(window.devicePixelRatio,0,0,window.devicePixelRatio,0,0);
  }
  fitCanvas(overlay, octx);
  window.addEventListener('resize', () => fitCanvas(overlay, octx));

  function drawChargeRing(x, y, level) {
    octx.clearRect(0,0,overlay.width,overlay.height);
    if (level <= 0) return;
    const radius = 34;
    octx.save();
    octx.lineWidth = 3; octx.strokeStyle = 'rgba(255,255,255,0.15)';
    octx.beginPath(); octx.arc(x,y,radius,0,Math.PI*2); octx.stroke();
    octx.strokeStyle = level >= 1 ? '#ffffff' : `hsl(${level*40}, 95%, 65%)`;
    octx.lineWidth = 3.5; octx.shadowColor = octx.strokeStyle; octx.shadowBlur = 10;
    octx.beginPath(); octx.arc(x,y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*level); octx.stroke();
    octx.shadowBlur = 0;
    octx.fillStyle = 'rgba(255,255,255,0.85)'; octx.beginPath(); octx.arc(x,y,3.5,0,Math.PI*2); octx.fill();
    octx.restore();
  }

  const video = document.getElementById('video');
  const statusEl = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const hudText = document.getElementById('hudText');
  const hudSwatch = document.getElementById('hudSwatch');

  const state = {
    handCount: 0, targetPosX: 0, targetPosY: 0, prevMirrorX: null, prevMirrorY: null,
    rotVelX: 0, rotVelY: 0, targetScale: 1, pinching: false, chargeLevel: 0,
    pinchScreenX: 0, pinchScreenY: 0, fingerCount: 0, gesture: 'idle', frozen: false,
    rainbow: false, sizeBoost: 0, phase: 'reforming', phaseStart: performance.now()
  };
  for (let i = 0; i < PARTICLE_COUNT*3; i++) explodeFrom[i] = positions[i];

  const EXPLODE_MS = 650, HOLD_MS = 220, REFORM_MS = 1300, CHARGE_MS = 1100;

  function dist3(a,b){ return Math.hypot(a.x-b.x, a.y-b.y, (a.z||0)-(b.z||0)); }

  function analyzeHand(lm) {
    const wrist = lm[0];
    const map = { thumb:[4,3], index:[8,6], middle:[12,10], ring:[16,14], pinky:[20,18] };
    const ext = {}; let count = 0;
    for (const k in map) { const [tip,pip]=map[k]; const e = dist3(wrist,lm[tip]) > dist3(wrist,lm[pip])*1.12; ext[k]=e; if(e) count++; }
    return { ext, count };
  }
  function classifyGesture(ext, count) {
    if (count === 0) return 'fist';
    if (count >= 5) return 'open';
    if (ext.index && ext.middle && !ext.ring && !ext.pinky) return 'peace';
    return 'move';
  }

  function triggerExplode() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx=basePositions[i*3], by=basePositions[i*3+1], bz=basePositions[i*3+2];
      const len = Math.hypot(bx,by,bz) || 1;
      const dirX=bx/len, dirY=by/len, dirZ=bz/len;
      const dist = 7 + Math.random()*14;
      explodeFrom[i*3]=positions[i*3]; explodeFrom[i*3+1]=positions[i*3+1]; explodeFrom[i*3+2]=positions[i*3+2];
      explodeTargets[i*3]=dirX*dist+(Math.random()-0.5)*6; explodeTargets[i*3+1]=dirY*dist+(Math.random()-0.5)*6; explodeTargets[i*3+2]=dirZ*dist+(Math.random()-0.5)*6;
    }
    state.phase = 'exploding'; state.phaseStart = performance.now();
  }
  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
  function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

  let peaceWasActive = false;

  function onResults(results) {
    const hands = results.multiHandLandmarks || [];
    state.handCount = hands.length;
    if (hands.length === 0) {
      state.pinching = false; state.chargeLevel = Math.max(0, state.chargeLevel-0.06);
      state.prevMirrorX = null; state.prevMirrorY = null; state.frozen = false; state.rainbow = false;
      state.gesture = 'idle'; peaceWasActive = false;
      return;
    }
    const lm = hands[0];
    const { ext, count } = analyzeHand(lm);
    state.fingerCount = count;
    const gesture = classifyGesture(ext, count);
    state.gesture = gesture;
    state.frozen = (gesture === 'fist');
    state.rainbow = (gesture === 'open');
    if (!state.rainbow) targetColor.copy(colorForFingerCount(count));

    const mirrorX = 1 - lm[9].x, mirrorY = lm[9].y;
    if (state.prevMirrorX !== null && !state.frozen) {
      state.rotVelY += (mirrorX - state.prevMirrorX) * 6.5;
      state.rotVelX += (mirrorY - state.prevMirrorY) * 6.5;
    }
    state.prevMirrorX = mirrorX; state.prevMirrorY = mirrorY;

    if (!state.frozen) {
      state.targetPosX = (mirrorX-0.5)*9;
      state.targetPosY = -(mirrorY-0.5)*6.5;
    }

    if (gesture === 'peace' && !peaceWasActive) {
      spawnPulseRing(); state.sizeBoost = 0.09; currentColor.setRGB(1,1,1);
    }
    peaceWasActive = (gesture === 'peace');

    const handSize = dist3(lm[0], lm[9]) || 0.001;
    const pinchDist = dist3(lm[4], lm[8]) / handSize;
    const isPinching = pinchDist < 0.55 && !state.frozen;
    const thumbTip = lm[4], indexTip = lm[8];
    state.pinchScreenX = (1-(thumbTip.x+indexTip.x)/2)*window.innerWidth;
    state.pinchScreenY = ((thumbTip.y+indexTip.y)/2)*window.innerHeight;

    if (isPinching && state.phase === 'idle') { state.pinching = true; }
    else {
      if (state.pinching && state.chargeLevel >= 1 && state.phase === 'idle') triggerExplode();
      state.pinching = false;
    }

    if (hands.length >= 2) {
      const c0 = hands[0][9], c1 = hands[1][9];
      const d = Math.hypot(c0.x-c1.x, c0.y-c1.y);
      state.targetScale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(d, 0.15, 0.9, 0.55, 2.3), 0.5, 2.4);
    }
  }

  const hands = new Hands({ locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file });
  hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.6 });
  hands.onResults(onResults);

  const mpCamera = new Camera(video, { onFrame: async () => { await hands.send({ image: video }); }, width: 640, height: 480 });
  mpCamera.start().then(() => { statusText.textContent = 'Tracking'; statusEl.classList.add('live'); })
    .catch(() => { statusText.textContent = 'Camera unavailable'; });

  const toggleBtn = document.getElementById('toggleBtn');
  let bgOn = false;
  toggleBtn.addEventListener('click', () => {
    bgOn = !bgOn; video.classList.toggle('bg-on', bgOn); toggleBtn.classList.toggle('active', bgOn);
    toggleBtn.textContent = bgOn ? 'Hide Webcam' : 'Webcam BG';
  });

  const GESTURE_LABELS = { idle:'Idle', move:'Tracking', peace:'Pulse', fist:'Frozen', open:'Rainbow' };

  let curPosX=0, curPosY=0, curScale=1, breathT=0, bgTick=0;

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();

    if (state.rainbow) {
      targetColor.setHSL((now/1800)%1, 0.9, 0.6);
    }
    currentColor.lerp(targetColor, 0.08);
    material.color.copy(currentColor);
    state.sizeBoost *= 0.9;
    material.size = BASE_POINT_SIZE + state.sizeBoost;

    hudText.textContent = GESTURE_LABELS[state.gesture] || 'Idle';
    hudSwatch.style.background = '#'+currentColor.getHexString();
    hudSwatch.style.color = '#'+currentColor.getHexString();

    if (++bgTick % 6 === 0) {
      const dim = currentColor.clone().multiplyScalar(0.16);
      document.body.style.background = `radial-gradient(circle at 50% 45%, #${dim.getHexString()} 0%, #060608 60%)`;
    }

    curPosX += (state.targetPosX-curPosX)*0.09; curPosY += (state.targetPosY-curPosY)*0.09;
    sphereGroup.position.set(curPosX, curPosY, 0);

    if (state.handCount === 0 && state.phase === 'idle') state.rotVelY += 0.0009;
    if (!state.frozen) {
      sphereGroup.rotation.y += state.rotVelY; sphereGroup.rotation.x += state.rotVelX;
      sphereGroup.rotation.x = THREE.MathUtils.clamp(sphereGroup.rotation.x, -1.1, 1.1);
    }
    state.rotVelX *= 0.9; state.rotVelY *= 0.94;
    stars.rotation.y += 0.00015;

    curScale += (state.targetScale-curScale)*0.08;
    sphereGroup.scale.set(curScale, curScale, curScale);

    for (let i = pulseRings.length-1; i >= 0; i--) {
      const p = pulseRings[i]; const t = (now-p.start)/900;
      if (t >= 1) { sphereGroup.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); pulseRings.splice(i,1); continue; }
      p.mesh.scale.setScalar(0.4 + t*2.2); p.mesh.material.opacity = 0.75*(1-t);
    }

    if (state.pinching && state.phase === 'idle') {
      state.chargeLevel = Math.min(1, state.chargeLevel + (16/CHARGE_MS));
      drawChargeRing(state.pinchScreenX, state.pinchScreenY, state.chargeLevel);
    } else if (!state.pinching && state.chargeLevel > 0 && state.phase === 'idle') {
      state.chargeLevel = Math.max(0, state.chargeLevel - 0.05);
      if (state.chargeLevel > 0) drawChargeRing(state.pinchScreenX, state.pinchScreenY, state.chargeLevel);
      else octx.clearRect(0,0,overlay.width,overlay.height);
    } else if (state.phase !== 'idle') { octx.clearRect(0,0,overlay.width,overlay.height); }

    if (state.phase === 'exploding') {
      const t = Math.min(1, (now-state.phaseStart)/EXPLODE_MS); const e = easeOutCubic(t);
      for (let i=0;i<PARTICLE_COUNT;i++) {
        positions[i*3]=explodeFrom[i*3]+(explodeTargets[i*3]-explodeFrom[i*3])*e;
        positions[i*3+1]=explodeFrom[i*3+1]+(explodeTargets[i*3+1]-explodeFrom[i*3+1])*e;
        positions[i*3+2]=explodeFrom[i*3+2]+(explodeTargets[i*3+2]-explodeFrom[i*3+2])*e;
      }
      geometry.attributes.position.needsUpdate = true;
      if (t >= 1) { state.phase = 'holding'; state.phaseStart = now; }
    } else if (state.phase === 'holding') {
      if (now - state.phaseStart >= HOLD_MS) {
        state.phase = 'reforming'; state.phaseStart = now;
        for (let i=0;i<PARTICLE_COUNT*3;i++) explodeFrom[i]=positions[i];
      }
    } else if (state.phase === 'reforming') {
      const t = Math.min(1, (now-state.phaseStart)/REFORM_MS); const e = easeInOutCubic(t);
      for (let i=0;i<PARTICLE_COUNT;i++) {
        positions[i*3]=explodeFrom[i*3]+(basePositions[i*3]-explodeFrom[i*3])*e;
        positions[i*3+1]=explodeFrom[i*3+1]+(basePositions[i*3+1]-explodeFrom[i*3+1])*e;
        positions[i*3+2]=explodeFrom[i*3+2]+(basePositions[i*3+2]-explodeFrom[i*3+2])*e;
      }
      geometry.attributes.position.needsUpdate = true;
      if (t >= 1) { state.phase = 'idle'; state.chargeLevel = 0; }
    } else {
      breathT += 0.006; const pulse = 1 + Math.sin(breathT)*0.012;
      for (let i=0;i<PARTICLE_COUNT;i++) {
        positions[i*3]=basePositions[i*3]*pulse; positions[i*3+1]=basePositions[i*3+1]*pulse; positions[i*3+2]=basePositions[i*3+2]*pulse;
      }
      geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  animate();
})();
