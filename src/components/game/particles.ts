import * as THREE from "three";

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class ParticleManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private pointGeometry: THREE.BufferGeometry;
  private pointMaterial: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;
  private maxParticles = 600;

  private positions: Float32Array;
  private colors: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    this.pointGeometry = new THREE.BufferGeometry();
    this.pointGeometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.pointGeometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    // Particle sprite using canvas
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.2)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);

    this.pointMaterial = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointGeometry, this.pointMaterial);
    this.scene.add(this.pointsMesh);
  }

  // Spawn spark particles when digging
  public spawnDigSparks(position: THREE.Vector3, colorHex: number = 0x38bdf8, count: number = 24) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed + (Math.random() - 0.5),
        1.5 + Math.random() * 3.0,
        Math.sin(angle) * speed + (Math.random() - 0.5)
      );

      const color = new THREE.Color(colorHex);
      if (Math.random() > 0.5) color.setHex(0xffffff);

      this.particles.push({
        pos: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        )),
        vel,
        color,
        size: 0.15 + Math.random() * 0.2,
        alpha: 1.0,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.4,
      });
    }
  }

  // Spawn violent explosion fireball and debris
  public spawnExplosion(position: THREE.Vector3, count: number = 80) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      const speed = 3.0 + Math.random() * 7.0;
      const vel = dir.multiplyScalar(speed);

      // Colors from bright yellow to orange to fiery red
      const palette = [0xffffff, 0xfef08a, 0xf97316, 0xef4444];
      const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);

      this.particles.push({
        pos: position.clone(),
        vel,
        color,
        size: 0.25 + Math.random() * 0.35,
        alpha: 1.0,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.6,
      });
    }
  }

  public update(delta: number) {
    const gravity = new THREE.Vector3(0, -5.0, 0);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vel.addScaledVector(gravity, delta);
      p.pos.addScaledVector(p.vel, delta);
      p.alpha = 1 - p.life / p.maxLife;
    }

    // Update geometry buffers
    let ptr = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        this.positions[ptr] = p.pos.x;
        this.positions[ptr + 1] = p.pos.y;
        this.positions[ptr + 2] = p.pos.z;

        this.colors[ptr] = p.color.r * p.alpha;
        this.colors[ptr + 1] = p.color.g * p.alpha;
        this.colors[ptr + 2] = p.color.b * p.alpha;
      } else {
        this.positions[ptr] = 0;
        this.positions[ptr + 1] = -99999;
        this.positions[ptr + 2] = 0;

        this.colors[ptr] = 0;
        this.colors[ptr + 1] = 0;
        this.colors[ptr + 2] = 0;
      }
      ptr += 3;
    }

    this.pointGeometry.attributes.position.needsUpdate = true;
    this.pointGeometry.attributes.color.needsUpdate = true;
  }

  public destroy() {
    this.scene.remove(this.pointsMesh);
    this.pointGeometry.dispose();
    this.pointMaterial.dispose();
  }
}
