import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { isMoonId, MOON_BY_ID, type BodyId } from "../astronomy/bodies.ts";
import type { EphemerisStore } from "../astronomy/ephemerisStore.ts";
import { perseidCrossingCenter, positionOfSwiftTuttle } from "../astronomy/perseids.ts";
import { length } from "../astronomy/positions.ts";
import type { BodyRadii } from "../astronomy/scale.ts";
import { writeStartPose } from "./startPose.ts";

export type StreamId = "swiftTuttle" | "perseids";
export type FocusId = BodyId | "reset" | StreamId;

export function isStreamId(id: string): id is StreamId {
  return id === "swiftTuttle" || id === "perseids";
}

type CameraRigProps = {
  focus: FocusId;
  focusFrom: FocusId;
  focusNonce: number;
  store: EphemerisStore;
  radii: BodyRadii;
};

type OrbitLike = {
  target: Vector3;
  update: () => void;
};

const goalCam = new Vector3();
const goalTarget = new Vector3();
const startCam = new Vector3();
const startTarget = new Vector3();
const bodyPos = new Vector3();
const offset = new Vector3();
const leavePos = new Vector3();
const aimCam = new Vector3();
const destVec = new Vector3();
const destDir = new Vector3();
const lookDir = new Vector3();
const aimAxis = new Vector3();
const startOff = new Vector3();
const aimOff = new Vector3();
const startDir = new Vector3();
const aimDir = new Vector3();
const worldUp = new Vector3(0, 1, 0);
const turnQuat = new Quaternion();
const identQuat = new Quaternion();

const FLY_MIN = 2.3;
const FLY_MAX = 4.2;
const TURN_MIN = 0.7;
const TURN_MAX = 1.55;
/** Pause on the aimed frame before the dolly starts. */
const AIM_HOLD = 0.4;
/** Ease look from leave onto dest, starting during the aim hold. */
const LOOK_FACE = 1.7;
/** Destination sits this far down from the top of the frame while we still look at leave. */
const DEST_SCREEN_Y = 0.25;

function easeInOut(u: number): number {
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/** Quintic ease-in-out: even slower takeoff and a longer creep into the finish. */
function easeFly(u: number): number {
  return u < 0.5 ? 16 * u * u * u * u * u : 1 - (-2 * u + 2) ** 5 / 2;
}

function applyLook(camera: PerspectiveCamera, controls: OrbitLike, look: Vector3) {
  controls.target.copy(look);
  camera.lookAt(look);
}

function flyDuration(from: Vector3, to: Vector3): number {
  const dist = from.distanceTo(to);
  return Math.min(FLY_MAX, Math.max(FLY_MIN, 1.6 + Math.sqrt(dist) * 0.2));
}

function writeFocusPosition(focus: FocusId, store: EphemerisStore, out: Vector3) {
  if (focus === "reset") {
    out.set(0, 0, 0);
    return;
  }
  if (focus === "swiftTuttle") {
    const pos = positionOfSwiftTuttle(new Date(store.dateMs), store.auInUnits);
    out.set(pos[0], pos[1], pos[2]);
    return;
  }
  if (focus === "perseids") {
    const pos = perseidCrossingCenter(store.auInUnits);
    out.set(pos[0], pos[1], pos[2]);
    return;
  }
  const pos = store.positions[focus];
  out.set(pos[0], pos[1], pos[2]);
}

export function writeFocusPose(
  focus: FocusId,
  store: EphemerisStore,
  radii: BodyRadii,
  cameraOut: Vector3,
  targetOut: Vector3,
) {
  const positions = store.positions;

  if (focus === "reset") {
    const reach = Math.max(length(positions.saturn), store.auInUnits * 8);
    targetOut.set(0, 0, 0);
    cameraOut.set(reach * 0.62, reach * 0.38, reach * 0.62);
    return;
  }

  writeFocusPosition(focus, store, targetOut);

  if (isStreamId(focus)) {
    const r = targetOut.length() || 1;
    if (focus === "perseids") {
      const stand = Math.max(store.auInUnits * 0.42, 8);
      cameraOut.set(
        targetOut.x + stand * 0.55,
        targetOut.y + stand * 0.38,
        targetOut.z + stand * 0.72,
      );
      return;
    }
    const stand = Math.max(r * 0.08, store.auInUnits * 0.35, 5);
    const px = -targetOut.z / r;
    const pz = targetOut.x / r;
    cameraOut.set(
      targetOut.x + px * stand * 0.92 + (targetOut.x / r) * stand * 0.18,
      targetOut.y + stand * 0.28,
      targetOut.z + pz * stand * 0.92 + (targetOut.z / r) * stand * 0.18,
    );
    return;
  }

  const pos = positions[focus];
  const radius = radii[focus];
  targetOut.set(pos[0], pos[1], pos[2]);

  if (focus === "sun") {
    cameraOut.set(0, radius * 1.35, radius * 3.4);
    return;
  }

  if (isMoonId(focus)) {
    const parent = positions[MOON_BY_ID[focus].parent];
    let ax = pos[0] - parent[0];
    let ay = pos[1] - parent[1];
    let az = pos[2] - parent[2];
    const len = Math.hypot(ax, ay, az) || 1;
    const stand = focus === "yulia" ? radius * 6.5 : radius * 12;
    cameraOut.set(
      pos[0] + (ax / len) * stand,
      pos[1] + radius * 6 + (ay / len) * radius * 2,
      pos[2] + (az / len) * stand,
    );
    return;
  }

  const len = Math.hypot(pos[0], pos[1], pos[2]) || 1;
  const ax = pos[0] / len;
  const az = pos[2] / len;
  if (focus === "earth") {
    const phase = 1.15;
    const dist = radius * 10;
    const sx = az;
    const sz = -ax;
    cameraOut.set(
      pos[0] + (-Math.cos(phase) * ax + Math.sin(phase) * sx) * dist,
      pos[1] + radius * 4,
      pos[2] + (-Math.cos(phase) * az + Math.sin(phase) * sz) * dist,
    );
    return;
  }

  cameraOut.set(
    pos[0] + ax * radius * 10,
    pos[1] + radius * 5,
    pos[2] + az * radius * 10,
  );
}

function setGoals(focus: FocusId, store: EphemerisStore, radii: BodyRadii) {
  writeFocusPose(focus, store, radii, goalCam, goalTarget);
}

function writeBodyPoint(
  focus: FocusId,
  store: EphemerisStore,
  fallback: Vector3,
  out: Vector3,
) {
  writeFocusPosition(focus, store, out);
  if (out.lengthSq() === 0 && fallback.lengthSq() > 0) out.copy(fallback);
}

function destElevationAngle(camera: PerspectiveCamera): number {
  const fov = (camera.fov * Math.PI) / 180;
  const ndcY = 1 - 2 * DEST_SCREEN_Y;
  return Math.atan(Math.tan(fov / 2) * ndcY);
}

/** Camera around `leave`, looking at it; `dest` sits on the midline, 25% from the top. */
function writeAimCam(
  leave: Vector3,
  dest: Vector3,
  stand: number,
  camera: PerspectiveCamera,
  out: Vector3,
) {
  destVec.copy(dest).sub(leave);
  const sep = destVec.length();
  if (sep < 1e-5) {
    out.copy(worldUp).multiplyScalar(stand).add(leave);
    return;
  }
  destDir.copy(destVec).multiplyScalar(1 / sep);
  aimAxis.copy(destDir).cross(worldUp);
  if (aimAxis.lengthSq() < 1e-8) {
    aimAxis.set(Math.abs(destDir.x) > 0.9 ? 0 : 1, 0, Math.abs(destDir.x) > 0.9 ? 1 : 0);
  }
  aimAxis.normalize();
  // Pitch look down so dest sits above leave on screen.
  lookDir.copy(destDir).applyAxisAngle(aimAxis, -destElevationAngle(camera));
  out.copy(leave).addScaledVector(lookDir, -Math.max(stand, 0.08));
}

function turnDuration(fromCam: Vector3, leave: Vector3, aim: Vector3): number {
  startOff.copy(fromCam).sub(leave);
  aimOff.copy(aim).sub(leave);
  if (startOff.lengthSq() < 1e-8 || aimOff.lengthSq() < 1e-8) return TURN_MIN;
  const angle = startOff.angleTo(aimOff);
  return Math.min(TURN_MAX, Math.max(TURN_MIN, 0.55 + angle * 0.5));
}

export function CameraRig({
  focus,
  focusFrom,
  focusNonce,
  store,
  radii,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const controls = useThree((state) => state.controls) as OrbitLike | null;
  const gl = useThree((state) => state.gl);
  const animating = useRef(false);
  const following = useRef(true);
  const snapped = useRef(false);
  const animTime = useRef(0);
  const turnLength = useRef(TURN_MIN);
  const flyLength = useRef(FLY_MIN);
  const fromFocus = useRef<FocusId>(focusFrom);
  const startStand = useRef(1);
  const flyFrom = useRef(new Vector3());
  const flyReady = useRef(false);
  const lastNonce = useRef(-1);
  const radiiRef = useRef(radii);
  radiiRef.current = radii;

  useEffect(() => {
    setGoals(focus, store, radiiRef.current);
    following.current = true;
    if (!snapped.current) {
      lastNonce.current = focusNonce;
      return;
    }
    if (lastNonce.current === focusNonce) return;
    fromFocus.current = focusFrom;
    startCam.copy(camera.position);
    startTarget.copy(controls?.target ?? goalTarget);
    writeBodyPoint(fromFocus.current, store, startTarget, leavePos);
    startStand.current = Math.max(startCam.distanceTo(leavePos), 0.08);
    writeAimCam(leavePos, goalTarget, startStand.current, camera, aimCam);
    const skipTurn =
      fromFocus.current === focus || leavePos.distanceToSquared(goalTarget) < 1e-8;
    turnLength.current = skipTurn
      ? 0
      : turnDuration(startCam, leavePos, aimCam);
    flyLength.current = flyDuration(skipTurn ? startCam : aimCam, goalCam);
    flyFrom.current.copy(skipTurn ? startCam : aimCam);
    flyReady.current = skipTurn;
    animTime.current = 0;
    animating.current = true;
    lastNonce.current = focusNonce;
  }, [camera, focus, focusFrom, focusNonce, store]);

  useEffect(() => {
    const canvas = gl.domElement;
    const stop = () => {
      animating.current = false;
      following.current = false;
    };
    const resume = () => {
      if (focus === "reset") return;
      writeFocusPosition(focus, store, bodyPos);
      offset.copy(camera.position).sub(bodyPos);
      following.current = true;
    };
    canvas.addEventListener("pointerdown", stop);
    canvas.addEventListener("wheel", stop, { passive: true });
    canvas.addEventListener("pointerup", resume);
    return () => {
      canvas.removeEventListener("pointerdown", stop);
      canvas.removeEventListener("wheel", stop);
      canvas.removeEventListener("pointerup", resume);
    };
  }, [camera, focus, gl, store]);

  useFrame((_, delta) => {
    if (!controls) return;

    if (!snapped.current) {
      if (focus === "earth") {
        writeStartPose(store, camera.position, controls.target);
      } else {
        setGoals(focus, store, radiiRef.current);
        camera.position.copy(goalCam);
        controls.target.copy(goalTarget);
      }
      controls.update();
      if (focus !== "reset") {
        writeFocusPosition(focus, store, bodyPos);
        offset.copy(camera.position).sub(bodyPos);
      }
      following.current = true;
      snapped.current = true;
      return;
    }

    if (animating.current) {
      setGoals(focus, store, radiiRef.current);
      writeBodyPoint(fromFocus.current, store, startTarget, leavePos);
      writeAimCam(leavePos, goalTarget, startStand.current, camera, aimCam);

      animTime.current += delta;
      const turnT = turnLength.current;
      const holdT = turnT > 1e-6 ? AIM_HOLD : 0;
      const flyT = flyLength.current;

      if (animTime.current < turnT) {
        const u = turnT <= 1e-6 ? 1 : Math.min(1, animTime.current / turnT);
        const t = easeInOut(u);
        startOff.copy(startCam).sub(leavePos);
        aimOff.copy(aimCam).sub(leavePos);
        if (startOff.lengthSq() > 1e-10 && aimOff.lengthSq() > 1e-10) {
          startDir.copy(startOff).normalize();
          aimDir.copy(aimOff).normalize();
          turnQuat.setFromUnitVectors(startDir, aimDir);
          turnQuat.slerp(identQuat, 1 - t);
          offset.copy(startOff).applyQuaternion(turnQuat);
          offset.setLength(startOff.length() * (1 - t) + aimOff.length() * t);
          camera.position.copy(leavePos).add(offset);
        } else {
          camera.position.lerpVectors(startCam, aimCam, t);
        }
        applyLook(camera, controls, leavePos);
        return;
      }

      const sinceAim = animTime.current - turnT;
      const faceU = Math.min(1, Math.max(0, sinceAim / (holdT + LOOK_FACE)));
      lookDir.copy(leavePos);
      lookDir.lerp(goalTarget, easeFly(faceU));

      if (animTime.current < turnT + holdT) {
        camera.position.copy(aimCam);
        applyLook(camera, controls, lookDir);
        return;
      }

      if (!flyReady.current) {
        flyFrom.current.copy(camera.position);
        flyReady.current = true;
      }
      const u =
        flyT <= 1e-6 ? 1 : Math.min(1, (animTime.current - turnT - holdT) / flyT);
      const t = easeFly(u);
      camera.position.lerpVectors(flyFrom.current, goalCam, t);
      applyLook(camera, controls, lookDir);
      if (u >= 1) {
        animating.current = false;
        if (focus !== "reset") {
          writeFocusPosition(focus, store, bodyPos);
          offset.copy(camera.position).sub(bodyPos);
        }
        controls.update();
      }
      return;
    }

    if (focus === "reset" || !following.current) return;

    writeFocusPosition(focus, store, bodyPos);
    controls.target.copy(bodyPos);
    camera.position.copy(bodyPos).add(offset);
    controls.update();
  });

  return null;
}
