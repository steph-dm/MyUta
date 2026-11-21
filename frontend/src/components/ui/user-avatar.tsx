import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-20 h-20 text-2xl" };

interface UserAvatarProps {
  name: string;
  email?: string;
  size?: keyof typeof sizes;
  className?: string;
}

const UserAvatar = ({ name, email = "", size = "md", className }: UserAvatarProps) => (
  <div
    aria-hidden="true"
    className={cn(
      "rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0",
      sizes[size],
      avatarColor(name || email).className,
      className,
    )}
  >
    {initials(name, email)}
  </div>
);

export default UserAvatar;
