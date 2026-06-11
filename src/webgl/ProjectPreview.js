import * as THREE from 'three';
import { noise3D } from '../shaders/noise.js';

const vert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec2 uVelocity;

${noise3D}

void main(){
  vec2 uv = vUv;
  vec2 ratio = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * ratio;

  // velocity based ripple distortion
  float velLen = length(uVelocity);
  vec2 dir = velLen > 0.0001 ? normalize(uVelocity) : vec2(0.0);
  float wave = sin(dot(p, dir) * 8.0 - uTime * 4.0) * velLen * 0.04;
  vec2 dp = p + dir * wave;

  float n = fbm(vec3(dp * 2.2, uTime * 0.25));
  float n2 = fbm(vec3(dp * 3.4 + 12.0, uTime * 0.18 + 4.0));

  vec3 dark = uColor * 0.12;
  vec3 mid = uColor * 0.7;
  vec3 bright = mix(uColor, vec3(1.0), 0.6);

  vec3 col = mix(dark, mid, smoothstep(-0.3, 0.5, n));
  col = mix(col, bright, smoothstep(0.3, 0.9, n2));

  // iridescent sheen — hue-rotated highlight riding the noise ridges
  vec3 iri = vec3(
    0.5 + 0.5 * cos(n2 * 6.2831 + uTime * 0.6),
    0.5 + 0.5 * cos(n2 * 6.2831 + uTime * 0.6 + 2.094),
    0.5 + 0.5 * cos(n2 * 6.2831 + uTime * 0.6 + 4.188)
  );
  col = mix(col, iri, smoothstep(0.55, 0.95, n2) * 0.35);

  // chromatic aberration on velocity
  float ca = velLen * 0.02;
  col.r += ca;
  col.b -= ca;

  // vignette
  float vig = smoothstep(1.0, 0.2, length(p));
  col *= mix(0.5, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class ProjectPreview{
  constructor(container){
    this.container = container;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();

    this.colorTarget = new THREE.Color('#7c5cff');
    this.colorCurrent = new THREE.Color('#7c5cff');

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uColor: { value: new THREE.Vector3(0.486, 0.36, 1.0) },
      uVelocity: { value: new THREE.Vector2(0, 0) }
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms
    });
    this.scene.add(new THREE.Mesh(geo, mat));

    this.velocity = new THREE.Vector2(0, 0);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this._tick();
  }

  setColor(hex){
    this.colorTarget.set(hex);
  }

  setVelocity(vx, vy){
    this.velocity.set(vx, vy);
  }

  resize(){
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if(w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    this.uniforms.uResolution.value.set(w, h);
  }

  _tick(){
    requestAnimationFrame(() => this._tick());
    const t = this.clock.getElapsedTime();
    this.uniforms.uTime.value = t;

    this.colorCurrent.lerp(this.colorTarget, 0.08);
    this.uniforms.uColor.value.set(this.colorCurrent.r, this.colorCurrent.g, this.colorCurrent.b);

    this.uniforms.uVelocity.value.lerp(this.velocity, 0.15);
    this.velocity.multiplyScalar(0.9);

    this.renderer.render(this.scene, this.camera);
  }
}
