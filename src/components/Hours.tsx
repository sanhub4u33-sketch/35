import { Clock, MapPin, Phone } from "lucide-react";
import { Button } from "./ui/button";

const hours = [
  { day: "Monday - Thursday", time: "9:00 AM - 8:00 PM" },
  { day: "Friday", time: "9:00 AM - 6:00 PM" },
  { day: "Saturday", time: "10:00 AM - 5:00 PM" },
  { day: "Sunday", time: "12:00 PM - 5:00 PM" },
];

const Hours = () => {
  return (
    <section id="about" className="py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Info */}
          <div>
            <p className="font-body text-gold font-medium mb-2">Visit Us</p>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6">
              Hours & Location
            </h2>
            <p className="font-body text-primary-foreground/80 mb-8 max-w-lg">
              Located in the heart of downtown, our historic building welcomes visitors
              with comfortable reading areas, modern amenities, and a dedicated staff
              ready to help.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-body font-medium">123 Oak Street</p>
                  <p className="font-body text-primary-foreground/70">
                    Downtown, City 12345
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-body font-medium">(555) 123-4567</p>
                  <p className="font-body text-primary-foreground/70">
                    info@oakwoodlibrary.org
                  </p>
                </div>
              </div>
            </div>

            <Button variant="gold" size="lg">
              Get Directions
            </Button>
          </div>

          {/* Hours Table */}
          <div className="bg-walnut-light/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-gold" />
              <h3 className="font-heading text-xl font-medium">Library Hours</h3>
            </div>
            <div className="space-y-4">
              {hours.map((item) => (
                <div
                  key={item.day}
                  className="flex justify-between items-center py-3 border-b border-primary-foreground/10 last:border-0"
                >
                  <span className="font-body text-primary-foreground/80">{item.day}</span>
                  <span className="font-body font-medium">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hours;
