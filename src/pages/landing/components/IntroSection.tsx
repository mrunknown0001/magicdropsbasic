import React from 'react';
import { FileText, Users, Zap, ArrowRight, CheckCircle2, Clock, Shield, Target, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import homeofficeImage from '../../../assets/landing/homeoffice.png';

interface ProcessStep {
  id: number;
  icon: any;
  title: string;
  description: string;
  duration: string;
  highlight: string;
}

function IntroSection() {
  const navigate = useNavigate();

  const processSteps: ProcessStep[] = [
    {
      id: 1,
      icon: FileText,
      title: "Bewerbung einreichen",
      description: "Füllen Sie unser kurzes Online-Formular aus – ganz ohne Lebenslauf oder Anschreiben.",
      duration: "3 Min",
      highlight: "Keine Vorkenntnisse"
    },
    {
      id: 2,
      icon: Users,
      title: "Persönliches Onboarding",
      description: "Unser Team führt Sie persönlich ein und zeigt Ihnen alle Arbeitsabläufe.",
      duration: "30 Min",
      highlight: "1-zu-1 Betreuung"
    },
    {
      id: 3,
      icon: Zap,
      title: "Sofort durchstarten",
      description: "Beginnen Sie mit Ihren ersten Aufgaben und erhalten Sie Ihre erste Auszahlung.",
      duration: "7 Tage",
      highlight: "Erste Zahlung"
    }
  ];

  const handleApplyClick = () => {
    navigate('/bewerbung');
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full mb-6">
            <Target className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">So funktioniert's</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Von der Bewerbung zum{' '}
            <span 
              className="relative inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` }}
            >
              ersten Gehalt
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Unser bewährter 3-Schritte-Prozess bringt Sie in weniger als einer Woche 
            von der Bewerbung zu Ihrem ersten Remote-Einkommen.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {processSteps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={step.id} className="relative group">
                
                {/* Connection Line */}
                {index < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-8 h-0.5 bg-gray-200 transform translate-x-4 z-0">
                    <div 
                      className="h-full rounded-full transition-all duration-500 group-hover:w-full"
                      style={{ 
                        background: `linear-gradient(90deg, var(--primary-color), var(--accent-color))`,
                        width: '30%'
                      }}
                    ></div>
                  </div>
                )}

                {/* Step Card */}
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 relative z-10 min-h-[320px] flex flex-col">
                  
                  {/* Step Number & Icon */}
                  <div className="flex items-center space-x-4 mb-6">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ 
                        background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                      }}
                    >
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-3xl font-black text-gray-200">{step.id}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow flex flex-col space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed flex-grow">{step.description}</p>
                    
                    {/* Highlights */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">{step.duration}</span>
                      </div>
                      <div 
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ 
                          background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                        }}
                      >
                        {step.highlight}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-12 text-center relative overflow-hidden">
          
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-lg font-bold text-gray-900">4.9/5</span>
              <span className="text-gray-600">• Über 800 Bewertungen</span>
            </div>
            
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Bereit für Ihren Remote-Erfolg?
            </h3>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Schließen Sie sich über 1.200 zufriedenen Mitarbeitern an und starten Sie 
              noch heute Ihre Remote-Karriere mit attraktiver Vergütung.
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
    </section>
  );
}

export default IntroSection; 