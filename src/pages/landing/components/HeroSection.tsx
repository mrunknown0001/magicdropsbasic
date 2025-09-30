import { Star, ArrowRight, CheckCircle2, Euro, Clock, MapPin, Users, Zap, Play, Briefcase, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import heroImage from '/src/assets/landing/hero-image.png';
import homeofficeImage from '/src/assets/landing/homeoffice.png';

interface HeroSectionProps {
  settings: any;
  handleWhatsAppClick: () => void;
}

interface Slide {
  id: number;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  features: string[];
  primaryCTA: string;
  secondaryCTA?: string;
  stats: {
    number: string;
    label: string;
    subtext?: string;
  }[];
}

function HeroSection({ settings, handleWhatsAppClick }: HeroSectionProps) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slides: Slide[] = [
    {
      id: 1,
      eyebrow: "Attraktive Vergütung",
      title: "Verdienen Sie bis zu 3.200€ - Ihr finanzieller Durchbruch",
      description: "Starten Sie Ihre digitale Karriere mit einem der bestbezahlten Remote-Jobs in Deutschland. Keine Vorerfahrung erforderlich.",
      image: heroImage,
      imageAlt: "Erfolgreiche Remote-Mitarbeiterin verdient 3200€ monatlich",
      features: ["Gehalt bis 3.200€/Monat", "Pünktliche Auszahlung", "Sozialversicherung inklusive"],
      primaryCTA: "Jetzt bewerben",
      secondaryCTA: "Arbeitsmodelle ansehen",
      stats: [
        { number: "3.200€", label: "Max. Gehalt", subtext: "pro Monat" },
        { number: "2.800€", label: "Durchschnitt", subtext: "unserer Mitarbeiter" },
        { number: "7 Tage", label: "Erste Zahlung", subtext: "nach Start" }
      ]
    },
    {
      id: 2,
      eyebrow: "100% Remote Work",
      title: "Arbeiten Sie von überall - Ihre Freiheit, Ihr Erfolg",
      description: "Gestalten Sie Ihren Arbeitsalltag nach Ihren Wünschen. Homeoffice, flexible Zeiten und perfekte Work-Life-Balance warten auf Sie.",
      image: homeofficeImage,
      imageAlt: "Homeoffice Arbeitsplatz - Flexible Remote Arbeit",
      features: ["Freie Zeiteinteilung", "100% Homeoffice", "Work-Life-Balance"],
      primaryCTA: "Jetzt bewerben",
      secondaryCTA: "Vorteile entdecken",
      stats: [
        { number: "24/7", label: "Verfügbar", subtext: "wann Sie wollen" },
        { number: "0km", label: "Anfahrt", subtext: "von zu Hause" },
        { number: "100%", label: "Remote", subtext: "überall arbeiten" }
      ]
    },
    {
      id: 3,
      eyebrow: "Sofortiger Einstieg",
      title: "Starten Sie sofort durch - Ihre Chance wartet",
      description: "Keine monatelange Wartezeit, keine komplizierten Prozesse. Bewerben Sie sich heute und starten Sie bereits nächste Woche durch.",
      image: heroImage,
      imageAlt: "Schneller Einstieg - Sofort mit Remote Arbeit beginnen",
      features: ["3-Minuten Bewerbung", "Kostenlose Einarbeitung", "Start in 7 Tagen"],
      primaryCTA: "Jetzt bewerben",
      secondaryCTA: "Häufige Fragen",
      stats: [
        { number: "3 Min", label: "Bewerbung", subtext: "schnell & einfach" },
        { number: "0€", label: "Kosten", subtext: "komplett kostenlos" },
        { number: "1 Woche", label: "Startzeit", subtext: "bis zum ersten Job" }
      ]
    }
  ];

  const handleApplyClick = () => {
    navigate('/bewerbung');
  };

  const changeSlide = (newSlide: number) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Start transition
    setTimeout(() => {
      setCurrentSlide(newSlide);
      
      // End transition
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 300);
  };

  const nextSlide = () => {
    const newSlide = (currentSlide + 1) % slides.length;
    changeSlide(newSlide);
  };

  const prevSlide = () => {
    const newSlide = (currentSlide - 1 + slides.length) % slides.length;
    changeSlide(newSlide);
  };

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentSlideData = slides[currentSlide];

  return (
    <section className="relative bg-white overflow-hidden">
      {/* Full-width Slider Container */}
      <div className="relative h-[80vh] min-h-[600px]">
        
        {/* Slide Background */}
        <div 
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            isTransitioning ? 'opacity-90 scale-105' : 'opacity-100 scale-100'
          }`}
          style={{
            background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 60%, var(--accent-color)))`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10"></div>
        </div>

        {/* Slide Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Content Column */}
              <div className={`lg:col-span-7 text-white space-y-8 transition-all duration-500 ease-out ${
                isTransitioning ? 'opacity-0 translate-x-[-20px]' : 'opacity-100 translate-x-0'
              }`}>
                
                {/* Eyebrow */}
                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                  {currentSlide === 0 && <Euro className="h-4 w-4 text-white" />}
                  {currentSlide === 1 && <MapPin className="h-4 w-4 text-white" />}
                  {currentSlide === 2 && <Zap className="h-4 w-4 text-white" />}
                  <span className="text-sm font-semibold">{currentSlideData.eyebrow}</span>
                </div>

                {/* Main Headline */}
                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6">
                    {currentSlideData.title}
                  </h1>
                  <p className="text-xl lg:text-2xl text-white/90 leading-relaxed max-w-2xl">
                    {currentSlideData.description}
                  </p>
                </div>

                {/* Features List */}
                <div className="flex flex-wrap lg:flex-nowrap gap-3">
                  {currentSlideData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 whitespace-nowrap">
                      <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                      <span className="text-sm font-medium text-white">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    onClick={handleApplyClick}
                    className="group inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-gray-50 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gray-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                    <span className="relative z-10">{currentSlideData.primaryCTA}</span>
                    <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                  
                  {currentSlideData.secondaryCTA && (
                    <button 
                      onClick={() => {
                        let sectionId = '';
                        if (currentSlide === 0) sectionId = 'positionen'; // Arbeitsmodelle ansehen
                        if (currentSlide === 1) sectionId = 'vorteile'; // Vorteile entdecken
                        if (currentSlide === 2) sectionId = 'faq'; // Häufige Fragen
                        
                        const element = document.getElementById(sectionId);
                        if (element) element.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center justify-center px-6 py-4 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-300"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      <span>{currentSlideData.secondaryCTA}</span>
                    </button>
                  )}
                </div>

                {/* Trust Elements */}
                <div className="flex items-center space-x-6 pt-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-white">4.9/5 Bewertung</span>
                  </div>
                  <div className="text-sm text-white/80">
                    Über <span className="font-semibold text-white">1.200+</span> zufriedene Mitarbeiter
                  </div>
                </div>
              </div>

              {/* Image Column */}
              <div className={`lg:col-span-5 relative transition-all duration-500 ease-out ${
                isTransitioning ? 'opacity-0 translate-x-[20px]' : 'opacity-100 translate-x-0'
              }`}>
                <div className="relative">
                  
                  {/* Main Image Container */}
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src={currentSlideData.image}
                      alt={currentSlideData.imageAlt}
                      className="w-full h-full object-cover transition-all duration-1000"
                    />
                    
                    {/* Image Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                    
                    {/* Floating Stats on Image */}
                    <div className="absolute inset-4 flex flex-col justify-between">
                      
                      {/* Top Stats */}
                      <div className="flex justify-between">
                        {currentSlideData.stats.slice(0, 2).map((stat, index) => (
                          <div key={index} className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                            <div className="text-lg font-black text-gray-900">{stat.number}</div>
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{stat.label}</div>
                            {stat.subtext && (
                              <div className="text-xs text-gray-500">{stat.subtext}</div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Bottom Stat */}
                      {currentSlideData.stats[2] && (
                        <div className="self-center bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg text-center">
                          <div className="text-2xl font-black text-gray-900">{currentSlideData.stats[2].number}</div>
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{currentSlideData.stats[2].label}</div>
                          {currentSlideData.stats[2].subtext && (
                            <div className="text-xs text-gray-500">{currentSlideData.stats[2].subtext}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sleek Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 w-8 h-16 bg-white/5 backdrop-blur-sm rounded-r-lg flex items-center justify-center hover:bg-white/15 hover:w-10 transition-all duration-300 group"
        >
          <ArrowRight className="h-4 w-4 text-white/80 rotate-180 group-hover:text-white group-hover:translate-x-[-1px] transition-all duration-200" />
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 w-8 h-16 bg-white/5 backdrop-blur-sm rounded-l-lg flex items-center justify-center hover:bg-white/15 hover:w-10 transition-all duration-300 group"
        >
          <ArrowRight className="h-4 w-4 text-white/80 group-hover:text-white group-hover:translate-x-[1px] transition-all duration-200" />
        </button>
      </div>
    </section>
  );
}

export default HeroSection; 