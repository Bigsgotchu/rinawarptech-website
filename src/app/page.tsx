import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Testimonials } from "../components/Testimonials";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { PricingComparison } from "../components/PricingComparison";
import { Download } from "../components/Download";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <PricingComparison />
        <FAQ />
        <Download />
      </main>
      <footer className="py-12 mt-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>&copy; 2024 RinaWarp Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
