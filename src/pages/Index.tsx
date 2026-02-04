import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeaturedBooks from "@/components/FeaturedBooks";
import Services from "@/components/Services";
import Hours from "@/components/Hours";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <FeaturedBooks />
        <Services />
        <Hours />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
