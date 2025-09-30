import React from 'react';
import { Star, Quote, Users, ArrowRight, CheckCircle2, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import testimonial images
import testimonial1 from '../../../assets/landing/testimonials/testimonial1.png';
import testimonial2 from '../../../assets/landing/testimonials/testimonial2.png';
import testimonial3 from '../../../assets/landing/testimonials/testimonial3.png';
import testimonial4 from '../../../assets/landing/testimonials/testimonial4.png';
import testimonial5 from '../../../assets/landing/testimonials/testimonial5.png';
import testimonial6 from '../../../assets/landing/testimonials/testimonial6.png';

interface Testimonial {
  id: number;
  name: string;
  position: string;
  text: string;
  rating: number;
  workingFor: string;
  avatar: string;
  earnings: string;
  highlight: string;
}

function TestimonialsSection() {
  const navigate = useNavigate();

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Sarah M.',
      position: 'Remote Specialist',
      text: 'Als Mutter ist mir Flexibilität wichtig – hier habe ich sie endlich gefunden. Perfekte Work-Life-Balance!',
      rating: 5,
      workingFor: '8 Monate',
      avatar: testimonial1,
      earnings: '2.400€',
      highlight: 'Teilzeit-Mutter'
    },
    {
      id: 2,
      name: 'Julia P.',
      position: 'Digital Specialist',
      text: 'Ich kann arbeiten, wann ich will und mein Studium problemlos finanzieren. Genial!',
      rating: 5,
      workingFor: '4 Monate',
      avatar: testimonial2,
      earnings: '1.800€',
      highlight: 'Studentin'
    },
    {
      id: 3,
      name: 'David W.',
      position: 'Senior Specialist',
      text: 'Ich war skeptisch. Heute bin ich dankbar. Kein Stress, klare Aufgaben, super Team.',
      rating: 5,
      workingFor: '6 Monate',
      avatar: testimonial3,
      earnings: '3.100€',
      highlight: 'Vollzeit'
    },
    {
      id: 4,
      name: 'Lisa H.',
      position: 'Team Lead',
      text: 'Inzwischen bin ich in einer Führungsrolle – hier zählt Engagement wirklich.',
      rating: 5,
      workingFor: '18 Monate',
      avatar: testimonial4,
      earnings: '3.200€',
      highlight: 'Aufstieg'
    },
    {
      id: 5,
      name: 'Marco T.',
      position: 'Remote Specialist',
      text: 'Die Remote-Arbeit hat mein Leben verändert. Keine Pendelwege, tolles Team.',
      rating: 5,
      workingFor: '10 Monate',
      avatar: testimonial5,
      earnings: '2.800€',
      highlight: 'Life-Changer'
    },
    {
      id: 6,
      name: 'Anna K.',
      position: 'Digital Specialist',
      text: 'Perfekter Einstieg! Die Schulungen sind top und man lernt ständig Neues.',
      rating: 5,
      workingFor: '3 Monate',
      avatar: testimonial6,
      earnings: '2.200€',
      highlight: 'Neueinsteiger'
    }
  ];

  const handleApplyClick = () => {
    navigate('/bewerbung');
  };

  return (
    <section id="testimonials" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full border border-gray-200 mb-6 shadow-sm">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Erfahrungsberichte</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Echte{' '}
            <span 
              className="relative inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` }}
            >
              Erfolgsgeschichten
            </span>
            {' '}unseres Teams
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Lesen Sie, wie über 1.200 Menschen bereits erfolgreich ihre Remote-Karriere 
            gestartet haben und ihre finanziellen Ziele erreicht haben.
          </p>
          
          {/* Trust Stats */}
          <div className="flex items-center justify-center mt-12 space-x-8">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-lg font-bold text-gray-900">4.9/5</span>
            </div>
            <div className="text-gray-600">
              <span className="font-bold text-gray-900">800+</span> echte Bewertungen
            </div>
            <div className="text-gray-600">
              <span className="font-bold text-gray-900">98%</span> Weiterempfehlung
            </div>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.id} 
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 group min-h-[350px] flex flex-col"
            >
              
              {/* Header with Quote */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex space-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <Quote className="h-6 w-6 text-gray-300" />
              </div>
              
              {/* Testimonial Text */}
              <blockquote className="text-gray-700 leading-relaxed mb-6 text-base flex-grow">
                "{testimonial.text}"
              </blockquote>
              
              {/* Author Section */}
              <div className="mt-auto">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-gray-100">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.position}</div>
                  </div>
                </div>
                
                {/* Stats Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm">
                    <span className="font-bold text-gray-900">{testimonial.earnings}</span>
                    <span className="text-gray-500 text-xs ml-1">/Monat</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="px-2 py-1 rounded-full text-xs font-bold text-white"
                      style={{ 
                        background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                      }}
                    >
                      {testimonial.highlight}
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-500">Arbeitet seit {testimonial.workingFor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default TestimonialsSection; 