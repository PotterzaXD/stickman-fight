import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Fighter, Snowman, type Projectile } from '../game/entities';
import type { Game } from '../game/game';
import { THEMES } from '../game/maps';
import { swingArm, walkLegs } from '../game/toys';
import type { MapDef, Platform } from '../game/types';

/*
 * 3D mode's picture of a normal match. The game itself is exactly the same as 2D; only the drawing changes.
 *
 * The camera is the 2D camera: an orthographic camera looking straight at the scene, with the same centre and
 * zoom as the 2D view (world y goes down, three's y goes up, so y is flipped). Nothing about the point of view
 * changes. What changes is the models: round shiny heads with eyes that blink and look around, round limbs,
 * thick rounded platforms, real shadows, 3D weapons and 3D shots.
 *
 * Depth: stickmen stand at z = 0, platforms are boxes behind them (front face at z = -8), clouds far behind.
 */

const PLAT_DEPTH = 150;
const PLAT_FRONT = -8;
/** Stickmen, helpers and shots stand a little in front of the platforms, so their shadows fall on them. */
const FRONT = 34;

/** Colour helpers */
const col = (c: string) => new THREE.Color(c);

interface Rig {
  root: THREE.Group;
  head: THREE.Mesh;
  eyes: THREE.Group;
  pupils: THREE.Mesh[];
  lids: THREE.Mesh[];
  bones: THREE.Mesh[];
  joints: THREE.Mesh[];
  mat: THREE.MeshStandardMaterial;
  weapons: { group: THREE.Group; key: string }[];
  shield: THREE.Mesh;
  color: string;
}

interface SnowRig {
  root: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  scarf: THREE.MeshStandardMaterial;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

export class Renderer3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000);
  private sun: THREE.DirectionalLight;
  private world = new THREE.Group();
  private actors = new THREE.Group();
  private mapRef: MapDef | null = null;
  private plats: THREE.Group[] = [];
  private deco = new THREE.Group();
  private rigs = new Map<Fighter, Rig>();
  private snows = new Map<Snowman, SnowRig>();
  private shots = new Map<Projectile, THREE.Object3D>();
  private balls: THREE.Mesh[] = [];
  private bits: THREE.InstancedMesh;
  // Shared pieces
  private geo = makeGeos();
  private mats = makeMats();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(this.world);
    this.actors.position.z = FRONT;
    this.world.add(this.actors);
    this.world.add(this.deco);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8d8d99', 1.5));
    this.sun = new THREE.DirectionalLight('#ffffff', 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);
    this.bits = new THREE.InstancedMesh(this.geo.box, new THREE.MeshStandardMaterial({ roughness: 0.6 }), 800);
    this.bits.count = 0;
    this.bits.frustumCulled = false;
    this.actors.add(this.bits);
  }

  /** Same camera as the 2D game: centre (cam.x, cam.y) shifted by the shake, `zoom` world pixels per screen pixel. */
  render(g: Game, vw: number, vh: number, dpr: number, z: number, sx: number, sy: number) {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(vw, vh, false);
    if (this.mapRef !== g.map) this.buildMap(g.map);
    const cx = g.cam.x - sx / z;
    const cy = g.cam.y - sy / z;
    const cam = this.camera;
    cam.left = -vw / 2 / z;
    cam.right = vw / 2 / z;
    cam.top = vh / 2 / z;
    cam.bottom = -vh / 2 / z;
    cam.position.set(cx, -cy, 1000);
    cam.updateProjectionMatrix();
    // The sun: up and to the left, a little in front, so stickmen throw soft shadows on the platforms behind them.
    const hw = vw / 2 / z + 200;
    const hh = vh / 2 / z + 200;
    this.sun.position.set(cx - 260, -cy + 520, 700);
    this.sun.target.position.set(cx, -cy, 0);
    const sc = this.sun.shadow.camera;
    sc.left = -hw - 300;
    sc.right = hw + 300;
    sc.top = hh + 300;
    sc.bottom = -hh - 300;
    sc.near = 1;
    sc.far = 2400;
    sc.updateProjectionMatrix();
    this.updatePlatforms(g);
    this.updateFighters(g);
    this.updateSnowmen(g);
    this.updateShots(g);
    this.updateBalls(g);
    this.updateBits(g);
    this.updateDeco(cx);
    this.renderer.render(this.scene, cam);
  }

  dispose() {
    this.renderer.dispose();
  }

  // ---------- the map ----------

  private buildMap(map: MapDef) {
    for (const p of this.plats) this.world.remove(p);
    this.plats = [];
    this.mapRef = map;
    const th = THEMES[map.theme];
    // The sky stays a soft gradient (it is far away), behind the 3D world.
    this.scene.background = skyTexture(th.sky[0], th.sky[1]);
    for (const p of map.platforms) {
      const grp = platformMesh(p, th.plat, th.top);
      this.plats.push(grp);
      this.world.add(grp);
    }
    // Clouds (round and puffy) or stars, far behind.
    this.deco.clear();
    const night = th.deco === 'stars' || th.deco === 'space';
    if (night) {
      const pts: number[] = [];
      for (let i = 0; i < 160; i++) pts.push((i * 997) % (map.w + 1200) - 600, -((i * 571) % (map.h + 400)) + 200, -900);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this.deco.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 3 })));
    } else {
      for (let i = 0; i < 7; i++) {
        const c = new THREE.Group();
        const n = 4 + (i % 3);
        for (let k = 0; k < n; k++) {
          const m = new THREE.Mesh(this.geo.sphere, this.mats.cloud);
          const r = 26 + ((i * 7 + k * 13) % 20);
          m.scale.set(r, r * 0.85, r * 0.8);
          m.position.set(k * 30 - n * 15, (k % 2) * 14, 0);
          c.add(m);
        }
        c.position.set((i / 7) * (map.w + 600) - 300, -(80 + ((i * 131) % Math.max(200, map.h * 0.45))), -700 - (i % 3) * 60);
        c.userData.speed = 6 + (i % 4) * 3;
        this.deco.add(c);
      }
      // The sun
      if (map.theme === 'day' || map.theme === 'snow' || map.theme === 'sunset' || map.theme === 'beach') {
        const s = new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: map.theme === 'sunset' ? '#ffab40' : '#fff59d' }));
        s.scale.setScalar(60);
        s.position.set(map.w * 0.82, -90, -1000);
        this.deco.add(s);
      }
    }
  }

  private updateDeco(cx: number) {
    for (const c of this.deco.children) {
      if (!c.userData.speed) continue;
      c.position.x += c.userData.speed / 60;
      if (c.position.x > cx + 2000) c.position.x -= 4000;
    }
  }

  private updatePlatforms(g: Game) {
    g.map.platforms.forEach((p, i) => {
      const m = this.plats[i];
      if (!m) return;
      m.position.set(p.x + p.w / 2, -(p.y + p.h / 2), PLAT_FRONT - PLAT_DEPTH / 2);
      m.visible = !(g.glassT[i] > 0);
    });
  }

  // ---------- stickmen ----------

  private rig(f: Fighter): Rig {
    let r = this.rigs.get(f);
    if (r && r.color === f.color) return r;
    if (r) this.actors.remove(r.root);
    const mat = new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.38, metalness: 0.05 });
    const root = new THREE.Group();
    const bones: THREE.Mesh[] = [];
    const joints: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(this.geo.cyl, mat);
      b.castShadow = true;
      bones.push(b);
      root.add(b);
    }
    for (let i = 0; i < 9; i++) {
      const j = new THREE.Mesh(this.geo.smallSphere, mat);
      j.castShadow = true;
      joints.push(j);
      root.add(j);
    }
    const head = new THREE.Mesh(this.geo.sphere, mat);
    head.castShadow = true;
    root.add(head);
    // Two eyes on the front of the head, turned toward where it faces.
    const eyes = new THREE.Group();
    const pupils: THREE.Mesh[] = [];
    const lids: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const e = new THREE.Mesh(this.geo.smallSphere, this.mats.white);
      e.scale.set(0.27, 0.32, 0.18);
      e.position.set(side * 0.33, 0.12, 0.88);
      eyes.add(e);
      const p = new THREE.Mesh(this.geo.smallSphere, this.mats.black);
      p.scale.set(0.14, 0.17, 0.1);
      p.position.set(side * 0.33, 0.12, 1.0);
      eyes.add(p);
      pupils.push(p);
      const lid = new THREE.Mesh(this.geo.smallSphere, mat);
      lid.scale.set(0.3, 0.05, 0.2);
      lid.position.set(side * 0.33, 0.12, 0.92);
      lid.visible = false;
      eyes.add(lid);
      lids.push(lid);
    }
    root.add(eyes);
    const shield = new THREE.Mesh(this.geo.sphere, this.mats.shield);
    shield.visible = false;
    root.add(shield);
    r = { root, head, eyes, pupils, lids, bones, joints, mat, weapons: [], shield, color: f.color };
    this.rigs.set(f, r);
    this.actors.add(root);
    return r;
  }

  private updateFighters(g: Game) {
    for (const [f, r] of this.rigs) if (!g.fighters.includes(f)) {
      this.actors.remove(r.root);
      this.rigs.delete(f);
    }
    for (const f of g.fighters) {
      const r = this.rig(f);
      r.root.visible = f.alive;
      if (!f.alive) continue;
      this.pose(g, f, r);
    }
  }

  /** The 2D stickman's pose (same joints), built out of round 3D pieces. */
  private pose(g: Game, f: Fighter, r: Rig) {
    const s = f.scale;
    const { x, y } = f;
    const d = f.facing || 1;
    const pace = f.onGround && Math.abs(f.vx) > 20 ? Math.abs(f.vx) / f.speed : 0;
    const walk = walkLegs(x, y, s, f.walkPhase * d, pace, d);
    const legs = f.onGround
      ? walk.legs
      : [
          { foot: { x: x - d * 10 * s, y: y - 4 * s }, knee: { x: x - d * 2 * s, y: y - 16 * s } },
          { foot: { x: x + d * 6 * s, y: y - 12 * s }, knee: { x: x + d * 12 * s, y: y - 24 * s } },
        ];
    // Breathing: the body rises and falls a tiny bit when standing still.
    const breath = pace ? 0 : Math.sin(g.time * 2.4 + f.id) * 0.8 * s;
    const hip = f.onGround ? { x: walk.hip.x, y: walk.hip.y } : { x, y: y - 34 * s };
    const neck = { x, y: y - 62 * s + breath };
    const head = { x, y: y - 73 * s + breath };
    const sh = f.shoulder();
    const hands = f.weapons.map((_, i) => f.hand(i));
    const arm = swingArm(sh, s, f.walkPhase * d, pace, d);
    const back = f.weapons.length > 1 ? hands[1] : pace > 0 ? arm : { x: x - d * 3 * s, y: y - 36 * s };
    const segs: [{ x: number; y: number }, { x: number; y: number }][] = [
      [legs[0].foot, legs[0].knee],
      [legs[0].knee, hip],
      [legs[1].foot, legs[1].knee],
      [legs[1].knee, hip],
      [hip, neck],
      [sh, back],
      [sh, hands[0]],
    ];
    const rad = 2.7 * s;
    segs.forEach(([a, b], i) => bone(r.bones[i], a, b, rad, i === 0 || i === 1 ? 1.5 : i === 2 || i === 3 ? -1.5 : 0));
    const js = [legs[0].foot, legs[0].knee, legs[1].foot, legs[1].knee, hip, neck, sh, back, hands[0]];
    js.forEach((p, i) => {
      const m = r.joints[i];
      m.position.set(p.x, -p.y, i < 2 ? 1.5 : i < 4 ? -1.5 : 0);
      m.scale.setScalar(rad * (i === 0 || i === 2 ? 1.25 : 1.05));
    });
    // The head: a shiny ball. The eyes turn the way it is looking and blink now and then.
    const hr = 11 * s;
    r.head.position.set(head.x, -head.y, 0);
    r.head.scale.setScalar(hr);
    r.eyes.position.copy(r.head.position);
    r.eyes.scale.setScalar(hr);
    const aim = f.angles[0];
    const lookX = Math.cos(aim) * 0.06;
    const lookY = -Math.sin(aim) * 0.05;
    r.eyes.rotation.set(0, d * 0.75, 0);
    r.pupils.forEach((p, i) => p.position.set((i ? 1 : -1) * 0.33 + lookX * d, 0.12 + lookY, 1.0));
    const blink = (g.time + f.id * 1.37) % 3.6 < 0.13 || f.stun > 0.25;
    r.lids.forEach((l) => (l.visible = blink));
    r.pupils.forEach((p) => (p.visible = !blink));
    // Hurt: a white flash. Frozen: icy blue.
    r.mat.emissive.set(f.hurtFlash > 0 ? '#ffffff' : f.frozenT > 0 ? '#4fc3f7' : '#000000');
    r.mat.emissiveIntensity = f.hurtFlash > 0 ? 0.45 : f.frozenT > 0 ? 0.5 : 0;
    // Weapons
    while (r.weapons.length < f.weapons.length) {
      const grp = new THREE.Group();
      r.root.add(grp);
      r.weapons.push({ group: grp, key: '' });
    }
    r.weapons.forEach((w, i) => {
      const def = f.weapons[i];
      w.group.visible = !!def;
      if (!def) return;
      const ready = f.cds[i] <= 0 && !f.boomerangOut[i];
      const len = f.reach(i);
      const key = `${def.id}|${Math.round(len)}|${ready ? 1 : 0}|${s}`;
      if (w.key !== key) {
        disposeChildren(w.group);
        w.group.add(weaponMesh(def.id, len, s, ready, this.mats, this.geo));
        w.key = key;
      }
      w.group.position.set(hands[i].x, -hands[i].y, 3);
      w.group.rotation.set(0, 0, -f.angles[i]);
      // Keep blades the right way up when aiming left.
      w.group.scale.set(1, Math.cos(f.angles[i]) < 0 ? -1 : 1, 1);
    });
    // Shield bubble
    r.shield.visible = f.shielding;
    if (f.shielding) {
      r.shield.position.set(x, -(f.cy - 4 * s), 0);
      r.shield.scale.setScalar(f.h * 0.62);
      this.mats.shield.opacity = 0.12 + 0.25 * (f.shieldHp / 200);
    }
  }

  private updateSnowmen(g: Game) {
    for (const [m, r] of this.snows) if (!g.snowmen.includes(m) || !m.alive) {
      this.actors.remove(r.root);
      this.snows.delete(m);
    }
    for (const m of g.snowmen) {
      if (!m.alive) continue;
      let r = this.snows.get(m);
      if (!r) {
        const root = new THREE.Group();
        const mat = this.mats.snow.clone();
        for (const [yy, rr] of [[14, 15], [36, 12], [52, 9]]) {
          const b = new THREE.Mesh(this.geo.sphere, mat);
          b.position.set(0, yy, 0);
          b.scale.setScalar(rr);
          b.castShadow = true;
          root.add(b);
        }
        const scarf = new THREE.MeshStandardMaterial({ color: m.owner.color, roughness: 0.6 });
        const sc = new THREE.Mesh(this.geo.cyl, scarf);
        sc.scale.set(10, 4, 10);
        sc.position.set(0, 44, 0);
        root.add(sc);
        const nose = new THREE.Mesh(this.geo.cone, this.mats.carrot);
        nose.scale.set(2.2, 9, 2.2);
        nose.rotation.z = -Math.PI / 2;
        nose.position.set(6, 52, 6);
        root.add(nose);
        for (const side of [-1, 1]) {
          const e = new THREE.Mesh(this.geo.smallSphere, this.mats.black);
          e.scale.setScalar(1.6);
          e.position.set(2 + side * 3.5, 55, 8);
          root.add(e);
        }
        r = { root, mat, scarf };
        this.snows.set(m, r);
        this.actors.add(root);
      }
      r.root.position.set(m.x, -m.y, 0);
      r.root.rotation.y = (m.facing || 1) * 0.5;
      r.mat.emissive.set(m.hurtFlash > 0 ? '#ffffff' : '#000000');
      r.mat.emissiveIntensity = m.hurtFlash > 0 ? 0.6 : 0;
    }
  }

  // ---------- shots ----------

  private updateShots(g: Game) {
    for (const [p, o] of this.shots) if (!g.projectiles.includes(p)) {
      this.actors.remove(o);
      this.shots.delete(p);
    }
    for (const p of g.projectiles) {
      let o = this.shots.get(p);
      if (!o) {
        o = shotMesh(p, this.mats, this.geo);
        this.shots.set(p, o);
        this.actors.add(o);
      }
      o.position.set(p.x, -p.y, 4);
      if (p.kind === 'arrow' || p.kind === 'laser' || p.kind === 'dart') o.rotation.set(0, 0, -Math.atan2(p.vy, p.vx));
      else if (p.kind === 'boomerang' || p.kind === 'shuriken') o.rotation.set(0.4, 0, -p.t * 18);
      else o.rotation.set(p.t * 3, p.t * 5, 0);
    }
  }

  /** Snowballs lying on the ground (step on one and you fly). */
  private updateBalls(g: Game) {
    while (this.balls.length < g.groundBalls.length) {
      const m = new THREE.Mesh(this.geo.sphere, this.mats.snow);
      m.castShadow = true;
      this.balls.push(m);
      this.actors.add(m);
    }
    this.balls.forEach((m, i) => {
      const b = g.groundBalls[i];
      m.visible = !!b && !(b.life < 1.5 && Math.floor(b.life * 8) % 2 === 0);
      if (!b) return;
      m.position.set(b.x, -(b.y - 11), 0);
      m.scale.setScalar(12);
    });
  }

  /** Bits flying off hits: little 3D cubes. */
  private updateBits(g: Game) {
    const n = Math.min(800, g.particles.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const p = g.particles[i];
      const k = Math.max(0, p.life / p.max);
      const sz = p.size * (0.4 + 0.6 * k);
      m.makeRotationFromEuler(new THREE.Euler(p.life * 7, p.life * 5, 0));
      m.scale(tmpA.set(sz, sz, sz));
      m.setPosition(p.x, -p.y, 10);
      this.bits.setMatrixAt(i, m);
      this.bits.setColorAt(i, c.set(p.color));
    }
    this.bits.count = n;
    this.bits.instanceMatrix.needsUpdate = true;
    if (this.bits.instanceColor) this.bits.instanceColor.needsUpdate = true;
  }
}

/** Point a unit cylinder from a to b (2D world points), radius r, at depth z. */
function bone(m: THREE.Mesh, a: { x: number; y: number }, b: { x: number; y: number }, r: number, z: number) {
  tmpA.set(a.x, -a.y, z);
  tmpB.set(b.x, -b.y, z);
  const len = tmpA.distanceTo(tmpB) || 0.001;
  m.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
  tmpB.sub(tmpA).normalize();
  tmpQ.setFromUnitVectors(UP, tmpB);
  m.quaternion.copy(tmpQ);
  m.scale.set(r, len, r);
}

function disposeChildren(g: THREE.Group) {
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.own) o.geometry.dispose();
    });
  }
}

function skyTexture(top: string, bottom: string) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Earth for normal platforms: darker toward the bottom, with little stones. */
const dirtCache = new Map<string, THREE.CanvasTexture>();
function dirtTexture(base: string, w: number, h: number) {
  let tex = dirtCache.get(base);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const gr = ctx.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, base);
    gr.addColorStop(1, shade(base, -0.35));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 64);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rnd() < 0.5 ? shade(base, -0.2) : shade(base, 0.15);
      ctx.beginPath();
      ctx.ellipse(rnd() * 128, rnd() * 64, 2 + rnd() * 4, 1.5 + rnd() * 2.5, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    dirtCache.set(base, tex);
  }
  const t = tex.clone();
  t.repeat.set(Math.max(1, Math.round(w / Math.max(60, h * 2))), 1);
  t.needsUpdate = true;
  return t;
}

/** Lighter (amount > 0) or darker (amount < 0). */
function shade(c: string, amount: number) {
  const k = new THREE.Color(c);
  return amount >= 0 ? '#' + k.lerp(new THREE.Color('#ffffff'), amount).getHexString() : '#' + k.multiplyScalar(1 + amount).getHexString();
}

/** A platform: a thick rounded block with its top colour as a slab on top. Special blocks get their own look. */
function platformMesh(p: Platform, plat: string, top: string): THREE.Group {
  const grp = new THREE.Group();
  const kind = p.kind;
  const base =
    kind === 'concrete' ? '#9e9e9e'
    : kind === 'lava' ? '#ff5722'
    : kind === 'glass' ? '#b3e5fc'
    : kind === 'sandbag' ? '#c8a165'
    : kind === 'bounce' ? '#ec407a'
    : kind === 'ice' ? '#e1f5fe'
    : kind === 'spikes' ? '#78909c'
    : kind === 'wall' ? '#8d6e63'
    : plat;
  const mat = new THREE.MeshStandardMaterial({
    color: kind ? base : '#ffffff',
    map: kind ? null : dirtTexture(base, p.w, p.h),
    roughness: kind === 'ice' || kind === 'glass' ? 0.1 : 0.8,
    metalness: kind === 'concrete' ? 0.1 : 0,
    transparent: kind === 'glass',
    opacity: kind === 'glass' ? 0.55 : 1,
    emissive: kind === 'lava' ? col('#ff3d00') : col('#000000'),
    emissiveIntensity: kind === 'lava' ? 0.6 : 0,
  });
  const radius = Math.min(8, p.h / 2.2, p.w / 4);
  const body = new THREE.Mesh(new RoundedBoxGeometry(p.w, p.h, PLAT_DEPTH, 3, radius), mat);
  body.receiveShadow = true;
  body.castShadow = true;
  grp.add(body);
  if (!kind) {
    // The grass (or snow) on top, a little thicker at the front edge.
    const slab = new THREE.Mesh(new RoundedBoxGeometry(p.w + 4, Math.min(10, p.h * 0.45), PLAT_DEPTH + 4, 3, 3), new THREE.MeshStandardMaterial({ color: top, roughness: 0.75 }));
    slab.position.y = p.h / 2 - Math.min(10, p.h * 0.45) / 2 + 1;
    slab.receiveShadow = true;
    grp.add(slab);
  }
  if (kind === 'spikes') {
    const n = Math.max(2, Math.floor(p.w / 20));
    const mat2 = new THREE.MeshStandardMaterial({ color: '#cfd8dc', metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(8, 18, 10), mat2);
      c.position.set(-p.w / 2 + (i + 0.5) * (p.w / n), p.h / 2 + 9, PLAT_DEPTH / 2 - 10);
      c.castShadow = true;
      grp.add(c);
    }
  }
  return grp;
}

function makeGeos() {
  return {
    sphere: new THREE.SphereGeometry(1, 28, 20),
    smallSphere: new THREE.SphereGeometry(1, 14, 10),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
    box: new THREE.BoxGeometry(1, 1, 1),
    cone: new THREE.ConeGeometry(1, 1, 14),
  };
}

function makeMats() {
  return {
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }),
    black: new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.2 }),
    steel: new THREE.MeshStandardMaterial({ color: '#dfe6ea', roughness: 0.18, metalness: 0.75 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: '#616161', roughness: 0.4, metalness: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ color: '#8d6e63', roughness: 0.7 }),
    darkWood: new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: '#fbc02d', roughness: 0.3, metalness: 0.6 }),
    snow: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }),
    carrot: new THREE.MeshStandardMaterial({ color: '#ff7043', roughness: 0.5 }),
    shield: new THREE.MeshStandardMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false }),
    boomer: new THREE.MeshStandardMaterial({ color: '#ffb300', roughness: 0.45 }),
    string: new THREE.MeshBasicMaterial({ color: '#eeeeee' }),
    cloud: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }),
  };
}

type Mats = ReturnType<typeof makeMats>;
type Geos = ReturnType<typeof makeGeos>;

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, own = false) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  if (own) m.userData.own = true;
  return m;
}

/** The release-day weapons in 3D (hand at the origin, pointing along +x). Anything else gets a plain stick. */
function weaponMesh(id: string, len: number, s: number, ready: boolean, mats: Mats, geo: Geos): THREE.Group {
  const g = new THREE.Group();
  const add = (m: THREE.Mesh, x: number, y: number, z: number, sx: number, sy: number, sz: number, rz = 0) => {
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.z = rz;
    g.add(m);
    return m;
  };
  const shaft = (from: number, to: number, r: number, mat: THREE.Material) => add(mesh(geo.cyl, mat), (from + to) / 2, 0, 0, r, to - from, r, Math.PI / 2);
  switch (id) {
    case 'sword': {
      add(mesh(geo.box, mats.darkWood), 4 * s, 0, 0, 12 * s, 6 * s, 6 * s);
      add(mesh(geo.box, mats.gold), 10 * s, 0, 0, 4 * s, 18 * s, 7 * s);
      add(mesh(geo.box, mats.steel), (12 * s + len - 8 * s) / 2, 0, 0, len - 20 * s, 7 * s, 2.4 * s);
      const tip = add(mesh(geo.cone, mats.steel), len - 5 * s, 0, 0, 3.5 * s, 10 * s, 1.2 * s, -Math.PI / 2);
      tip.scale.z = 1.2 * s;
      break;
    }
    case 'spear':
      shaft(-8 * s, len - 14 * s, 2 * s, mats.wood);
      add(mesh(geo.cone, mats.steel), len - 9 * s, 0, 0, 6 * s, 18 * s, 6 * s, -Math.PI / 2);
      break;
    case 'hammer':
      shaft(-4 * s, len - 10 * s, 2.5 * s, mats.wood);
      add(mesh(new RoundedBoxGeometry(22, 32, 22, 2, 4), mats.darkSteel, true), len - 5 * s, 0, 0, s, s, s);
      break;
    case 'bow': {
      const arc = mesh(new THREE.TorusGeometry(24 * s, 2 * s, 8, 24, 2.3), mats.darkWood, true);
      arc.position.set(-6 * s, 0, 0);
      arc.rotation.z = -1.15;
      g.add(arc);
      const a = { x: -6 * s + Math.cos(1.15) * 24 * s, y: Math.sin(1.15) * 24 * s };
      add(mesh(geo.cyl, mats.string), a.x, 0, 0, 0.5 * s, a.y * 2, 0.5 * s);
      if (ready) {
        shaft(4 * s, len, 1.2 * s, mats.darkWood);
        add(mesh(geo.cone, mats.darkSteel), len + 2 * s, 0, 0, 3 * s, 8 * s, 3 * s, -Math.PI / 2);
      }
      break;
    }
    case 'boomerang':
      if (ready) g.add(boomerang(14 * s, s, mats, geo));
      break;
    case 'bomb':
      if (ready) g.add(bomb(12 * s, 10 * s, mats, geo));
      break;
    case 'katana': {
      shaft(-4 * s, 14 * s, 2.6 * s, mats.black);
      add(mesh(geo.cyl, mats.gold), 14 * s, 0, 0, 7 * s, 2 * s, 7 * s, Math.PI / 2);
      // A gently curved blade.
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(16 * s, 0, 0), new THREE.Vector3(len * 0.6, 4 * s, 0), new THREE.Vector3(len, 9 * s, 0));
      g.add(mesh(new THREE.TubeGeometry(curve, 16, 1.8 * s, 6), mats.steel, true));
      break;
    }
    case 'snowball':
      if (ready) add(mesh(geo.sphere, mats.snow), 10 * s, 0, 0, 9 * s, 9 * s, 9 * s);
      break;
    default:
      shaft(-4 * s, len, 2.4 * s, mats.wood);
  }
  return g;
}

function boomerang(x: number, s: number, mats: Mats, geo: Geos) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const m = mesh(geo.box, mats.boomer);
    m.scale.set(22 * s, 6 * s, 3 * s);
    m.position.set(x + 6 * s, side * 6 * s, 0);
    m.rotation.z = side * 0.6;
    g.add(m);
  }
  return g;
}

function bomb(x: number, r: number, mats: Mats, geo: Geos) {
  const g = new THREE.Group();
  const b = mesh(geo.sphere, mats.black);
  b.scale.setScalar(r);
  b.position.set(x, 0, 0);
  g.add(b);
  const f = mesh(geo.cyl, mats.wood);
  f.scale.set(r * 0.15, r * 0.6, r * 0.15);
  f.position.set(x + r * 0.5, r * 0.9, 0);
  f.rotation.z = -0.5;
  g.add(f);
  return g;
}

/** A flying shot. */
function shotMesh(p: Projectile, mats: Mats, geo: Geos): THREE.Object3D {
  const g = new THREE.Group();
  const s = p.scale || 1;
  switch (p.kind) {
    case 'arrow': {
      const sh = mesh(geo.cyl, mats.darkWood);
      sh.scale.set(1.3, 34, 1.3);
      sh.rotation.z = Math.PI / 2;
      g.add(sh);
      const tip = mesh(geo.cone, mats.darkSteel);
      tip.scale.set(3.5, 9, 3.5);
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 19;
      g.add(tip);
      break;
    }
    case 'boomerang':
      g.add(boomerang(-6 * s, s * 1.2, mats, geo));
      break;
    case 'bomb':
      g.add(bomb(0, p.r, mats, geo));
      break;
    case 'snowball':
    case 'minisnow': {
      const b = mesh(geo.sphere, mats.snow);
      b.scale.setScalar(p.r);
      g.add(b);
      break;
    }
    default: {
      const b = mesh(geo.sphere, mats.boomer);
      b.scale.setScalar(Math.max(5, p.r));
      g.add(b);
    }
  }
  return g;
}
