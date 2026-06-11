import * as THREE from 'three';
import { createGlassMaterial, createEnergyMaterial } from './materials.js';

/**
 * The camera travel path. Document scroll progress (0-1) maps directly to
 * curve parameter t. Each control point roughly anchors a section.
 */
export function buildPath(){
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.18, 9.0),     // 0.00 hero start
    new THREE.Vector3(1.05, 0.36, 1.5),    // 0.14 hero -> about
    new THREE.Vector3(-0.95, -0.24, -8.5), // 0.30 about -> work
    new THREE.Vector3(1.3, 0.42, -19.0),   // 0.40 work panel 1/2
    new THREE.Vector3(-1.2, -0.36, -30.0), // 0.50 work panel 3/4
    new THREE.Vector3(0.85, 0.24, -41.0),  // 0.62 work -> capabilities
    new THREE.Vector3(-0.7, 0.42, -53.0),  // 0.78 capabilities -> process
    new THREE.Vector3(0.35, -0.18, -65.0), // 0.90 process -> contact
    new THREE.Vector3(0.0, 0.0, -78.0)     // 1.00 contact end
  ], false, 'catmullrom', 0.5);
}

const PALETTE = {
  hero: new THREE.Color('#7c5cff'),
  about: new THREE.Color('#5ce1ff'),
  work: new THREE.Color('#ff5c8a'),
  capabilities: new THREE.Color('#7c5cff'),
  process: new THREE.Color('#ffd95c'),
  contact: new THREE.Color('#ffffff')
};

export { PALETTE };

/* ---------------------------------------------------------------
   Spine — a tunnel of glass rings threading the entire camera path,
   colour-matched to each section's palette. Ties every set piece into
   one continuous world rather than disconnected scenes.
--------------------------------------------------------------- */
export function buildSpine(envMap, path){
  const group = new THREE.Group();
  const sectionColors = [PALETTE.hero, PALETTE.about, PALETTE.work, PALETTE.capabilities, PALETTE.process, PALETTE.contact];
  const mats = sectionColors.map((c) => createGlassMaterial({
    color: `#${c.getHexString()}`,
    envMap,
    iridescence: 1,
    displaceAmp: 0.025,
    displaceFreq: 1.4,
    speed: 0.15
  }));

  const ringCount = 18;
  const rings = [];
  for(let i = 0; i < ringCount; i++){
    const u = i / (ringCount - 1);
    const center = path.getPointAt(u);
    const tangent = path.getTangentAt(u);
    const matIndex = Math.min(mats.length - 1, Math.floor(u * mats.length));
    const radius = 3.4 + Math.sin(u * Math.PI * 6) * 0.5;
    const geo = new THREE.TorusGeometry(radius, 0.045, 12, 56);
    const mesh = new THREE.Mesh(geo, mats[matIndex]);
    mesh.position.copy(center);
    mesh.lookAt(center.clone().add(tangent));
    mesh.userData.spin = 0.04 + (i % 5) * 0.015;
    mesh.userData.dir = i % 2 === 0 ? 1 : -1;
    group.add(mesh);
    rings.push(mesh);
  }

  return {
    group,
    materials: mats,
    update(t, elapsed){
      rings.forEach((r) => {
        r.rotation.z += 0.0016 * r.userData.dir * (1 + r.userData.spin);
      });
    }
  };
}

/* ---------------------------------------------------------------
   Hero centerpiece — large displaced iridescent blob + orbiting shards
--------------------------------------------------------------- */
export function buildHero(envMap){
  const group = new THREE.Group();
  group.position.set(2.4, -0.4, -2.5);

  const coreGeo = new THREE.IcosahedronGeometry(2.1, 32);
  const coreMat = createGlassMaterial({ color: '#bdb4ff', envMap, iridescence: 1, displaceAmp: 0.22, displaceFreq: 0.55, speed: 0.12 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const shards = new THREE.Group();
  const shardGeo = new THREE.OctahedronGeometry(0.22, 0);
  const shardMat = createGlassMaterial({ color: '#ff9fc7', envMap, iridescence: 1, displaceAmp: 0.05, displaceFreq: 2, speed: 0.3 });
  for(let i = 0; i < 10; i++){
    const m = new THREE.Mesh(shardGeo, shardMat);
    const r = 3.2 + Math.random() * 1.4;
    const theta = (i / 10) * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    m.position.set(
      Math.cos(theta) * Math.sin(phi) * r,
      Math.cos(phi) * r * 0.6,
      Math.sin(theta) * Math.sin(phi) * r
    );
    m.userData.speed = 0.2 + Math.random() * 0.4;
    m.userData.radius = r;
    m.userData.theta = theta;
    m.userData.yOff = m.position.y;
    shards.add(m);
  }
  group.add(shards);

  return {
    group,
    materials: [coreMat, shardMat],
    update(t, elapsed){
      core.rotation.y = elapsed * 0.08;
      core.rotation.x = elapsed * 0.05;
      shards.children.forEach((m) => {
        const a = m.userData.theta + elapsed * m.userData.speed * 0.3;
        m.position.x = Math.cos(a) * m.userData.radius;
        m.position.z = Math.sin(a) * m.userData.radius;
        m.rotation.x = elapsed * m.userData.speed;
        m.rotation.y = elapsed * m.userData.speed * 0.7;
      });
    }
  };
}

/* ---------------------------------------------------------------
   About — drifting cluster of glass fragments ("ideas")
--------------------------------------------------------------- */
export function buildFragments(envMap){
  const group = new THREE.Group();
  group.position.set(-1.2, 0.2, -10);

  const mats = [
    createGlassMaterial({ color: '#9fd9ff', envMap, iridescence: 1, displaceAmp: 0.06, displaceFreq: 1.5, speed: 0.2 }),
    createGlassMaterial({ color: '#cfc2ff', envMap, iridescence: 1, displaceAmp: 0.06, displaceFreq: 1.5, speed: 0.25 })
  ];

  const items = [];
  const geos = [
    new THREE.TetrahedronGeometry(0.55, 0),
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.IcosahedronGeometry(0.4, 0)
  ];

  for(let i = 0; i < 9; i++){
    const geo = geos[i % geos.length];
    const mat = mats[i % mats.length];
    const m = new THREE.Mesh(geo, mat);
    m.position.set(
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 8
    );
    m.userData.spin = 0.05 + Math.random() * 0.15;
    m.userData.axis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
    group.add(m);
    items.push(m);
  }

  return {
    group,
    materials: mats,
    update(t, elapsed){
      items.forEach((m) => {
        m.rotateOnAxis(m.userData.axis, m.userData.spin * 0.016);
      });
      group.rotation.y = elapsed * 0.02;
    }
  };
}

/* ---------------------------------------------------------------
   Work corridor — large tilted glass panels, one per project
--------------------------------------------------------------- */
export function buildWorkCorridor(envMap, projectColors){
  const group = new THREE.Group();
  const panels = [];

  const positions = [
    new THREE.Vector3(3.4, 0.6, -16.5),
    new THREE.Vector3(-3.6, -0.4, -23.5),
    new THREE.Vector3(3.2, 0.2, -30.5),
    new THREE.Vector3(-3.4, 0.5, -37.5)
  ];

  positions.forEach((pos, i) => {
    const color = projectColors[i % projectColors.length];
    const geo = new THREE.BoxGeometry(3.4, 2.1, 0.08, 4, 4, 1);
    const mat = createGlassMaterial({ color, envMap, iridescence: 1, displaceAmp: 0.04, displaceFreq: 1.2, speed: 0.18 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.y = pos.x > 0 ? -0.45 : 0.45;
    mesh.rotation.x = (Math.random() - 0.5) * 0.08;
    mesh.userData.baseRotY = mesh.rotation.y;
    mesh.userData.baseScale = 1;

    const light = new THREE.PointLight(color, 6, 14, 2);
    light.position.copy(pos).add(new THREE.Vector3(pos.x > 0 ? -1.5 : 1.5, 0.5, 1.5));
    group.add(light);

    group.add(mesh);
    panels.push({ mesh, mat, light, basePos: pos.clone() });
  });

  return {
    group,
    panels,
    materials: panels.map(p => p.mat),
    update(t, elapsed){
      panels.forEach((p, i) => {
        p.mesh.rotation.y = p.mesh.userData.baseRotY + Math.sin(elapsed * 0.2 + i) * 0.06;
        p.mesh.position.y = p.basePos.y + Math.sin(elapsed * 0.3 + i * 1.4) * 0.18;
      });
    },
    setHover(index, hovered){
      panels.forEach((p, i) => {
        const target = (i === index && hovered) ? 1.18 : 1;
        p.mesh.scale.setScalar(THREE.MathUtils.lerp(p.mesh.scale.x, target, 0.12));
        const lightTarget = (i === index && hovered) ? 14 : 6;
        p.light.intensity = THREE.MathUtils.lerp(p.light.intensity, lightTarget, 0.12);
      });
    }
  };
}

/* ---------------------------------------------------------------
   Capabilities — central "engine" core with orbiting nodes
--------------------------------------------------------------- */
export function buildCore(envMap){
  const group = new THREE.Group();
  group.position.set(-1.0, 0.3, -47);

  const coreGeo = new THREE.TorusKnotGeometry(1.3, 0.38, 200, 24);
  const coreMat = createGlassMaterial({ color: '#a78bff', envMap, iridescence: 1, displaceAmp: 0.05, displaceFreq: 0.8, speed: 0.15 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const nodeMat = createGlassMaterial({ color: '#bfe9ff', envMap, iridescence: 1, displaceAmp: 0.04, displaceFreq: 2, speed: 0.25 });
  const nodeGeo = new THREE.IcosahedronGeometry(0.32, 8);
  const nodes = [];
  for(let i = 0; i < 4; i++){
    const m = new THREE.Mesh(nodeGeo, nodeMat);
    m.userData.radius = 3.2;
    m.userData.theta = (i / 4) * Math.PI * 2;
    m.userData.speed = 0.25 + i * 0.04;
    m.userData.tilt = (i % 2 === 0) ? 0.3 : -0.3;
    group.add(m);
    nodes.push(m);
  }

  return {
    group,
    materials: [coreMat, nodeMat],
    update(t, elapsed){
      core.rotation.x = elapsed * 0.1;
      core.rotation.y = elapsed * 0.07;
      nodes.forEach((m) => {
        const a = m.userData.theta + elapsed * m.userData.speed;
        m.position.set(
          Math.cos(a) * m.userData.radius,
          Math.sin(a * 0.7) * m.userData.tilt * m.userData.radius,
          Math.sin(a) * m.userData.radius
        );
        m.rotation.x = a;
        m.rotation.y = a * 0.6;
      });
    }
  };
}

/* ---------------------------------------------------------------
   Process — ascending helix of step-nodes
--------------------------------------------------------------- */
export function buildProcessHelix(envMap){
  const group = new THREE.Group();
  group.position.set(0.4, 0, -59);

  const mat = createGlassMaterial({ color: '#ffe0a3', envMap, iridescence: 1, displaceAmp: 0.05, displaceFreq: 1.5, speed: 0.2 });
  const geo = new THREE.IcosahedronGeometry(0.5, 6);
  const nodes = [];
  for(let i = 0; i < 4; i++){
    const m = new THREE.Mesh(geo, mat);
    const a = (i / 4) * Math.PI * 2.4;
    m.position.set(Math.cos(a) * 2.6, i * 1.6 - 2.4, Math.sin(a) * 2.6 - i * 2.0);
    m.userData.baseY = m.position.y;
    m.userData.phase = a;
    group.add(m);
    nodes.push(m);
  }

  return {
    group,
    materials: [mat],
    update(t, elapsed){
      nodes.forEach((m) => {
        m.rotation.y = elapsed * 0.3 + m.userData.phase;
        m.position.y = m.userData.baseY + Math.sin(elapsed * 0.5 + m.userData.phase) * 0.2;
      });
    }
  };
}

/* ---------------------------------------------------------------
   Contact — bright convergence core (feeds bloom)
--------------------------------------------------------------- */
export function buildConvergence(){
  const group = new THREE.Group();
  group.position.set(0, 0, -76);

  const mat = createEnergyMaterial({ color: '#ffffff' });
  const geo = new THREE.IcosahedronGeometry(0.9, 4);
  const core = new THREE.Mesh(geo, mat);
  group.add(core);

  const ringGeo = new THREE.TorusGeometry(2.0, 0.015, 8, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#bda8ff', toneMapped: false, transparent: true, opacity: 0.5 });
  const rings = [];
  for(let i = 0; i < 3; i++){
    const r = new THREE.Mesh(ringGeo, ringMat);
    r.scale.setScalar(1 + i * 0.6);
    r.rotation.x = Math.PI / 2 + i * 0.3;
    group.add(r);
    rings.push(r);
  }

  return {
    group,
    materials: [mat, ringMat],
    update(t, elapsed, focus = 1){
      core.rotation.y = elapsed * 0.2;
      const pulse = 1 + Math.sin(elapsed * 1.4) * 0.08;
      // shrink the core down to a faint pinprick until the camera actually
      // arrives at the contact section, so it doesn't bloom into a giant
      // white orb that washes out earlier scenes
      const reveal = THREE.MathUtils.lerp(0.06, 1, THREE.MathUtils.clamp(focus, 0, 1));
      core.scale.setScalar(pulse * reveal);
      group.scale.setScalar(THREE.MathUtils.lerp(0.5, 1, THREE.MathUtils.clamp(focus, 0, 1)));
      rings.forEach((r, i) => {
        r.rotation.z = elapsed * (0.1 + i * 0.05);
      });
    }
  };
}

/* ---------------------------------------------------------------
   Particle field — drifting dust spanning the whole travel path
--------------------------------------------------------------- */
export function buildParticles(){
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for(let i = 0; i < count; i++){
    positions[i * 3 + 0] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = 10 - Math.random() * 95;
    seeds[i] = Math.random();
    sizes[i] = Math.random() * 2.2 + 0.4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#bda8ff') }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      varying float vSeed;
      void main(){
        vSeed = aSeed;
        vec3 p = position;
        p.x += sin(uTime * 0.1 + aSeed * 6.2831) * 0.6;
        p.y += cos(uTime * 0.08 + aSeed * 6.2831) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (220.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vSeed;
      uniform vec3 uColor;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if(d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColor, vec3(1.0), vSeed * 0.6);
        gl_FragColor = vec4(col, alpha * 0.45);
      }
    `
  });

  const points = new THREE.Points(geo, mat);

  return {
    points,
    update(t, elapsed){
      uniforms.uTime.value = elapsed;
    },
    setColor(hex){
      uniforms.uColor.value.set(hex);
    }
  };
}
