import { memo, useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import {
  MOON_BY_ID,
  MOON_IDS,
  PLANET_IDS,
  SYSTEM_BODIES,
} from "../astronomy/bodies.ts";
import type { EphemerisStore } from "../astronomy/ephemerisStore.ts";
import {
  createAllMoonOrbitPaths,
  createAllPlanetOrbitPaths,
} from "../astronomy/orbits.ts";
import { planetNorthMap } from "../astronomy/axes.ts";
import { planetRadiiMap, type BodyRadii } from "../astronomy/scale.ts";
import { ShowBodyNamesContext } from "./BodyLabel.tsx";
import { CameraFar } from "./CameraFar.tsx";
import { CameraRig, type FocusId } from "./CameraRig.tsx";
import { EphemerisLoop } from "./EphemerisLoop.tsx";
import { MilkyWay } from "./MilkyWay.tsx";
import { PerseidStream } from "./PerseidStream.tsx";
import { Earth, type GeoLocation } from "./Earth.tsx";
import { OrbitRing } from "./OrbitRing.tsx";
import { Planet } from "./Planet.tsx";
import { RotationAxisLine } from "./RotationAxisLine.tsx";
import { Satellite } from "./Satellite.tsx";
import { Sun } from "./Sun.tsx";

type SolarSystemProps = {
  store: EphemerisStore;
  radii: BodyRadii;
  focus: FocusId;
  focusFrom: FocusId;
  focusNonce: number;
  skyRadius: number;
  cameraFar: number;
  maxDistance: number;
  showAxes: boolean;
  showNames: boolean;
  showDegrees: boolean;
  skyBrightness: number;
  milkyWayBrightness: number;
  auInUnits: number;
  perseidCrossing: boolean;
  startTarget: [number, number, number];
  userGeo?: GeoLocation | null;
};

export const SolarSystem = memo(function SolarSystem({
  store,
  radii,
  focus,
  focusFrom,
  focusNonce,
  skyRadius,
  cameraFar,
  maxDistance,
  showAxes,
  showNames,
  showDegrees,
  skyBrightness,
  milkyWayBrightness,
  auInUnits,
  perseidCrossing,
  startTarget,
  userGeo,
}: SolarSystemProps) {
  const planetOrbits = useMemo(
    () => createAllPlanetOrbitPaths(new Date(store.dateMs), auInUnits),
    [auInUnits, store],
  );
  const moonOrbits = useMemo(
    () =>
      createAllMoonOrbitPaths(
        new Date(store.dateMs),
        auInUnits,
        planetNorthMap(store.axes),
        planetRadiiMap(radii),
      ),
    [auInUnits, radii, store],
  );

  return (
    <ShowBodyNamesContext.Provider value={showNames}>
      <color attach="background" args={["#02040a"]} />
      <ambientLight intensity={0.28} color="#c5d4ff" />
      <hemisphereLight args={["#fff4d6", "#1a2233", 0.35]} />
      <CameraFar far={cameraFar} />
      <EphemerisLoop store={store} />
      <MilkyWay
        store={store}
        radius={skyRadius}
        showAxes={showAxes}
        showDegrees={showDegrees}
        starBrightness={skyBrightness}
        milkyWayBrightness={milkyWayBrightness}
      />
      <PerseidStream
        store={store}
        auInUnits={auInUnits}
        crossing={perseidCrossing}
        labelRadius={radii.earth}
      />

      <Sun store={store} radius={radii.sun} />
      {PLANET_IDS.filter((id) => id !== "earth").map((id) => (
        <Planet key={id} id={id} store={store} radius={radii[id]} />
      ))}
      <Earth store={store} radius={radii.earth} userGeo={userGeo} />
      {MOON_IDS.map((id) => (
        <Satellite key={id} id={id} store={store} radius={radii[id]} />
      ))}

      {showAxes ? (
        <>
          {PLANET_IDS.map((id) => (
            <OrbitRing
              key={`${id}-orbit`}
              points={planetOrbits[id]}
              color="#ffffff"
              opacity={0.24}
            />
          ))}
          {MOON_IDS.map((id) => (
            <OrbitRing
              key={`${id}-orbit`}
              points={moonOrbits[id]}
              getOffset={() => store.positions[MOON_BY_ID[id].parent]}
              color="#ffffff"
              opacity={0.24}
            />
          ))}
        </>
      ) : null}

      {showAxes
        ? SYSTEM_BODIES.map((body) => (
            <RotationAxisLine
              key={`${body.id}-axis`}
              getPosition={() => store.positions[body.id]}
              getNorth={() => store.axes[body.id].north}
              getTiltDeg={() => store.axes[body.id].tiltDeg}
              radius={radii[body.id]}
              showDegrees={showDegrees}
              positions={store.positions}
              radii={radii}
            />
          ))
        : null}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.05}
        maxDistance={maxDistance}
        target={startTarget}
      />
      <CameraRig
        focus={focus}
        focusFrom={focusFrom}
        focusNonce={focusNonce}
        store={store}
        radii={radii}
      />
    </ShowBodyNamesContext.Provider>
  );
});
