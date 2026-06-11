import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const gradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uAberration: { value: 0.0015 },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.045 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uGrain;

    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
    }

    void main(){
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float dist = length(center);

      // chromatic aberration grows toward edges + reacts to uAberration
      vec2 dir = normalize(center + 1e-5);
      float amt = uAberration * (0.4 + dist * 1.6);

      float r = texture2D(tDiffuse, uv - dir * amt).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv + dir * amt).b;
      vec3 color = vec3(r, g, b);

      // vignette
      float vig = smoothstep(0.95, 0.25, dist * (1.0 + uVignette));
      color *= mix(1.0 - uVignette * 0.85, 1.0, vig);

      // film grain
      float grain = rand(uv * uResolution.xy + fract(uTime));
      color += (grain - 0.5) * uGrain;

      // subtle scanline shimmer
      float scan = sin(uv.y * uResolution.y * 0.6 + uTime * 4.0) * 0.012;
      color += scan;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export function createPostFX(renderer, scene, camera, width, height){
  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.45, 0.78);
  composer.addPass(bloomPass);

  const gradePass = new ShaderPass(gradeShader);
  gradePass.uniforms.uResolution.value.set(width, height);
  composer.addPass(gradePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return { composer, bloomPass, gradePass };
}
