"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import confetti from "canvas-confetti";
import {
  CellData,
  Difficulty,
  GameMode,
  GameState,
  DIFFICULTY_PRESETS,
  FaceDirection,
} from "./types";
import { BoardManager } from "./board";
import { MinerAvatar, SurfaceCoord } from "./character";
import { ParticleManager } from "./particles";
import { sound } from "./sound";
import { GameHUD } from "./GameHUD";
import { StartMenu } from "./StartMenu";
import { PartyLobbyModal } from "./PartyLobbyModal";
import { partyClient } from "@/lib/partyClient";
import { PartySession } from "./types";
import { createNameplateSprite } from "./character";

export const MinesweeperGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Game Settings & State ---
  const [mode, setMode] = useState<GameMode>("surface");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [gameState, setGameState] = useState<GameState>("idle");
  const [interactMode, setInteractMode] = useState<"reveal" | "flag">("reveal");
  const [followMiner, setFollowMiner] = useState<boolean>(true);
  const [minerFace, setMinerFace] = useState<FaceDirection>("top");
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Start Menu & Party Session State
  const [showStartMenu, setShowStartMenu] = useState<boolean>(true);
  const [showLobbyModal, setShowLobbyModal] = useState<boolean>(false);
  const [partySession, setPartySession] = useState<PartySession | null>(null);
  const remoteAvatarsRef = useRef<Map<string, { avatar: MinerAvatar; nameplate: THREE.Sprite }>>(new Map());

  // Counters
  const [minesRemaining, setMinesRemaining] = useState<number>(DIFFICULTY_PRESETS.medium.mines);
  const [flagsPlaced, setFlagsPlaced] = useState<number>(0);
  const [timeSeconds, setTimeSeconds] = useState<number>(0);

  // --- Three.js & Engine Refs ---
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const boardManagerRef = useRef<BoardManager | null>(null);
  const minerAvatarRef = useRef<MinerAvatar | null>(null);
  const particleManagerRef = useRef<ParticleManager | null>(null);

  const cellsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const hoveredCellRef = useRef<CellData | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastManualControlTimeRef = useRef<number>(0);
  const clickStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Continuous movement inputs (Roblox bLockerman style)
  const keysPressedRef = useRef<{ forward: boolean; backward: boolean; left: boolean; right: boolean }>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const mobileMoveDirRef = useRef<{ x: number; z: number } | null>(null);
  const currentMinerFaceRef = useRef<FaceDirection>("top");

  const currentConfig = DIFFICULTY_PRESETS[difficulty];

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;
  const interactModeRef = useRef<"reveal" | "flag">(interactMode);
  interactModeRef.current = interactMode;

  const resetMovementInputs = useCallback(() => {
    keysPressedRef.current = { forward: false, backward: false, left: false, right: false };
    mobileMoveDirRef.current = null;
    if (minerAvatarRef.current && minerAvatarRef.current.action === "walk") {
      minerAvatarRef.current.action = "idle";
    }
  }, []);

  const handleSetInteractMode = useCallback(
    (newMode: "reveal" | "flag") => {
      resetMovementInputs();
      setInteractMode(newMode);
    },
    [resetMovementInputs]
  );

  useEffect(() => {
    resetMovementInputs();
  }, [interactMode, resetMovementInputs]);

  const handleGameOver = useCallback((win: boolean, broadcast: boolean = true) => {
    setGameState(win ? "won" : "lost");
    gameStateRef.current = win ? "won" : "lost";
    const board = boardManagerRef.current;
    const scene = sceneRef.current;
    const miner = minerAvatarRef.current;
    if (!board || !scene) return;

    if (broadcast && partyClient.session) {
      partyClient.sendAction({
        type: "game_over",
        explodedBy: win ? undefined : partyClient.playerName,
      });
    }

    if (win) {
      sound.playWin();
      if (miner) miner.triggerCelebrate();

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      board.cells.forEach((cell) => {
        if (cell.isMine) {
          if (cell.mesh) {
            cell.mesh.visible = false;
            cell.mesh.removeFromParent();
          }
          if (cell.flagMesh) {
            cell.flagMesh.removeFromParent();
            cell.flagMesh = undefined;
          }

          const mine = board.createMineModel();
          if (cell.mesh) mine.position.copy(cell.mesh.position);
          scene.add(mine);
          cell.mineMesh = mine;
        }
      });
    }
  }, []);

  const handleGameOverRef = useRef<(win: boolean, broadcast?: boolean) => void>(handleGameOver);
  handleGameOverRef.current = handleGameOver;

  const checkVictory = useCallback(() => {
    const board = boardManagerRef.current;
    if (!board) return;

    const unrevealedSafe = board.cells.filter((c) => !c.isMine && !c.isRevealed);
    if (unrevealedSafe.length === 0) {
      handleGameOver(true);
    }
  }, [handleGameOver]);

  const revealCell = useCallback(
    (cell: CellData, broadcast: boolean = true) => {
      if (cell.isRevealed || cell.isFlagged || gameStateRef.current === "won" || gameStateRef.current === "lost") {
        return;
      }

      const board = boardManagerRef.current;
      const scene = sceneRef.current;
      const miner = minerAvatarRef.current;
      const particles = particleManagerRef.current;
      if (!board || !scene) return;

      // Guaranteed safe first reveal
      if (!board.firstClickDone) {
        board.populateMines(cell);
        setGameState("playing");
        gameStateRef.current = "playing";
      }

      // Broadcast reveal to party
      if (broadcast && partyClient.session) {
        const mineLocations = board.cells.filter((c) => c.isMine).map((c) => c.id);
        partyClient.sendAction({
          type: "reveal",
          cellId: cell.id,
          minesLocations: mineLocations.length > 0 ? mineLocations : undefined,
        });
      }

      // Animate Miner Digging
      if (miner && cell.mesh) {
        miner.triggerDig(() => {
          if (particles && cell.mesh) {
            particles.spawnDigSparks(cell.mesh.position);
          }
        });
      }

      cell.isRevealed = true;

      // Visual removal of unrevealed block
      if (cell.mesh) {
        cell.mesh.visible = false;
        cell.mesh.removeFromParent();
      }
      if (cell.flagMesh) {
        cell.flagMesh.removeFromParent();
        cell.flagMesh = undefined;
      }

      // Check if Mine
      if (cell.isMine) {
        sound.playExplosion();
        if (particles && cell.mesh) {
          particles.spawnExplosion(cell.mesh.position, 100);
        }
        if (miner) miner.triggerDead();
        handleGameOver(false);
        return;
      }

      // Safe Cell
      sound.playReveal(cell.neighborMines);

      // Create excavated bedrock foundation tile in surface mode
      if (mode === "surface" && cell.mesh) {
        const bedrock = board.createBedrockTile(cell.id);
        bedrock.position.copy(cell.mesh.position);
        if (cell.face && miner) {
          const norm = miner.getFaceNormal(cell.face);
          bedrock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
          bedrock.position.addScaledVector(norm, -0.15);
        }
        scene.add(bedrock);
        cell.bedrockMesh = bedrock;
      }

      if (cell.neighborMines > 0) {
        // Show 3D Number Sprite
        const sprite = board.createNumberSprite(cell.neighborMines);
        if (cell.mesh) {
          sprite.position.copy(cell.mesh.position);
          if (cell.face && miner) {
            const norm = miner.getFaceNormal(cell.face);
            sprite.position.addScaledVector(norm, 0.2);
          }
        }
        scene.add(sprite);
        cell.sprite = sprite;
      } else {
        // Queue-based BFS Flood Fill
        const queue: CellData[] = [cell];
        const visited = new Set<string>([cell.id]);

        while (queue.length > 0) {
          const current = queue.shift()!;
          const neighbors = board.getNeighbors(current);

          neighbors.forEach((neighbor) => {
            if (visited.has(neighbor.id) || neighbor.isFlagged) return;
            visited.add(neighbor.id);

            if (!neighbor.isRevealed) {
              neighbor.isRevealed = true;

              if (neighbor.mesh) {
                neighbor.mesh.visible = false;
                neighbor.mesh.removeFromParent();
              }
              if (neighbor.flagMesh) {
                neighbor.flagMesh.removeFromParent();
                neighbor.flagMesh = undefined;
              }

              if (mode === "surface" && neighbor.mesh) {
                const bedrock = board.createBedrockTile(neighbor.id);
                bedrock.position.copy(neighbor.mesh.position);
                if (neighbor.face && miner) {
                  const norm = miner.getFaceNormal(neighbor.face);
                  bedrock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
                  bedrock.position.addScaledVector(norm, -0.15);
                }
                scene.add(bedrock);
                neighbor.bedrockMesh = bedrock;
              }

              if (neighbor.neighborMines > 0) {
                const sprite = board.createNumberSprite(neighbor.neighborMines);
                if (neighbor.mesh) {
                  sprite.position.copy(neighbor.mesh.position);
                  if (neighbor.face && miner) {
                    const norm = miner.getFaceNormal(neighbor.face);
                    sprite.position.addScaledVector(norm, 0.2);
                  }
                }
                scene.add(sprite);
                neighbor.sprite = sprite;
              } else {
                queue.push(neighbor);
              }
            }
          });
        }
      }

      checkVictory();
    },
    [mode, checkVictory, handleGameOver]
  );

  const toggleFlag = useCallback(
    (cell: CellData, broadcast: boolean = true) => {
      if (cell.isRevealed || gameStateRef.current === "won" || gameStateRef.current === "lost") return;

      const board = boardManagerRef.current;
      const scene = sceneRef.current;
      if (!board || !scene || !cell.mesh) return;

      cell.isFlagged = !cell.isFlagged;
      sound.playFlag(cell.isFlagged);

      if (broadcast && partyClient.session) {
        partyClient.sendAction({
          type: "flag",
          cellId: cell.id,
          isFlagged: cell.isFlagged,
        });
      }

      if (cell.isFlagged) {
        // Add 3D Flag Mesh
        const flag = board.createFlagModel();
        flag.position.copy(cell.mesh.position);

        if (cell.face && minerAvatarRef.current) {
          const norm = minerAvatarRef.current.getFaceNormal(cell.face);
          flag.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
          flag.position.addScaledVector(norm, 0.45);
        }

        scene.add(flag);
        cell.flagMesh = flag;
        cell.mesh.material = board.matFlagged;
        setFlagsPlaced((f) => f + 1);
        setMinesRemaining((m) => m - 1);
      } else {
        // Remove Flag
        if (cell.flagMesh) {
          cell.flagMesh.removeFromParent();
          cell.flagMesh = undefined;
        }
        cell.mesh.material = board.matHidden;
        setFlagsPlaced((f) => f - 1);
        setMinesRemaining((m) => m + 1);
      }
    },
    []
  );

  const revealCellRef = useRef<(cell: CellData, broadcast?: boolean) => void>(revealCell);
  revealCellRef.current = revealCell;

  const toggleFlagRef = useRef<(cell: CellData, broadcast?: boolean) => void>(toggleFlag);
  toggleFlagRef.current = toggleFlag;

  // --- Initialize Scene & Game ---
  const initGame = useCallback(
    (customMode?: GameMode, customDiff?: Difficulty) => {
      const container = containerRef.current;
      if (!container) return;

      const activeMode = customMode || mode;
      const activeDiff = customDiff || difficulty;
      const activeConfig = DIFFICULTY_PRESETS[activeDiff];

      // Reset State
      setGameState("idle");
      gameStateRef.current = "idle";
      setTimeSeconds(0);
      const totalMines = activeConfig.mines;
      setMinesRemaining(totalMines);
      setFlagsPlaced(0);

      const width = container.clientWidth || window.innerWidth || 800;
      const height = container.clientHeight || window.innerHeight || 600;

      // 1. Persistent Scene
      let scene = sceneRef.current;
      if (!scene) {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x060913, 0.015);
        sceneRef.current = scene;
      } else {
        scene.clear();
        remoteAvatarsRef.current.clear();
      }

      // 2. Persistent Camera
      let camera = cameraRef.current;
      const camDist = activeConfig.gridSize * 2.8;
    if (!camera) {
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(camDist, camDist * 0.9, camDist * 1.2);
      cameraRef.current = camera;
    }

    // 3. Persistent WebGLRenderer (Created once, never destroyed across rounds)
    let renderer = rendererRef.current;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);
    }

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(15, 25, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.6);
    dirLight2.position.set(-20, -15, -15);
    scene.add(dirLight2);

    const rimLight = new THREE.PointLight(0x0284c7, 1.5, 40);
    rimLight.position.set(0, 0, 0);
    scene.add(rimLight);

    // 5. Starfield Background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 180;
      starPositions[i + 1] = (Math.random() - 0.5) * 180;
      starPositions[i + 2] = (Math.random() - 0.5) * 180;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.35,
      transparent: true,
      opacity: 0.75,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // 6. Particle Manager
    const particles = new ParticleManager(scene);
    particleManagerRef.current = particles;

    // 7. Board Manager
    const board = new BoardManager(activeConfig.gridSize, activeConfig.mines, activeMode);
    boardManagerRef.current = board;
    const cells = board.initBoard();

    // 8. Grid Layout & Core Planet
    const N = activeConfig.gridSize;
    const spacing = 1.05;
    const cubeSize = 1.0;
    const half = (N - 1) / 2;
    const offset = half * spacing;
    const surfaceDistance = offset + cubeSize / 2;

    // Solid Bedrock Core to eliminate empty void inside and anchor the planetoid
    if (activeMode === "surface") {
      const coreSize = (N - 1) * spacing + cubeSize * 0.92;
      const coreGeo = new THREE.BoxGeometry(coreSize, coreSize, coreSize);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x080d1a,
        roughness: 0.85,
        metalness: 0.3,
      });
      scene.add(new THREE.Mesh(coreGeo, coreMat));
    }

    // Cells Mesh Group
    const cellsGroup = new THREE.Group();
    cellsGroupRef.current = cellsGroup;
    scene.add(cellsGroup);

    // Surface tile plate geometry - slim plates eliminate edge Z-fighting completely!
    const tileThickness = 0.22;
    const tileGeo = new THREE.BoxGeometry(cubeSize * 0.98, cubeSize * 0.98, tileThickness);
    const edgesGeo = new THREE.EdgesGeometry(tileGeo);
    const edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
    });

    cells.forEach((cell) => {
      const mesh = new THREE.Mesh(tileGeo, board.matHidden);
      const wire = new THREE.LineSegments(edgesGeo, edgeLineMat);
      wire.raycast = () => {};
      mesh.add(wire);

      if (activeMode === "surface") {
        const uPos = (cell.x - half) * spacing;
        const vPos = (cell.y - half) * spacing;
        const faceDist = surfaceDistance - tileThickness / 2;

        switch (cell.face) {
          case "top":
            mesh.position.set(uPos, faceDist, -vPos);
            mesh.rotation.x = Math.PI / 2;
            break;
          case "bottom":
            mesh.position.set(uPos, -faceDist, vPos);
            mesh.rotation.x = -Math.PI / 2;
            break;
          case "front":
            mesh.position.set(uPos, vPos, faceDist);
            mesh.rotation.set(0, 0, 0);
            break;
          case "back":
            mesh.position.set(-uPos, -vPos, -faceDist);
            mesh.rotation.y = Math.PI;
            break;
          case "left":
            mesh.position.set(-faceDist, vPos, uPos);
            mesh.rotation.y = -Math.PI / 2;
            break;
          case "right":
            mesh.position.set(faceDist, vPos, -uPos);
            mesh.rotation.y = Math.PI / 2;
            break;
        }
      } else {
        mesh.position.set(
          cell.x * spacing - offset,
          cell.y * spacing - offset,
          cell.z * spacing - offset
        );
      }

      mesh.userData = { cellId: cell.id };
      cellsGroup.add(mesh);
      cell.mesh = mesh;
    });

    // 9. Miner Avatar - Random Planet Spawn & Auto-Opening (bLockerman style)
    const faces: FaceDirection[] = ["top", "front", "right", "back", "left", "bottom"];
    const randomFace = faces[Math.floor(Math.random() * faces.length)];
    const randomU = Math.floor(Math.random() * N);
    const randomV = Math.floor(Math.random() * N);
    const spawnCoord: SurfaceCoord = { face: randomFace, u: randomU, v: randomV };

    const playerHex = parseInt((partyClient.playerColor || "#0284c7").replace("#", "0x"), 16) || 0x0284c7;
    const miner = new MinerAvatar(
      N,
      spacing,
      cubeSize,
      partyClient.playerId || "local_player",
      partyClient.playerName || "Miner",
      playerHex
    );
    miner.teleportToCoord(spawnCoord);
    currentMinerFaceRef.current = randomFace;
    miner.onFaceChange = (newFace) => {
      const oldFace = currentMinerFaceRef.current;
      currentMinerFaceRef.current = newFace;
      setMinerFace(newFace);

      // Seamlessly rotate third-person follow camera around cube planet
      if (cameraRef.current && minerAvatarRef.current && oldFace !== newFace) {
        const oldNorm = minerAvatarRef.current.getFaceNormal(oldFace);
        const newNorm = minerAvatarRef.current.getFaceNormal(newFace);
        const qEdge = new THREE.Quaternion().setFromUnitVectors(oldNorm, newNorm);

        // Rotate camera position and up vector around the cube center (0, 0, 0)
        cameraRef.current.position.applyQuaternion(qEdge);
        cameraRef.current.up.applyQuaternion(qEdge);
        controlsTargetRef.current.copy(minerAvatarRef.current.group.position);
        cameraRef.current.lookAt(controlsTargetRef.current);
      }
    };
    miner.canStepTo = (coord) => {
      const cell = board.cellMap.get(`${coord.face}_${coord.u}_${coord.v}`);
      return !!cell; // All board tiles, including flagged ones, are walkable
    };
    miner.onLandOnCoord = (coord) => {
      const cell = board.cellMap.get(`${coord.face}_${coord.u}_${coord.v}`);
      if (cell && !cell.isRevealed && !cell.isFlagged) {
        revealCellRef.current(cell);
      }
    };
    minerAvatarRef.current = miner;
    scene.add(miner.group);
    setMinerFace(randomFace);

    // Orient camera immediately in third-person directly framing the miner
    const normal = miner.currentNormal;
    const worldUp = Math.abs(normal.y) > 0.8 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const tilt = worldUp.clone().projectOnPlane(normal).normalize().multiplyScalar(0.42);
    const targetDir = normal.clone().multiplyScalar(0.85).add(tilt).normalize();
    camera.up.copy(worldUp);
    camera.position.copy(miner.group.position).add(targetDir.multiplyScalar(camDist));
    controlsTargetRef.current.copy(miner.group.position);
    camera.lookAt(controlsTargetRef.current);

    // Auto-reveal starting cell to open the safe opening cluster immediately
    const startCell = board.cellMap.get(`${randomFace}_${randomU}_${randomV}`);
    if (startCell) {
      revealCell(startCell);
    }
  }, [mode, difficulty, revealCell]);

  // Initial load
  useEffect(() => {
    initGame();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth || 800;
      const h = containerRef.current.clientHeight || window.innerHeight || 600;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [initGame]);

  // --- Animation Loop ---
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Roblox-style 3rd-person follow camera (smooth translation, never forcibly snaps angle)
      if (followMiner && minerAvatarRef.current && cameraRef.current) {
        const minerPos = minerAvatarRef.current.group.position;
        const target = controlsTargetRef.current;
        const targetDelta = minerPos.clone().sub(target).multiplyScalar(0.12);
        target.add(targetDelta);

        // Translate camera along with target so the view angle set by the player is 100% preserved
        cameraRef.current.position.add(targetDelta);
        cameraRef.current.lookAt(target);
      }

      // Update Miner Avatar Continuous Movement (Roblox bLockerman style)
      if (minerAvatarRef.current && cameraRef.current) {
        let fwd = keysPressedRef.current.forward;
        let bwd = keysPressedRef.current.backward;
        let lft = keysPressedRef.current.left;
        let rgt = keysPressedRef.current.right;

        if (mobileMoveDirRef.current) {
          if (mobileMoveDirRef.current.z > 0) fwd = true;
          if (mobileMoveDirRef.current.z < 0) bwd = true;
          if (mobileMoveDirRef.current.x < 0) lft = true;
          if (mobileMoveDirRef.current.x > 0) rgt = true;
        }

        minerAvatarRef.current.updateContinuous(delta, cameraRef.current, {
          forward: fwd,
          backward: bwd,
          left: lft,
          right: rgt,
        });
      }

      // Update Particles
      if (particleManagerRef.current) {
        particleManagerRef.current.update(delta);
      }

      // Multiplayer: update remote avatars and send local heartbeat
      if (partySession && sceneRef.current) {
        const scene = sceneRef.current;
        const currentPlayers = partySession.players || {};
        const activeIds = new Set<string>();

        Object.entries(currentPlayers).forEach(([pId, p]) => {
          if (pId === partyClient.playerId) return;
          activeIds.add(pId);

          let remote = remoteAvatarsRef.current.get(pId);
          if (!remote) {
            const colorNum = parseInt((p.color || "#0284c7").replace("#", "0x"), 16);
            const avatar = new MinerAvatar(
              currentConfig.gridSize,
              1.05,
              1.0,
              pId,
              p.name || "Explorer",
              colorNum
            );
            const nameplate = createNameplateSprite(p.name || "Explorer", p.color || "#0284c7");
            scene.add(avatar.group);
            scene.add(nameplate);
            remote = { avatar, nameplate };
            remoteAvatarsRef.current.set(pId, remote);
          }

          if (p.position && p.normal) {
            remote.avatar.updateRemote(p.position, p.normal, p.action || "idle", delta);
            remote.nameplate.position
              .copy(remote.avatar.group.position)
              .addScaledVector(remote.avatar.currentNormal, 0.72);
          }
        });

        // Cleanup disconnected remote players
        remoteAvatarsRef.current.forEach((remote, pId) => {
          if (!activeIds.has(pId)) {
            scene.remove(remote.avatar.group);
            scene.remove(remote.nameplate);
            remoteAvatarsRef.current.delete(pId);
          }
        });

        // Send local player heartbeat
        if (minerAvatarRef.current) {
          const m = minerAvatarRef.current;
          partyClient.sendHeartbeat({
            coord: m.currentCoord,
            position: { x: m.currentPosition.x, y: m.currentPosition.y, z: m.currentPosition.z },
            normal: { x: m.currentNormal.x, y: m.currentNormal.y, z: m.currentNormal.z },
            facing: 0,
            action: m.action,
          });
        }
      }

      // Pulse mine cores without matrix mutations (zero lag)
      if (gameState === "lost" && boardManagerRef.current) {
        boardManagerRef.current.matMineCore.emissiveIntensity = 0.8 + Math.sin(time * 0.008) * 0.5;
      }

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [gameState, followMiner, partySession, currentConfig.gridSize]);

  // --- Keyboard Controls (Continuous WASD / Arrow Walking, F / Q to Flag) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const miner = minerAvatarRef.current;
      const board = boardManagerRef.current;
      if (!miner || !board || gameState === "won" || gameState === "lost") return;

      const key = e.key.toLowerCase();

      // Continuous movement keys
      if (key === "w" || key === "arrowup") {
        e.preventDefault();
        keysPressedRef.current.forward = true;
      } else if (key === "s" || key === "arrowdown") {
        e.preventDefault();
        keysPressedRef.current.backward = true;
      } else if (key === "a" || key === "arrowleft") {
        e.preventDefault();
        keysPressedRef.current.left = true;
      } else if (key === "d" || key === "arrowright") {
        e.preventDefault();
        keysPressedRef.current.right = true;
      }
      // Action F or Q = Flag Hovered Tile (or Facing Tile)
      else if (key === "f" || key === "q") {
        e.preventDefault();
        if (hoveredCellRef.current) {
          toggleFlagRef.current(hoveredCellRef.current);
        } else {
          const facing = miner.getFacingCoord();
          const facingCell = board.cellMap.get(`${facing.face}_${facing.u}_${facing.v}`);
          if (facingCell) {
            toggleFlagRef.current(facingCell);
          } else {
            const curCell = board.cellMap.get(`${miner.currentCoord.face}_${miner.currentCoord.u}_${miner.currentCoord.v}`);
            if (curCell) toggleFlagRef.current(curCell);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "w" || key === "arrowup") keysPressedRef.current.forward = false;
      if (key === "s" || key === "arrowdown") keysPressedRef.current.backward = false;
      if (key === "a" || key === "arrowleft") keysPressedRef.current.left = false;
      if (key === "d" || key === "arrowright") keysPressedRef.current.right = false;
    };

    const handleBlur = () => {
      keysPressedRef.current = { forward: false, backward: false, left: false, right: false };
      mobileMoveDirRef.current = null;
      if (minerAvatarRef.current && minerAvatarRef.current.action === "walk") {
        minerAvatarRef.current.action = "idle";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleBlur);
    };
  }, [gameState]);

  // --- Canvas Pointer Interaction (360-degree Drag Rotation + Click Dig/Flag) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDown = false;
    let lastX = 0;
    let lastY = 0;
    let totalDrag = 0;
    let downButton = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      totalDrag = 0;
      downButton = e.button;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!cameraRef.current || !boardManagerRef.current) return;
      const rect = container.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle Camera Drag (Only on Left Click or Touch Drag, Never on Right Click)
      if (isDown && downButton === 0) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        totalDrag += Math.hypot(dx, dy);

        if (totalDrag > 4) {
          isDraggingRef.current = true;
          lastManualControlTimeRef.current = performance.now();

          const camera = cameraRef.current;
          const target = controlsTargetRef.current;
          const offset = camera.position.clone().sub(target);

          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

          // 360-degree rotation around local screen axes
          const qHoriz = new THREE.Quaternion().setFromAxisAngle(camUp, -dx * 0.005);
          const qVert = new THREE.Quaternion().setFromAxisAngle(camRight, -dy * 0.005);

          offset.applyQuaternion(qHoriz).applyQuaternion(qVert);
          camera.position.copy(target).add(offset);
          camera.up.applyQuaternion(qVert);
          camera.lookAt(target);
        }

        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }

      // Hover Raycasting
      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const visibleMeshes: THREE.Mesh[] = [];
      boardManagerRef.current.cells.forEach((c) => {
        if (!c.isRevealed && c.mesh && c.mesh.visible) {
          visibleMeshes.push(c.mesh);
        }
      });

      const intersects = raycasterRef.current.intersectObjects(visibleMeshes, false);

      // Reset previous hover
      if (hoveredCellRef.current && hoveredCellRef.current.mesh && !hoveredCellRef.current.isFlagged) {
        hoveredCellRef.current.mesh.material = boardManagerRef.current.matHidden;
      }

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const cellId = hitMesh.userData.cellId;
        const cell = boardManagerRef.current.cellMap.get(cellId);

        if (cell && !cell.isFlagged) {
          hitMesh.material = boardManagerRef.current.matHiddenHover;
          hoveredCellRef.current = cell;
        } else {
          hoveredCellRef.current = null;
        }
      } else {
        hoveredCellRef.current = null;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDown = isDown;
      isDown = false;
      isDraggingRef.current = false;

      if (!wasDown) return;

      // If dragged more than 5px, it was a camera rotate, not a click!
      if (totalDrag > 5) {
        lastManualControlTimeRef.current = performance.now();
        return;
      }

      // IT WAS A CLEAN CLICK!
      if (!cameraRef.current || !boardManagerRef.current) return;
      const rect = container.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const visibleMeshes: THREE.Mesh[] = [];
      boardManagerRef.current.cells.forEach((c) => {
        if (!c.isRevealed && c.mesh && c.mesh.visible) {
          visibleMeshes.push(c.mesh);
        }
      });

      const intersects = raycasterRef.current.intersectObjects(visibleMeshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const cellId = hitMesh.userData.cellId;
        const cell = boardManagerRef.current.cellMap.get(cellId);
        if (!cell) return;

        const isRightClick = e.button === 2;
        const shouldFlag = isRightClick || interactModeRef.current === "flag";

        if (shouldFlag) {
          toggleFlagRef.current(cell);
        }
        // In walk mode, movement is strictly restricted to joypad or WASD.
        // Left-clicking does not trigger character navigation.
      } else {
        // Check for Chording on already revealed numbered cells
        const revealedTargets: THREE.Object3D[] = [];
        boardManagerRef.current.cells.forEach((c) => {
          if (c.isRevealed && c.neighborMines > 0) {
            if (c.sprite) revealedTargets.push(c.sprite);
            if (c.bedrockMesh) revealedTargets.push(c.bedrockMesh);
          }
        });

        const revealedHits = raycasterRef.current.intersectObjects(revealedTargets, true);
        if (revealedHits.length > 0) {
          let hitObj: THREE.Object3D | null = revealedHits[0].object;
          let cellId: string | null = null;
          while (hitObj) {
            if (hitObj.userData?.cellId) {
              cellId = hitObj.userData.cellId;
              break;
            }
            hitObj = hitObj.parent;
          }
          if (cellId) {
            const cell = boardManagerRef.current.cellMap.get(cellId);
            if (cell && cell.isRevealed && cell.neighborMines > 0) {
              const neighbors = boardManagerRef.current.getNeighbors(cell);
              const flaggedCount = neighbors.filter((n) => n.isFlagged).length;
              if (flaggedCount === cell.neighborMines) {
                sound.playChord();
                neighbors.forEach((n) => {
                  if (!n.isRevealed && !n.isFlagged) {
                    revealCellRef.current(n);
                  }
                });
              } else {
                sound.playClick();
              }
            }
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const camera = cameraRef.current;
      const target = controlsTargetRef.current;
      const offset = camera.position.clone().sub(target);
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      const newLen = THREE.MathUtils.clamp(offset.length() * zoomFactor, 5, 65);
      offset.setLength(newLen);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
      lastManualControlTimeRef.current = performance.now();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("contextmenu", onContextMenu);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  // --- Camera Presets ---
  const handleResetCamera = () => {
    if (!cameraRef.current) return;
    const camDist = currentConfig.gridSize * 2.8;
    controlsTargetRef.current.set(0, 0, 0);
    cameraRef.current.up.set(0, 1, 0);
    cameraRef.current.position.set(camDist, camDist * 0.9, camDist * 1.2);
    cameraRef.current.lookAt(controlsTargetRef.current);
  };

  const handleCameraPreset = (
    preset: "front" | "back" | "top" | "bottom" | "left" | "right" | "iso" | "miner"
  ) => {
    if (!cameraRef.current) return;
    const dist = currentConfig.gridSize * 3.2;

    switch (preset) {
      case "front":
        controlsTargetRef.current.set(0, 0, 0);
        cameraRef.current.up.set(0, 1, 0);
        cameraRef.current.position.set(0, 0, dist);
        cameraRef.current.lookAt(controlsTargetRef.current);
        break;
      case "back":
        controlsTargetRef.current.set(0, 0, 0);
        cameraRef.current.up.set(0, 1, 0);
        cameraRef.current.position.set(0, 0, -dist);
        cameraRef.current.lookAt(controlsTargetRef.current);
        break;
      case "top":
        controlsTargetRef.current.set(0, 0, 0);
        cameraRef.current.up.set(0, 0, -1);
        cameraRef.current.position.set(0, dist, 0.001);
        cameraRef.current.lookAt(controlsTargetRef.current);
        break;
      case "bottom":
        controlsTargetRef.current.set(0, 0, 0);
        cameraRef.current.up.set(0, 0, 1);
        cameraRef.current.position.set(0, -dist, 0.001);
        cameraRef.current.lookAt(controlsTargetRef.current);
        break;
      case "left":
        controlsTargetRef.current.set(0, 0, 0);
        cameraRef.current.up.set(0, 1, 0);
        cameraRef.current.position.set(-dist, 0, 0);
        cameraRef.current.lookAt(controlsTargetRef.current);
        break;
      case "right":
        controlsTargetRef.current.set(0, 0, 0);
        cameraRef.current.up.set(0, 1, 0);
        cameraRef.current.position.set(dist, 0, 0);
        cameraRef.current.lookAt(controlsTargetRef.current);
        break;
      case "iso":
        controlsTargetRef.current.set(0, 0, 0);
        cameraRef.current.up.set(0, 1, 0);
        cameraRef.current.position.set(dist * 0.75, dist * 0.75, dist * 0.75);
        cameraRef.current.lookAt(controlsTargetRef.current);
        break;
      case "miner":
        if (minerAvatarRef.current) {
          const minerPos = minerAvatarRef.current.group.position;
          const normal = minerAvatarRef.current.currentNormal;
          controlsTargetRef.current.copy(minerPos);
          const worldUp = Math.abs(normal.y) > 0.8 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
          cameraRef.current.up.copy(worldUp);
          const tilt = worldUp.clone().projectOnPlane(normal).normalize().multiplyScalar(0.42);
          const targetDir = normal.clone().multiplyScalar(0.85).add(tilt).normalize();
          cameraRef.current.position.copy(controlsTargetRef.current.clone().add(targetDir.multiplyScalar(dist * 0.85)));
          cameraRef.current.lookAt(controlsTargetRef.current);
        }
        break;
    }
    lastManualControlTimeRef.current = performance.now();
  };

  // --- Miner Touch / On-screen Action Handler ---
  const handleStartMove = (dir: "up" | "down" | "left" | "right") => {
    switch (dir) {
      case "up":
        mobileMoveDirRef.current = { x: 0, z: 1 };
        break;
      case "down":
        mobileMoveDirRef.current = { x: 0, z: -1 };
        break;
      case "left":
        mobileMoveDirRef.current = { x: -1, z: 0 };
        break;
      case "right":
        mobileMoveDirRef.current = { x: 1, z: 0 };
        break;
    }
  };

  const handleStopMove = () => {
    mobileMoveDirRef.current = null;
  };

  const handleMinerAction = (action: "step" | "dig" | "flag", du?: number | string) => {
    const miner = minerAvatarRef.current;
    const board = boardManagerRef.current;
    if (!miner || !board) return;

    if (action === "step") {
      if (typeof du === "string") {
        handleStartMove(du as "up" | "down" | "left" | "right");
      }
    } else if (action === "flag") {
      handleSetInteractMode(interactModeRef.current === "flag" ? "reveal" : "flag");
    }
  };

  // --- Game Timer Effect ---
  useEffect(() => {
    if (gameState === "playing") {
      const interval = setInterval(() => {
        setTimeSeconds((t) => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  // --- Party Synchronization Effect ---
  useEffect(() => {
    const unsubscribe = partyClient.subscribe((sess) => {
      setPartySession({ ...sess });

      const board = boardManagerRef.current;
      if (!board) return;

      if (sess.mineLocations && sess.mineLocations.length > 0 && !board.firstClickDone) {
        board.setMinesFromLocations(sess.mineLocations);
        setGameState("playing");
        gameStateRef.current = "playing";
      }

      sess.revealedCells.forEach((cId) => {
        const cell = board.cellMap.get(cId);
        if (cell && !cell.isRevealed) {
          revealCellRef.current(cell, false);
        }
      });

      const flaggedSet = new Set(sess.flaggedCells);
      board.cells.forEach((cell) => {
        if (flaggedSet.has(cell.id) && !cell.isFlagged) {
          toggleFlagRef.current(cell, false);
        } else if (!flaggedSet.has(cell.id) && cell.isFlagged) {
          toggleFlagRef.current(cell, false);
        }
      });

      if (sess.gameState === "won" && gameStateRef.current !== "won") {
        handleGameOverRef.current(true, false);
      } else if (sess.gameState === "lost" && gameStateRef.current !== "lost") {
        handleGameOverRef.current(false, false);
      } else if (sess.gameState === "playing" && showLobbyModal) {
        setShowLobbyModal(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [showLobbyModal]);

  // --- Auto-join Room from URL Query Param ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get("room");
      if (roomParam) {
        partyClient.joinRoom(roomParam.toUpperCase()).then((sess) => {
          if (sess) {
            setPartySession(sess);
            setMode(sess.mode);
            setDifficulty(sess.difficulty);
            setShowStartMenu(false);
            if (sess.gameState === "lobby") {
              setShowLobbyModal(true);
            }
            initGame(sess.mode, sess.difficulty);
          }
        });
      }
    }
  }, [initGame]);

  const clearRemoteAvatars = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    remoteAvatarsRef.current.forEach((remote) => {
      scene.remove(remote.avatar.group);
      scene.remove(remote.nameplate);
    });
    remoteAvatarsRef.current.clear();
  }, []);

  const handleStartSolo = useCallback(
    (newMode: GameMode, newDiff: Difficulty) => {
      sound.playClick();
      partyClient.leaveRoom();
      setPartySession(null);
      clearRemoteAvatars();
      setMode(newMode);
      setDifficulty(newDiff);
      setShowStartMenu(false);
      setShowLobbyModal(false);
      initGame(newMode, newDiff);
    },
    [clearRemoteAvatars, initGame]
  );

  const handleCreateParty = useCallback(
    async (newMode: GameMode, newDiff: Difficulty) => {
      sound.playClick();
      setMode(newMode);
      setDifficulty(newDiff);
      const sess = await partyClient.createRoom({ mode: newMode, difficulty: newDiff });
      if (sess) {
        setPartySession(sess);
        setShowStartMenu(false);
        setShowLobbyModal(true);
        initGame(newMode, newDiff);
      }
    },
    [initGame]
  );

  const handleJoinParty = useCallback(
    async (code: string) => {
      sound.playClick();
      const sess = await partyClient.joinRoom(code);
      if (sess) {
        setPartySession(sess);
        setMode(sess.mode);
        setDifficulty(sess.difficulty);
        setShowStartMenu(false);
        if (sess.gameState === "lobby") {
          setShowLobbyModal(true);
        } else {
          setShowLobbyModal(false);
        }
        initGame(sess.mode, sess.difficulty);
      }
    },
    [initGame]
  );

  const handleLeaveParty = useCallback(() => {
    sound.playClick();
    partyClient.leaveRoom();
    setPartySession(null);
    clearRemoteAvatars();
    setShowLobbyModal(false);
    setShowStartMenu(true);
  }, [clearRemoteAvatars]);

  const handleStartPartyGame = useCallback(() => {
    sound.playClick();
    const board = boardManagerRef.current;
    const mineLocations = board?.cells.filter((c) => c.isMine).map((c) => c.id) || [];
    partyClient.sendAction({
      type: "start",
      minesLocations: mineLocations.length > 0 ? mineLocations : undefined,
    });
    setShowLobbyModal(false);
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950"
      style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}
      />

      {/* Cyber HUD Overlay */}
      <GameHUD
        gameState={gameState}
        minesRemaining={minesRemaining}
        totalMines={currentConfig.mines}
        flagsPlaced={flagsPlaced}
        timeSeconds={timeSeconds}
        difficulty={difficulty}
        interactMode={interactMode}
        followMiner={followMiner}
        currentMinerFace={minerFace}
        isMuted={isMuted}
        onSetInteractMode={handleSetInteractMode}
        onToggleFollowMiner={() => setFollowMiner(!followMiner)}
        onResetCamera={handleResetCamera}
        onCameraPreset={handleCameraPreset}
        onRestart={() => initGame()}
        onChangeDifficulty={(d) => {
          setDifficulty(d);
        }}
        onToggleMute={() => {
          const m = sound.toggleMute();
          setIsMuted(m);
        }}
        onMinerAction={handleMinerAction}
        onStartMove={handleStartMove}
        onStopMove={handleStopMove}
        onOpenMenu={() => setShowStartMenu(true)}
        partySession={partySession}
        onLeaveParty={handleLeaveParty}
      />

      {/* Start Menu Overlay */}
      {showStartMenu && (
        <StartMenu
          onStartSolo={handleStartSolo}
          onJoinParty={handleJoinParty}
          onCreateParty={handleCreateParty}
          onOpenHelp={() => {}}
          isMuted={isMuted}
          onToggleMute={() => {
            const m = sound.toggleMute();
            setIsMuted(m);
          }}
        />
      )}

      {/* Party Lobby Modal */}
      {showLobbyModal && partySession && (
        <PartyLobbyModal
          session={partySession}
          currentPlayerId={partyClient.playerId}
          onStartGame={handleStartPartyGame}
          onLeaveParty={handleLeaveParty}
        />
      )}
    </div>
  );
};
