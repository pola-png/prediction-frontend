import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import placeholderImages from "@/lib/placeholder-images.json";

export default function Home() {
  const heroImage = placeholderImages.hero;
  return (
    <section className="relative w-full h-[80vh] flex items-center justify-center text-center">
      <Image
        src={heroImage.src}
        alt={heroImage.alt}
        fill
        className="object-cover"
        data-ai-hint="stadium football"
        priority
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground">
          Welcome to GoalGazer
        </h1>
        <p className="mt-4 text-lg md:text-xl text-primary-foreground/80">
          Leverage the power of AI to get the most accurate football match
          predictions.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="#">Get Started</Link>
        </Button>
      </div>
    </section>
  );
}
