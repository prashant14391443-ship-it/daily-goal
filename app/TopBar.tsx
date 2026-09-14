"use client";

import { usePathname } from "next/navigation";
import NotificationCenter from "./NotificationCenter";
import ProfileMenu from "./ProfileMenu";

//    <Bell size={18} className="text-violet-200" /> + 👤 show ONLY on the 5 main tab screens
const SHOW = ["/dashboard", "/study", "/gym-log", "/routine-habits", "/todo"];

export default function TopBar() {
  const pathname = usePathname();
  if (!SHOW.includes(pathname)) return null;
  return (
    <>
      <NotificationCenter />
      <ProfileMenu />
    </>
  );
}