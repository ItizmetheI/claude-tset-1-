import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPostFX } from './postprocessing.js';
import { applyFocus } from './materials.js';
import {
  buildPath, PALETTE,
  buildSpine, buildHero, buildFragments, buildWorkCorridor, buildCore, buildProcessHelix, buildConvergence,
  buildParticles
} from './scenePieces.js';

// progress stops -> fog/light/particle colour keyframes
const COLOR_STOPS = [
  { t: 0.00, color: PALETTE.hero },
  { t: 0.26, color: PALETTE.about },
  { t: 0.45, color: PALETTE.work },
  { t: 0.65, color: PALETTE.capabilities },
  { t: 0.82, color: PALETTE.process },
  { t: 1.00, color: PALETTE.contact }
];

function colorAtProgress(p, target){
  for(let i = 0; i < COLOR_STOPS.length - 1; i++){
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if(p >= a.t && p <= b.t){
      const local = (p - a.t) / (b.t - a.t || 1);
      return target.copy(a.color).lerp(b.color, local);
    }
  }
  return target.copy(COLOR_STOPS[COLOR_STOPS.length - 1].color);
}

const PROJECT_COLORS = ['#7c5cff', '#ff5c8a', '#5ce1ff', '#ffd95c'];

// Approximate progress (0-1) at which each set piece is "on stage",
// derived from each section's position in the page. Used to fade
// the rest of the world out of focus so only one scene reads sharp
// at a time, tying everything into a single choreographed journey.
const FOCUS = {
  hero: { center: 0.06, spread: 0.16 },
  fragments: { center: 0.25, spread: 0.16 },
  work: { center: 0.43, spread: 0.16 },
  core: { center: 0.62, spread: 0.16 },
  process: { center: 0.78, spread: 0.16 },
  contact: { center: 0.93, spread: 0.16 }
};

function focusFor(p, key){
  const { center, spread } = FOCUS[key];
  const d = Math.abs(p - center);
  return THREE.MathUtils.clamp(1 - d / spread, 0, 1);
}

export class World{
  constructor(container){
    this.container = container;
    this.clock = new THREE.Clock();

    this.progress = 0;
    this.targetProgress = 0;
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.fogColor = new THREE.Color('#07070a');
    this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.045);
    this.scene.background = this.fogColor.clone();

    this.camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 200);

    // --- environment map for PBR glass reflections ---
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.envMap = envRT.texture;
    pmrem.dispose();

    // --- lights ---
    this.hemiLight = new THREE.HemisphereLight(0xbcb6ff, 0x0a0a12, 0.65);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.PointLight(0xffffff, 2.4, 26, 2);
    this.camera.add(this.keyLight);
    this.scene.add(this.camera);

    // --- camera path ---
    this.path = buildPath();

    // --- set pieces ---
    this.spine = buildSpine(this.envMap, this.path);
    this.hero = buildHero(this.envMap);
    this.fragments = buildFragments(this.envMap);
    this.work = buildWorkCorridor(this.envMap, PROJECT_COLORS);
    this.core = buildCore(this.envMap);
    this.process = buildProcessHelix(this.envMap);
    this.contact = buildConvergence();
    this.particles = buildParticles();

    [this.spine, this.hero, this.fragments, this.work, this.core, this.process, this.contact].forEach((piece) => {
      this.scene.add(piece.group);
    });
    this.scene.add(this.particles.points);

    this._materials = [
      ...this.spine.materials,
      ...this.hero.materials,
      ...this.fragments.materials,
      ...this.work.materials,
      ...this.core.materials,
      ...this.process.materials
    ];

    // --- post-processing ---
    const fx = createPostFX(this.renderer, this.scene, this.camera, container.clientWidth, container.clientHeight);
    this.composer = fx.composer;
    this.bloomPass = fx.bloomPass;
    this.gradePass = fx.gradePass;

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    this._tmpColor = new THREE.Color();
    this._lookTarget = new THREE.Vector3();
    this._velocity = 0;
    this._lastProgress = 0;
    this._hovering = false;

    this.resize();
    this._tick();
  }

  setProgress(p){
    this.targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  setHover(index, hovered, color){
    this.work.setHover(index, hovered);
    this._hovering = hovered;
    if(hovered && color){
      this.particles.setColor(color);
    }
  }

  resize(){
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if(w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
    this.gradePass.uniforms.uResolution.value.set(w, h);
  }

  _tick(){
    requestAnimationFrame(() => this._tick());
    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // smooth scroll-driven progress + mouse
    this.progress += (this.targetProgress - this.progress) * 0.07;
    this.mouse.lerp(this.targetMouse, 0.06);

    this._velocity = THREE.MathUtils.lerp(this._velocity, Math.abs(this.targetProgress - this._lastProgress), 0.2);
    this._lastProgress = this.targetProgress;

    // camera along path
    const camPos = this.path.getPointAt(this.progress);
    const lookPos = this.path.getPointAt(Math.min(this.progress + 0.05, 1));

    this.camera.position.set(
      camPos.x + this.mouse.x * 0.6,
      camPos.y + this.mouse.y * 0.35,
      camPos.z
    );
    this._lookTarget.set(
      lookPos.x + this.mouse.x * 0.9,
      lookPos.y + this.mouse.y * 0.5,
      lookPos.z
    );

    // gentle cinematic roll that drifts across the journey
    const roll = Math.sin(this.progress * Math.PI * 5) * 0.05 + this.mouse.x * 0.04;
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.camera.lookAt(this._lookTarget);

    // fog / background colour drifts across the journey
    colorAtProgress(this.progress, this._tmpColor);
    this.fogColor.lerp(this._tmpColor.clone().multiplyScalar(0.18), 0.04);
    this.scene.fog.color.copy(this.fogColor);
    this.scene.background.copy(this.fogColor);
    this.hemiLight.color.lerp(this._tmpColor, 0.04);
    if(!this._hovering){
      this.particles.setColor(`#${this._tmpColor.getHexString()}`);
    }

    // chromatic aberration responds to scroll velocity too
    const baseAberration = 0.0012 + Math.min(this._velocity * 0.4, 0.004);
    this.gradePass.uniforms.uAberration.value = THREE.MathUtils.lerp(this.gradePass.uniforms.uAberration.value, baseAberration, 0.1);
    this.gradePass.uniforms.uTime.value = elapsed;

    // animate set pieces
    this.spine.update(this.progress, elapsed);
    this.hero.update(this.progress, elapsed);
    this.fragments.update(this.progress, elapsed);
    this.work.update(this.progress, elapsed);
    this.core.update(this.progress, elapsed);
    this.process.update(this.progress, elapsed);
    const contactFocus = focusFor(this.progress, 'contact');
    this.contact.update(this.progress, elapsed, contactFocus);
    this.particles.update(this.progress, elapsed);

    // fade everything except the set piece for the active section so the
    // world reads as one continuous, choreographed space
    applyFocus(this.hero.materials, focusFor(this.progress, 'hero'));
    applyFocus(this.fragments.materials, focusFor(this.progress, 'fragments'));
    applyFocus(this.work.materials, focusFor(this.progress, 'work'));
    applyFocus(this.core.materials, focusFor(this.progress, 'core'));
    applyFocus(this.process.materials, focusFor(this.progress, 'process'));
    applyFocus(this.contact.materials, contactFocus);

    // material time uniforms
    this._materials.forEach((m) => {
      if(m.userData.uniforms) m.userData.uniforms.uTime.value = elapsed;
    });

    this.composer.render(dt);
  }
}
