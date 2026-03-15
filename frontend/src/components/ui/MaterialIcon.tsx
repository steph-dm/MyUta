import { cn } from "../../lib/utils";

interface MaterialIconProps {
  icon: string;
  className?: string;
  /** Material Symbols optical size: 20, 24, 40, 48 */
  size?: number;
}

/**
 * Renders a Google Material Symbols Outlined icon.
 * @see https://fonts.google.com/icons for icon names.
 */
const MaterialIcon = ({ icon, className, size = 24 }: MaterialIconProps) => (
  <span
    className={cn("material-symbols-outlined select-none", className)}
    style={{ fontSize: size }}
    aria-hidden="true"
  >
    {icon}
  </span>
);

export default MaterialIcon;
