import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
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
  UserCheck,
  Clock,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import wisebraryLogo from '@/assets/wisebrary-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { isPWAStandalone } from '@/lib/pwa';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// Animated counter hook
const useCounter = (target: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  
  return { count, ref };
};

// Section wrapper with scroll animation
const AnimatedSection = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const HomePage = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const pwa = isPWAStandalone();
  const [activeCount, setActiveCount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'6hr' | '12hr'>('12hr');
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
  const navBg = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const [navOpacity, setNavOpacity] = useState(0);

  useEffect(() => {
    return navBg.on('change', (v) => setNavOpacity(v));
  }, [navBg]);

  // Real-time active members count
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
      const isOwnerAdmin = user.email === 'wisebrary@gmail.com';
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

  const activeCounter = useCounter(activeCount, 1500);

  const features = [
    { icon: Wifi, title: 'Dual High-Speed WiFi', description: 'Blazing fast internet with backup connection for uninterrupted studying.' },
    { icon: Zap, title: 'First Digital Library in Lucknow', description: 'Pioneer digital library in Lucknow with modern facilities.' },
    { icon: Users, title: 'Peaceful Environment', description: 'Quiet, air-conditioned space perfect for focused studying.' },
    { icon: BookOpen, title: 'Study Materials', description: 'Access to reference books and study materials for various exams.' },
    { icon: UserCheck, title: 'Digital Attendance', description: 'Smart digital attendance tracking with real-time monitoring.' },
    { icon: Sparkles, title: 'Premium Infrastructure', description: 'Modern furniture, power backup, and optimized lighting for comfort.' },
  ];

  const testimonials = [
    { name: 'Hasan Alam', text: 'The place is so warm in the winters, and vice versa for summers, the perfect environment one could ask for.' },
    { name: 'Talib Mehdi', text: 'A warm and cozy place to maximize your productivity. wisebrary came as a saviour in providing a silent and focused work environment.' },
    { name: 'Dania Zehra', text: 'An excellent library for focused preparation. The environment is silent and disciplined, with proper ventilation, lighting, and seating.' },
    { name: 'Nikhil Singh', text: 'The space itself is well-maintained, with comfortable seating and plenty of natural light.' },
    { name: 'Areeba Fatima', text: 'Very good owner, and very comfortable seating arrangements. Perfect temperature in summers, would recommend 10/10!' },
    { name: 'Shreyansh Mishra', text: 'wisebrary is an exceptional self-study library that sets the standard for a productive and focused learning environment.' },
    { name: 'Apoorva Bharti', text: 'The library has a peaceful atmosphere. Comfortable seating and great resources. Highly recommended!' },
    { name: 'Andaleeb Zehra', text: 'Library is spacious, clean, and well-maintained. The staff is incredibly friendly and helpful.' },
    { name: 'Mohd Sajid Abbas', text: 'Definitely a must-visit place! The atmosphere is so serene that it elevates concentration manifold 💯' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300"
        style={{ 
          backgroundColor: `hsla(0, 0%, 100%, ${navOpacity * 0.9})`,
          backdropFilter: `blur(${navOpacity * 12}px)`,
          borderColor: `hsla(0, 0%, 88%, ${navOpacity})`
        }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <motion.div 
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden flex-shrink-0 bg-background flex items-center justify-center ring-2 ring-primary/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <img src={wisebraryLogo} alt="wisebrary" className="w-full h-full object-cover" />
            </motion.div>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-3xl font-bold text-foreground truncate tracking-tight">wisebrary</h1>
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
      </motion.nav>

      {/* Hero Section */}
      <motion.section 
        className="relative min-h-screen flex items-center pt-20 overflow-hidden"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        {/* Animated background orbs */}
        <motion.div 
          className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full blur-[100px]"
          style={{ background: 'hsla(43, 90%, 48%, 0.08)' }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: 'hsla(43, 96%, 56%, 0.06)' }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{ background: 'hsla(43, 90%, 48%, 0.1)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(hsla(0,0%,0%,0.1) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,0%,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-5 py-2.5 rounded-full mb-8"
            >
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                <Star className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-sm text-foreground font-medium">First Digital Library in Lucknow</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground mb-6 leading-[0.85]"
            >
              Your Gateway
              <motion.span 
                className="block text-gradient mt-2"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                to Success
              </motion.span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed"
            >
              A peaceful, modern study environment with 18 hours access, 
              high-speed WiFi, and everything you need to achieve your goals.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Link to="/login">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" className="btn-primary gap-2 text-base px-8 py-6 shadow-lg">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
              <a href="#features">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" variant="outline" className="text-base px-8 py-6">
                    Explore Features
                  </Button>
                </motion.div>
              </a>
            </motion.div>

            {/* Stats Row */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1 }}
              className="flex items-center justify-center gap-6 sm:gap-12 mt-16"
            >
              <div className="text-center">
                <p className="text-3xl sm:text-5xl font-black text-foreground">18<span className="text-primary">hrs</span></p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Open Daily</p>
              </div>
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-border to-transparent" />
              <div className="text-center" ref={activeCounter.ref}>
                <div className="flex items-center gap-2 justify-center">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-success animate-ping" />
                  </div>
                  <p className="text-3xl sm:text-5xl font-black text-foreground">{activeCount}</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Studying Now</p>
              </div>
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-border to-transparent" />
              <div className="text-center">
                <p className="text-3xl sm:text-5xl font-black text-foreground">50<span className="text-primary">+</span></p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Seats Available</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground/50" />
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-28 relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, hsla(0,0%,95%,0.5) 0%, hsla(0,0%,100%,0) 100%)' }} />
        <div className="container mx-auto px-4 relative">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-primary font-semibold text-sm tracking-widest uppercase mb-4 block">Why Us</span>
            <h2 className="font-display text-4xl sm:text-5xl font-black text-foreground mb-4">
              Why Choose <span className="text-gradient">wisebrary</span>?
            </h2>
            <p className="text-muted-foreground text-lg">
              We provide everything you need for focused, productive study sessions.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 0.1}>
                <motion.div 
                  className="card-elevated p-8 h-full group cursor-default"
                  whileHover={{ y: -8, boxShadow: '0 20px 40px -12px hsla(43, 90%, 48%, 0.15)' }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div 
                    className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center mb-6"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                  >
                    <feature.icon className="w-7 h-7 text-primary-foreground" />
                  </motion.div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Benefits */}
      <section className="py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <span className="text-primary font-semibold text-sm tracking-widest uppercase mb-4 block">Membership</span>
              <h2 className="font-display text-4xl sm:text-5xl font-black text-foreground mb-6">
                Membership <span className="text-gradient">Benefits</span>
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Join our growing community of dedicated students and unlock exclusive benefits.
              </p>

              <div className="space-y-4">
                {[
                  '18 hours daily library access',
                  'High-speed dual WiFi connection',
                  'Air-conditioned comfortable seating',
                  'Power backup for uninterrupted study',
                  'Digital attendance tracking',
                  'Flexible monthly payment options',
                  'Study materials & reference books',
                ].map((benefit, i) => (
                  <motion.div 
                    key={benefit} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="w-6 h-6 rounded-full hero-gradient flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-foreground font-medium">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <Link to="/login" className="inline-block mt-10">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" className="btn-primary gap-2 shadow-lg">
                    Join Now <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </Link>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="relative">
                <motion.div 
                  className="absolute -top-8 -left-8 w-72 h-72 rounded-full blur-[80px]"
                  style={{ background: 'hsla(43, 90%, 48%, 0.12)' }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 5, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute -bottom-8 -right-8 w-72 h-72 rounded-full blur-[80px]"
                  style={{ background: 'hsla(43, 96%, 56%, 0.08)' }}
                  animate={{ scale: [1.1, 1, 1.1] }}
                  transition={{ duration: 6, repeat: Infinity }}
                />
                <div className="relative card-elevated p-8 border-primary/10">
                  {/* Toggle */}
                  <div className="flex bg-secondary rounded-xl p-1 mb-8">
                    {['6hr', '12hr'].map((plan) => (
                      <motion.button
                        key={plan}
                        onClick={() => setSelectedPlan(plan as '6hr' | '12hr')}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                          selectedPlan === plan
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        {plan === '6hr' ? '6 Hours' : '12 Hours'}
                      </motion.button>
                    ))}
                  </div>

                  <h3 className="font-display text-3xl font-black text-foreground mb-1">
                    {selectedPlan === '6hr' ? '6 Hours' : '12 Hours'} Plan
                  </h3>
                  <p className="text-sm text-muted-foreground mb-8">Daily access for {selectedPlan === '6hr' ? '6' : '12'} hours</p>

                  <div className="space-y-1 mb-8">
                    {(selectedPlan === '6hr'
                      ? [
                          { duration: '1 Month', price: '₹650' },
                          { duration: '2 Months', price: '₹1,200' },
                          { duration: '3 Months', price: '₹1,650' },
                        ]
                      : [
                          { duration: '1 Month', price: '₹1,200' },
                          { duration: '2 Months', price: '₹2,200' },
                          { duration: '3 Months', price: '₹3,000' },
                        ]
                    ).map((item, i, arr) => (
                      <motion.div
                        key={item.duration}
                        className={`flex items-center justify-between py-4 px-4 rounded-lg hover:bg-secondary/50 transition-colors ${i < arr.length - 1 ? 'border-b border-border/50' : ''}`}
                        whileHover={{ x: 4 }}
                      >
                        <span className="text-muted-foreground">{item.duration}</span>
                        <span className="text-2xl font-black text-foreground">{item.price}</span>
                      </motion.div>
                    ))}
                  </div>

                  <a href="tel:+918112708784" className="block">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="w-full btn-primary py-6 text-base font-bold shadow-lg">Call to Enquire</Button>
                    </motion.div>
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, hsla(0,0%,95%,0.5) 0%, hsla(0,0%,100%,0) 100%)' }} />
        <div className="container mx-auto px-4 relative">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-primary font-semibold text-sm tracking-widest uppercase mb-4 block">Testimonials</span>
            <h2 className="font-display text-4xl sm:text-5xl font-black text-foreground mb-4">
              What Our <span className="text-gradient">Members</span> Say
            </h2>
            <p className="text-muted-foreground text-lg">
              Hear from students who achieved their goals with us.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <AnimatedSection key={testimonial.name} delay={i * 0.05}>
                <motion.div 
                  className="card-elevated p-6 h-full"
                  whileHover={{ y: -4, boxShadow: '0 16px 32px -8px hsla(0, 0%, 0%, 0.12)' }}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-5 text-sm leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <p className="font-bold text-foreground text-sm">{testimonial.name}</p>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection className="text-center mb-20">
              <span className="text-primary font-semibold text-sm tracking-widest uppercase mb-4 block">Contact</span>
              <h2 className="font-display text-4xl sm:text-5xl font-black text-foreground mb-4">
                Visit Us <span className="text-gradient">Today</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                We're always here to help you on your journey to success.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Info Card */}
              <AnimatedSection>
                <div className="card-elevated p-6 sm:p-8 space-y-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-1">Address</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Near SBI Bank, Golaganj,<br />
                        Lucknow, Uttar Pradesh
                      </p>
                      <a 
                        href="https://maps.app.goo.gl/QazeDSE8A4gdjDmU8?g_st=aw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm inline-block mt-1 font-medium"
                      >
                        View on Google Maps →
                      </a>
                    </div>
                  </div>

                  <div className="h-px bg-border" />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-1">Contact</h3>
                      <a href="tel:+918112708784" className="text-primary hover:underline font-medium block text-sm">+91 81127 08784</a>
                      <a href="tel:+919795403039" className="text-primary hover:underline font-medium block text-sm">+91 9795403039</a>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-1">Email</h3>
                      <a href="mailto:wisebrary@gmail.com" className="text-primary hover:underline font-medium text-sm">wisebrary@gmail.com</a>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-1">Hours</h3>
                      <p className="text-sm text-muted-foreground">Open 18 hours daily</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Map */}
              <AnimatedSection delay={0.2}>
                <div className="card-elevated overflow-hidden min-h-[350px] h-full">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.0!2d80.946!3d26.846!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDUwJzQ1LjYiTiA4MMKwNTYnNDUuNiJF!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '350px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="wisebrary Location"
                  />
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground py-12 border-t border-sidebar-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/30 bg-background flex items-center justify-center">
                <img src={wisebraryLogo} alt="wisebrary" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">wisebrary</h3>
                <p className="text-sm text-sidebar-foreground/70">Lucknow's First Digital Library</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-sidebar-foreground/70">
              <a href="#features" className="hover:text-sidebar-foreground transition-colors">Features</a>
              <a href="#contact" className="hover:text-sidebar-foreground transition-colors">Contact</a>
              <Link to="/login" className="hover:text-sidebar-foreground transition-colors">Login</Link>
            </div>

            <p className="text-sm text-sidebar-foreground/50">
              © {new Date().getFullYear()} wisebrary. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
