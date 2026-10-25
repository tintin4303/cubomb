import * as THREE from "three";
import { CellData, FaceDirection, GameMode } from "./types";

export class BoardManager {
  public gridSize: number;
  public totalMines: number;
  public mode: GameMode;
  public spacing: number = 1.1;
  public cubeSize: number = 1.0;

  public cells: CellData[] = [];
  public cellMap: Map<string, CellData> = new Map();
  public firstClickDone: boolean = false;

  // Reusable materials
  public matHidden!: THREE.MeshStandardMaterial;
  public matHiddenHover!: THREE.MeshStandardMaterial;
  public matChordHighlight!: THREE.MeshStandardMaterial;
  public matRevealed!: THREE.MeshStandardMaterial;
  public matFlagged!: THREE.MeshStandardMaterial;
  public matMineCore!: THREE.MeshStandardMaterial;
  public matMineSpike!: THREE.MeshStandardMaterial;
  public matBedrock!: THREE.MeshStandardMaterial;

  constructor(gridSize: number, totalMines: number, mode: GameMode) {
    this.gridSize = gridSize;
    this.totalMines = totalMines;
    this.mode = mode;
    this.initMaterials();
  }

  private initMaterials() {
    this.matHidden = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark slate sci-fi plating
      roughness: 0.25,
      metalness: 0.65,
    });

    this.matHiddenHover = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Glowing sky cyan highlight
      roughness: 0.15,
      metalness: 0.8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
    });

    this.matChordHighlight = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Electric azure chord pulse
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
    });

    this.matRevealed = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 0.4,
    });

    this.matBedrock = new THREE.MeshStandardMaterial({
      color: 0x080c16, // Recessed metallic bedrock foundation
      roughness: 0.75,
      metalness: 0.35,
    });

    this.matFlagged = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });

    this.matMineCore = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    this.matMineSpike = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.3,
    });
  }

  // Generate cells on cube planet surface
  public initBoard(): CellData[] {
    this.cells = [];
    this.cellMap.clear();
    this.firstClickDone = false;
    this.initSurfaceCells();
    return this.cells;
  }

  // Surface mode: 6 faces of the cube
  private initSurfaceCells() {
    const faces: FaceDirection[] = ["top", "bottom", "front", "back", "left", "right"];
    const N = this.gridSize;

    faces.forEach((face) => {
      for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
          const id = `${face}_${u}_${v}`;
          const cell: CellData = {
            id,
            x: u,
            y: v,
            z: 0,
            face,
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            neighborMines: 0,
            isOuter: true,
          };
          this.cells.push(cell);
          this.cellMap.set(id, cell);
        }
      }
    });
  }

  // Place mines guaranteed safe from the first clicked cell
  public populateMines(safeCell: CellData): string[] {
    this.firstClickDone = true;
    const safeNeighbors = this.getNeighbors(safeCell);
    const safeIds = new Set<string>([safeCell.id, ...safeNeighbors.map((c) => c.id)]);

    const candidatePool = this.cells.filter((c) => !safeIds.has(c.id));
    const pool = candidatePool.length >= this.totalMines ? candidatePool : this.cells.filter((c) => c.id !== safeCell.id);

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const placedMineIds: string[] = [];
    const minesToPlace = Math.min(this.totalMines, pool.length);
    for (let i = 0; i < minesToPlace; i++) {
      pool[i].isMine = true;
      placedMineIds.push(pool[i].id);
    }

    // Compute neighbor mines for all cells
    this.cells.forEach((cell) => {
      if (cell.isMine) return;
      const neighbors = this.getNeighbors(cell);
      cell.neighborMines = neighbors.filter((n) => n.isMine).length;
    });

    return placedMineIds;
  }

  // Populate mines directly from synchronized party locations
  public setMinesFromLocations(mineIds: string[]) {
    this.firstClickDone = true;
    const mineSet = new Set(mineIds);
    this.cells.forEach((cell) => {
      cell.isMine = mineSet.has(cell.id);
    });

    this.cells.forEach((cell) => {
      if (cell.isMine) return;
      const neighbors = this.getNeighbors(cell);
      cell.neighborMines = neighbors.filter((n) => n.isMine).length;
    });
  }

  // Get neighbors of a cell
  public getNeighbors(cell: CellData): CellData[] {
    return this.getSurfaceNeighbors(cell);
  }

  // Surface mode 8-neighbor wrapping around cube faces
  private getSurfaceNeighbors(cell: CellData): CellData[] {
    const neighbors: CellData[] = [];
    const offsets = [-1, 0, 1];
    const N = this.gridSize;

    for (const du of offsets) {
      for (const dv of offsets) {
        if (du === 0 && dv === 0) continue;

        let nu = cell.x + du;
        let nv = cell.y + dv;
        let nFace = cell.face!;

        if (nu >= 0 && nu < N && nv >= 0 && nv < N) {
          const n = this.cellMap.get(`${nFace}_${nu}_${nv}`);
          if (n) neighbors.push(n);
          continue;
        }

        // Cross-face edge wrapping
        const resolved = this.resolveFaceEdge(cell.face!, nu, nv, N);
        if (resolved) {
          const n = this.cellMap.get(`${resolved.face}_${resolved.u}_${resolved.v}`);
          if (n && !neighbors.some((x) => x.id === n.id)) {
            neighbors.push(n);
          }
        }
      }
    }
    return neighbors;
  }

  private resolveFaceEdge(
    face: FaceDirection,
    u: number,
    v: number,
    N: number
  ): { face: FaceDirection; u: number; v: number } | null {
    // 1. FRONT face (+Z)
    if (face === "front") {
      if (v >= N) return { face: "top", u: Math.max(0, Math.min(N - 1, u)), v: 0 };
      if (v < 0) return { face: "bottom", u: Math.max(0, Math.min(N - 1, u)), v: N - 1 };
      if (u >= N) return { face: "right", u: 0, v: Math.max(0, Math.min(N - 1, v)) };
      if (u < 0) return { face: "left", u: N - 1, v: Math.max(0, Math.min(N - 1, v)) };
    }

    // 2. TOP face (+Y)
    if (face === "top") {
      if (v >= N) return { face: "back", u: Math.max(0, Math.min(N - 1, u)), v: 0 };
      if (v < 0) return { face: "front", u: Math.max(0, Math.min(N - 1, u)), v: N - 1 };
      if (u >= N) return { face: "right", u: Math.max(0, Math.min(N - 1, v)), v: N - 1 };
      if (u < 0) return { face: "left", u: Math.max(0, Math.min(N - 1, N - 1 - v)), v: N - 1 };
    }

    // 3. BACK face (-Z)
    if (face === "back") {
      if (v >= N) return { face: "bottom", u: Math.max(0, Math.min(N - 1, u)), v: 0 };
      if (v < 0) return { face: "top", u: Math.max(0, Math.min(N - 1, u)), v: N - 1 };
      if (u >= N) return { face: "left", u: 0, v: Math.max(0, Math.min(N - 1, v)) };
      if (u < 0) return { face: "right", u: N - 1, v: Math.max(0, Math.min(N - 1, v)) };
    }

    // 4. BOTTOM face (-Y)
    if (face === "bottom") {
      if (v >= N) return { face: "front", u: Math.max(0, Math.min(N - 1, u)), v: 0 };
      if (v < 0) return { face: "back", u: Math.max(0, Math.min(N - 1, u)), v: N - 1 };
      if (u >= N) return { face: "right", u: Math.max(0, Math.min(N - 1, N - 1 - v)), v: 0 };
      if (u < 0) return { face: "left", u: Math.max(0, Math.min(N - 1, v)), v: 0 };
    }

    // 5. RIGHT face (+X)
    if (face === "right") {
      if (u >= N) return { face: "back", u: 0, v: Math.max(0, Math.min(N - 1, v)) };
      if (u < 0) return { face: "front", u: N - 1, v: Math.max(0, Math.min(N - 1, v)) };
      if (v >= N) return { face: "top", u: N - 1, v: Math.max(0, Math.min(N - 1, u)) };
      if (v < 0) return { face: "bottom", u: N - 1, v: Math.max(0, Math.min(N - 1, N - 1 - u)) };
    }

    // 6. LEFT face (-X)
    if (face === "left") {
      if (u >= N) return { face: "front", u: 0, v: Math.max(0, Math.min(N - 1, v)) };
      if (u < 0) return { face: "back", u: N - 1, v: Math.max(0, Math.min(N - 1, v)) };
      if (v >= N) return { face: "top", u: 0, v: Math.max(0, Math.min(N - 1, N - 1 - u)) };
      if (v < 0) return { face: "bottom", u: 0, v: Math.max(0, Math.min(N - 1, u)) };
    }
    return null;
  }

  // Create Flag Model (3D futuristic hologram beacon)
  public createFlagModel(): THREE.Group {
    const group = new THREE.Group();
    const scale = 0.5;

    // Glowing base ring
    const baseGeo = new THREE.CylinderGeometry(0.24 * scale, 0.3 * scale, 0.08 * scale, 12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.9 * scale, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0.45 * scale;
    group.add(pole);

    // Holographic flag banner (Triangle)
    const bannerShape = new THREE.Shape();
    bannerShape.moveTo(0, 0);
    bannerShape.lineTo(0.45 * scale, 0.18 * scale);
    bannerShape.lineTo(0, 0.36 * scale);
    bannerShape.closePath();

    const bannerGeo = new THREE.ShapeGeometry(bannerShape);
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0.02 * scale, 0.5 * scale, 0);
    group.add(banner);

    // Tip beacon sphere
    const tipGeo = new THREE.SphereGeometry(0.06 * scale, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.9 * scale;
    group.add(tip);

    return group;
  }

  private geoMineCore = new THREE.SphereGeometry(0.36, 12, 12);
  private geoMineSpike = new THREE.ConeGeometry(0.06, 0.3, 6);

  // Create Mine Model (3D futuristic naval mine - zero point lights for maximum performance)
  public createMineModel(): THREE.Group {
    const group = new THREE.Group();

    // Core sphere (reused geometry & glowing emissive material)
    const core = new THREE.Mesh(this.geoMineCore, this.matMineCore);
    group.add(core);

    // Spikes protruding in 6 axes + 4 diagonals (reused geometry)
    const spikeDirs = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 1, 1).normalize(),
      new THREE.Vector3(-1, 1, 1).normalize(),
      new THREE.Vector3(1, -1, 1).normalize(),
      new THREE.Vector3(1, 1, -1).normalize(),
    ];

    spikeDirs.forEach((dir) => {
      const spike = new THREE.Mesh(this.geoMineSpike, this.matMineSpike);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      spike.position.copy(dir).multiplyScalar(0.28);
      group.add(spike);
    });

    return group;
  }

  // Create High-DPI Canvas Number Sprite
  public createNumberSprite(number: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Color scheme based on number value
      const colors = [
        "#38bdf8", // 1: Sky Blue
        "#34d399", // 2: Emerald Green
        "#f87171", // 3: Coral Red
        "#a78bfa", // 4: Violet
        "#fbbf24", // 5: Amber
        "#22d3ee", // 6: Cyan
        "#f472b6", // 7: Rose/Pink
        "#e11d48", // 8+: Crimson
      ];
      const color = colors[Math.min(number - 1, colors.length - 1)];

      ctx.clearRect(0, 0, size, size);

      // Background soft glowing aura
      const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, 54);
      grad.addColorStop(0, "rgba(15, 23, 42, 0.75)");
      grad.addColorStop(0.8, "rgba(15, 23, 42, 0.35)");
      grad.addColorStop(1, "rgba(15, 23, 42, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 54, 0, Math.PI * 2);
      ctx.fill();

      // Bold text with drop shadow & dark outline
      ctx.font = "900 68px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.strokeStyle = "#020617";
      ctx.lineWidth = 10;
      ctx.lineJoin = "round";
      ctx.strokeText(number.toString(), size / 2, size / 2 + 2);

      ctx.fillStyle = color;
      ctx.fillText(number.toString(), size / 2, size / 2 + 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.renderOrder = 100;
    sprite.scale.set(this.cubeSize * 0.72, this.cubeSize * 0.72, 1);
    return sprite;
  }

  // Create recessed bedrock foundation plate for excavated tiles
  public createBedrockTile(cellId: string): THREE.Group {
    const group = new THREE.Group();
    const size = this.cubeSize * 0.96;
    const thickness = 0.08;

    // Recessed base slab
    const geo = new THREE.BoxGeometry(size, thickness, size);
    const mesh = new THREE.Mesh(geo, this.matBedrock);
    mesh.userData = { cellId, isBedrock: true };
    group.add(mesh);

    // Subtle sci-fi border wire
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
    });
    const wire = new THREE.LineSegments(edges, lineMat);
    wire.raycast = () => {};
    group.add(wire);

    return group;
  }
}
