import React, { useState } from 'react';
import { Plus, Minus, HelpCircle, ArrowRight, CheckCircle2, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

function FAQSection() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQ[] = [
    {
      id: 1,
      question: 'Was brauche ich für den Job?',
      answer: 'Einen Computer oder Laptop, stabiles Internet und grundlegende PC-Kenntnisse. Alles Weitere zeigen wir Ihnen in der kostenlosen Einarbeitung.',
      category: 'Voraussetzungen'
    },
    {
      id: 2,
      question: 'Muss ich etwas zahlen?',
      answer: 'Nein – die Bewerbung, Einführung und Schulung sind 100% kostenlos. Es entstehen Ihnen keinerlei Kosten.',
      category: 'Kosten'
    },
    {
      id: 3,
      question: 'Wann erhalte ich meine erste Auszahlung?',
      answer: 'Ihre erste Auszahlung erhalten Sie bereits 7 Tage nach Arbeitsbeginn. Danach erfolgen alle Zahlungen pünktlich monatlich.',
      category: 'Bezahlung'
    },
    {
      id: 4,
      question: 'Gibt es feste Arbeitszeiten?',
      answer: 'Nein – Sie entscheiden völlig selbst, wann Sie arbeiten möchten. Ob morgens, abends oder am Wochenende – Sie haben die volle Flexibilität.',
      category: 'Arbeitszeit'
    },
    {
      id: 5,
      question: 'Muss ich telefonieren oder verkaufen?',
      answer: 'Nein – die Aufgaben bestehen ausschließlich aus der Bearbeitung digitaler Prozesse. Kein Verkauf, keine Kaltakquise, keine Telefonate.',
      category: 'Aufgaben'
    },
    {
      id: 6,
      question: 'Wie schnell kann ich starten?',
      answer: 'Nach erfolgreicher Bewerbung können Sie innerhalb von 24-48 Stunden mit der Einarbeitung beginnen und direkt durchstarten.',
      category: 'Einstieg'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleApplyClick = () => {
    navigate('/bewerbung');
  };

  return (
    <section id="faq" className="py-24 bg-gray-50 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-gray-200 mb-6 shadow-sm">
            <HelpCircle className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Häufige Fragen</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Ihre{' '}
            <span 
              className="relative inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` }}
            >
              wichtigsten Fragen
            </span>
            {' '}beantwortet
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Alle wichtigen Informationen zu Ihrem Remote-Einstieg, Vergütung und Arbeitsabläufen 
            auf einen Blick.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="grid gap-6 mb-20">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className={`bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg group ${
                openIndex === index ? 'shadow-xl border-gray-300' : ''
              }`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex-1 pr-6">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {faq.category}
                    </span>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-400">
                      Frage {faq.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {faq.question}
                  </h3>
                </div>
                <div className="flex-shrink-0">
                  <div 
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      openIndex === index 
                        ? 'text-white' 
                        : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                    }`}
                    style={openIndex === index ? {
                      background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                    } : {}}
                  >
                    {openIndex === index ? (
                      <Minus className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </button>
              
              {openIndex === index && (
                <div className="px-8 pb-6">
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-gray-700 leading-relaxed text-base">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Support CTA */}
        <div className="bg-white rounded-3xl p-12 border border-gray-200 shadow-sm text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Noch Fragen offen?
            </h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Unser Support-Team steht Ihnen persönlich zur Verfügung und beantwortet 
              alle Ihre Fragen rund um den Remote-Einstieg.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={handleApplyClick}
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                }}
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                <span className="relative z-10">Jetzt bewerben & loslegen</span>
                <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Persönliche Beratung</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Schnelle Antworten</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQSection; 