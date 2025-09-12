
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center text-primary">GoalGazer Frontend</h1>
        <p className="text-center mt-4">This is the Next.js frontend application.</p>
        <div className="flex justify-center mt-8">
          <Button>Get Started</Button>
        </div>
      </div>
    </main>
  );
}
