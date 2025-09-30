import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, User, MapPin, Send, Mail, Phone, Calendar, Home, Globe, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { useSettingsContext } from '../context/SettingsContext';
import { sendApplicationConfirmationEmail } from '../services/emailApi';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { Header, Footer } from './landing/components';

interface ApplicationFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  nationality: string;
  motivation_text: string;
  experience_text: string;
}

const JobApplication: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings, colors } = useSettingsContext();
  const { settings: publicSettings } = usePublicSettings();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'Deutschland',
    nationality: 'Deutsch',
    motivation_text: '',
    experience_text: ''
  });

  const steps = [
    { id: 1, title: 'Persönliche Daten', icon: User, description: 'Grundlegende Informationen über Sie' },
    { id: 2, title: 'Kontakt & Adresse', icon: MapPin, description: 'Ihre Kontaktdaten und Anschrift' },
    { id: 3, title: 'Ihre Bewerbung', icon: FileText, description: 'Motivation und Erfahrungen' }
  ];

  const handleInputChange = (field: keyof ApplicationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.first_name && formData.last_name && formData.email && formData.phone && formData.date_of_birth);
      case 2:
        return !!(formData.street && formData.postal_code && formData.city && formData.country);
      case 3:
        return !!(formData.motivation_text);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    } else {
      showToast({
        type: 'error',
        title: 'Fehlende Angaben',
        message: 'Bitte füllen Sie alle Pflichtfelder aus.'
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      showToast({
        type: 'error',
        title: 'Fehlende Angaben',
        message: 'Bitte füllen Sie alle Pflichtfelder aus.'
      });
      return;
    }

    setIsSubmitting(true);
    let applicationSubmitted = false;
    let applicationId: string | null = null;

    try {
      // First, submit the application to the database
      console.log('Submitting application to database...');
      const { data, error } = await supabase
        .from('job_applications')
        .insert([formData])
        .select('id')
        .single();

      if (error) throw error;

      applicationSubmitted = true;
      applicationId = data.id;
      console.log('Application submitted successfully to database with ID:', applicationId);

      // Show success message - no automatic emails sent (manual approval required)
      showToast({
        type: 'success',
        title: 'Bewerbung eingereicht',
        message: 'Ihre Bewerbung wurde erfolgreich eingereicht. Wir melden uns bald bei Ihnen!'
      });

      navigate('/application-success');

    } catch (error: any) {
      console.error('Error submitting application:', error);
      
      if (!applicationSubmitted) {
        showToast({
          type: 'error',
          title: 'Fehler',
          message: 'Fehler beim Einreichen der Bewerbung. Bitte versuchen Sie es erneut.'
        });
      } else {
        // Application was submitted but something else failed
        showToast({
          type: 'success',
          title: 'Bewerbung eingereicht',
          message: 'Ihre Bewerbung wurde erfolgreich eingereicht. Wir melden uns bald bei Ihnen!'
        });
        navigate('/application-success');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 mb-3">
                  <User className="w-4 h-4 mr-2" style={{ color: `var(--primary-color)` }} />
                  Vorname *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-200 hover:border-gray-300"
                  style={{
                    borderColor: formData.first_name ? `var(--primary-color)` : undefined,
                    boxShadow: formData.first_name ? `0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent)` : undefined
                  }}
                  placeholder="Max"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <User className="w-4 h-4 mr-2 text-primary-dynamic" />
                  Nachname *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                  placeholder="Mustermann"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <Mail className="w-4 h-4 mr-2 text-primary-dynamic" />
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                placeholder="max.mustermann@email.com"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <Phone className="w-4 h-4 mr-2 text-primary-dynamic" />
                  Telefonnummer *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                  placeholder="+49 123 456789"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <Calendar className="w-4 h-4 mr-2 text-primary-dynamic" />
                  Geburtsdatum *
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <Home className="w-4 h-4 mr-2 text-primary-dynamic" />
                Straße und Hausnummer *
              </label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                placeholder="Musterstraße 123"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <MapPin className="w-4 h-4 mr-2 text-primary-dynamic" />
                  Postleitzahl *
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                  placeholder="12345"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <MapPin className="w-4 h-4 mr-2 text-primary-dynamic" />
                  Stadt *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                  placeholder="Musterstadt"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <Globe className="w-4 h-4 mr-2 text-primary-dynamic" />
                  Land *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                  required
                >
                  <option value="Deutschland">Deutschland</option>
                  <option value="Österreich">Österreich</option>
                  <option value="Schweiz">Schweiz</option>
                  <option value="Andere">Andere</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <Globe className="w-4 h-4 mr-2 text-primary-dynamic" />
                  Nationalität
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300"
                  placeholder="Deutsch"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <Sparkles className="w-4 h-4 mr-2 text-primary-dynamic" />
                Ihre Motivation und Erfahrung *
              </label>
              <div className="relative">
                <textarea
                  value={formData.motivation_text}
                  onChange={(e) => handleInputChange('motivation_text', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 resize-none"
                  rows={6}
                  placeholder="Erzählen Sie uns von sich: Warum möchten Sie bei uns arbeiten? Welche Erfahrungen bringen Sie mit? Was motiviert Sie für diese Position?"
                  required
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {formData.motivation_text.length}/1000
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Teilen Sie Ihre Motivation, relevante Erfahrungen und was Sie zu einem idealen Kandidaten macht.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <FileText className="w-4 h-4 mr-2 text-primary-dynamic" />
                Zusätzliche Erfahrungen & Qualifikationen
              </label>
              <div className="relative">
                <textarea
                  value={formData.experience_text}
                  onChange={(e) => handleInputChange('experience_text', e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-primary-dynamic focus:ring-4 focus:ring-primary-dynamic/10 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 resize-none"
                  rows={5}
                  placeholder="Weitere relevante Erfahrungen, Fähigkeiten, Zertifikate oder Qualifikationen, die für diese Position relevant sind..."
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {formData.experience_text.length}/800
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Optional: Zusätzliche Informationen, die Ihre Bewerbung stärken könnten.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Dynamic colors from settings
  const primaryColor = publicSettings?.primary_color || '#ee1d3c';
  const accentColor = publicSettings?.accent_color || '#231f20';

  // Dynamic styles
  const dynamicStyles = {
    '--primary-color': primaryColor,
    '--accent-color': accentColor,
  } as React.CSSProperties;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = publicSettings?.contact_phone || '+4915123456789';
    const websiteName = publicSettings?.website_name;
    const message = `Hallo, ich möchte mich als App-Tester bei ${websiteName} bewerben!`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-white" style={dynamicStyles}>
      {/* Header */}
      <Header 
        settings={publicSettings}
        scrollToTop={scrollToTop}
        scrollToSection={scrollToSection}
        handleWhatsAppClick={handleWhatsAppClick}
      />

      {/* Main Application Content */}
      <div className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full border border-gray-200 mb-6 shadow-sm">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bewerbung</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Starten Sie Ihre{' '}
              <span 
                className="relative inline-block bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` }}
              >
                Remote-Karriere
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              In nur 3 Minuten zur Bewerbung – ohne Lebenslauf, ohne Vorkenntnisse. 
              Werden Sie Teil unseres erfolgreichen Remote-Teams.
            </p>

            {/* Trust Elements */}
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>100% kostenlos</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Keine Verpflichtungen</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Sofortige Rückmeldung</span>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-16">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1 relative">
                    {/* Connection Line */}
                    {index < steps.length - 1 && (
                      <div className="absolute top-8 left-1/2 w-full h-0.5 -z-10 bg-gray-200" style={{ left: '60%', width: 'calc(80% - 2rem)' }}>
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'w-full' : 'w-0'
                          }`}
                          style={{ 
                            background: isCompleted ? `linear-gradient(90deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` : 'transparent'
                          }}
                        ></div>
                      </div>
                    )}
                    
                    {/* Step Circle */}
                    <div 
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 shadow-lg ${
                        isCompleted 
                          ? 'text-white' 
                          : isCurrent 
                          ? 'text-white'
                          : 'bg-white border-2 border-gray-200 text-gray-400'
                      }`}
                      style={
                        isCompleted || isCurrent ? {
                          background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`
                        } : {}
                      }
                    >
                      {isCompleted ? <Check className="w-6 h-6" /> : <StepIcon className="w-6 h-6" />}
                    </div>
                    
                    {/* Step Info */}
                    <div className="text-center">
                      <p className={`text-sm font-bold mb-1 ${
                        isCurrent ? 'text-gray-900' : 
                        isCompleted ? 'text-gray-700' :
                        'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 hidden sm:block max-w-28 leading-tight">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Application Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-8 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {steps[currentStep - 1]?.title}
                  </h2>
                  <p className="text-gray-600">
                    {steps[currentStep - 1]?.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Schritt</div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: `var(--primary-color)` }}
                  >
                    {currentStep} / {steps.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="px-8 py-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Card Footer */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    currentStep === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Zurück
                </button>

                {currentStep < steps.length ? (
                  <button
                    onClick={nextStep}
                    className="group flex items-center px-8 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                    <span className="relative z-10">Weiter</span>
                    <ChevronRight className="w-5 h-5 ml-2 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`group flex items-center px-8 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                    }}
                  >
                    {!isSubmitting && (
                      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                    )}
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        <span>Wird eingereicht...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10">Bewerbung einreichen</span>
                        <Send className="w-5 h-5 ml-2 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer 
        settings={publicSettings}
        scrollToTop={scrollToTop}
        scrollToSection={scrollToSection}
        handleWhatsAppClick={handleWhatsAppClick}
      />
    </div>
  );
};

export default JobApplication;
