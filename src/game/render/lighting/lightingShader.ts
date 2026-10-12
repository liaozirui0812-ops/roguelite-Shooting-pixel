export const LIGHTING_VERTEX = `
attribute vec2 aQuad;
uniform vec2 uResolution;
uniform vec4 uSlot;
uniform vec4 uDest;
uniform vec4 uSource;
uniform float uFlip;
varying vec2 vLocal;
varying vec2 vUV;
varying vec2 vScreen;
void main() {
  vLocal = aQuad;
  vUV = uSource.xy + aQuad * uSource.zw;
  vScreen = uDest.xy + vec2(mix(aQuad.x, 1.0-aQuad.x, uFlip), aQuad.y) * uDest.zw;
  vec2 p = uSlot.xy + aQuad * uSlot.zw;
  gl_Position = vec4(p.x/uResolution.x*2.0-1.0, 1.0-p.y/uResolution.y*2.0, 0, 1);
}`;

export const LIGHTING_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uColor;
uniform sampler2D uNormal;
uniform vec4 uNormalRect;
uniform vec4 uBounds;
uniform vec4 uSource;
uniform vec2 uTexel;
uniform vec2 uLight;
uniform vec2 uRadii;
uniform vec2 uAspect;
uniform vec3 uAmbient;
uniform vec3 uDirect;
uniform float uHeight;
uniform float uExponent;
uniform float uFloor;
uniform float uStrength;
uniform float uRim;
uniform float uLevels;
uniform float uFlip;
varying vec2 vLocal;
varying vec2 vUV;
varying vec2 vScreen;
void main() {
  vec4 color = texture2D(uColor, vUV);
  if (color.a < 0.001) discard;
  vec2 nuv = clamp((vLocal - uBounds.xy) / uBounds.zw, 0.0, 1.0);
  vec3 n = texture2D(uNormal, uNormalRect.xy + nuv*uNormalRect.zw).rgb * 2.0 - 1.0;
  if (uRim > 0.0) {
    vec2 low = uSource.xy + uTexel * 0.5;
    vec2 high = uSource.xy + uSource.zw - uTexel * 0.5;
    float l = texture2D(uColor, clamp(vUV-vec2(uTexel.x,0),low,high)).a;
    float r = texture2D(uColor, clamp(vUV+vec2(uTexel.x,0),low,high)).a;
    float t = texture2D(uColor, clamp(vUV-vec2(0,uTexel.y),low,high)).a;
    float b = texture2D(uColor, clamp(vUV+vec2(0,uTexel.y),low,high)).a;
    n.xy += vec2(l-r,t-b)*uRim;
  }
  n.xy *= uAspect;
  n.x *= mix(1.0,-1.0,uFlip);
  n = normalize(n);
  vec2 delta = uLight - vScreen;
  float t = clamp((length(delta)-uRadii.x)/(uRadii.y-uRadii.x),0.0,1.0);
  float a = pow(1.0-t,uExponent);
  if (uLevels > 1.0) a = floor(a*(uLevels-1.0)+0.5)/(uLevels-1.0);
  float diffuse = max(dot(n,normalize(vec3(delta,uHeight))),0.0);
  float response = mix(1.0,diffuse,uStrength);
  vec3 base = clamp(uAmbient+uDirect*a,vec3(uFloor),vec3(1));
  vec3 total = clamp(uAmbient+uDirect*a*response,vec3(uFloor),vec3(1));
  // Canvas receives premultiplied RGBA. The global base multiplier is applied exactly once later.
  gl_FragColor = vec4(color.rgb*(total/base)*color.a,color.a);
}`;
