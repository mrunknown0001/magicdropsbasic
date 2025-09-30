import React from 'react';
import { Euro, Clock, Shield, Laptop, Heart, Award, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Benefit {
  id: number;
  icon: any;
  title: string;
  description: string;
  highlight: string;
}

function BenefitsSection() {
  const navigate = useNavigate();

  const benefits: Benefit[] = [
    {
      id: 1,
      icon: Euro,
      title: 'Attraktive Vergütung',
      description: 'Verdienen Sie bis zu 3.200€ monatlich mit pünktlicher Auszahlung direkt auf Ihr Konto.',
      highlight: 'Bis zu 3.200€'
    },
    {
      id: 2,
      icon: Clock,
      title: 'Maximale Flexibilität',
      description: 'Arbeiten Sie wann und wo Sie wollen – perfekte Work-Life-Balance garantiert.',
      highlight: '24/7 flexibel'
    },
    {
      id: 3,
      icon: Shield,
      title: 'Seriöser Arbeitgeber',
      description: 'Transparente Bedingungen, faire Verträge und ein Team, das Sie unterstützt.',
      highlight: '100% seriös'
    },
    {
      id: 4,
      icon: Laptop,
      title: 'Einfacher Einstieg',
      description: 'Keine Vorkenntnisse erforderlich – wir zeigen Ihnen alles Schritt für Schritt.',
      highlight: 'Ohne Vorerfahrung'
    }
  ];

  const handleApplyClick = () => {
    navigate('/bewerbung');
  };

  return (
    <section id="vorteile" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full border border-gray-200 mb-6 shadow-sm">
            <Heart className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ihre Vorteile</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Warum sich{' '}
            <span 
              className="relative inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` }}
            >
              Remote Work
            </span>
            {' '}für Sie lohnt
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Entdecken Sie die Vorteile einer modernen Remote-Karriere, die Ihr Leben 
            nachhaltig verbessert und neue Möglichkeiten eröffnet.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <div 
                key={benefit.id} 
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 group min-h-[280px] flex flex-col"
              >
                
                {/* Icon */}
                <div className="mb-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300"
                    style={{ 
                      background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                    }}
                  >
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6 flex-grow">{benefit.description}</p>
                  
                  {/* Highlight Tag */}
                  <div className="mt-auto">
                    <div 
                      className="inline-block px-3 py-1.5 rounded-full text-xs font-bold text-white"
                      style={{ 
                        background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                      }}
                    >
                      {benefit.highlight}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats & CTA Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-12 relative overflow-hidden">
          <div className="max-w-4xl mx-auto">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 mb-1">98%</div>
                <div className="text-sm font-semibold text-gray-700">Zufriedenheit</div>
                <div className="text-xs text-gray-500">unserer Mitarbeiter</div>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
                  <Euro className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 mb-1">2.800€</div>
                <div className="text-sm font-semibold text-gray-700">Durchschnitt</div>
                <div className="text-xs text-gray-500">monatliches Gehalt</div>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-purple-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 mb-1">1.200+</div>
                <div className="text-sm font-semibold text-gray-700">Mitarbeiter</div>
                <div className="text-xs text-gray-500">arbeiten bereits mit uns</div>
              </div>
            </div>

            {/* CTA Content */}
            <div className="text-center">
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Bereit für Ihre Remote-Karriere?
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                Schließen Sie sich über 1.200 zufriedenen Remote-Mitarbeitern an und starten Sie 
                noch heute mit attraktiver Vergütung und maximaler Flexibilität.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                  onClick={handleApplyClick}
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                  }}
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                  <span className="relative z-10">Jetzt kostenlos bewerben</span>
                  <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Kostenlose Einarbeitung</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span>100% sicher & seriös</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BenefitsSection; 