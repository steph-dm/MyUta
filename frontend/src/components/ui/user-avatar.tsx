import { cn } from "../../lib/utils";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-sky-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-slate-500",
];

function getInitials(name: string, email: string): string {
  return (name || email)
    .split(/[\s@]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getColorIndex(name: string): number {
  return (
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length
  );
}

interface UserAvatarProps {
  name: string;
  email: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl",
};

const UserAvatar = ({
  name,
  email,
  size = "md",
  className,
}: UserAvatarProps) => {
  const initials = getInitials(name, email);
  const colorIndex = getColorIndex(name);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0",
        sizeClasses[size],
        AVATAR_COLORS[colorIndex],
        className,
      )}
    >
      {initials}
    </div>
  );
};

export default UserAvatar;
