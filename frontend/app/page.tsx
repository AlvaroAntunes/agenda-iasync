"use client";

import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhatsAppMockup from "@/components/WhatsAppMockup";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import { TestimonialsSection } from "@/components/Testimonials";

const HomePage = () => {
  useEffect(() => {
    // Verifica se há uma seção salva para fazer scroll
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    if (scrollToSection) {
      sessionStorage.removeItem('scrollToSection');
      
      // Aguarda um pouco para garantir que a página carregou
      setTimeout(() => {
        const element = document.querySelector(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

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
