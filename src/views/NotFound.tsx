import { Link } from "@/client/navigation";
import { Button } from "@/components/ui/button.tsx";
import { Scale } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6">
        <Scale className="w-8 h-8 text-primary-foreground" />
      </div>
      <h1 className="font-serif text-6xl font-bold text-primary mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-8">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild size="lg">
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
