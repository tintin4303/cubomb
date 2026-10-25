import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { sound } from "./sound";

export type CharacterAction = "idle" | "walk" | "dig" | "celebrate" | "dead";

export interface SurfaceCoord {
  face: "top" | "bottom" | "front" | "back" | "left" | "right";
  u: number; // 0 to gridSize - 1
  v: number; // 0 to gridSize - 1
}

export class MinerAvatar {
  public group: THREE.Group;
  public action: CharacterAction = "idle";

  // Real 3D GLTF Astronaut Model Support
  private gltfRoot: THREE.Group | null = null;
  private gltfArmLeft: THREE.Object3D | null = null;
  private gltfArmRight: THREE.Object3D | null = null;
  private gltfLegLeft: THREE.Object3D | null = null;
  private gltfLegRight: THREE.Object3D | null = null;
  private gltfHead: THREE.Object3D | null = null;
  private isGltfLoaded: boolean = false;

  private static cachedAstronautGltf: THREE.Group | null = null;
  private static isAstronautLoading: boolean = false;
  private static pendingCallbacks: (() => void)[] = [];

  // Character sub-meshes for animation (procedural fallback)
  private proceduralContainer!: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private visorMesh!: THREE.Mesh;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;
  private pickaxeGroup!: THREE.Group;
  private antennaLight!: THREE.PointLight;
  private antennaTip!: THREE.Mesh;

  // Identity & Callbacks
  public id: string = "local_player";
  public playerName: string = "Miner";
  public currentCoord: SurfaceCoord = { face: "top", u: 1, v: 1 };
  public onFaceChange?: (face: SurfaceCoord["face"]) => void;
  public canStepTo?: (coord: SurfaceCoord) => boolean;
  public onLandOnCoord?: (coord: SurfaceCoord) => void;
  public onFootstep?: (pos: THREE.Vector3, normal: THREE.Vector3) => void;

  // Continuous 3D Movement (Roblox bLockerman style)
  public currentPosition: THREE.Vector3 = new THREE.Vector3();
  public currentNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  public moveSpeed: number = 1.9; // Appropriately slower, deliberate Roblox walking pace
  public navTargetPos: THREE.Vector3 | null = null;
  public navTargetCoord: SurfaceCoord | null = null;

  // Animation & Audio timers
  private animTimer: number = 0;
  private digTimer: number = 0;
  private footstepTimer: number = 0;

  // Dimensions & Styling
  public gridSize: number = 5;
  public spacing: number = 1.1;
  public cubeSize: number = 1.0;
  private accentColor: number = 0x0284c7;

  constructor(
    gridSize: number = 5,
    spacing: number = 1.1,
    cubeSize: number = 1.0,
    id: string = "local_player",
    playerName: string = "Miner",
    accentColor: number = 0x0284c7
  ) {
    this.gridSize = gridSize;
    this.spacing = spacing;
    this.cubeSize = cubeSize;
    this.id = id;
    this.playerName = playerName;
    this.accentColor = accentColor;

    this.group = new THREE.Group();
    this.createModel();

    // Set initial position on top face center
    const center = Math.floor(gridSize / 2);
    this.currentCoord = { face: "top", u: center, v: center };
    this.teleportToCoord(this.currentCoord);
  }

  public static preloadAstronaut(onLoaded?: () => void) {
    if (typeof window === "undefined") return;
    if (MinerAvatar.cachedAstronautGltf) {
      onLoaded?.();
      return;
    }
    if (onLoaded) {
      MinerAvatar.pendingCallbacks.push(onLoaded);
    }
    if (MinerAvatar.isAstronautLoading) return;
    MinerAvatar.isAstronautLoading = true;

    const loader = new GLTFLoader();
    loader.load(
      "/models/astronaut.glb",
      (gltf) => {
        const root = gltf.scene;
        const astronautNode = root.getObjectByName("astronautA");
        if (astronautNode) {
          astronautNode.position.set(0, 0, 0);
        }

        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.material) {
              const orig = m.material as THREE.MeshStandardMaterial;
              orig.roughness = 0.35;
              orig.metalness = 0.25;
            }
          }
        });

        MinerAvatar.cachedAstronautGltf = root;
        MinerAvatar.isAstronautLoading = false;
        MinerAvatar.pendingCallbacks.forEach((cb) => cb());
        MinerAvatar.pendingCallbacks = [];
      },
      undefined,
      (err) => {
        console.warn("Could not load /models/astronaut.glb, using procedural fallback", err);
        MinerAvatar.isAstronautLoading = false;
      }
    );
  }

  private tryAttachGltf() {
    if (MinerAvatar.cachedAstronautGltf) {
      this.attachGltfInstance(MinerAvatar.cachedAstronautGltf);
    } else {
      MinerAvatar.preloadAstronaut(() => {
        if (!this.isGltfLoaded && MinerAvatar.cachedAstronautGltf) {
          this.attachGltfInstance(MinerAvatar.cachedAstronautGltf);
        }
      });
    }
  }

  private attachGltfInstance(template: THREE.Group) {
    if (this.isGltfLoaded) return;
    const gltfClone = template.clone(true);

    this.gltfRoot = gltfClone;
    this.gltfArmLeft = gltfClone.getObjectByName("armLeft") || null;
    this.gltfArmRight = gltfClone.getObjectByName("armRight") || null;
    this.gltfLegLeft = gltfClone.getObjectByName("legLeft") || null;
    this.gltfLegRight = gltfClone.getObjectByName("legRight") || null;
    this.gltfHead = gltfClone.getObjectByName("head") || null;

    // Scale to match chibi avatar size (~0.55 relative to cube)
    this.gltfRoot.scale.setScalar(0.72);
    // Face forward (+Z direction)
    this.gltfRoot.rotation.y = Math.PI;
    this.gltfRoot.position.set(0, 0, 0);

    // Attach pickaxe to right arm if available
    if (this.gltfArmRight && this.pickaxeGroup) {
      const pickaxeClone = this.pickaxeGroup.clone(true);
      pickaxeClone.position.set(0, -0.32, 0.08);
      pickaxeClone.rotation.set(Math.PI / 4, 0, 0);
      this.gltfArmRight.add(pickaxeClone);
    }

    this.group.add(this.gltfRoot);
    if (this.proceduralContainer) {
      this.proceduralContainer.visible = false;
    }
    this.isGltfLoaded = true;
  }

  private createModel() {
    const scale = 0.55; // Cute chibi scale relative to cube size

    this.proceduralContainer = new THREE.Group();
    this.group.add(this.proceduralContainer);

    // Materials
    const matSuit = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.3,
      metalness: 0.2,
    });
    const matSuitAccent = new THREE.MeshStandardMaterial({
      color: this.accentColor,
      roughness: 0.4,
      metalness: 0.1,
    });
    const matDark = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
    });
    const matVisor = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const matGold = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.8,
    });

    // 1. Torso / Body
    const bodyGeo = new THREE.CylinderGeometry(0.24 * scale, 0.2 * scale, 0.38 * scale, 8);
    this.bodyMesh = new THREE.Mesh(bodyGeo, matSuit);
    this.bodyMesh.position.y = 0.32 * scale;
    this.proceduralContainer.add(this.bodyMesh);

    // Torso chest plate
    const chestGeo = new THREE.BoxGeometry(0.22 * scale, 0.2 * scale, 0.12 * scale);
    const chestMesh = new THREE.Mesh(chestGeo, matSuitAccent);
    chestMesh.position.set(0, 0, 0.12 * scale);
    this.bodyMesh.add(chestMesh);

    // Backpack (Life Support / Scanner battery)
    const packGeo = new THREE.BoxGeometry(0.26 * scale, 0.28 * scale, 0.18 * scale);
    const packMesh = new THREE.Mesh(packGeo, matDark);
    packMesh.position.set(0, 0.04 * scale, -0.16 * scale);
    this.bodyMesh.add(packMesh);

    // Antenna on backpack
    const antPoleGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.35 * scale);
    const antPole = new THREE.Mesh(antPoleGeo, matSuitAccent);
    antPole.position.set(0.08 * scale, 0.22 * scale, -0.16 * scale);
    this.bodyMesh.add(antPole);

    const antTipGeo = new THREE.SphereGeometry(0.045 * scale, 8, 8);
    const matAntTip = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.antennaTip = new THREE.Mesh(antTipGeo, matAntTip);
    this.antennaTip.position.set(0.08 * scale, 0.4 * scale, -0.16 * scale);
    this.bodyMesh.add(this.antennaTip);

    // Subtle beacon point light
    this.antennaLight = new THREE.PointLight(0x38bdf8, 0.8, 2.5);
    this.antennaLight.position.set(0, 0.4 * scale, 0.2 * scale);
    this.proceduralContainer.add(this.antennaLight);

    // 2. Head & Visor
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.58 * scale, 0);

    const headGeo = new THREE.SphereGeometry(0.28 * scale, 12, 12);
    const headMesh = new THREE.Mesh(headGeo, matSuit);
    this.headGroup.add(headMesh);

    // Visor
    const visorGeo = new THREE.SphereGeometry(0.24 * scale, 12, 12, 0, Math.PI);
    this.visorMesh = new THREE.Mesh(visorGeo, matVisor);
    this.visorMesh.rotation.x = -Math.PI / 2;
    this.visorMesh.position.set(0, 0.02 * scale, 0.08 * scale);
    this.visorMesh.scale.set(1.0, 0.85, 0.95);
    this.headGroup.add(this.visorMesh);

    // Helmet Ear Caps
    const earGeo = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.08 * scale, 8);
    const leftEar = new THREE.Mesh(earGeo, matSuitAccent);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.28 * scale, 0, 0);
    this.headGroup.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.x = 0.28 * scale;
    this.headGroup.add(rightEar);

    this.proceduralContainer.add(this.headGroup);

    // 3. Arms
    const armGeo = new THREE.CylinderGeometry(0.065 * scale, 0.06 * scale, 0.28 * scale, 6);
    armGeo.translate(0, -0.14 * scale, 0);

    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.25 * scale, 0.46 * scale, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, matSuit);
    this.leftArmGroup.add(leftArmMesh);
    this.proceduralContainer.add(this.leftArmGroup);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.25 * scale, 0.46 * scale, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, matSuit);
    this.rightArmGroup.add(rightArmMesh);
    this.proceduralContainer.add(this.rightArmGroup);

    // Pickaxe in right hand
    this.pickaxeGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.45 * scale, 6);
    const handleMesh = new THREE.Mesh(handleGeo, matDark);
    handleMesh.position.y = -0.12 * scale;
    this.pickaxeGroup.add(handleMesh);

    const pickHeadGeo = new THREE.BoxGeometry(0.3 * scale, 0.06 * scale, 0.06 * scale);
    const pickHeadMesh = new THREE.Mesh(pickHeadGeo, matGold);
    pickHeadMesh.position.y = 0.1 * scale;
    this.pickaxeGroup.add(pickHeadMesh);

    this.pickaxeGroup.position.set(0, -0.25 * scale, 0.08 * scale);
    this.pickaxeGroup.rotation.x = Math.PI / 4;
    this.rightArmGroup.add(this.pickaxeGroup);

    // 4. Legs
    const legGeo = new THREE.CylinderGeometry(0.075 * scale, 0.07 * scale, 0.26 * scale, 6);
    legGeo.translate(0, -0.13 * scale, 0);

    const bootGeo = new THREE.BoxGeometry(0.12 * scale, 0.1 * scale, 0.18 * scale);
    bootGeo.translate(0, -0.22 * scale, 0.04 * scale);

    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.11 * scale, 0.16 * scale, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, matSuit);
    const leftBootMesh = new THREE.Mesh(bootGeo, matDark);
    this.leftLegGroup.add(leftLegMesh);
    this.leftLegGroup.add(leftBootMesh);
    this.proceduralContainer.add(this.leftLegGroup);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.11 * scale, 0.16 * scale, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, matSuit);
    const rightBootMesh = new THREE.Mesh(bootGeo, matDark);
    this.rightLegGroup.add(rightLegMesh);
    this.rightLegGroup.add(rightBootMesh);
    this.proceduralContainer.add(this.rightLegGroup);

    // Connect real GLTF model if loaded or initiate load
    this.tryAttachGltf();
  }

  // Convert surface coordinate (face, u, v) to 3D world position
  public getCoordWorldPosition(coord: SurfaceCoord): THREE.Vector3 {
    const half = (this.gridSize - 1) / 2;
    const offset = half * this.spacing;
    const surfaceDistance = offset + this.cubeSize / 2;

    const uPos = (coord.u - half) * this.spacing;
    const vPos = (coord.v - half) * this.spacing;

    const pos = new THREE.Vector3();
    switch (coord.face) {
      case "top":
        pos.set(uPos, surfaceDistance, -vPos);
        break;
      case "bottom":
        pos.set(uPos, -surfaceDistance, vPos);
        break;
      case "front":
        pos.set(uPos, vPos, surfaceDistance);
        break;
      case "back":
        pos.set(-uPos, -vPos, -surfaceDistance);
        break;
      case "left":
        pos.set(-surfaceDistance, vPos, uPos);
        break;
      case "right":
        pos.set(surfaceDistance, vPos, -uPos);
        break;
    }
    return pos;
  }

  // Convert any 3D continuous point on the cube surface to the grid coordinate
  // Convert any 3D continuous point on the cube surface to the grid coordinate with edge hysteresis
  public getCellAtPosition(pos: THREE.Vector3, preferredFace?: SurfaceCoord["face"]): SurfaceCoord {
    const half = (this.gridSize - 1) / 2;
    const absX = Math.abs(pos.x);
    const absY = Math.abs(pos.y);
    const absZ = Math.abs(pos.z);

    const currentFace = preferredFace || this.currentCoord?.face || "top";
    let face: SurfaceCoord["face"] = currentFace;

    // Hysteresis bias: minimal threshold (0.001) avoids corner jitter while allowing clean, immediate edge crossing
    const bias = 0.001;

    let curMag = 0;
    if (currentFace === "top" || currentFace === "bottom") curMag = absY;
    else if (currentFace === "front" || currentFace === "back") curMag = absZ;
    else curMag = absX;

    const maxVal = Math.max(absX, absY, absZ);

    if (maxVal > curMag + bias) {
      if (absY >= absX && absY >= absZ) {
        face = pos.y >= 0 ? "top" : "bottom";
      } else if (absZ >= absX && absZ >= absY) {
        face = pos.z >= 0 ? "front" : "back";
      } else {
        face = pos.x >= 0 ? "right" : "left";
      }
    }

    let u = half;
    let v = half;

    switch (face) {
      case "top":
        u = half + pos.x / this.spacing;
        v = half - pos.z / this.spacing;
        break;
      case "bottom":
        u = half + pos.x / this.spacing;
        v = half + pos.z / this.spacing;
        break;
      case "front":
        u = half + pos.x / this.spacing;
        v = half + pos.y / this.spacing;
        break;
      case "back":
        u = half - pos.x / this.spacing;
        v = half - pos.y / this.spacing;
        break;
      case "left":
        u = half + pos.z / this.spacing;
        v = half + pos.y / this.spacing;
        break;
      case "right":
        u = half - pos.z / this.spacing;
        v = half + pos.y / this.spacing;
        break;
    }

    const roundU = Math.max(0, Math.min(this.gridSize - 1, Math.round(u)));
    const roundV = Math.max(0, Math.min(this.gridSize - 1, Math.round(v)));

    return { face, u: roundU, v: roundV };
  }

  // Get normal vector of a face
  public getFaceNormal(face: SurfaceCoord["face"]): THREE.Vector3 {
    switch (face) {
      case "top": return new THREE.Vector3(0, 1, 0);
      case "bottom": return new THREE.Vector3(0, -1, 0);
      case "front": return new THREE.Vector3(0, 0, 1);
      case "back": return new THREE.Vector3(0, 0, -1);
      case "left": return new THREE.Vector3(-1, 0, 0);
      case "right": return new THREE.Vector3(1, 0, 0);
    }
  }

  // Teleport instantly to coordinate
  public teleportToCoord(coord: SurfaceCoord) {
    const prevFace = this.currentCoord?.face;
    this.currentCoord = { ...coord };
    this.navTargetCoord = null;
    this.navTargetPos = null;

    this.currentPosition = this.getCoordWorldPosition(coord);
    this.group.position.copy(this.currentPosition);

    this.currentNormal = this.getFaceNormal(coord.face);

    // Default facing forward on this face
    const up = this.currentNormal;
    const defaultFwd = (Math.abs(up.y) > 0.8) ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const fwd = defaultFwd.projectOnPlane(up).normalize();
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const mat = new THREE.Matrix4().makeBasis(right, up, fwd);
    this.group.quaternion.setFromRotationMatrix(mat);

    if (this.onFaceChange && prevFace !== coord.face) {
      this.onFaceChange(coord.face);
    }
  }

  // Get the coordinate directly in front of the miner
  public getFacingCoord(): SurfaceCoord {
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();
    const probePos = this.currentPosition.clone().addScaledVector(fwd, this.spacing * 0.95);

    const half = (this.gridSize - 1) / 2;
    const offset = half * this.spacing;
    const surfaceDistance = offset + this.cubeSize / 2;
    const maxDim = Math.max(Math.abs(probePos.x), Math.abs(probePos.y), Math.abs(probePos.z));
    if (maxDim > 0.001) {
      probePos.multiplyScalar(surfaceDistance / maxDim);
    }
    return this.getCellAtPosition(probePos);
  }

  // Smoothly orient avatar towards walk direction and surface normal
  private orientAvatar(walkDir: THREE.Vector3, normal: THREE.Vector3, delta: number) {
    if (walkDir.lengthSq() < 0.001) return;

    const up = normal.clone().normalize();
    let fwd = walkDir.clone().projectOnPlane(up);
    if (fwd.lengthSq() < 0.001) {
      fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).projectOnPlane(up);
    }
    if (fwd.lengthSq() < 0.001) {
      fwd = (Math.abs(up.y) > 0.8 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0)).projectOnPlane(up);
    }
    fwd.normalize();

    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();

    // In avatar local space: right is +X, up is +Y, forward (visor) is +Z
    const rotMat = new THREE.Matrix4().makeBasis(right, up, fwd);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);

    this.group.quaternion.slerp(targetQuat, Math.min(1, delta * 14));
  }

  // Move character continuously towards target cell (Click-to-Move)
  public navigateTo(target: SurfaceCoord) {
    if (this.action === "dead") return;
    this.navTargetCoord = target;
    this.navTargetPos = this.getCoordWorldPosition(target);
  }

  // Legacy directional step (gives a smooth directional impulse)
  public stepDirection(du: number, dv: number): boolean {
    if (this.action === "dead") return false;
    const nextU = Math.max(0, Math.min(this.gridSize - 1, this.currentCoord.u + du));
    const nextV = Math.max(0, Math.min(this.gridSize - 1, this.currentCoord.v + dv));
    this.navigateTo({ face: this.currentCoord.face, u: nextU, v: nextV });
    return true;
  }

  // Legacy camera-relative step
  public stepCameraRelative(
    dir: "up" | "down" | "left" | "right",
    camera: THREE.Camera
  ): boolean {
    if (this.action === "dead") return false;
    const normal = this.currentNormal;
    const camFwd = new THREE.Vector3();
    camera.getWorldDirection(camFwd);
    const camRight = new THREE.Vector3().crossVectors(camFwd, camera.up).normalize();

    let fwdOnPlane = camFwd.clone().projectOnPlane(normal).normalize();
    if (fwdOnPlane.lengthSq() < 0.01) {
      fwdOnPlane = camera.up.clone().projectOnPlane(normal).normalize();
    }
    let rightOnPlane = camRight.clone().projectOnPlane(normal).normalize();
    if (rightOnPlane.lengthSq() < 0.01) {
      rightOnPlane = new THREE.Vector3().crossVectors(fwdOnPlane, normal).normalize();
    }

    let impulse = new THREE.Vector3();
    if (dir === "up") impulse.add(fwdOnPlane);
    if (dir === "down") impulse.sub(fwdOnPlane);
    if (dir === "right") impulse.add(rightOnPlane);
    if (dir === "left") impulse.sub(rightOnPlane);

    if (impulse.lengthSq() > 0.001) {
      impulse.normalize();
      const targetPos = this.currentPosition.clone().addScaledVector(impulse, this.spacing);
      this.navTargetPos = targetPos;
    }
    return true;
  }

  // Main Continuous Movement Loop (Roblox bLockerman style)
  public updateContinuous(
    delta: number,
    camera: THREE.Camera,
    input: { forward: boolean; backward: boolean; left: boolean; right: boolean }
  ) {
    if (this.action === "dead") {
      this.animTimer += delta;
      this.animateLimbs(delta);
      return;
    }

    const half = (this.gridSize - 1) / 2;
    const offset = half * this.spacing;
    const surfaceDistance = offset + this.cubeSize / 2;

    const currentFaceNormal = this.getFaceNormal(this.currentCoord.face);
    let walkDir = new THREE.Vector3();
    const hasInput = input.forward || input.backward || input.left || input.right;

    if (hasInput) {
      // Manual input cancels any pending click-to-walk navigation
      this.navTargetCoord = null;
      this.navTargetPos = null;

      const camForward = new THREE.Vector3();
      camera.getWorldDirection(camForward);
      const camRight = new THREE.Vector3().crossVectors(camForward, camera.up).normalize();

      // Screen-aligned movement on the face tangent plane:
      let rightOnPlane = camRight.clone().projectOnPlane(currentFaceNormal).normalize();
      if (rightOnPlane.lengthSq() < 0.01) {
        rightOnPlane = (Math.abs(currentFaceNormal.y) > 0.8)
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 0, 1).cross(currentFaceNormal).normalize();
      }
      const upOnPlane = new THREE.Vector3().crossVectors(currentFaceNormal, rightOnPlane).normalize();

      if (input.forward) walkDir.add(upOnPlane);
      if (input.backward) walkDir.sub(upOnPlane);
      if (input.right) walkDir.add(rightOnPlane);
      if (input.left) walkDir.sub(rightOnPlane);

      if (walkDir.lengthSq() > 0.001) {
        walkDir.normalize();
      }
    }

    const isMoving = walkDir.lengthSq() > 0.01;

    if (isMoving) {
      this.action = "walk";

      // Move smoothly across the surface
      const moveDist = this.moveSpeed * delta;
      const candidatePos = this.currentPosition.clone().addScaledVector(walkDir, moveDist);

      // Project onto the cube surface
      const maxDim = Math.max(Math.abs(candidatePos.x), Math.abs(candidatePos.y), Math.abs(candidatePos.z));
      if (maxDim > 0.001) {
        candidatePos.multiplyScalar(surfaceDistance / maxDim);
      }

      // Check which tile this new position enters
      const nextCellCoord = this.getCellAtPosition(candidatePos);

      // Collision check (cannot walk onto flagged mines or blocked tiles)
      let allowed = true;
      if (this.canStepTo && !this.canStepTo(nextCellCoord)) {
        if (
          nextCellCoord.face !== this.currentCoord.face ||
          nextCellCoord.u !== this.currentCoord.u ||
          nextCellCoord.v !== this.currentCoord.v
        ) {
          allowed = false;
        }
      }

      if (allowed) {
        this.currentPosition.copy(candidatePos);
        this.group.position.copy(candidatePos);

        const isNewCell =
          nextCellCoord.face !== this.currentCoord.face ||
          nextCellCoord.u !== this.currentCoord.u ||
          nextCellCoord.v !== this.currentCoord.v;

        if (isNewCell) {
          const prevFace = this.currentCoord.face;
          this.currentCoord = { ...nextCellCoord };

          if (prevFace !== nextCellCoord.face) {
            const oldNorm = this.getFaceNormal(prevFace);
            const newNorm = this.getFaceNormal(nextCellCoord.face);
            const qEdge = new THREE.Quaternion().setFromUnitVectors(oldNorm, newNorm);
            walkDir.applyQuaternion(qEdge);
            if (this.onFaceChange) {
              this.onFaceChange(nextCellCoord.face);
            }
          }

          // Step-to-reveal hook (bLockerman style)
          if (this.onLandOnCoord) {
            this.onLandOnCoord(nextCellCoord);
          }
        }
      }

      // Smoothly blend surface normal across edges
      const targetNormal = this.getFaceNormal(this.currentCoord.face);
      this.currentNormal.lerp(targetNormal, Math.min(1, delta * 15)).normalize();

      // Smoothly turn body towards walking direction
      this.orientAvatar(walkDir, this.currentNormal, delta);

      // Periodic natural footstep sound and foot dust
      this.footstepTimer += delta;
      if (this.footstepTimer >= 0.48) {
        this.footstepTimer = 0;
        sound.playStep();
        if (this.onFootstep) {
          this.onFootstep(this.currentPosition, this.currentNormal);
        }
      }
    } else {
      if (this.action === "walk") {
        this.action = "idle";
      }
      this.footstepTimer = 0.4;
    }

    // Update animations
    this.animTimer += delta;
    this.animateLimbs(delta);
  }

  // Generic fallback update
  public update(delta: number) {
    this.animTimer += delta;
    this.animateLimbs(delta);
  }

  // Trigger dig swing animation
  public triggerDig(callback?: () => void) {
    if (this.action === "dead") return;
    this.action = "dig";
    this.digTimer = 0.35;
    setTimeout(() => {
      if (this.action === "dig") {
        this.action = "idle";
      }
      callback?.();
    }, 350);
  }

  // Win celebration
  public triggerCelebrate() {
    this.action = "celebrate";
  }

  // Dead / game over
  public triggerDead() {
    this.action = "dead";
  }

  // Reset to idle
  public reset(coord?: SurfaceCoord) {
    this.action = "idle";
    this.group.rotation.set(0, 0, 0);
    if (this.gltfRoot) {
      this.gltfRoot.position.set(0, 0, 0);
      this.gltfRoot.rotation.set(0, Math.PI, 0);
    }
    const center = Math.floor(this.gridSize / 2);
    this.teleportToCoord(coord || { face: "top", u: center, v: center });
  }

  private animateLimbs(delta: number) {
    // Antenna beacon pulse
    if (this.antennaTip) {
      const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 6);
      (this.antennaTip.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.2 + 0.3 * pulse, 0.2);
    }

    if (this.action === "walk") {
      const walkFreq = 7.0;
      const swing = Math.sin(this.animTimer * walkFreq);

      // Swing procedural legs
      this.leftLegGroup.rotation.x = swing * 0.65;
      this.rightLegGroup.rotation.x = -swing * 0.65;

      // Swing procedural arms
      this.leftArmGroup.rotation.x = -swing * 0.55;
      this.rightArmGroup.rotation.x = swing * 0.55;

      // Stable body posture
      this.bodyMesh.position.y = 0.32 * 0.55;
      this.headGroup.rotation.y = swing * 0.08;

      // Swing GLTF limbs
      if (this.isGltfLoaded) {
        if (this.gltfLegLeft) this.gltfLegLeft.rotation.x = swing * 0.65;
        if (this.gltfLegRight) this.gltfLegRight.rotation.x = -swing * 0.65;
        if (this.gltfArmLeft) this.gltfArmLeft.rotation.x = -swing * 0.55;
        if (this.gltfArmRight) this.gltfArmRight.rotation.x = swing * 0.55;
        if (this.gltfHead) this.gltfHead.rotation.y = swing * 0.08;
      }
    } else if (this.action === "dig") {
      this.digTimer = Math.max(0, this.digTimer - delta);
      const digProgress = 1 - this.digTimer / 0.35;

      // Strike pickaxe
      const strike = Math.sin(digProgress * Math.PI);
      this.rightArmGroup.rotation.x = -1.2 + strike * 2.2;
      this.pickaxeGroup.rotation.x = Math.PI / 4 + strike * 0.8;
      this.bodyMesh.rotation.x = strike * 0.3;
      this.headGroup.rotation.x = strike * 0.4;

      if (this.isGltfLoaded) {
        if (this.gltfArmRight) this.gltfArmRight.rotation.x = -1.2 + strike * 2.2;
        if (this.gltfHead) this.gltfHead.rotation.x = strike * 0.4;
      }
    } else if (this.action === "celebrate") {
      // Victory dance
      const hop = Math.abs(Math.sin(this.animTimer * 8));
      this.bodyMesh.position.y = (0.32 + hop * 0.2) * 0.55;
      this.group.rotation.y += delta * 5;

      this.leftArmGroup.rotation.z = 2.2;
      this.rightArmGroup.rotation.z = -2.2;
      this.leftArmGroup.rotation.x = 0;
      this.rightArmGroup.rotation.x = 0;
      this.headGroup.rotation.x = -0.3;

      if (this.isGltfLoaded) {
        if (this.gltfRoot) this.gltfRoot.position.y = hop * 0.12;
        if (this.gltfArmLeft) this.gltfArmLeft.rotation.z = 2.0;
        if (this.gltfArmRight) this.gltfArmRight.rotation.z = -2.0;
        if (this.gltfHead) this.gltfHead.rotation.x = -0.3;
      }
    } else if (this.action === "dead") {
      // Defeated / Dizzy
      this.group.rotation.z = Math.PI / 2.2;
      this.leftArmGroup.rotation.x = 1.0;
      this.rightArmGroup.rotation.x = 1.0;
      this.headGroup.rotation.y = Math.sin(this.animTimer * 4) * 0.4;

      if (this.isGltfLoaded) {
        if (this.gltfArmLeft) this.gltfArmLeft.rotation.x = 1.0;
        if (this.gltfArmRight) this.gltfArmRight.rotation.x = 1.0;
        if (this.gltfHead) this.gltfHead.rotation.y = Math.sin(this.animTimer * 4) * 0.4;
      }
    } else {
      // Idle breathing
      const breath = Math.sin(this.animTimer * 2.5);
      this.bodyMesh.position.y = (0.32 + breath * 0.015) * 0.55;
      this.headGroup.position.y = (0.58 + breath * 0.01) * 0.55;
      this.headGroup.rotation.y = Math.sin(this.animTimer * 0.8) * 0.15;

      // Smoothly return limbs to resting posture
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, Math.min(1, delta * 10));
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, Math.min(1, delta * 10));
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, Math.min(1, delta * 10));
      this.leftArmGroup.rotation.z = THREE.MathUtils.lerp(this.leftArmGroup.rotation.z, 0, Math.min(1, delta * 10));
      this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0.2, Math.min(1, delta * 10));
      this.rightArmGroup.rotation.z = THREE.MathUtils.lerp(this.rightArmGroup.rotation.z, 0, Math.min(1, delta * 10));
      this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, 0, Math.min(1, delta * 10));

      if (this.isGltfLoaded) {
        if (this.gltfRoot) this.gltfRoot.position.y = THREE.MathUtils.lerp(this.gltfRoot.position.y, 0, Math.min(1, delta * 10));
        if (this.gltfLegLeft) this.gltfLegLeft.rotation.x = THREE.MathUtils.lerp(this.gltfLegLeft.rotation.x, 0, Math.min(1, delta * 10));
        if (this.gltfLegRight) this.gltfLegRight.rotation.x = THREE.MathUtils.lerp(this.gltfLegRight.rotation.x, 0, Math.min(1, delta * 10));
        if (this.gltfArmLeft) {
          this.gltfArmLeft.rotation.x = THREE.MathUtils.lerp(this.gltfArmLeft.rotation.x, 0, Math.min(1, delta * 10));
          this.gltfArmLeft.rotation.z = THREE.MathUtils.lerp(this.gltfArmLeft.rotation.z, 0, Math.min(1, delta * 10));
        }
        if (this.gltfArmRight) {
          this.gltfArmRight.rotation.x = THREE.MathUtils.lerp(this.gltfArmRight.rotation.x, 0, Math.min(1, delta * 10));
          this.gltfArmRight.rotation.z = THREE.MathUtils.lerp(this.gltfArmRight.rotation.z, 0, Math.min(1, delta * 10));
        }
        if (this.gltfHead) {
          this.gltfHead.rotation.x = THREE.MathUtils.lerp(this.gltfHead.rotation.x, 0, Math.min(1, delta * 10));
          this.gltfHead.rotation.y = THREE.MathUtils.lerp(this.gltfHead.rotation.y, Math.sin(this.animTimer * 0.8) * 0.15, Math.min(1, delta * 10));
        }
      }
    }
  }

  // Synchronize remote avatar state from multiplayer updates
  public updateRemote(
    targetPos: { x: number; y: number; z: number },
    targetNormal: { x: number; y: number; z: number },
    remoteAction: "idle" | "walk" | "dig" | "celebrate" | "dead",
    delta: number
  ) {
    this.animTimer += delta;
    this.action = remoteAction;
    const dest = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    const norm = new THREE.Vector3(targetNormal.x, targetNormal.y, targetNormal.z).normalize();

    // Smooth position lerp
    this.currentPosition.lerp(dest, Math.min(1, delta * 12));
    this.group.position.copy(this.currentPosition);
    this.currentNormal.copy(norm);

    // Orient upwards matching surface normal
    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);
    if (currentUp.dot(norm) < 0.999) {
      const q = new THREE.Quaternion().setFromUnitVectors(currentUp, norm);
      this.group.quaternion.premultiply(q);
    }

    this.animateLimbs(delta);
  }
}

export function createNameplateSprite(name: string, colorHex: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
    if (ctx.roundRect) {
      ctx.roundRect(4, 4, 248, 56, 12);
    } else {
      ctx.rect(4, 4, 248, 56);
    }
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = colorHex || "#0284c7";
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 128, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.4, 0.35, 1);
  return sprite;
}
