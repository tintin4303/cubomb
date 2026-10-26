import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CellData, FaceDirection, GameMode } from "./types";

export class BoardManager {
  public gridSize: number;
  public totalMines: number;
  public mode: GameMode;
  public spacing: number = 1.05;
  public cubeSize: number = 1.0;

  public cells: CellData[] = [];
  public cellMap: Map<string, CellData> = new Map();
  public neighborMap: Map<string, CellData[]> = new Map();
  public firstClickDone: boolean = false;

  // Cached 3D model template
  private static cachedMineTemplate: THREE.Group | null = null;
  private static isModelLoading: boolean = false;

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
    this.neighborMap.clear();
    this.firstClickDone = false;
    this.initSurfaceCells();
    this.buildNeighborMap();
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

  // Place mines guaranteed safe from one or more safe anchor cells (and all their neighbors)
  public populateMines(safeCell: CellData, extraSafeCells: CellData[] = []): string[] {
    this.firstClickDone = true;
    const allAnchors = [safeCell, ...extraSafeCells];
    const safeIds = new Set<string>();
    allAnchors.forEach((anchor) => {
      safeIds.add(anchor.id);
      this.getNeighbors(anchor).forEach((n) => safeIds.add(n.id));
    });

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

  // Build exact 3D Euclidean neighbor map across all 6 cube faces, edges, and corners
  private buildNeighborMap() {
    this.neighborMap.clear();
    const N = this.gridSize;
    const spacing = this.spacing;
    const half = (N - 1) / 2;
    const faceDist = (half + 0.5) * spacing;
    const thresholdSq = Math.pow(1.42 * spacing, 2);

    const posList: { cell: CellData; x: number; y: number; z: number }[] = [];
    for (const cell of this.cells) {
      const uPos = (cell.x - half) * spacing;
      const vPos = (cell.y - half) * spacing;
      let x = 0;
      let y = 0;
      let z = 0;

      switch (cell.face) {
        case "top":
          x = uPos;
          y = faceDist;
          z = -vPos;
          break;
        case "bottom":
          x = uPos;
          y = -faceDist;
          z = vPos;
          break;
        case "front":
          x = uPos;
          y = vPos;
          z = faceDist;
          break;
        case "back":
          x = -uPos;
          y = -vPos;
          z = -faceDist;
          break;
        case "left":
          x = -faceDist;
          y = vPos;
          z = uPos;
          break;
        case "right":
          x = faceDist;
          y = vPos;
          z = -uPos;
          break;
        default:
          x = uPos;
          y = vPos;
          z = 0;
          break;
      }
      posList.push({ cell, x, y, z });
    }

    const oppositeFaces: Record<string, string> = {
      top: "bottom",
      bottom: "top",
      front: "back",
      back: "front",
      left: "right",
      right: "left",
    };

    for (let i = 0; i < posList.length; i++) {
      const p1 = posList[i];
      const neighbors: CellData[] = [];
      const f1 = p1.cell.face;
      const opp = f1 ? oppositeFaces[f1] : undefined;

      for (let j = 0; j < posList.length; j++) {
        if (i === j) continue;
        const p2 = posList[j];
        if (opp && p2.cell.face === opp) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        if (dx * dx + dy * dy + dz * dz <= thresholdSq) {
          neighbors.push(p2.cell);
        }
      }
      this.neighborMap.set(p1.cell.id, neighbors);
    }
  }

  // Get neighbors of a cell (O(1) precomputed exact 3D surface neighbors)
  public getNeighbors(cell: CellData): CellData[] {
    return this.neighborMap.get(cell.id) || [];
  }

  // Create Beacon Model (3D futuristic planetary sensor beacon seated flush on tile)
  public createFlagModel(): THREE.Group {
    const group = new THREE.Group();
    const scale = 0.55;

    // 1. Heavy industrial tripod collar base - seated flush at y = 0
    const baseH = 0.08 * scale;
    const baseGeo = new THREE.CylinderGeometry(0.24 * scale, 0.32 * scale, baseH, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = baseH / 2;
    group.add(base);

    // 3 stabilizing tripod foot struts
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const legGeo = new THREE.BoxGeometry(0.08 * scale, 0.04 * scale, 0.22 * scale);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(Math.sin(angle) * 0.22 * scale, 0.02 * scale, Math.cos(angle) * 0.22 * scale);
      leg.rotation.y = angle;
      group.add(leg);
    }

    // 2. Central sensor pylon shaft
    const shaftH = 0.8 * scale;
    const shaftGeo = new THREE.CylinderGeometry(0.045 * scale, 0.07 * scale, shaftH, 8);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = baseH + shaftH / 2;
    group.add(shaft);

    // 3. Dual pulsing holographic sensor rings
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.2,
      metalness: 0.5,
      roughness: 0.2,
    });
    const ring1Geo = new THREE.TorusGeometry(0.12 * scale, 0.022 * scale, 6, 16);
    ring1Geo.rotateX(Math.PI / 2);
    const ring1 = new THREE.Mesh(ring1Geo, ringMat);
    ring1.position.y = baseH + shaftH * 0.45;
    group.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(0.09 * scale, 0.018 * scale, 6, 16);
    ring2Geo.rotateX(Math.PI / 2);
    const ring2 = new THREE.Mesh(ring2Geo, ringMat);
    ring2.position.y = baseH + shaftH * 0.75;
    group.add(ring2);

    // 4. Floating holographic beacon core (Octahedron crystal emitter)
    const coreGeo = new THREE.OctahedronGeometry(0.11 * scale, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = baseH + shaftH + 0.1 * scale;
    group.add(core);

    // 5. Vertical translucent holographic signal cone (warning beam)
    const beamGeo = new THREE.CylinderGeometry(0.18 * scale, 0.02 * scale, 0.45 * scale, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = baseH + shaftH + 0.35 * scale;
    group.add(beam);

    return group;
  }

  private geoMineCore = new THREE.SphereGeometry(0.36, 12, 12);
  private geoMineSpike = new THREE.ConeGeometry(0.06, 0.3, 6);

  // Preload real 3D mine model from public assets
  public static preloadModel() {
    if (typeof window === "undefined" || BoardManager.cachedMineTemplate || BoardManager.isModelLoading) return;
    BoardManager.isModelLoading = true;
    const loader = new GLTFLoader();
    loader.load(
      "/models/mine.glb",
      (gltf) => {
        const root = gltf.scene;
        // Center model geometry
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);

        // Scale to fit tile
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetScale = 0.75 / maxDim;
        root.scale.setScalar(targetScale);

        // Apply dark metallic space-mine material
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.material) {
              const orig = m.material as THREE.MeshStandardMaterial;
              orig.metalness = 0.8;
              orig.roughness = 0.3;
            }
          }
        });

        BoardManager.cachedMineTemplate = root;
      },
      undefined,
      (err) => {
        console.warn("Could not load /models/mine.glb, using procedural fallback", err);
      }
    );
  }

  // Create Mine Model (Uses real 3D Kenney space-mine model with procedural fallback)
  public createMineModel(): THREE.Group {
    const group = new THREE.Group();

    if (BoardManager.cachedMineTemplate) {
      const clone = BoardManager.cachedMineTemplate.clone(true);
      group.add(clone);
      return group;
    }

    // Try loading template for future mine reveals
    BoardManager.preloadModel();

    // Procedural sci-fi naval mine fallback
    const core = new THREE.Mesh(this.geoMineCore, this.matMineCore);
    group.add(core);

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
