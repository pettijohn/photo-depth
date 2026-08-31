export const FULLSCREEN_VERTEX = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 position = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  v_uv = position;
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}`;

export const KAWASE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_source;
uniform vec2 u_texel;
void main() {
  vec2 offset = u_texel * 1.5;
  vec4 color = texture(u_source, v_uv) * 0.2;
  color += texture(u_source, v_uv + vec2(offset.x, offset.y)) * 0.2;
  color += texture(u_source, v_uv + vec2(-offset.x, offset.y)) * 0.2;
  color += texture(u_source, v_uv + vec2(offset.x, -offset.y)) * 0.2;
  color += texture(u_source, v_uv - offset) * 0.2;
  outColor = color;
}`;

export const COMPOSE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_photo;
uniform sampler2D u_depth;
uniform sampler2D u_blur1;
uniform sampler2D u_blur2;
uniform sampler2D u_blur3;
uniform sampler2D u_blur4;
uniform sampler2D u_blur5;
uniform float u_foregroundCutoff;
uniform float u_backgroundCutoff;
uniform float u_foregroundSoftness;
uniform float u_backgroundSoftness;
uniform float u_blurStrength;

vec4 blurAt(float level) {
  vec4 a;
  vec4 b;
  if (level < 1.0) { a = texture(u_photo, v_uv); b = texture(u_blur1, v_uv); }
  else if (level < 2.0) { a = texture(u_blur1, v_uv); b = texture(u_blur2, v_uv); }
  else if (level < 3.0) { a = texture(u_blur2, v_uv); b = texture(u_blur3, v_uv); }
  else if (level < 4.0) { a = texture(u_blur3, v_uv); b = texture(u_blur4, v_uv); }
  else { a = texture(u_blur4, v_uv); b = texture(u_blur5, v_uv); }
  return mix(a, b, fract(level));
}

void main() {
  float depth = texture(u_depth, v_uv).r;
  float foregroundHalf = u_foregroundSoftness * 0.5;
  float backgroundHalf = u_backgroundSoftness * 0.5;
  float foreground = smoothstep(u_foregroundCutoff - foregroundHalf, u_foregroundCutoff + foregroundHalf, depth);
  float background = 1.0 - smoothstep(u_backgroundCutoff - backgroundHalf, u_backgroundCutoff + backgroundHalf, depth);
  float sharpness = clamp(foreground * background, 0.0, 1.0);
  float distanceAmount = 0.0;
  if (depth < u_foregroundCutoff) {
    distanceAmount = (u_foregroundCutoff - depth) / max(u_foregroundCutoff, 0.000001);
  } else if (depth > u_backgroundCutoff) {
    distanceAmount = (depth - u_backgroundCutoff) / max(1.0 - u_backgroundCutoff, 0.000001);
  }
  float transitionScale = depth <= u_foregroundCutoff ? u_foregroundSoftness : u_backgroundSoftness;
  float influence = max(clamp(distanceAmount, 0.0, 1.0), (1.0 - sharpness) * transitionScale);
  float level = clamp(u_blurStrength, 0.0, 1.0) * influence * 5.0;
  outColor = blurAt(level);
}`;
