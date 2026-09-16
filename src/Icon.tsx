import { iconFor } from './gameIcons';

/** Game Icons: monochrome SVG that inherits colour, unlike emoji. */
export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const Ic = iconFor(name);
  return <Ic size={size} className="gi" aria-hidden="true" />;
}
