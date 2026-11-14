import * as THREE from 'three';
import { getProceduralTerrainTexture } from './proceduralAssets';

export const HD2D_FOG_DEFAULTS = {
  color: '#b8d0e0',
  near: 42,
  far: 175,
} as const;

export interface WaterShaderOptions {
  fogColor?: string | number;
  fogNear?: number;
  fogFar?: number;
  normalMap?: THREE.Texture;
}

const WATER_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vFogDepth;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float waveA = sin(pos.x * 0.45 + uTime * 1.9) * 0.045;
    float waveB = cos(pos.z * 0.55 - uTime * 1.5) * 0.035;
    float waveC = sin((pos.x + pos.z) * 0.9 + uTime * 2.4) * 0.02;
    pos.y += waveA + waveB + waveC;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    vFogDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform sampler2D uNormalMap;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vFogDepth;

  void main() {
    vec2 uvA = vWorldPos.xz * 0.055 + vec2(uTime * 0.032, uTime * 0.021);
    vec2 uvB = vWorldPos.xz * 0.085 - vec2(uTime * 0.024, -uTime * 0.029);

    vec3 n1 = texture2D(uNormalMap, uvA).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormalMap, uvB).xyz * 2.0 - 1.0;
    vec3 ripple = normalize(n1 + n2);

    float shimmer = pow(max(0.0, dot(ripple, normalize(vec3(0.25, 0.3, 0.92)))), 14.0);
    float band = sin(vWorldPos.x * 0.6 + vWorldPos.z * 0.4 + uTime * 1.4) * 0.5 + 0.5;
    vec3 baseWater = mix(uDeepColor, uShallowColor, 0.4 + band * 0.35 + ripple.x * 0.15);

    // Shoreline foam edge based on UV border proximity + wave oscillation
    float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float foamWave = sin(vWorldPos.x * 1.4 + vWorldPos.z * 1.2 + uTime * 2.8) * 0.012;
    float foamMask = 1.0 - smoothstep(0.015, 0.065 + foamWave, edgeDist);

    vec3 color = baseWater + vec3(0.55, 0.78, 0.95) * shimmer * 0.55;
    color = mix(color, uFoamColor, clamp(foamMask * 0.82, 0.0, 1.0));

    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

    float alpha = mix(0.86, 0.96, foamMask);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createWaterShaderMaterial(options: WaterShaderOptions = {}): THREE.ShaderMaterial {
  const normalMap = options.normalMap ?? getProceduralTerrainTexture('water_normal', 1);
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color(options.fogColor ?? HD2D_FOG_DEFAULTS.color) },
      uFogNear: { value: options.fogNear ?? HD2D_FOG_DEFAULTS.near },
      uFogFar: { value: options.fogFar ?? HD2D_FOG_DEFAULTS.far },
      uNormalMap: { value: normalMap },
      uShallowColor: { value: new THREE.Color('#2c8cb8') },
      uDeepColor: { value: new THREE.Color('#164d75') },
      uFoamColor: { value: new THREE.Color('#e3f6ff') },
    },
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: WATER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
}

const BILLBOARD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vLocalUv;
  varying float vFogDepth;

  void main() {
    vLocalUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const BILLBOARD_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uUvRect;
  uniform float uFlipX;
  uniform vec3 uAuraColor;
  uniform float uAuraIntensity;
  uniform float uTime;
  uniform float uHitFlash;
  uniform float uAlphaTest;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec2 vLocalUv;
  varying float vFogDepth;

  vec2 toSheetUv(vec2 localUv) {
    float u = uFlipX > 0.5 ? (1.0 - localUv.x) : localUv.x;
    return uUvRect.xy + vec2(u, localUv.y) * uUvRect.zw;
  }

  void main() {
    vec2 sampleUv = toSheetUv(vLocalUv);
    vec4 texel = texture2D(uMap, sampleUv);

    vec2 halfTexel = uUvRect.zw * (0.5 / 32.0);
    vec2 minCell = uUvRect.xy + halfTexel;
    vec2 maxCell = uUvRect.xy + uUvRect.zw - halfTexel;
    vec2 stepUv = uUvRect.zw * (1.0 / 32.0);

    float aL = texture2D(uMap, clamp(sampleUv + vec2(-stepUv.x, 0.0), minCell, maxCell)).a;
    float aR = texture2D(uMap, clamp(sampleUv + vec2(stepUv.x, 0.0), minCell, maxCell)).a;
    float aU = texture2D(uMap, clamp(sampleUv + vec2(0.0, stepUv.y), minCell, maxCell)).a;
    float aD = texture2D(uMap, clamp(sampleUv + vec2(0.0, -stepUv.y), minCell, maxCell)).a;

    float maxNeighborA = max(max(aL, aR), max(aU, aD));
    float minNeighborA = min(min(aL, aR), min(aU, aD));
    float pulse = 0.78 + 0.22 * sin(uTime * 6.5);

    // Outer pixel-crisp rim halo when Shaman fusion or Dragon aura is active
    if (texel.a < uAlphaTest) {
      if (uAuraIntensity > 0.02 && maxNeighborA >= uAlphaTest) {
        vec3 outerAura = uAuraColor * (1.15 * uAuraIntensity * pulse);
        float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
        outerAura = mix(outerAura, uFogColor, clamp(fogFactor * 0.7, 0.0, 1.0));
        gl_FragColor = vec4(outerAura, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        return;
      }
      discard;
    }

    // Soft ground-tinted HD-2D vertical shading (cooler/darker near feet, warm sunlight above)
    vec3 groundTint = mix(vec3(0.82, 0.84, 0.88), vec3(1.05, 1.02, 0.96), clamp(vLocalUv.y, 0.0, 1.0));
    vec3 color = texel.rgb * groundTint;

    // Inner silhouette rim glow for active Shaman fusion
    if (uAuraIntensity > 0.02) {
      float innerEdge = 1.0 - step(uAlphaTest, minNeighborA);
      float rimAmount = clamp(innerEdge * 0.75 + 0.14, 0.0, 0.9) * uAuraIntensity * pulse;
      color = mix(color, uAuraColor * 1.25, rimAmount);
    }

    // Crisp white/crimson damage hit-flash
    if (uHitFlash > 0.001) {
      vec3 flashColor = mix(vec3(1.0, 0.24, 0.24), vec3(1.0, 0.97, 0.92), 0.65);
      color = mix(color, flashColor, clamp(uHitFlash, 0.0, 1.0));
    }

    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    color = mix(color, uFogColor, clamp(fogFactor * 0.85, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createBillboardSpriteMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uUvRect: { value: new THREE.Vector4(0, 0.75, 0.25, 0.25) },
      uFlipX: { value: 0 },
      uAuraColor: { value: new THREE.Color('#ff7029') },
      uAuraIntensity: { value: 0 },
      uTime: { value: 0 },
      uHitFlash: { value: 0 },
      uAlphaTest: { value: 0.45 },
      uFogColor: { value: new THREE.Color(HD2D_FOG_DEFAULTS.color) },
      uFogNear: { value: HD2D_FOG_DEFAULTS.near },
      uFogFar: { value: HD2D_FOG_DEFAULTS.far },
    },
    vertexShader: BILLBOARD_VERTEX_SHADER,
    fragmentShader: BILLBOARD_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: false,
  });
}

export interface BiomeTerrainShaderOptions {
  map?: THREE.Texture;
  primaryColor?: string | number;
  secondaryColor?: string | number;
  hazardCenter?: [number, number] | THREE.Vector2;
  hazardRadius?: number;
  hazardColor?: string | number;
  hazardIntensity?: number;
  fogColor?: string | number;
  fogNear?: number;
  fogFar?: number;
  texScale?: number;
  contourStrength?: number;
}

const BIOME_TERRAIN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vFogDepth;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    vFogDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const BIOME_TERRAIN_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform vec2 uHazardCenter;
  uniform float uHazardRadius;
  uniform vec3 uHazardColor;
  uniform float uHazardIntensity;
  uniform float uTime;
  uniform float uTexScale;
  uniform float uContourStrength;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vFogDepth;

  void main() {
    // Tile base procedural texture in world space so 250m chunks stay crisp
    vec2 worldUv = vWorldPos.xz * uTexScale;
    vec3 texel = texture2D(uMap, worldUv).rgb;
    float texLuma = dot(texel, vec3(0.299, 0.587, 0.114));

    // Broad organic biome macro-variation blending primary and secondary tints
    float macroWave =
      sin(vWorldPos.x * 0.045 + cos(vWorldPos.z * 0.038) * 1.4) * 0.5 + 0.5;
    float microWave =
      cos(vWorldPos.z * 0.09 - vWorldPos.x * 0.07) * 0.5 + 0.5;
    float biomeBlend = clamp(macroWave * 0.65 + microWave * 0.35, 0.0, 1.0);

    vec3 biomeTint = mix(uPrimaryColor, uSecondaryColor, biomeBlend);
    vec3 baseColor = mix(texel * biomeTint * 1.45, biomeTint * (0.65 + texLuma * 0.7), 0.48);

    // Subtle HD-2D contour grid lines every 12.5m (with stronger 25m majors)
    vec2 minorCell = abs(fract(vWorldPos.xz / 12.5 - 0.5) - 0.5) * 12.5;
    float minorDist = min(minorCell.x, minorCell.y);
    float minorLine = 1.0 - smoothstep(0.06, 0.18, minorDist);

    vec2 majorCell = abs(fract(vWorldPos.xz / 25.0 - 0.5) - 0.5) * 25.0;
    float majorDist = min(majorCell.x, majorCell.y);
    float majorLine = 1.0 - smoothstep(0.08, 0.24, majorDist);

    float contourMask = max(minorLine * 0.45, majorLine * 0.9) * uContourStrength;
    baseColor = mix(baseColor, baseColor * 0.72 + uSecondaryColor * 0.22, contourMask);

    // Pulsing environmental hazard ring & zone
    if (uHazardRadius > 0.01 && uHazardIntensity > 0.001) {
      float dist = length(vWorldPos.xz - uHazardCenter);
      float insideZone = 1.0 - smoothstep(uHazardRadius - 1.5, uHazardRadius + 0.5, dist);
      float pulse = 0.75 + 0.25 * sin(uTime * 3.6);
      float ripple = 0.5 + 0.5 * sin(dist * 0.55 - uTime * 3.2);

      // Perimeter warning ring
      float ringDist = abs(dist - uHazardRadius);
      float ringBand = 1.0 - smoothstep(0.35, 1.65, ringDist);
      float ringGlow = ringBand * (0.7 + 0.3 * sin(uTime * 5.0));

      float zoneMix = clamp(
        (insideZone * (0.14 + ripple * 0.14) * pulse + ringGlow * 0.65) * uHazardIntensity,
        0.0,
        0.88
      );
      baseColor = mix(baseColor, uHazardColor * 1.25, zoneMix);
    }

    // Distance-based HD-2D depth fog
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    vec3 finalColor = mix(baseColor, uFogColor, clamp(fogFactor, 0.0, 1.0));

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createBiomeTerrainShaderMaterial(
  options: BiomeTerrainShaderOptions = {},
): THREE.ShaderMaterial {
  const map = options.map ?? getProceduralTerrainTexture('grass_frontier', 1);
  const centerVec =
    options.hazardCenter instanceof THREE.Vector2
      ? options.hazardCenter.clone()
      : new THREE.Vector2(
          options.hazardCenter?.[0] ?? 0,
          options.hazardCenter?.[1] ?? 0,
        );

  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uPrimaryColor: { value: new THREE.Color(options.primaryColor ?? '#5c9449') },
      uSecondaryColor: { value: new THREE.Color(options.secondaryColor ?? '#3f6e39') },
      uHazardCenter: { value: centerVec },
      uHazardRadius: { value: options.hazardRadius ?? 0 },
      uHazardColor: { value: new THREE.Color(options.hazardColor ?? '#ff511a') },
      uHazardIntensity: { value: options.hazardIntensity ?? 0 },
      uTime: { value: 0 },
      uTexScale: { value: options.texScale ?? 0.28 },
      uContourStrength: { value: options.contourStrength ?? 0.28 },
      uFogColor: { value: new THREE.Color(options.fogColor ?? HD2D_FOG_DEFAULTS.color) },
      uFogNear: { value: options.fogNear ?? HD2D_FOG_DEFAULTS.near },
      uFogFar: { value: options.fogFar ?? HD2D_FOG_DEFAULTS.far },
    },
    vertexShader: BIOME_TERRAIN_VERTEX_SHADER,
    fragmentShader: BIOME_TERRAIN_FRAGMENT_SHADER,
    transparent: false,
  });
}
