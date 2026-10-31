import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <p className="text-5xl font-bold text-accent">404</p>
      <Link href="/" className="btn-primary mt-6">
        Toolbox
      </Link>
    </div>
  );
}
