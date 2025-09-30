# Landing Page Components

This directory contains all the modular components that make up the landing page. Each component is self-contained and reusable.

## Component Structure

### 1. **Header.tsx**
- Top header bar with contact information
- Main navigation with logo and menu items
- Mobile-responsive hamburger menu
- Smooth scroll navigation to page sections

### 2. **HeroSection.tsx**
- Main hero section with headline and call-to-action
- Feature badges (flexible hours, remote work, etc.)
- Primary WhatsApp application button
- Dynamic company branding

### 3. **StatsAndPartners.tsx**
- Company statistics with visual cards
- Partner logos (IDnow, WebID, Postident)
- Team meeting image with satisfaction overlay

### 4. **BenefitsSection.tsx**
- Benefits of working as a KYC App-Tester
- Attractive compensation details
- Flexible working hours information
- Visual icons and feature lists

### 5. **HowItWorksSection.tsx**
- 3-step process explanation
- Application → Training → Start working
- Numbered step indicators with icons

### 6. **RequirementsSection.tsx**
- Technical requirements (computer, internet, etc.)
- Personal requirements (reliability, teamwork, etc.)
- Visual layout with image and requirement lists

### 7. **TestimonialsSection.tsx**
- Employee testimonials with photos
- Star ratings and experience duration
- Dynamic company name integration

### 8. **FAQSection.tsx**
- Comprehensive FAQ with 10 questions
- Collapsible accordion interface
- Dynamic company name in answers

### 9. **CTASection.tsx**
- Final call-to-action section
- Gradient background with benefits summary
- WhatsApp application button

### 10. **Footer.tsx**
- Company information and contact details
- Navigation links and legal pages
- Additional CTA section
- Copyright information

## Props Interface

Most components accept these common props:
- `settings`: Dynamic settings from the database (company name, colors, logo, etc.)
- `handleWhatsAppClick`: Function to handle WhatsApp application
- `scrollToTop`: Function to scroll to page top
- `scrollToSection`: Function to scroll to specific sections

## Dynamic Features

All components support:
- **Dynamic Branding**: Company name, logo, and colors from settings
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Smooth Animations**: Hover effects and transitions
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Usage

```tsx
import {
  Header,
  HeroSection,
  StatsAndPartners,
  // ... other components
} from './components';

// Use in LandingPage.tsx
<Header 
  settings={settings}
  scrollToTop={scrollToTop}
  scrollToSection={scrollToSection}
  handleWhatsAppClick={handleWhatsAppClick}
/>
```

## Styling

Components use:
- **Tailwind CSS**: Utility-first CSS framework
- **Dynamic Colors**: CSS custom properties for theming
- **Responsive Classes**: Mobile-first responsive design
- **Hover Effects**: Interactive animations and transitions 