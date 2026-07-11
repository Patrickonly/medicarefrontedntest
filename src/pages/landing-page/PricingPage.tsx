import PricingSection from "@/components/landing/PricingSection";
import LandingNavbar from "@/components/landing/LandingNavbar";
import FooterSection from "@/components/landing/FooterSection";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-card">
      <LandingNavbar />
      <main className="pt-16">
        <PricingSection />
      </main>
      <FooterSection />
    </div>
  );
}