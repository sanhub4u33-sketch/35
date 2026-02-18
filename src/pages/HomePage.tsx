import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Wifi, 
  BookOpen, 
  Users, 
  Star,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Zap,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-library.jpg';
import wisebraryLogo from '@/assets/wisebrary-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { isPWAStandalone } from '@/lib/pwa';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const HomePage = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const pwa = isPWAStandalone();
  const [activeCount, setActiveCount] = useState(0);

  // Real-time active members count (those with entry but no exit today)
  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'attendance'), (snap) => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const active = snap.docs.filter((d) => {
        const data = d.data();
        return data.date === today && !data.exitTime;
      });
      setActiveCount(active.length);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!pwa) return;
    if (loading) return;

    if (user) {
      const isOwnerAdmin = user.email === 'wisebray@gmail.com';
      const target = isOwnerAdmin ? '/admin' : '/user';
      navigate(target, { replace: true });
      return;
    }
  }, [pwa, loading, user, userRole, navigate]);

  if (pwa && (loading || !!user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Opening your account…</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Clock,
      title: '24 Hours Open',
      description: 'Study anytime that suits your schedule. Our library never closes.',
    },
    {
      icon: Wifi,
      title: 'Dual High-Speed WiFi',
      description: 'Blazing fast internet with backup connection for uninterrupted studying.',
    },
    {
      icon: Zap,
      title: 'First Digital Library in Lucknow',
      description: 'Pioneer digital library in Lucknow with modern facilities.',
    },
    {
      icon: Users,
      title: 'Peaceful Environment',
      description: 'Quiet, air-conditioned space perfect for focused studying.',
    },
    {
      icon: BookOpen,
      title: 'Study Materials',
      description: 'Access to reference books and study materials for various exams.',
    },
    {
      icon: UserCheck,
      title: 'Digital Attendance',
      description: 'Smart digital attendance tracking with real-time monitoring.',
    },
  ];

  const testimonials = [
    {
      name: 'Rahul Kumar',
      exam: 'UPSC Aspirant',
      text: 'The 24/7 access helped me prepare for my exams without any time constraints. Best library in the area!',
    },
    {
      name: 'Priya Singh',
      exam: 'SSC Preparation',
      text: 'Clean environment, good WiFi, and helpful staff. Highly recommended for serious students.',
    },
    {
      name: 'Amit Verma',
      exam: 'Bank PO',
      text: 'The digital facilities are amazing. I can track my study hours and stay motivated.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-effect">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
              <img src={wisebraryLogo} alt="Wisebrary" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-3xl font-bold text-foreground truncate tracking-tight">Wisebrary</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">Lucknow's First Digital Library</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Link to="/login">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">Login</Button>
            </Link>
            <a href="#contact" className="hidden sm:block">
              <Button size="sm" className="btn-primary">Contact Us</Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Wisebrary - Digital Library" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
              <Star className="w-4 h-4 text-accent" />
              <span className="text-sm text-primary-foreground font-medium">First Digital Library in Lucknow</span>
            </div>
            
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-4 sm:mb-6 animate-slide-up">
              Your Gateway to
              <span className="block text-gradient bg-gradient-to-r from-accent via-primary to-accent bg-clip-text"> Success</span>
            </h1>
            
            <p className="text-lg text-primary-foreground/80 mb-8 animate-slide-up delay-100">
              A peaceful, modern study environment with 24/7 access, 
              high-speed WiFi, and all the facilities you need to achieve your goals.
            </p>
            
            <div className="flex flex-wrap gap-4 animate-slide-up delay-200">
              <Link to="/login">
                <Button size="lg" className="btn-primary gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                  Explore Features
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-4 sm:gap-8 mt-8 sm:mt-12 animate-slide-up delay-300">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary-foreground">24/7</p>
                <p className="text-xs sm:text-sm text-primary-foreground/70">Open Hours</p>
              </div>
              <div className="w-px h-8 sm:h-12 bg-primary-foreground/30" />
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                  <p className="text-2xl sm:text-3xl font-bold text-primary-foreground">{activeCount}</p>
                </div>
                <p className="text-xs sm:text-sm text-primary-foreground/70">Studying Now</p>
              </div>
              <div className="w-px h-8 sm:h-12 bg-primary-foreground/30" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary-foreground">50+</p>
                <p className="text-xs sm:text-sm text-primary-foreground/70">Seats Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              Why Choose Wisebrary?
            </h2>
            <p className="text-muted-foreground">
              We provide everything you need for focused, productive study sessions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="card-elevated p-8 hover:shadow-lg transition-all duration-300 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-xl hero-gradient flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Benefits */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-4xl font-bold text-foreground mb-6">
                Membership Benefits
              </h2>
              <p className="text-muted-foreground mb-8">
                Join our growing community of dedicated students and unlock exclusive benefits.
              </p>

              <div className="space-y-4">
                {[
                  '24/7 library access with entry card',
                  'High-speed dual WiFi connection',
                  'Air-conditioned comfortable seating',
                  'Power backup for uninterrupted study',
                  'Digital attendance tracking',
                  'Flexible monthly payment options',
                  'Study materials & reference books',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <Link to="/login" className="inline-block mt-8">
                <Button size="lg" className="btn-primary gap-2">
                  Join Now <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
              <div className="relative card-elevated p-8">
                <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                  Monthly Membership
                </h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold text-primary">₹250</span>
                  <span className="text-muted-foreground">/month onwards</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Affordable plans starting from ₹250/month. Contact us for special rates and packages.
                </p>
                <a href="tel:+918112708784">
                  <Button className="w-full btn-primary">Call to Enquire</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              What Our Members Say
            </h2>
            <p className="text-muted-foreground">
              Hear from students who achieved their goals with us.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="card-elevated p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.exam}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold text-foreground mb-4">
                Visit Us Today
              </h2>
              <p className="text-muted-foreground">
                We're always here to help you on your journey to success.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="card-elevated p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">Address</h3>
                    <a 
                      href="https://maps.app.goo.gl/QazeDSE8A4gdjDmU8?g_st=aw"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View on Google Maps
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">Contact</h3>
                    <a href="tel:+918112708784" className="text-primary hover:underline text-lg font-medium block">
                      +91 81127 08784
                    </a>
                    <a href="tel:+919795403039" className="text-primary hover:underline text-lg font-medium block">
                      +91 9795403039
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">Email</h3>
                    <a href="mailto:wisebrary@gmail.com" className="text-primary hover:underline text-lg font-medium">
                      wisebrary@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="card-elevated overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.0!2d80.946!3d26.846!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDUwJzQ1LjYiTiA4MMKwNTYnNDUuNiJF!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '300px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Wisebrary Location"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/30 bg-white flex items-center justify-center">
                <img src={wisebraryLogo} alt="Wisebrary" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Wisebrary</h3>
                <p className="text-sm text-sidebar-foreground/70">Lucknow's First Digital Library</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-sidebar-foreground/70">
              <a href="#features" className="hover:text-sidebar-foreground transition-colors">Features</a>
              <a href="#contact" className="hover:text-sidebar-foreground transition-colors">Contact</a>
              <Link to="/login" className="hover:text-sidebar-foreground transition-colors">Login</Link>
            </div>

            <p className="text-sm text-sidebar-foreground/50">
              © {new Date().getFullYear()} Wisebrary. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
