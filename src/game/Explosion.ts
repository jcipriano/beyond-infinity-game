import { Color3, Mesh, Scene, StandardMaterial, Vector3, VertexBuffer, VertexData } from "@babylonjs/core";

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

export class Explosion {
  private readonly shards: Shard[] = [];
  private readonly material: StandardMaterial;

  /**
   * Creates the shared material debris shards are rendered with.
   * @param scene - The Babylon scene to create shard meshes in.
   */
  constructor(private readonly scene: Scene) {
    this.material = new StandardMaterial("explosionMat", scene);
    this.material.backFaceCulling = false;
  }

  /**
   * Breaks a mesh apart into one small mesh per triangle, each flying outward from its center.
   * @param source - The mesh to shatter; its own triangles become the debris.
   */
  trigger(source: Mesh): void {
    const sourceMaterial = source.material as StandardMaterial | null;
    this.material.diffuseColor = sourceMaterial?.diffuseColor ?? Color3.White();

    source.computeWorldMatrix(true);
    const worldMatrix = source.getWorldMatrix();
    const center = source.getAbsolutePosition();

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

  // Disposes all debris shards for a new run.
  reset(): void {
    for (const shard of this.shards) {
      shard.mesh.dispose();
    }
    this.shards.length = 0;
  }
}
