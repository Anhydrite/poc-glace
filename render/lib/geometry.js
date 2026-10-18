/**
 * Generateur de geometrie procedurale "glace" (low-poly facette).
 *
 * Tout est construit a partir de primitives three + deformations deterministes,
 * dans l'esprit du blocking de la video : des formes simples et lisibles dont on
 * valide la silhouette et le cadrage, que la passe cinematique vient ensuite
 * habiller.
 */
import * as THREE from 'three';

export function facet(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  return g;
}

export function jitter(geometry, amount, rng, opts = {}) {
  const g = geometry.clone();
  const pos = g.attributes.position;
  const seedRng = opts.seedRng || rng;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(
      i,
      x + (seedRng() - 0.5) * amount,
      y + (seedRng() - 0.5) * amount * (opts.yScale ?? 1),
      z + (seedRng() - 0.5) * amount,
    );
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

export function taper(geometry, fn) {
  const g = geometry.clone();
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const s = fn(y, x, z);
    pos.setXYZ(i, x * s, y, z * s);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* Blocs de base                                                       */
/* ------------------------------------------------------------------ */

/** Prisme hexagonal irregulier, facette : la brique de toute la glace. */
export function shardGeometry({ radius = 1, height = 2, sides = 6, jitterAmt = 0.12, rng, tip = 0.35 } = {}) {
  const geo = new THREE.CylinderGeometry(radius * tip, radius, height, sides, 3, false);
  const j = jitter(geo, radius * jitterAmt, rng, { yScale: 0.4 });
  geo.dispose();
  return facet(j);
}

/** Bloc de glace anguleux (polyedre deforme). */
export function blockGeometry({ radius = 1, detail = 0, amount = 0.28, rng } = {}) {
  const geo = new THREE.DodecahedronGeometry(radius, detail);
  return facet(jitter(geo, radius * amount, rng));
}

/* ------------------------------------------------------------------ */
/* Elements de decor                                                    */
/* ------------------------------------------------------------------ */

/** Aiguille / cathedrale de glace monumentale (Big Ben version glace).
 *  Construite en deux temps : une ame facettee (lathe a 6 pans) puis des
 *  lames cristallines rayonnantes, pour une silhouette nettement plus
 *  "cristal" qu'un simple cone.
 */
export function crystalSpire({ rng, height = 26, radius = 3.2, tiers = 8, seed = 7 } = {}) {
  const group = new THREE.Group();
  group.name = 'crystalSpire';

  // Ame : profil en escalier marque, tourne a 6 pans (facettes nettes).
  const profile = [];
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const y = u * height;
    const scallop = 1 - 0.30 * (i % 2);
    const base = radius * Math.pow(1 - u, 0.68) * scallop;
    profile.push(new THREE.Vector2(Math.max(0.04, base), y));
  }
  const lathe = new THREE.LatheGeometry(profile, 6);
  const core = new THREE.Mesh(facet(jitter(lathe, radius * 0.03, rng, { yScale: 0.2 })));
  lathe.dispose();
  core.userData.slot = 'ice';
  group.add(core);

  // Contreforts : 6 nervures verticales qui donnent la lecture "cathedrale".
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    const uTop = 0.72;
    const h = height * uTop;
    const ribGeo = taper(facet(new THREE.BoxGeometry(radius * 0.62, h, radius * 0.42)), (yy) => {
      const k = (yy + h / 2) / h; // 0 en bas, 1 en haut
      return 1 - k * 0.78;
    });
    const rib = new THREE.Mesh(ribGeo);
    rib.position.set(Math.cos(a) * radius * 0.62, h / 2, Math.sin(a) * radius * 0.62);
    rib.rotation.y = -a;
    rib.rotation.z = 0.02;
    rib.userData.slot = 'iceDeep';
    group.add(rib);
  }

  // Lames cristallines rayonnantes (3 etages de 8 lames).
  const levels = [0.16, 0.4, 0.62];
  for (const uLevel of levels) {
    const r = Math.max(0.3, radius * Math.pow(1 - uLevel, 0.68));
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + uLevel * 3.1;
      const h = height * (0.16 + rng() * 0.1);
      const blade = new THREE.Mesh(
        taper(facet(new THREE.ConeGeometry(r * 0.3, h, 4)), (yy) => 1 - Math.abs(yy) / (h * 0.5) * 0.35),
      );
      blade.position.set(Math.cos(a) * r * 0.82, uLevel * height, Math.sin(a) * r * 0.82);
      blade.rotation.set(Math.PI / 2 - 0.7 - rng() * 0.25, -a, 0);
      blade.scale.set(1, 1.15 + rng() * 0.5, 0.7);
      blade.userData.slot = uLevel > 0.5 ? 'iceGlass' : 'ice';
      group.add(blade);
    }
  }

  // Couronne + pointe.
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.34, radius * 0.24, height * 0.06, 6));
  crown.position.y = height * 0.8;
  crown.userData.slot = 'iceDeep';
  group.add(crown);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.2, height * 0.34, 5, 1, false));
  tip.position.y = height * 0.95;
  tip.userData.slot = 'iceGlass';
  group.add(tip);

  // Fenetres lumineuses (equivalent des baies eclairees de Big Ben).
  for (let i = 0; i < 3; i++) {
    const u = 0.3 + i * 0.18;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.3, radius * Math.pow(1 - u, 0.68) * 1.06), 0.07, 6, 6),
    );
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = 0.2 * i;
    ring.position.y = u * height;
    ring.userData.slot = 'emissive';
    ring.userData.color = 0xbff2ff;
    group.add(ring);
  }

  group.userData.height = height;
  return group;
}

/** Banquise / floe basse polaire. */
export function iceShelf({ rng, radius = 8, sides = 9, thickness = 1.1, relief = 0.9 } = {}) {
  const shape = new THREE.Shape();
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rng() * 0.22;
    const r = radius * (0.5 + rng() * 0.8);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.28, bevelSegments: 1, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  const j = jitter(geo, relief * 0.5, rng, { yScale: 0.5 });
  geo.dispose();
  const mesh = new THREE.Mesh(facet(j));
  mesh.userData.slot = 'iceDeep';

  // Calotte de neige : brise l'aspect "dalle plate".
  const capShape = new THREE.Shape();
  const capPts = pts.map(([x, y]) => [x * (0.5 + rng() * 0.32), y * (0.5 + rng() * 0.32)]);
  capShape.moveTo(capPts[0][0], capPts[0][1]);
  for (let i = 1; i < capPts.length; i++) capShape.lineTo(capPts[i][0], capPts[i][1]);
  capShape.closePath();
  const capGeo = new THREE.ExtrudeGeometry(capShape, { depth: thickness * 0.55, bevelEnabled: true, bevelSize: 0.22, bevelThickness: 0.2, bevelSegments: 1, steps: 1 });
  capGeo.rotateX(-Math.PI / 2);
  const cap = new THREE.Mesh(facet(jitter(capGeo, relief * 0.3, rng, { yScale: 0.6 })));
  capGeo.dispose();
  cap.position.y = thickness * 0.72;
  cap.userData.slot = 'snow';

  const group = new THREE.Group();
  group.name = 'iceShelf';
  group.add(mesh, cap);
  group.userData.slot = mesh.userData.slot;
  return group;
}

/** Champ de banquise. */
export function iceField({ rng, count = 26, spread = 90, height = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'iceField';
  for (let i = 0; i < count; i++) {
    const shelf = iceShelf({ rng, radius: 1.6 + rng() * 7.5, sides: 6 + Math.floor(rng() * 4), thickness: 0.5 + rng() * 1.4 });
    const [dx, dz] = rng.disc(spread);
    shelf.position.set(dx, height - 0.4 + rng() * 0.9, dz);
    shelf.rotation.y = rng() * Math.PI * 2;
    shelf.userData.slot = rng() < 0.28 ? 'ice' : 'snow';
    group.add(shelf);
  }
  return group;
}

/** Pic montagneux facette avec calotte. */
export function mountain({ rng, height = 24, radius = 16, ridges = 10, snowLine = 0.42, snowSlot = 'snow' } = {}) {
  const group = new THREE.Group();
  group.name = 'mountain';
  const bodyGeo = new THREE.ConeGeometry(radius, height, ridges, 6, false);
  const jittered = facet(jitter(bodyGeo, radius * 0.16, rng, { yScale: 0.4 }));
  bodyGeo.dispose();
  const body = new THREE.Mesh(jittered);
  body.position.y = height / 2;
  body.userData.slot = 'rock';
  group.add(body);

  // Calotte neigeuse : cone legerement plus large, tronque.
  const capGeo = new THREE.ConeGeometry(radius * 0.52, height * (1 - snowLine), ridges, 4, false);
  const cap = new THREE.Mesh(facet(jitter(capGeo, radius * 0.07, rng, { yScale: 0.4 })));
  capGeo.dispose();
  cap.position.y = height * (snowLine + (1 - snowLine) / 2);
  cap.userData.slot = snowSlot;
  group.add(cap);
  return group;
}

/** Banc de nuages : plaques douces qui traversent la montagne. */
export function cloudBank({ rng, count = 22, spread = 46, y = 8, size = [24, 12], color = null, opacityScale = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'cloudBank';
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(size[0] * (0.5 + rng()), size[1] * (0.5 + rng()), 1, 1);
    const mesh = new THREE.Mesh(geo);
    const [dx, dz] = rng.disc(spread);
    mesh.position.set(dx, y + (rng() - 0.5) * 7, dz);
    mesh.rotation.set((rng() - 0.5) * 0.35, rng() * Math.PI * 2, (rng() - 0.5) * 0.3);
    mesh.userData.slot = 'cloud';
    mesh.userData.opacity = Math.min(1, (0.28 + rng() * 0.34) * opacityScale);
    mesh.userData.driftSpeed = 0.2 + rng() * 0.7;
    mesh.userData.driftDir = rng() * Math.PI * 2;
    if (color != null) mesh.userData.materialOverrides = { color, soft: 0.5 };
    group.add(mesh);
  }
  return group;
}

/** Interieur de cabine (avion privé / icebreaker) avec hublot decoupe. */
export function cabinInterior({ rng, radius = 1.55, width = 9, height = 5.4, depth = 5 } = {}) {
  const group = new THREE.Group();
  group.name = 'cabinInterior';
  const wallMat = 'dark';

  const mk = (w, h, d, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData.slot = wallMat;
    group.add(m);
    return m;
  };

  // Cloison avant percee d'un hublot circulaire (vraie decoupe circulaire).
  const zWall = 0;
  const halfW = width / 2;
  const halfH = height / 2;
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-halfW, -halfH);
  wallShape.lineTo(halfW, -halfH);
  wallShape.lineTo(halfW, halfH);
  wallShape.lineTo(-halfW, halfH);
  wallShape.closePath();
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, radius, 0, Math.PI * 2, true);
  wallShape.holes.push(holePath);
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: 0.42, bevelEnabled: false, curveSegments: 42 });
  wallGeo.translate(0, 0, -0.21);
  const wall = new THREE.Mesh(wallGeo);
  wall.name = 'cabinBulkhead';
  wall.userData.slot = wallMat;
  group.add(wall);

  // Parois laterales + plafond + plancher (profondeur de champ interieure).
  mk(depth, height, 0.3, -halfW, 0, zWall + depth / 2, Math.PI / 2);
  mk(depth, height, 0.3, halfW, 0, zWall + depth / 2, Math.PI / 2);
  mk(width, 0.3, depth, 0, halfH, zWall + depth / 2);
  mk(width, 0.3, depth, 0, -halfH, zWall + depth / 2);

  // Vitre du hublot : fine couche reflechissante (pas de transmission : couteux).
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.995, 42));
  glass.name = 'portholeGlass';
  glass.position.set(0, 0, zWall + 0.02);
  glass.userData.slot = 'glass';
  glass.userData.materialOverrides = {
    transmission: 0,
    opacity: 0.16,
    roughness: 0.03,
    color: 0xcfeaff,
    envMapIntensity: 1.9,
    side: 2,
  };
  glass.userData.keepMaterial = false;
  group.add(glass);

  // Renfort metallique circulaire du hublot (cote interieur = +Z).
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.06, radius * 0.075, 10, 44));
  ring.position.set(0, 0, zWall + 0.20);
  ring.userData.slot = 'metal';
  group.add(ring);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, radius * 0.045, 8, 40));
  ring2.position.set(0, 0, zWall + 0.32);
  ring2.userData.slot = 'metal';
  group.add(ring2);

  // Liseret lumineux froid autour du hublot : accent "glace".
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.87, 0.018, 6, 40));
  glowRing.position.set(0, 0, zWall + 0.30);
  glowRing.userData.slot = 'emissive';
  glowRing.userData.color = 0xa8ecff;
  group.add(glowRing);

  // Boulons.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 6));
    b.rotation.x = Math.PI / 2;
    b.position.set(Math.cos(a) * radius * 1.2, Math.sin(a) * radius * 1.2, zWall + 0.22);
    b.userData.slot = 'metal';
    group.add(b);
  }

  // Console laterale + sieges stylises (profondeur, hors du champ de la
  // trajectoire camera, mais captes en silhouette au demarrage).
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 2.6));
  console_.position.set(-halfW + 0.85, -0.9, zWall + 2.4);
  console_.userData.slot = 'metal';
  group.add(console_);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 1.1));
  seat.position.set(-halfW + 1.5, -1.9, zWall + 2.2);
  seat.userData.slot = 'dark';
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.28));
  back.position.set(-halfW + 1.5, -1.35, zWall + 2.75);
  back.userData.slot = 'dark';
  group.add(back);

  // Rubans lumineux interieurs (couleur froide, reflets sur le metal).
  for (const y of [halfH - 0.22, -halfH + 0.22]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.035, 0.035));
    strip.position.set(0, y, zWall + 1.1);
    strip.userData.slot = 'emissive';
    strip.userData.color = 0xbfe9ff;
    strip.userData.emissiveIntensity = 1.6;
    group.add(strip);
  }

  // Lampe de cabine : garantit que l'interieur n'est jamais un aplat noir.
  const cabinLight = new THREE.PointLight(0xcfe9ff, 12, 16, 2.0);
  cabinLight.position.set(0, halfH - 0.6, zWall + 2.2);
  cabinLight.name = 'cabinLight';
  group.add(cabinLight);
  const cabinLight2 = new THREE.PointLight(0x9fd0ee, 6, 12, 2.0);
  cabinLight2.position.set(0, -halfH + 0.5, zWall + 1.2);
  cabinLight2.name = 'cabinLight2';
  group.add(cabinLight2);

  group.userData.porthole = { z: zWall, radius };
  return group;
}

/** Tunnel de glace perce d'une ouverture (concept 2). */
export function iceTunnel({ rng, length = 34, radius = 4.2, openingRadius = 2.5 } = {}) {
  const group = new THREE.Group();
  group.name = 'iceTunnel';

  const profile = [];
  const sides = 12;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    profile.push(new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius));
  }
  profile.push(profile[0].clone());

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.8, 0.3, -length * 0.35),
    new THREE.Vector3(-0.6, -0.4, -length * 0.7),
    new THREE.Vector3(0.2, 0.9, -length),
  ]);

  const tubeGeo = new THREE.TubeGeometry(curve, 40, radius, sides, false);
  const shell = new THREE.Mesh(facet(jitter(tubeGeo, radius * 0.14, rng, { yScale: 1 })));
  shell.userData.slot = 'iceDeep';
  shell.material = null;
  group.add(shell);

  // Nervures de glace.
  for (let i = 0; i < 14; i++) {
    const t = 0.05 + (i / 14) * 0.9;
    const p = curve.getPointAt(t);
    const rib = new THREE.Mesh(shardGeometry({ radius: radius * (0.24 + rng() * 0.3), height: 0.7 + rng() * 1.5, sides: 5, rng, tip: 0.5 }));
    const a = rng() * Math.PI * 2;
    rib.position.set(p.x + Math.cos(a) * radius * 0.86, p.y + Math.sin(a) * radius * 0.86, p.z);
    rib.rotation.set(rng() * 1.2, rng() * Math.PI, rng() * 1.2);
    rib.userData.slot = 'ice';
    group.add(rib);
  }

  // Encadrement de l'ouverture (ovale facette).
  const frame = new THREE.Mesh(new THREE.TorusGeometry(openingRadius * 1.05, 0.34, 8, 26));
  frame.scale.set(1.22, 1, 1);
  frame.position.set(0, 0.2, 0.6);
  frame.userData.slot = 'frost';
  group.add(frame);

  group.userData.opening = { radius: openingRadius, z: 0.6 };
  group.userData.curve = curve;
  return group;
}

/** Artefact cristallin "explose" (equivalent du casque VR du concept 3). */
export function explodedArtifact({ rng, scale = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'explodedArtifact';
  const parts = [];

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0));
  core.userData.slot = 'crystal';
  parts.push({ mesh: core, rest: [0, 0, 0], explode: [0, 0, 0.9] });
  group.add(core);

  // Anneaux.
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.26, 0.075, 6, 22));
    ring.rotation.set(Math.PI / 2 + (i - 1) * 0.5, i * 0.7, 0);
    ring.userData.slot = 'metalWarm';
    parts.push({ mesh: ring, rest: [0, 0, 0], explode: [0, (i - 1) * 0.62, 0], spin: 0.3 + i * 0.2 });
    group.add(ring);
  }

  // Lentilles / coques.
  for (let s = 0; s < 2; s++) {
    const sign = s === 0 ? 1 : -1;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.02, 10, 6, 0, Math.PI, 0, Math.PI * 0.62));
    shell.scale.set(1, 0.92, 1);
    shell.rotation.z = sign * Math.PI;
    shell.userData.slot = 'iceGlass';
    parts.push({ mesh: shell, rest: [0, 0, 0], explode: [0, 0, sign * 1.25] });
    group.add(shell);
  }

  // Eclats satellites.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const shard = new THREE.Mesh(shardGeometry({ radius: 0.1 + rng() * 0.12, height: 0.34 + rng() * 0.5, sides: 5, rng, tip: 0.3 }));
    const r = 1.5 + rng() * 0.5;
    shard.position.set(Math.cos(a) * r, (rng() - 0.5) * 0.9, Math.sin(a) * r);
    shard.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    shard.userData.slot = 'crystal';
    parts.push({
      mesh: shard,
      rest: shard.position.toArray(),
      explode: [Math.cos(a) * 1.5, (rng() - 0.2) * 1.6, Math.sin(a) * 1.5],
      spin: 0.6 + rng(),
    });
    group.add(shard);
  }

  // Socle.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, 0.22, 8));
  base.position.y = -1.5;
  base.userData.slot = 'metal';
  parts.push({ mesh: base, rest: [0, -1.5, 0], explode: [0, -0.15, 0] });
  group.add(base);

  group.scale.setScalar(scale);
  group.userData.parts = parts;
  group.userData.explodeK = 0;
  group.userData.setExplode = (k) => {
    for (const p of parts) {
      p.mesh.position.set(
        p.rest[0] + p.explode[0] * k,
        p.rest[1] + p.explode[1] * k,
        p.rest[2] + p.explode[2] * k,
      );
      if (p.spin) p.mesh.rotation.y += p.spin * 0.004 * k;
    }
  };
  return group;
}

/** Gardien de glace stylise (equivalent du samourai du concept 4). */
export function iceGuardian({ rng, scale = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'iceGuardian';

  const body = new THREE.Group();
  body.name = 'guardianBody';
  group.add(body);

  const add = (geo, slot, pos, rot, parent = body) => {
    const m = new THREE.Mesh(geo);
    m.userData.slot = slot;
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    parent.add(m);
    return m;
  };

  // Buste : prisme facette effile vers la taille.
  const torsoGeo = taper(facet(jitter(new THREE.CylinderGeometry(0.52, 0.36, 1.5, 7, 3), 0.07, rng)), (y) => {
    const k = (y + 0.75) / 1.5;
    return 1 + 0.18 * Math.sin(k * Math.PI);
  });
  const torso = add(torsoGeo, 'figure', [0, 0.15, 0]);
  torso.name = 'torso';

  // Epaulieres cristallines.
  for (const s of [-1, 1]) {
    const pauldron = add(shardGeometry({ radius: 0.3, height: 0.46, sides: 5, rng, tip: 0.45 }), 'figure', [s * 0.6, 0.72, 0], [0.3, 0, s * 0.5]);
    pauldron.scale.set(1.15, 1, 1.0);
  }

  // Tete : polyedre facette + heaume pointu.
  add(facet(jitter(new THREE.IcosahedronGeometry(0.24, 0), 0.05, rng)), 'figure', [0, 1.06, 0]);
  add(new THREE.ConeGeometry(0.26, 0.4, 5), 'iceGlass', [0, 1.34, 0]);
  // Visiere luminescente.
  add(new THREE.BoxGeometry(0.34, 0.045, 0.045), 'emissive', [0, 1.05, 0.2]).userData.color = 0x9ff0ff;

  // Bras.
  const arms = {};
  for (const s of [-1, 1]) {
    const upper = add(facet(jitter(new THREE.CapsuleGeometry(0.13, 0.5, 3, 6), 0.03, rng)), 'figure', [s * 0.56, 0.36, 0.02], [0.1, 0, s * 0.16]);
    const lower = add(facet(jitter(new THREE.CapsuleGeometry(0.115, 0.5, 3, 6), 0.03, rng)), 'figure', [s * 0.62, -0.04, 0.34], [-0.75, 0, s * 0.06]);
    const hand = add(facet(jitter(new THREE.IcosahedronGeometry(0.13, 0), 0.03, rng)), 'figure', [s * 0.62, -0.3, 0.6]);
    arms[s] = { upper, lower, hand };
  }

  // Jambes (blocs simples, l'essentiel de la silhouette).
  for (const s of [-1, 1]) {
    add(facet(jitter(new THREE.CapsuleGeometry(0.16, 0.62, 3, 6), 0.035, rng)), 'figure', [s * 0.22, -0.95, 0.02]);
    add(facet(jitter(new THREE.CapsuleGeometry(0.14, 0.6, 3, 6), 0.03, rng)), 'figure', [s * 0.24, -1.6, 0.06]);
  }

  // Lame de glace (le "katana").
  const bladeGroup = new THREE.Group();
  bladeGroup.name = 'blade';
  bladeGroup.position.set(0.9, -0.4, 0.9);
  bladeGroup.rotation.set(-1.1, 0.2, 0.25);
  body.add(bladeGroup);
  const bladeGeo = taper(facet(new THREE.BoxGeometry(0.075, 2.5, 0.2)), (y) => 1 - Math.max(0, (y / 1.25)) * 0.55);
  const blade = new THREE.Mesh(bladeGeo);
  blade.userData.slot = 'blade';
  bladeGroup.add(blade);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 6));
  hilt.position.y = -1.4;
  hilt.userData.slot = 'metalWarm';
  bladeGroup.add(hilt);

  // Cape / traine cristalline.
  const cape = new THREE.Mesh(facet(jitter(new THREE.PlaneGeometry(1.3, 2.0, 6, 6), 0.06, rng)), 'iceGlass');
  cape.material = null;
  cape.position.set(0, -0.35, -0.28);
  cape.rotation.x = 0.1;
  cape.userData.slot = 'iceGlass';
  cape.name = 'cape';
  body.add(cape);

  group.scale.setScalar(scale);
  group.userData.body = body;
  group.userData.arms = arms;
  group.userData.blade = bladeGroup;
  group.userData.cape = cape;
  return group;
}

/** Champ de glaciers pour le plan final plein ecran. */
export function glacierField({ rng, count = 90, spread = 260 } = {}) {
  const group = new THREE.Group();
  group.name = 'glacierField';
  for (let i = 0; i < count; i++) {
    const [dx, dz] = rng.disc(spread);
    const radius = 1.6 + rng() * 9;
    const height = 1.4 + rng() * 16;
    const g = shardGeometry({ radius, height, sides: 4 + Math.floor(rng() * 3), rng, jitterAmt: 0.2, tip: 0.22 });
    const m = new THREE.Mesh(g);
    m.position.set(dx, height * 0.32 - 1.2, dz);
    m.rotation.set((rng() - 0.5) * 0.25, rng() * Math.PI * 2, (rng() - 0.5) * 0.25);
    m.userData.slot = rng() < 0.7 ? 'ice' : 'iceDeep';
    group.add(m);
  }
  return group;
}

/** Plancher / etendue de glace vive (miroir sombre). */
export function glacialSea({ size = 900, segments = 90, rng } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h =
      Math.sin(x * 0.014 + y * 0.011) * 0.32 +
      Math.sin(x * 0.043 - y * 0.031) * 0.11 +
      Math.sin(x * 0.12 + y * 0.09) * 0.03;
    pos.setZ(i, h);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo);
  mesh.userData.slot = 'water';
  mesh.name = 'glacialSea';
  return mesh;
}

/** Plafond de nuages bas (couche douce sous laquelle on plonge). */
export function cloudSea({ size = 420, y = -6, rows = 26, rng } = {}) {
  const group = new THREE.Group();
  group.name = 'cloudSea';
  for (let i = 0; i < rows; i++) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size / 4, size / 4));
    plane.rotation.x = -Math.PI / 2;
    const [dx, dz] = rng.disc(size / 2);
    plane.position.set(dx, y + (rng() - 0.5) * 3.2, dz);
    plane.rotation.z = rng() * Math.PI;
    plane.userData.slot = 'cloud';
    plane.userData.opacity = 0.3 + rng() * 0.4;
    plane.userData.driftSpeed = 0.1 + rng() * 0.3;
    plane.userData.driftDir = rng() * Math.PI * 2;
    group.add(plane);
  }
  return group;
}

/** Assigne les materiaux par slot aux meshes qui en declarent un.
 *  Les meshes sans slot (ou marques keepMaterial) gardent leur materiau
 *  d'origine : indispensable pour les shaders custom (aurores, faisceaux...). */
export function assemble(root, lib, opts = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.keepMaterial === true) return;
    const slot = o.userData.slot || opts.defaultSlot;
    if (!slot) return;
    const overrides = { ...(o.userData.materialOverrides || {}) };
    // La passe blocking reste volontairement plate : on ignore les accents de
    // couleur de la passe cinematique (comme le viewport "solid" de Blender).
    if (lib.isCinematic && o.userData.color != null) overrides.color = o.userData.color;
    if (o.userData.opacity != null) overrides.opacity = o.userData.opacity;
    if (lib.isCinematic && o.userData.emissiveIntensity != null) overrides.emissiveIntensity = o.userData.emissiveIntensity;
    o.material = lib.get(slot, overrides);
    o.castShadow = o.castShadow ?? opts.castShadow ?? true;
    o.receiveShadow = o.receiveShadow ?? opts.receiveShadow ?? true;
  });
  return root;
}
