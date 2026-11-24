import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function TopBar() {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-5 sm:px-6">
      <Link href="/" className="font-mono text-sm text-muted no-underline hover:text-foreground">Ayad Arif</Link>
      <ThemeToggle />
    </div>
  );
}
