import type { PointerEvent } from "react";
import { useEffect, useState } from "react";
import {
  isMoonId,
  MOON_BY_ID,
  MOONS_BY_PARENT,
  PRIMARY_BODIES,
  isPlanetId,
  type BodyId,
} from "../astronomy/bodies.ts";
import {
  SCRUB_FAST_DAYS_PER_SEC,
  SCRUB_FINE_DAYS_PER_SEC,
  SCRUB_SLOW_DAYS_PER_SEC,
} from "../astronomy/ephemerisStore.ts";
import type { BodyPositions } from "../astronomy/positions.ts";
import {
  BODY_SCALE_MAX,
  BODY_SCALE_MIN,
  SKY_BRIGHTNESS_MAX,
  SKY_BRIGHTNESS_MIN,
  type BodyRadii,
  type ScaleSettings,
} from "../astronomy/scale.ts";
import type { FocusId } from "../scene/CameraRig.tsx";
import { ObjectFacts } from "./ObjectFacts.tsx";

export type GeoStatus = "idle" | "pending" | "ready" | "denied" | "unavailable";

type ControlsProps = {
  date: Date;
  live: boolean;
  onDateChange: (date: Date) => void;
  focus: FocusId;
  onFocus: (id: FocusId) => void;
  onRefresh: () => void;
  onSpeed: (daysPerSec: number) => void;
  scale: ScaleSettings;
  onScaleChange: (patch: Partial<ScaleSettings>) => void;
  onScaleReset: () => void;
  radii: BodyRadii;
  positions: BodyPositions;
  showAxes: boolean;
  onShowAxesChange: (value: boolean) => void;
  geoStatus: GeoStatus;
  onWhereAmI: () => void;
};

type PanelId = "system" | "scale" | "objects";

type OpenPanels = Record<PanelId, boolean>;

const NARROW_QUERY = "(max-width: 840px)";

function isNarrowViewport(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches
  );
}

function defaultOpenPanels(): OpenPanels {
  return { system: true, scale: false, objects: false };
}

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(isNarrowViewport);
  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

function BodySwatch({ id }: { id: FocusId }) {
  if (id === "reset") return <span className="body-swatch body-swatch-reset" aria-hidden />;
  if (isMoonId(id)) {
    return (
      <span
        className="body-swatch"
        style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${MOON_BY_ID[id].swatch})` }}
        aria-hidden
      />
    );
  }
  return <span className={`body-swatch body-swatch-${id as BodyId}`} aria-hidden />;
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="hud-dock-icon" viewBox="0 0 16 16" aria-hidden>
      <path
        d={dir === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function combineLocalDateTime(datePart: string, timePart: string): Date {
  return new Date(`${datePart}T${timePart}`);
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderProps) {
  return (
    <label className="scale-slider">
      <span className="scale-slider-row">
        <span>{label}</span>
        <span className="scale-slider-value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function holdHandlers(speed: number, onSpeed: (value: number) => void) {
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onSpeed(speed);
    },
    onPointerUp: () => onSpeed(0),
    onPointerCancel: () => onSpeed(0),
  };
}

export function Controls({
  date,
  live,
  onDateChange,
  focus,
  onFocus,
  onRefresh,
  onSpeed,
  scale,
  onScaleChange,
  onScaleReset,
  radii,
  positions,
  showAxes,
  onShowAxesChange,
  geoStatus,
  onWhereAmI,
}: ControlsProps) {
  const overlap = radii.earth + radii.moon > positions.moonOrbitRadius;
  const dateValue = toDateInputValue(date);
  const timeValue = toTimeInputValue(date);
  const narrow = useNarrowViewport();
  const [openPanels, setOpenPanels] = useState<OpenPanels>(defaultOpenPanels);

  useEffect(() => {
    if (!narrow || geoStatus !== "ready") return;
    setOpenPanels((current) =>
      current.objects ? { ...current, objects: false } : current,
    );
  }, [geoStatus, narrow]);

  useEffect(() => {
    if (!narrow) return;
    setOpenPanels((current) => {
      if (current.scale && current.objects)
        return { ...current, objects: false };
      if (current.system && (current.scale || current.objects)) {
        return { ...current, scale: false, objects: false };
      }
      return current;
    });
  }, [narrow]);

  useEffect(() => {
    if (!narrow || (!openPanels.scale && !openPanels.objects)) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        setOpenPanels((current) => ({
          ...current,
          scale: false,
          objects: false,
        }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [narrow, openPanels.objects, openPanels.scale]);

  const togglePanel = (id: PanelId) => {
    setOpenPanels((current) => {
      const next = !current[id];
      if (narrow) {
        return {
          system: id === "system" && next,
          scale: id === "scale" && next,
          objects: id === "objects" && next,
        };
      }
      return { ...current, [id]: next };
    });
  };

  return (
    <div className="hud">
      <img
        className="hud-app-logo"
        src={`${import.meta.env.BASE_URL}icons/logo-128.png`}
        width={40}
        height={40}
        alt=""
        draggable={false}
      />
      <ObjectFacts focus={focus} />
      {narrow && (openPanels.scale || openPanels.objects) ? (
        <button
          type="button"
          className="hud-backdrop"
          aria-label="Close panel"
          onPointerDown={() =>
            setOpenPanels((current) => ({
              ...current,
              scale: false,
              objects: false,
            }))
          }
        />
      ) : null}

      <div className="hud-stack hud-stack-left">
        <div
          className={`hud-dock hud-dock-left ${openPanels.scale ? "is-open" : ""}`.trim()}
        >
          <aside
            id="hud-scale-panel"
            className="hud-panel hud-scale-panel"
            aria-label="Scene"
            inert={!openPanels.scale}
          >
            <div className="hud-panel-head">
              <p className="hud-kicker">Scene</p>
              <button
                type="button"
                className="scale-reset"
                onClick={onScaleReset}
              >
                Reset
              </button>
            </div>
            <label className="hud-check">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(event) => onShowAxesChange(event.target.checked)}
              />
              Show orbits and axes
            </label>
            <Slider
              label="Body sizes"
              value={scale.bodyScale}
              min={BODY_SCALE_MIN}
              max={BODY_SCALE_MAX}
              step={1}
              format={(value) => `${value}×`}
              onChange={(bodyScale) => onScaleChange({ bodyScale })}
            />
            <Slider
              label="Distances"
              value={scale.auInUnits}
              min={20}
              max={250}
              step={1}
              format={(value) => `1 AU = ${value}`}
              onChange={(auInUnits) => onScaleChange({ auInUnits })}
            />
            <Slider
              label="Star brightness"
              value={scale.skyBrightness}
              min={SKY_BRIGHTNESS_MIN}
              max={SKY_BRIGHTNESS_MAX}
              step={1}
              format={(value) => `${value}%`}
              onChange={(skyBrightness) => onScaleChange({ skyBrightness })}
            />
            <Slider
              label="Milky Way brightness"
              value={scale.milkyWayBrightness}
              min={SKY_BRIGHTNESS_MIN}
              max={SKY_BRIGHTNESS_MAX}
              step={1}
              format={(value) => `${value}%`}
              onChange={(milkyWayBrightness) => onScaleChange({ milkyWayBrightness })}
            />
            <p className="hud-scale">
              Body sizes ×{scale.bodyScale} relative to distances. 1 AU ={" "}
              {scale.auInUnits} scene units. Positions are ephemerides for the{" "}
              {live ? "current" : "selected"} time.
            </p>
            {overlap ? (
              <p className="hud-warning">
                Earth and Moon overlap at the current scale.
              </p>
            ) : null}
          </aside>
          <button
            type="button"
            className="hud-dock-tab"
            aria-expanded={openPanels.scale}
            aria-controls="hud-scale-panel"
            onClick={() => togglePanel("scale")}
          >
            <Chevron dir={openPanels.scale ? "left" : "right"} />
            <span className="hud-dock-tab-name">Scene</span>
          </button>
        </div>

        <div
          className={`hud-dock hud-dock-left hud-dock-time ${openPanels.system ? "is-open" : ""}`.trim()}
        >
          <header id="hud-system-panel" className="hud-panel hud-system-panel">
            <p className="hud-kicker">Time</p>
            <div className="hud-datetime" aria-label="Ephemeris date and time">
              <label className="hud-datetime-field">
                <span>Date</span>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(event) =>
                    onDateChange(
                      combineLocalDateTime(event.target.value, timeValue),
                    )
                  }
                />
              </label>
              <label className="hud-datetime-field">
                <span>Time</span>
                <input
                  type="time"
                  step={60}
                  value={timeValue}
                  onChange={(event) =>
                    onDateChange(
                      combineLocalDateTime(dateValue, event.target.value),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="hud-now"
                onClick={onRefresh}
                disabled={live}
              >
                Now
              </button>
            </div>
            <div className="hud-scrub" aria-label="Time rewind">
              <button
                type="button"
                aria-label="Rewind fast"
                {...holdHandlers(-SCRUB_FAST_DAYS_PER_SEC, onSpeed)}
              >
                ««
              </button>
              <button
                type="button"
                aria-label="Rewind"
                {...holdHandlers(-SCRUB_SLOW_DAYS_PER_SEC, onSpeed)}
              >
                «
              </button>
              <button
                type="button"
                aria-label="Rewind slow"
                {...holdHandlers(-SCRUB_FINE_DAYS_PER_SEC, onSpeed)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Forward slow"
                {...holdHandlers(SCRUB_FINE_DAYS_PER_SEC, onSpeed)}
              >
                ›
              </button>
              <button
                type="button"
                aria-label="Forward"
                {...holdHandlers(SCRUB_SLOW_DAYS_PER_SEC, onSpeed)}
              >
                »
              </button>
              <button
                type="button"
                aria-label="Forward fast"
                {...holdHandlers(SCRUB_FAST_DAYS_PER_SEC, onSpeed)}
              >
                »»
              </button>
            </div>
          </header>
          <button
            type="button"
            className="hud-dock-tab"
            aria-expanded={openPanels.system}
            aria-controls="hud-system-panel"
            onClick={() => togglePanel("system")}
          >
            <Chevron dir={openPanels.system ? "left" : "right"} />
            <span className="hud-dock-tab-name">Time</span>
          </button>
        </div>
      </div>

      <div
        className={`hud-dock hud-dock-right ${openPanels.objects ? "is-open" : ""}`.trim()}
      >
        <button
          type="button"
          className="hud-dock-tab"
          aria-expanded={openPanels.objects}
          aria-controls="hud-objects-panel"
          onClick={() => togglePanel("objects")}
        >
          <Chevron dir={openPanels.objects ? "right" : "left"} />
          <span className="hud-dock-tab-name">Objects</span>
        </button>
        <aside
          id="hud-objects-panel"
          className="hud-panel hud-objects-panel"
          aria-label="System bodies"
          inert={!openPanels.objects}
        >
          <p className="hud-kicker">Objects</p>
            <nav className="body-list" aria-label="System bodies">
              <button
                type="button"
                className={`body-list-overview ${focus === "reset" ? "is-active" : ""}`.trim()}
                onClick={() => {
                  onFocus("reset");
                  if (narrow)
                    setOpenPanels((current) => ({
                      ...current,
                      objects: false,
                    }));
                }}
              >
                Solar system overview
              </button>
              <button
                type="button"
                className={`body-list-locate ${geoStatus === "ready" ? "is-active" : ""}`.trim()}
                disabled={geoStatus === "pending"}
                onClick={onWhereAmI}
              >
                <span className="body-swatch body-swatch-locate" aria-hidden />
                {geoStatus === "pending"
                  ? "Locating…"
                  : geoStatus === "denied"
                    ? "Location denied"
                    : geoStatus === "unavailable"
                      ? "Location unavailable"
                      : "Where am I?"}
              </button>
              {PRIMARY_BODIES.map((item) => {
                const moons = isPlanetId(item.id) ? MOONS_BY_PARENT[item.id] : [];
                return (
                  <div key={item.id} className="body-group">
                    <button
                      type="button"
                      className={focus === item.id ? "is-active" : undefined}
                      onClick={() => {
                        onFocus(item.id);
                        if (narrow)
                          setOpenPanels((current) => ({
                            ...current,
                            objects: false,
                          }));
                      }}
                    >
                      <BodySwatch id={item.id} />
                      {item.label}
                    </button>
                    {moons.length > 0 ? (
                      <div className="body-moons">
                        {moons.map((moon) => (
                          <button
                            key={moon.id}
                            type="button"
                            className={`body-moon ${focus === moon.id ? "is-active" : ""}`.trim()}
                            onClick={() => {
                              onFocus(moon.id);
                              if (narrow)
                                setOpenPanels((current) => ({
                                  ...current,
                                  objects: false,
                                }));
                            }}
                          >
                            <BodySwatch id={moon.id} />
                            {moon.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
        </aside>
      </div>

      <p className="hud-credit">
        <a
          href="https://science.nasa.gov/"
          target="_blank"
          rel="noreferrer"
        >
          Imagery · NASA / USGS / ESA
        </a>
      </p>
    </div>
  );
}
