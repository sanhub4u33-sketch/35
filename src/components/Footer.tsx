import { Book, Facebook, Instagram, Twitter } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    explore: [
      { label: "Catalog", href: "#catalog" },
      { label: "New Arrivals", href: "#" },
      { label: "E-Resources", href: "#" },
      { label: "Children's Section", href: "#" },
    ],
    services: [
      { label: "Library Card", href: "#" },
      { label: "Room Reservations", href: "#" },
      { label: "Interlibrary Loan", href: "#" },
      { label: "Research Help", href: "#" },
    ],
    about: [
      { label: "Our History", href: "#about" },
      { label: "Staff", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Support the Library", href: "#" },
    ],
  };

  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Book className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading text-xl font-semibold text-foreground">
                Oakwood Library
              </span>
            </a>
            <p className="font-body text-muted-foreground max-w-sm mb-6">
              A community hub for learning, discovery, and connection since 1923.
              Open to all, free for everyone.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-medium text-foreground mb-4">Explore</h4>
            <ul className="space-y-3">
              {links.explore.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-medium text-foreground mb-4">Services</h4>
            <ul className="space-y-3">
              {links.services.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-medium text-foreground mb-4">About</h4>
            <ul className="space-y-3">
              {links.about.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-sm text-muted-foreground">
            © {currentYear} Oakwood Library. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
