import { Search } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream-dark/50 via-background to-background" />
      <div className="absolute top-0 left-0 right-0 h-96 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--gold)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,hsl(var(--sage)/0.1),transparent_40%)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="font-body text-sm text-muted-foreground">
              Open Today: 9AM - 8PM
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-semibold text-foreground mb-6 animate-fade-in [animation-delay:100ms]">
            Discover Your Next
            <span className="block text-gradient-gold">Great Read</span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in [animation-delay:200ms]">
            Explore over 50,000 books, digital resources, and community programs.
            Your journey of discovery starts here.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in [animation-delay:300ms]">
            <div className="relative flex items-center bg-card rounded-xl shadow-card border border-border overflow-hidden">
              <Search className="absolute left-5 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search books, authors, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-5 pl-14 pr-4 bg-transparent font-body text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <Button variant="hero" size="lg" className="m-2">
                Search
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in [animation-delay:400ms]">
            <span className="font-body text-sm text-muted-foreground">Popular:</span>
            {["New Arrivals", "Fiction", "Non-Fiction", "Children's Books"].map((tag) => (
              <a
                key={tag}
                href="#"
                className="px-4 py-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground font-body text-sm transition-colors duration-200"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-20 animate-fade-in [animation-delay:500ms]">
          {[
            { value: "50K+", label: "Books" },
            { value: "15K+", label: "E-Books" },
            { value: "200+", label: "Events/Year" },
            { value: "10K+", label: "Members" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="font-body text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
