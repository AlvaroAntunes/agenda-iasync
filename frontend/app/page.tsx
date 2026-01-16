import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhatsAppMockup from "@/components/WhatsAppMockup";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import { TestimonialsSection } from "@/components/Testimonials";

const HomePage = () => {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <WhatsAppMockup />
      <Features />
      <Pricing />
      <TestimonialsSection />
      <Footer />
    </main>
  );
};

export default HomePage;
