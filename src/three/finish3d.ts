import * as THREE from 'three';
import { CORPSE_BONES, RAG, type Corpse } from '../game/finish';
import type { Game } from '../game/game';

/*
 * 3D's fourth update (the 2D game's fourth update): death finishers, healing potions and banana peels in 3D.
 * Every finisher from 2D, built from the same round 3D pieces as the stickmen: ragdolls that flop and tumble,
 * cut in half, flung away, burned black into a pile of ash, flown into the sky with a twinkle, tripped flat on the
 * face, frozen and shattered, zapped into a flashing skeleton, slipped on a banana, and blown to pieces with
 * googly eyes. KO eyes are little crosses. Helpers' remains (a cat's grave and so on) stay flat on the 2D layer.
 */

type V = { x: number; y: number };
interface Geo {
  sphere: THREE.BufferGeometry;
  smallSphere: THREE.BufferGeometry;
  cyl: THREE.BufferGeometry;
  box: THREE.BufferGeometry;
  cone: THREE.BufferGeometry;
}

interface CorpseRig {
  root: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  bones: THREE.Mesh[];
  heads: THREE.Mesh[];
  /** KO crosses on the head (or googly eyes when blown to pieces). */
  eyes: THREE.Group;
  pupils: THREE.Mesh[];
  pile: THREE.Group;
  star: THREE.Mesh;
  peel: THREE.Group;
  shards: THREE.Mesh[];
}

const UP = new THREE.Vector3(0, 1, 0);
const tA = new THREE.Vector3();
const tB = new THREE.Vector3();
const tQ = new THREE.Quaternion();

/** Point a unit cylinder from a to b (2D world points), radius r, at depth z. */
function bone(m: THREE.Mesh, a: V, b: V, r: number, z: number) {
  tA.set(a.x, -a.y, z);
  tB.set(b.x, -b.y, z);
  const len = tA.distanceTo(tB) || 0.001;
  m.position.copy(tA).add(tB).multiplyScalar(0.5);
  tB.sub(tA).normalize();
  tQ.setFromUnitVectors(UP, tB);
  m.quaternion.copy(tQ);
  m.scale.set(r, len, r);
  m.visible = true;
}

/** A stiff stickman around its feet (x, y), turned by rot: the same joints as the 2D one. */
function stiffPose(c: Corpse) {
  const s = c.s;
  const cos = Math.cos(c.rot);
  const sin = Math.sin(c.rot);
  const p = (x: number, y: number): V => ({ x: c.x + (x * cos - y * sin) * s, y: c.y + (x * sin + y * cos) * s });
  const hip = p(0, -34);
  const neck = p(0, -62);
  const sh = p(0, -58);
  return {
    segs: [
      [p(-9, 0), hip],
      [p(9, 0), hip],
      [hip, neck],
      [p(-15, -46), sh],
      [sh, p(15, -46)],
    ] as [V, V][],
    head: p(0, -73),
  };
}

export class Finishers3D {
  private rigs = new Map<Corpse, CorpseRig>();
  private potions: THREE.Group[] = [];
  private peels: THREE.Group[] = [];
  private glass = new THREE.MeshStandardMaterial({ color: '#e53935', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, emissive: new THREE.Color('#b71c1c'), emissiveIntensity: 0.35 });
  private neck = new THREE.MeshStandardMaterial({ color: '#eceff1', roughness: 0.2, transparent: true, opacity: 0.8 });
  private cork = new THREE.MeshStandardMaterial({ color: '#8d6e63', roughness: 0.8 });
  private glow = new THREE.MeshBasicMaterial({ color: '#69f0ae', transparent: true, opacity: 0.25, depthWrite: false });
  private banana = new THREE.MeshStandardMaterial({ color: '#fdd835', roughness: 0.45 });
  private bananaTip = new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.6 });
  private black = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.3 });
  private white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
  private ash = new THREE.MeshStandardMaterial({ color: '#424242', roughness: 1 });
  private ashLight = new THREE.MeshStandardMaterial({ color: '#757575', roughness: 1 });
  private starMat = new THREE.MeshBasicMaterial({ color: '#fff59d' });
  private ice = new THREE.MeshStandardMaterial({ color: '#e1f5fe', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85, emissive: new THREE.Color('#4fc3f7'), emissiveIntensity: 0.3 });

  constructor(
    private parent: THREE.Group,
    private geo: Geo,
  ) {}

  update(g: Game) {
    this.updateCorpses(g);
    this.updatePotions(g);
    this.updatePeels(g);
  }

  dispose() {
    for (const r of this.rigs.values()) r.mat.dispose();
  }

  // ---------- finishers ----------

  private rig(c: Corpse): CorpseRig {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.38, metalness: 0.05, transparent: true });
    const mk = (geo: THREE.BufferGeometry, m: THREE.Material) => {
      const x = new THREE.Mesh(geo, m);
      x.castShadow = true;
      root.add(x);
      return x;
    };
    const bones = Array.from({ length: 8 }, () => mk(this.geo.cyl, mat));
    const heads = [mk(this.geo.sphere, mat)];
    // KO eyes: two little crosses (or, blown to pieces, two googly eyes).
    const eyes = new THREE.Group();
    const pupils: THREE.Mesh[] = [];
    if (c.style === 'pieces') {
      for (const [ex, sz] of [[-0.36, 0.36], [0.4, 0.29]]) {
        const w = new THREE.Mesh(this.geo.smallSphere, this.white);
        w.scale.set(sz, sz, sz * 0.6);
        w.position.set(ex, 0.18, 0.85);
        eyes.add(w);
        const p = new THREE.Mesh(this.geo.smallSphere, this.black);
        p.scale.setScalar(sz * 0.45);
        p.userData.ex = ex;
        p.userData.sz = sz;
        eyes.add(p);
        pupils.push(p);
      }
      const tongue = new THREE.Mesh(this.geo.smallSphere, new THREE.MeshStandardMaterial({ color: '#ef5350', roughness: 0.4 }));
      tongue.scale.set(0.24, 0.36, 0.12);
      tongue.position.set(0.1, -0.62, 0.8);
      eyes.add(tongue);
    } else if (!c.mascot) {
      for (const ex of [-0.36, 0.36])
        for (const a of [0.785, -0.785]) {
          const bar = new THREE.Mesh(this.geo.box, this.black);
          bar.scale.set(0.42, 0.09, 0.06);
          bar.position.set(ex, 0.25, 0.97);
          bar.rotation.z = a;
          eyes.add(bar);
        }
    }
    root.add(eyes);
    // Ash pile
    const pile = new THREE.Group();
    const p1 = new THREE.Mesh(this.geo.sphere, this.ash);
    p1.scale.set(22, 7, 14);
    pile.add(p1);
    const p2 = new THREE.Mesh(this.geo.sphere, this.ashLight);
    p2.scale.set(9, 4, 8);
    p2.position.set(-4, 3, 4);
    pile.add(p2);
    pile.visible = false;
    root.add(pile);
    // The twinkle as it flies off into the sky
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(1), this.starMat);
    star.visible = false;
    root.add(star);
    // The banana peel that did it
    const peel = this.peelMesh(10);
    peel.visible = false;
    root.add(peel);
    // Frozen: ice shards on the body
    const shards: THREE.Mesh[] = [];
    if (c.style === 'shatter') {
      for (let k = 0; k < 5; k++) {
        const sh = new THREE.Mesh(this.geo.cone, this.ice);
        sh.visible = false;
        root.add(sh);
        shards.push(sh);
      }
    }
    // Blown to pieces: a head and six bits flying, each its own piece.
    this.parent.add(root);
    return { root, mat, bones, heads, eyes, pupils, pile, star, peel, shards };
  }

  private updateCorpses(g: Game) {
    for (const [c, r] of this.rigs)
      if (!g.corpses.includes(c)) {
        this.parent.remove(r.root);
        r.mat.dispose();
        this.rigs.delete(c);
      }
    for (const c of g.corpses) {
      // Helpers' remains stay on the flat layer.
      if (c.prop) continue;
      let r = this.rigs.get(c);
      if (!r) {
        r = this.rig(c);
        this.rigs.set(c, r);
      }
      this.pose(g, c, r);
    }
  }

  private pose(g: Game, c: Corpse, r: CorpseRig) {
    const s = c.s;
    const rad = 2.7 * s;
    const hr = 11 * s;
    const fade = Math.max(0, Math.min(1, (c.life - c.t) / 0.8));
    r.mat.opacity = fade;
    r.mat.emissiveIntensity = 0;
    r.mat.color.set(c.color);
    r.bones.forEach((b) => (b.visible = false));
    r.pile.visible = false;
    r.star.visible = false;
    r.peel.visible = false;
    r.shards.forEach((x) => (x.visible = false));
    r.eyes.visible = true;
    const head = r.heads[0];
    head.visible = true;
    let headAt: V = { x: c.x, y: c.y };
    let headRot = 0;
    switch (c.style) {
      case 'ragdoll':
      case 'fling':
      case 'half': {
        const pts = c.pts!;
        let k = 0;
        for (const [a, b] of CORPSE_BONES) {
          if (c.style === 'half' && a === RAG.CHEST && b === RAG.BELLY) continue;
          bone(r.bones[k++], pts[a], pts[b], rad, 0);
        }
        headAt = pts[RAG.HEAD];
        // The head turns with the neck.
        headRot = Math.atan2(pts[RAG.HEAD].x - pts[1].x, -(pts[RAG.HEAD].y - pts[1].y));
        break;
      }
      case 'pieces': {
        let k = 0;
        for (const p of c.parts!) {
          if (p.kind === 'head') {
            headAt = p;
            headRot = p.rot;
            continue;
          }
          const dx = (Math.cos(p.rot) * p.len) / 2;
          const dy = (Math.sin(p.rot) * p.len) / 2;
          bone(r.bones[k++], { x: p.x - dx, y: p.y - dy }, { x: p.x + dx, y: p.y + dy }, p.kind === 'torso' ? rad * 1.2 : rad, 0);
        }
        // Googly eyes roll around.
        r.pupils.forEach((pp) => {
          const a = g.time * 9 + pp.userData.ex * 10;
          pp.position.set(pp.userData.ex + Math.cos(a) * pp.userData.sz * 0.45, 0.18 + Math.sin(a) * pp.userData.sz * 0.45, 1.0);
        });
        break;
      }
      case 'ashes':
      case 'shatter':
      case 'zap':
      case 'sky':
      case 'slip':
      case 'trip': {
        const st = stiffPose(c);
        let show = true;
        if (c.style === 'ashes') {
          show = c.t < 0.7;
          // Turning black...
          const k = Math.min(1, c.t / 0.5);
          r.mat.color.setRGB((30 + (1 - k) * 200) / 255, ((30 + (1 - k) * 200) * 0.6) / 255, ((30 + (1 - k) * 200) * 0.3) / 255);
          r.mat.emissive.set('#ff6d00');
          r.mat.emissiveIntensity = (1 - k) * 0.6;
          r.eyes.visible = false;
          // ...then a little pile of ash.
          const pile = Math.min(1, Math.max(0, (c.t - 0.6) / 0.4));
          if (pile > 0) {
            r.pile.visible = true;
            r.pile.position.set(c.x, -c.y, 0);
            r.pile.scale.setScalar(pile * s);
          }
        } else if (c.style === 'shatter') {
          show = c.t < 0.45;
          r.mat.color.set('#b3e5fc');
          r.mat.emissive.set('#4fc3f7');
          r.mat.emissiveIntensity = 0.5;
          r.eyes.visible = false;
          if (show)
            r.shards.forEach((x, i) => {
              x.visible = true;
              x.position.set(c.x + (i - 2) * 7 * s, -(c.y - (12 + i * 14) * s), 4);
              x.scale.set(4 * s, 12 * s, 4 * s);
              x.rotation.z = (i % 2 ? 0.6 : -0.6) + i;
            });
        } else if (c.style === 'zap') {
          show = c.t < 0.6;
          // A flashing skeleton.
          const on = Math.floor(c.t * 20) % 2 === 0;
          r.mat.color.set(on ? '#ffffff' : '#212121');
          r.mat.emissive.set(on ? '#fff176' : '#000000');
          r.mat.emissiveIntensity = on ? 0.6 : 0;
          r.eyes.visible = false;
        } else if (c.style === 'sky' && c.t > 0.9) {
          r.star.visible = true;
          r.star.position.set(c.x, -(c.y - 40 * s), 12);
          r.star.scale.setScalar(10 + Math.sin(g.time * 30) * 4);
          r.star.rotation.set(0, g.time * 6, g.time * 3);
        } else if (c.style === 'slip') {
          r.peel.visible = true;
          r.peel.position.set(c.x - (c.vx > 0 ? 60 : -60), -(c.y + 40), 0);
        }
        if (show) {
          st.segs.forEach(([a, b], i) => bone(r.bones[i], a, b, rad, 0));
          headAt = st.head;
          headRot = c.rot;
        }
        head.visible = show;
        if (!show) r.eyes.visible = false;
        break;
      }
    }
    head.position.set(headAt.x, -headAt.y, 0);
    head.scale.setScalar(hr);
    r.eyes.position.copy(head.position);
    r.eyes.scale.setScalar(hr);
    r.eyes.rotation.set(0, 0, -headRot);
    r.eyes.children.forEach((e) => {
      const m = (e as THREE.Mesh).material as THREE.Material;
      m.transparent = fade < 1;
      m.opacity = fade;
    });
  }

  // ---------- potions and peels ----------

  private peelMesh(r: number) {
    const g = new THREE.Group();
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-r, r * 0.3, 0), new THREE.Vector3(0, -r * 0.7, 0), new THREE.Vector3(r, r * 0.3, 0));
    const b = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, r * 0.32, 8), this.banana);
    b.castShadow = true;
    g.add(b);
    const tip = new THREE.Mesh(this.geo.smallSphere, this.bananaTip);
    tip.scale.setScalar(r * 0.22);
    tip.position.set(r, r * 0.32, 0);
    g.add(tip);
    return g;
  }

  /** Healing potions: a red glass flask with a cork, bobbing in a soft green glow. */
  private updatePotions(g: Game) {
    while (this.potions.length < g.potions.length) {
      const p = new THREE.Group();
      const body = new THREE.Mesh(this.geo.sphere, this.glass);
      body.scale.setScalar(9);
      body.castShadow = true;
      p.add(body);
      const neck = new THREE.Mesh(this.geo.cyl, this.neck);
      neck.scale.set(3.5, 8, 3.5);
      neck.position.y = 11;
      p.add(neck);
      const cork = new THREE.Mesh(this.geo.cyl, this.cork);
      cork.scale.set(4.5, 4, 4.5);
      cork.position.y = 16;
      p.add(cork);
      const glow = new THREE.Mesh(this.geo.sphere, this.glow);
      glow.scale.setScalar(17);
      glow.position.y = 2;
      p.add(glow);
      this.potions.push(p);
      this.parent.add(p);
    }
    this.potions.forEach((m, i) => {
      const po = g.potions[i];
      m.visible = !!po;
      if (!po) return;
      const bob = Math.sin(g.time * 4 + po.x) * 3;
      m.position.set(po.x, -(po.y - 12 + bob), 0);
      m.rotation.y = g.time * 1.5;
    });
  }

  /** Banana peels on the ground (step on one and you slip). They blink before they go away. */
  private updatePeels(g: Game) {
    while (this.peels.length < g.peels.length) {
      const p = this.peelMesh(9);
      this.peels.push(p);
      this.parent.add(p);
    }
    this.peels.forEach((m, i) => {
      const pe = g.peels[i];
      m.visible = !!pe && !(pe.life < 1.5 && Math.floor(pe.life * 8) % 2 === 0);
      if (!pe) return;
      m.position.set(pe.x, -(pe.y - 5), 0);
      m.rotation.set(0.5, 0.4, 0.3);
    });
  }
}
