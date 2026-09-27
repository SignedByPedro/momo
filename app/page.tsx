import MomoChat from "@/components/momo/MomoChat";
import MomoHero from "@/components/momo/MomoHero";
import PublicLegalFooter from "./legal/_components/PublicLegalFooter";

export default function Home() {
  return (
    <main className="momo-sales-home">
      <MomoHero />
      <MomoChat />
      <PublicLegalFooter />
    </main>
  );
}
