import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Line,
  LineBasicMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type PerspectiveCamera,
} from "three";
import { SYSTEM_BODY_IDS } from "../astronomy/bodies.ts";
import type { BodyPositions, Vec3 } from "../astronomy/positions.ts";
import type { BodyRadii } from "../astronomy/scale.ts";

type RotationAxisLineProps = {
  getPosition: () => Vec3;
  getNorth: () => Vec3;
  getTiltDeg: () => number;
  radius: number;
  showDegrees: boolean;
  positions: BodyPositions;
  radii: BodyRadii;
};

const NORTH_POLE = "#c45c5c";
const SOUTH_POLE = "#5a7eb0";
const AXIS_LABEL = "#c5cdd8";
const DEGREE_VIEW_RADII = 18;
const DEGREE_VIEW_MIN = 2.8;
const LARGE_BODY_RADII = 5.2;
const LARGE_BODY_RADIUS = 4;
const LABEL_PIXELS = 18;
const LABEL_GAP = 0.5;
const DISK_PAD = 1.12;

function axisHalfLength(radius: number): number {
  return Math.max(radius * 2.6, 0.14);
}

/** True if the sphere sits on the camera→label segment. */
function hiddenBehindBody(
  camX: number,
  camY: number,
  camZ: number,
  labelX: number,
  labelY: number,
  labelZ: number,
  bodyX: number,
  bodyY: number,
  bodyZ: number,
  radius: number,
): boolean {
  const dx = labelX - camX;
  const dy = labelY - camY;
  const dz = labelZ - camZ;
  const span = Math.hypot(dx, dy, dz);
  if (span < 1e-6) return false;
  const inv = 1 / span;
  const dirX = dx * inv;
  const dirY = dy * inv;
  const dirZ = dz * inv;
  const ox = camX - bodyX;
  const oy = camY - bodyY;
  const oz = camZ - bodyZ;
  const b = 2 * (ox * dirX + oy * dirY + oz * dirZ);
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - 4 * c;
  if (disc < 0) return false;
  const tHit = (-b - Math.sqrt(disc)) * 0.5;
  return tHit > 1e-4 && tHit < span - 1e-4;
}

/** True if the label sits on the body's silhouette from the camera. */
function projectsOnDisk(
  camX: number,
  camY: number,
  camZ: number,
  labelX: number,
  labelY: number,
  labelZ: number,
  bodyX: number,
  bodyY: number,
  bodyZ: number,
  radius: number,
): boolean {
  const bx = bodyX - camX;
  const by = bodyY - camY;
  const bz = bodyZ - camZ;
  const bodyDist = Math.hypot(bx, by, bz);
  if (bodyDist <= radius + 1e-4) return false;
  const lx = labelX - camX;
  const ly = labelY - camY;
  const lz = labelZ - camZ;
  const labelDist = Math.hypot(lx, ly, lz);
  if (labelDist < 1e-6) return false;
  const dot = (bx * lx + by * ly + bz * lz) / (bodyDist * labelDist);
  const sep = Math.acos(Math.min(1, Math.max(-1, dot)));
  return sep < Math.asin(Math.min(1, (radius * DISK_PAD) / bodyDist));
}

function labelOccluded(
  camX: number,
  camY: number,
  camZ: number,
  labelX: number,
  labelY: number,
  labelZ: number,
  positions: BodyPositions,
  radii: BodyRadii,
): boolean {
  for (const id of SYSTEM_BODY_IDS) {
    const body = positions[id];
    const radius = radii[id];
    const dx = labelX - body[0];
    const dy = labelY - body[1];
    const dz = labelZ - body[2];
    if (dx * dx + dy * dy + dz * dz <= radius * radius) return true;
    if (
      hiddenBehindBody(
        camX,
        camY,
        camZ,
        labelX,
        labelY,
        labelZ,
        body[0],
        body[1],
        body[2],
        radius,
      )
    ) {
      return true;
    }
    if (
      projectsOnDisk(
        camX,
        camY,
        camZ,
        labelX,
        labelY,
        labelZ,
        body[0],
        body[1],
        body[2],
        radius,
      )
    ) {
      return true;
    }
  }
  return false;
}

function createPoleSprite(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas is not available");
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sprite = new Sprite(material);
  sprite.frustumCulled = false;
  sprite.visible = false;
  return { canvas, ctx, texture, material, sprite, width, height };
}

function paintNorth(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tilt: string,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.font = "600 36px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.95)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 1;
  const rest = ` - ${tilt}°`;
  const nWidth = ctx.measureText("N").width;
  const restWidth = ctx.measureText(rest).width;
  const x = (width - nWidth - restWidth) / 2;
  const y = height / 2;
  ctx.fillStyle = NORTH_POLE;
  ctx.fillText("N", x, y);
  ctx.fillStyle = AXIS_LABEL;
  ctx.fillText(rest, x + nWidth, y);
}

function paintSouth(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.font = "600 36px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.95)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = SOUTH_POLE;
  ctx.fillText("S", width / 2, height / 2);
}

function spriteWorldHeight(
  camera: PerspectiveCamera,
  x: number,
  y: number,
  z: number,
  viewHeight: number,
) {
  const dist = Math.hypot(
    camera.position.x - x,
    camera.position.y - y,
    camera.position.z - z,
  );
  return (
    2 *
    Math.tan((camera.fov * Math.PI) / 360) *
    dist *
    (LABEL_PIXELS / Math.max(viewHeight, 1))
  );
}

function placeSprite(
  sprite: Sprite,
  camera: PerspectiveCamera,
  tipX: number,
  tipY: number,
  tipZ: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  aspect: number,
  viewHeight: number,
): [number, number, number] {
  const worldH = spriteWorldHeight(camera, tipX, tipY, tipZ, viewHeight);
  const extra = worldH * LABEL_GAP;
  const x = tipX + dirX * extra;
  const y = tipY + dirY * extra;
  const z = tipZ + dirZ * extra;
  sprite.position.set(x, y, z);
  sprite.scale.set(worldH * aspect, worldH, 1);
  return [x, y, z];
}

export function RotationAxisLine({
  getPosition,
  getNorth,
  getTiltDeg,
  radius,
  showDegrees,
  positions,
  radii,
}: RotationAxisLineProps) {
  const viewHeight = useThree((state) => state.size.height);
  const nearRef = useRef(false);
  const tiltRef = useRef("");
  const southPainted = useRef(false);
  const half = axisHalfLength(radius);
  const degreeLimit =
    radius >= LARGE_BODY_RADIUS
      ? radius * LARGE_BODY_RADII
      : Math.max(radius * DEGREE_VIEW_RADII, DEGREE_VIEW_MIN);

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(6), 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new LineBasicMaterial({
        color: "#d7e4ff",
        transparent: true,
        opacity: 0.85,
      }),
    [],
  );
  const line = useMemo(() => {
    const object = new Line(geometry, material);
    object.frustumCulled = false;
    return object;
  }, [geometry, material]);

  const northLabel = useMemo(() => createPoleSprite(384, 64), []);
  const southLabel = useMemo(() => createPoleSprite(64, 64), []);

  useLayoutEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      northLabel.texture.dispose();
      northLabel.material.dispose();
      southLabel.texture.dispose();
      southLabel.material.dispose();
    };
  }, [geometry, material, northLabel, southLabel]);

  useFrame(({ camera }) => {
    const position = getPosition();
    const north = getNorth();
    const nx = north[0] * half;
    const ny = north[1] * half;
    const nz = north[2] * half;
    const attr = geometry.getAttribute("position") as BufferAttribute;
    const array = attr.array as Float32Array;
    array[0] = position[0] - nx;
    array[1] = position[1] - ny;
    array[2] = position[2] - nz;
    array[3] = position[0] + nx;
    array[4] = position[1] + ny;
    array[5] = position[2] + nz;
    attr.needsUpdate = true;
    geometry.computeBoundingSphere();

    const northX = position[0] + nx;
    const northY = position[1] + ny;
    const northZ = position[2] + nz;
    const southX = position[0] - nx;
    const southY = position[1] - ny;
    const southZ = position[2] - nz;

    if (!showDegrees) {
      northLabel.sprite.visible = false;
      southLabel.sprite.visible = false;
      return;
    }

    const dx = camera.position.x - position[0];
    const dy = camera.position.y - position[1];
    const dz = camera.position.z - position[2];
    const distance = Math.hypot(dx, dy, dz);
    const enter = degreeLimit;
    const exit = degreeLimit * 1.2;
    nearRef.current = nearRef.current ? distance < exit : distance < enter;
    if (!nearRef.current) {
      northLabel.sprite.visible = false;
      southLabel.sprite.visible = false;
      return;
    }

    const persp = camera as PerspectiveCamera;
    const camX = camera.position.x;
    const camY = camera.position.y;
    const camZ = camera.position.z;
    const northExtra =
      spriteWorldHeight(persp, northX, northY, northZ, viewHeight) * LABEL_GAP;
    const southExtra =
      spriteWorldHeight(persp, southX, southY, southZ, viewHeight) * LABEL_GAP;
    const northLabelX = northX + north[0] * northExtra;
    const northLabelY = northY + north[1] * northExtra;
    const northLabelZ = northZ + north[2] * northExtra;
    const southLabelX = southX - north[0] * southExtra;
    const southLabelY = southY - north[1] * southExtra;
    const southLabelZ = southZ - north[2] * southExtra;
    const showNorth = !labelOccluded(
      camX,
      camY,
      camZ,
      northLabelX,
      northLabelY,
      northLabelZ,
      positions,
      radii,
    );
    const showSouth = !labelOccluded(
      camX,
      camY,
      camZ,
      southLabelX,
      southLabelY,
      southLabelZ,
      positions,
      radii,
    );

    if (showNorth) {
      const tilt = getTiltDeg().toFixed(1);
      if (tilt !== tiltRef.current) {
        tiltRef.current = tilt;
        paintNorth(northLabel.ctx, northLabel.width, northLabel.height, tilt);
        northLabel.texture.needsUpdate = true;
      }
      placeSprite(
        northLabel.sprite,
        persp,
        northX,
        northY,
        northZ,
        north[0],
        north[1],
        north[2],
        northLabel.width / northLabel.height,
        viewHeight,
      );
    }
    if (showSouth) {
      if (!southPainted.current) {
        paintSouth(southLabel.ctx, southLabel.width, southLabel.height);
        southLabel.texture.needsUpdate = true;
        southPainted.current = true;
      }
      placeSprite(
        southLabel.sprite,
        persp,
        southX,
        southY,
        southZ,
        -north[0],
        -north[1],
        -north[2],
        southLabel.width / southLabel.height,
        viewHeight,
      );
    }
    northLabel.sprite.visible = showNorth;
    southLabel.sprite.visible = showSouth;
  });

  return (
    <>
      <primitive object={line} />
      <primitive object={northLabel.sprite} />
      <primitive object={southLabel.sprite} />
    </>
  );
}
