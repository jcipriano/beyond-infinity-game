import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  ParticleSystem,
  Scene,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  VertexData,
} from "@babylonjs/core";

interface Shard {
  mesh: Mesh;
  velocity: Vector3;
  angularVelocity: Vector3;
  age: number;
}

const MIN_SPEED = 1.5;
const MAX_SPEED = 4;
const MAX_SPIN = 6;
const GRAVITY = -20;
const SHARD_LIFETIME = 1;

const PARTICLE_COUNT = 150;
const PARTICLE_MIN_SIZE = 0.05;
const PARTICLE_MAX_SIZE = 0.1;
const PARTICLE_MIN_LIFETIME = 0.7;
const PARTICLE_MAX_LIFETIME = 1.5;
const PARTICLE_MIN_SPEED = 2;
const PARTICLE_MAX_SPEED = 6;

export class Explosion {
  private readonly shards: Shard[] = [];
  private readonly material: StandardMaterial;
  private readonly particleSystem: ParticleSystem;

  /**
   * Creates the shared material debris shards are rendered with, and the particle burst
   * that plays alongside them.
   * @param scene - The Babylon scene to create shard meshes and particles in.
   */
  constructor(private readonly scene: Scene) {
    this.material = new StandardMaterial("explosionMat", scene);
    this.material.backFaceCulling = false;

    this.particleSystem = new ParticleSystem("explosionParticles", PARTICLE_COUNT, scene);
    this.particleSystem.particleTexture = createParticleTexture(scene);
    this.particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    this.particleSystem.minSize = PARTICLE_MIN_SIZE;
    this.particleSystem.maxSize = PARTICLE_MAX_SIZE;
    this.particleSystem.minLifeTime = PARTICLE_MIN_LIFETIME;
    this.particleSystem.maxLifeTime = PARTICLE_MAX_LIFETIME;
    this.particleSystem.minEmitPower = PARTICLE_MIN_SPEED;
    this.particleSystem.maxEmitPower = PARTICLE_MAX_SPEED;
    this.particleSystem.direction1 = new Vector3(-1, -1, -1);
    this.particleSystem.direction2 = new Vector3(1, 1, 1);
    this.particleSystem.minEmitBox = Vector3.Zero();
    this.particleSystem.maxEmitBox = Vector3.Zero();
    this.particleSystem.gravity = new Vector3(0, -20, 0);
    this.particleSystem.emitRate = 0;
    this.particleSystem.start();
  }

  /**
   * Breaks a mesh apart into one small mesh per triangle, each flying outward from its center.
   * @param source - The mesh to shatter; its own triangles become the debris.
   */
  trigger(source: Mesh): void {
    const sourceMaterial = source.material as StandardMaterial | null;
    const color = sourceMaterial?.diffuseColor ?? Color3.White();
    this.material.diffuseColor = color;

    source.computeWorldMatrix(true);
    const worldMatrix = source.getWorldMatrix();
    const center = source.getAbsolutePosition();

    this.particleSystem.emitter = center.clone();
    this.particleSystem.color1 = new Color4(color.r, color.g, color.b, 1);
    this.particleSystem.color2 = new Color4(color.r, color.g, color.b, 1);
    this.particleSystem.colorDead = new Color4(color.r, color.g, color.b, 0);
    this.particleSystem.manualEmitCount = PARTICLE_COUNT;

    const positions = source.getVerticesData(VertexBuffer.PositionKind);
    const indices = source.getIndices();
    if (!positions || !indices) return;

    for (let i = 0; i < indices.length; i += 3) {
      const worldPoints = [0, 1, 2].map((j) => {
        const index = indices[i + j];
        const local = new Vector3(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]);
        return Vector3.TransformCoordinates(local, worldMatrix);
      });
      const centroid = worldPoints[0].add(worldPoints[1]).add(worldPoints[2]).scale(1 / 3);

      const shardPositions = worldPoints.flatMap((point) => [
        point.x - centroid.x,
        point.y - centroid.y,
        point.z - centroid.z,
      ]);
      const shardIndices = [0, 1, 2];
      const normals: number[] = [];
      VertexData.ComputeNormals(shardPositions, shardIndices, normals);

      const shardMesh = new Mesh(`shard${i}`, this.scene);
      const vertexData = new VertexData();
      vertexData.positions = shardPositions;
      vertexData.indices = shardIndices;
      vertexData.normals = normals;
      vertexData.applyToMesh(shardMesh);
      shardMesh.position.copyFrom(centroid);
      shardMesh.material = this.material;

      const outward = centroid.subtract(center).normalize();
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      const velocity = outward.scale(speed);
      const angularVelocity = new Vector3(
        (Math.random() - 0.5) * MAX_SPIN,
        (Math.random() - 0.5) * MAX_SPIN,
        (Math.random() - 0.5) * MAX_SPIN
      );

      this.shards.push({ mesh: shardMesh, velocity, angularVelocity, age: 0 });
    }
  }

  /**
   * Flies each shard outward under gravity and spin, disposing it once its lifetime expires.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   */
  update(deltaSeconds: number): void {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const shard = this.shards[i];
      shard.age += deltaSeconds;
      if (shard.age >= SHARD_LIFETIME) {
        shard.mesh.dispose();
        this.shards.splice(i, 1);
        continue;
      }
      shard.velocity.y += GRAVITY * deltaSeconds;
      shard.mesh.position.addInPlace(shard.velocity.scale(deltaSeconds));
      shard.mesh.rotation.addInPlace(shard.angularVelocity.scale(deltaSeconds));
    }
  }

  // Disposes all debris shards and clears any in-flight particles for a new run.
  reset(): void {
    for (const shard of this.shards) {
      shard.mesh.dispose();
    }
    this.shards.length = 0;
    this.particleSystem.reset();
  }
}

/**
 * Draws a solid, hard-edged white dot into a dynamic texture, used as the particle sprite.
 * @param scene - The Babylon scene to create the texture in.
 */
function createParticleTexture(scene: Scene): DynamicTexture {
  const size = 64;
  const texture = new DynamicTexture("explosionParticleTexture", size, scene, false);
  texture.hasAlpha = true;

  const context = texture.getContext();
  const center = size / 2;
  context.clearRect(0, 0, size, size);
  context.fillStyle = "rgba(255, 255, 255, 1)";
  context.beginPath();
  context.arc(center, center, center, 0, Math.PI * 2);
  context.fill();
  texture.update();

  return texture;
}
