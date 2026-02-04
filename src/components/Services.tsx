import { BookOpen, Calendar, Laptop, Users } from "lucide-react";

const services = [
  {
    icon: BookOpen,
    title: "Book Borrowing",
    description: "Borrow up to 10 items for 3 weeks with easy online renewals.",
  },
  {
    icon: Laptop,
    title: "Digital Resources",
    description: "Access e-books, audiobooks, and online databases from anywhere.",
  },
  {
    icon: Calendar,
    title: "Events & Programs",
    description: "Join book clubs, author talks, workshops, and children's story time.",
  },
  {
    icon: Users,
    title: "Study Spaces",
    description: "Reserve quiet study rooms or collaborative workspaces.",
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-body text-gold font-medium mb-2">What We Offer</p>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Library Services
          </h2>
          <p className="font-body text-muted-foreground">
            More than just books. Discover resources and programs designed to inspire,
            educate, and connect our community.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group p-8 rounded-2xl bg-card border border-border hover:border-gold/30 transition-all duration-300 card-hover animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors">
                <service.icon className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-heading text-xl font-medium text-foreground mb-3">
                {service.title}
              </h3>
              <p className="font-body text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
