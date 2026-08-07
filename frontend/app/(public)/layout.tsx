import { GlassFooter } from "@/components/glass/glass-footer";
import { GlassNavbar } from "@/components/glass/glass-navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="liquid-bg flex min-h-screen flex-col">
      <GlassNavbar />
      <main className="flex-1 pt-16 pb-24 sm:pt-20">{children}</main>
      <GlassFooter />
    </div>
  );
}
