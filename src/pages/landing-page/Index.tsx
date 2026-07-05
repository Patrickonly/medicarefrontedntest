import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import FooterSection from "@/components/landing/FooterSection";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { success, error, warning, info } = useToast();

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <HeroSection />
      <div className="container mx-auto py-12 px-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Test Toast Notifications</h2>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={() => success("Success!", "Your action was completed successfully.")} className="bg-green-600 hover:bg-green-700">
            Show Success Toast
          </Button>
          <Button onClick={() => error("Error!", "Something went wrong. Please try again.")} className="bg-red-600 hover:bg-red-700">
            Show Error Toast
          </Button>
          <Button onClick={() => warning("Warning!", "Please review your input before continuing.")} className="bg-yellow-500 hover:bg-yellow-600">
            Show Warning Toast
          </Button>
          <Button onClick={() => info("Info!", "Here's some useful information for you.")} className="bg-blue-600 hover:bg-blue-700">
            Show Info Toast
          </Button>
        </div>
      </div>
      <FeaturesSection />
      <PricingSection />
      <CTASection />
      <FooterSection />
    </div>
  );
};

export default Index;
