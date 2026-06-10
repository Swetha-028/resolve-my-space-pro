import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Wrench, ShieldCheck, MapPin, BellRing } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Campus Portal — Report campus issues, fast" },
      {
        name: "description",
        content:
          "Students report broken fans, projectors, leaks and more. Admins assign staff. Everyone sees status updates in real time.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-md">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="font-semibold">Smart Campus</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-8 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1 text-xs font-medium text-accent-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Digital Complaint &
          Maintenance Portal
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
          Fix campus issues
          <span className="block bg-clip-text text-transparent gradient-brand"> in a few taps</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Report broken fans, faulty projectors, leaks or any classroom issue. Track it from{" "}
          <em>pending</em> to <em>resolved</em>, all from your phone.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: MapPin,
              title: "Geo-tagged",
              desc: "Auto-captures GPS plus building & room number.",
            },
            {
              icon: BellRing,
              title: "Live updates",
              desc: "Get notified when staff are assigned or issues resolved.",
            },
            {
              icon: ShieldCheck,
              title: "Role-based",
              desc: "Separate dashboards for students, admins and staff.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-5 text-left shadow-[var(--card-glow)]"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg gradient-brand-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 font-semibold">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
