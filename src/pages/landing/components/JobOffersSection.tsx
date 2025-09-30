import React from 'react';
import { Clock, Users, TrendingUp, ArrowRight, Star, Briefcase, Target, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobPosition {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  salary: string;
  hourlyRate: string;
  hours: string;
  features: string[];
  benefits: string[];
  recommended?: boolean;
  icon: React.ComponentType<any>;
  popularity: string;
}

interface JobOffersSectionProps {
  scrollToSection?: (sectionId: string) => void;
}

function JobOffersSection({ scrollToSection }: JobOffersSectionProps = {}) {
  const navigate = useNavigate();

  const positions: JobPosition[] = [
    {
      id: 1,
      type: 'Minijob',
      title: 'Flexibler Einstieg',
      subtitle: 'Perfekt für Studierende und Berufseinsteiger',
      salary: '556€',
      hourlyRate: '12-15€',
      hours: '15 Std/Woche',
      icon: Clock,
      popularity: 'Beliebt bei Studenten',
      features: ['Steuerfreie Auszahlung', 'Flexible Zeiten', 'Sofortiger Start'],
      benefits: ['Keine Sozialabgaben', 'Neben Studium/Job', 'Schneller Einstieg']
    },
    {
      id: 2,
      type: 'Teilzeit',
      title: 'Work-Life Balance',
      subtitle: 'Die perfekte Balance zwischen Arbeit und Leben',
      salary: '2.400€',
      hourlyRate: '15-20€',
      hours: '20-30 Std/Woche',
      icon: Users,
      recommended: true,
      popularity: 'Meist gewählt',
      features: ['Entwicklungschancen', 'Flexible Arbeitszeit', 'Team-Integration'],
      benefits: ['Urlaubsanspruch', 'Weiterbildung', 'Team-Support']
    },
    {
      id: 3,
      type: 'Vollzeit',
      title: 'Karriere-Fokus',
      subtitle: 'Für ambitionierte Remote-Professionals',
      salary: '3.200€',
      hourlyRate: '18-25€',
      hours: '35-40 Std/Woche',
      icon: TrendingUp,
      popularity: 'Höchstes Einkommen',
      features: ['Führungsverantwortung', 'Bonuszahlungen', 'Karriereentwicklung'],
      benefits: ['30 Tage Urlaub', 'Fortbildungen', 'Führungscoaching']
    }
  ];

  const handleFAQClick = () => {
    if (scrollToSection) {
      scrollToSection('faq');
    } else {
      const element = document.getElementById('faq');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleApplyClick = () => {
    navigate('/bewerbung');
  };

  return (
    <section id="positionen" className="py-24 bg-gray-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-gray-200 mb-6 shadow-sm">
            <Briefcase className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Arbeitsmodelle</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Finden Sie das Modell, das{' '}
            <span 
              className="relative inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` }}
            >
              zu Ihrem Leben passt
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Von flexiblen Nebenjobs bis zur Vollzeit-Karriere – wählen Sie das Arbeitsmodell, 
            das perfekt zu Ihrer aktuellen Lebenssituation passt.
          </p>
        </div>

        {/* Job Position Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {positions.map((position, index) => {
            const IconComponent = position.icon;
            return (
              <div 
                key={position.id} 
                className={`relative bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl group min-h-[480px] flex flex-col ${
                  position.recommended 
                    ? 'border-gray-300 shadow-lg ring-2 ring-gray-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                
                {/* Recommended Badge */}
                {position.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <div 
                      className="flex items-center space-x-2 px-4 py-2 rounded-full text-white text-xs font-bold shadow-lg"
                      style={{ 
                        background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                      }}
                    >
                      <Star className="h-3 w-3" />
                      <span>Empfohlen</span>
                    </div>
                  </div>
                )}

                <div className="p-8 flex flex-col h-full">
                  
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                      style={{ 
                        background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                      }}
                    >
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    
                    <div className="mb-4">
                      <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 uppercase tracking-wide">
                        {position.type}
                      </span>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{position.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{position.subtitle}</p>
                    </div>
                  </div>

                  {/* Salary Highlight */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-black text-gray-900 mb-1">bis zu {position.salary}</div>
                      <div className="text-sm text-gray-600 mb-3">monatlich • {position.hourlyRate}/Std</div>
                      <div className="text-xs font-semibold text-gray-700 bg-white px-3 py-1 rounded-full inline-block">
                        {position.hours}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Ihre Vorteile:</div>
                    {position.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Benefits */}
                  <div className="space-y-2 mb-8">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Zusätzlich inklusive:</div>
                    {position.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center space-x-3">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                        <span className="text-gray-600 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div className="mt-auto">
                    <button
                      onClick={handleApplyClick}
                      className="group flex items-center justify-center w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 text-white shadow-lg hover:shadow-xl relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                      }}
                    >
                      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                      <span className="relative z-10">Jetzt bewerben</span>
                      <ArrowRight className="ml-2 h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    {/* Popularity Indicator */}
                    <div className="text-center mt-3">
                      <span className="text-xs text-gray-500 font-medium">{position.popularity}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Target className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Beratung</span>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Noch unsicher welches Modell?
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Unser Team hilft Ihnen dabei, das perfekte Arbeitsmodell für Ihre Situation zu finden. 
              Kostenlose Beratung inklusive.
            </p>
            <button
              onClick={handleFAQClick}
              className="inline-flex items-center justify-center px-8 py-4 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              style={{
                background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
              }}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
              <span className="relative z-10">Häufige Fragen ansehen</span>
              <ArrowRight className="ml-3 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default JobOffersSection; 