import * as THREE from 'three';
import { noise3D } from '../shaders/noise.js';

/**
 * Physically-based "liquid glass" material: iridescent clearcoat + env reflections,
 * with vertex displacement injected via onBeforeCompile so the surface breathes
 * over time without needing a custom shader pipeline (keeps PBR lighting/env intact).
 */
export function createGlassMaterial({ color = '#ffffff', envMap, iridescence = 1, displaceAmp = 0.18, displaceFreq = 1.0, speed = 0.15 } = {}){
  const material = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.25,
    roughness: 0.28,
    transmission: 0.0,
    iridescence,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [100, 500],
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    envMap,
    envMapIntensity: 1.1,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1
  });

  material.userData.uniforms = { uTime: { value: 0 } };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = material.userData.uniforms.uTime;
    shader.vertexShader = `
      uniform float uTime;
      ${noise3D}
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float n = fbm(position * ${displaceFreq.toFixed(3)} + uTime * ${speed.toFixed(3)});
      transformed += normal * n * ${displaceAmp.toFixed(3)};`
    );
    material.userData.shader = shader;
  };

  return material;
}

/**
 * Bright emissive "energy" material for the contact convergence core — feeds the bloom pass.
 */
export function createEnergyMaterial({ color = '#ffffff' } = {}){
  const material = new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: true,
    opacity: 1
  });
  return material;
}

/**
 * Smoothly fades a group of materials toward a target opacity — used to keep
 * only the set piece nearest the active section sharp/bright, so the world
 * reads as one continuous space rather than everything visible at once.
 */
export function applyFocus(materials, focus, dim = 0.12){
  const target = dim + (1 - dim) * THREE.MathUtils.clamp(focus, 0, 1);
  materials.forEach((m) => {
    if(m.opacity === undefined) return;
    m.opacity = THREE.MathUtils.lerp(m.opacity, target, 0.06);
  });
}
