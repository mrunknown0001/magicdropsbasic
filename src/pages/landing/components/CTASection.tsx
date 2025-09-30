import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CTASectionProps {
  settings: any;
  handleWhatsAppClick: () => void;
}

function CTASection({ settings, handleWhatsAppClick }: CTASectionProps) {
  const navigate = useNavigate();

  const handleApplyClick = () => {
    navigate('/bewerbung');
  };

  return (
    <div className="mt-16 mb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-12 text-center text-white relative overflow-hidden" style={{
          background: `linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 60%, rgba(0, 0, 0, 0.15) 100%), var(--primary-color)`
        }}>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/3 to-black/8 rounded-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Bereit für den nächsten Schritt?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Starten Sie jetzt Ihre Remote-Karriere als Digitale Servicekraft – flexibel, sicher und gut bezahlt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Flexible Arbeitszeiten</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Attraktive Vergütung</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>100% Remote</span>
              </div>
            </div>
            <button 
              onClick={handleApplyClick}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full bg-white text-primary-dynamic hover:bg-gray-50 transition-all duration-300 hover:shadow-xl transform hover:scale-105"
            >
              Jetzt unverbindlich bewerben
              <ArrowLeft className="ml-2 h-5 w-5 transform rotate-180" />
            </button>
            <p className="mt-4 text-sm text-white/80">
              keine Verpflichtungen, keine Kosten, keine Risiken. Nur Chancen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CTASection; 