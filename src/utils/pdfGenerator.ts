import jsPDF from 'jspdf';
import { Contract } from '../types/database';
import { processContractVariables } from './contractUtils';
import html2canvas from 'html2canvas';

// Add German language support for proper handling of umlauts and special characters
import 'jspdf-autotable';

// Font sizes and margins for consistent formatting
const FONT_SIZE = {
  NORMAL: 11,
  SMALL: 9,
  LARGE: 14,
  HEADER: 16
};

const MARGIN = {
  TOP: 40,
  BOTTOM: 40,
  LEFT: 40,
  RIGHT: 40
};

/**
 * Clean special characters in text for PDF rendering
 * @param text Text to clean
 * @returns Cleaned text with fixed special characters
 */
const cleanTextForPDF = (text: string): string => {
  if (!text) return '';
  
  // Special case for the problematic paragraph about probation period
  if (text.includes('Probezeit von 6 Wochen') && 
      text.includes('Mitarbeiterportal') && 
      text.includes('Live-Chat') && 
      text.includes('10') && 
      text.includes('Arbeitsverhältnis')) {
    // Replace the entire paragraph with a fixed version
    return `Es wird eine Probezeit von 6 Wochen vereinbart, die zugleich als Einarbeitungszeit dient. Während dieser Zeit gelten folgende Regelungen: Die Aufgaben werden ausschließlich über das Mitarbeiterportal bereitgestellt. Die Abstimmung und Rückfragen erfolgen parallel über den LiveChat. Sobald alle im Auftragspanel verfügbaren Aufgaben erledigt sind, meldet sich der Mitarbeiter über den LiveChat zur Abstimmung, wann neue Aufgaben erscheinen. Auch wenn in dieser Phase nicht die volle Wochenarbeitszeit erreicht wird, erhält der Mitarbeiter das vereinbarte Gehalt in voller Höhe, sofern die Aufgaben vollständig und gewissenhaft erledigt wurden. Nach erfolgreichem Abschluss der Probezeit geht das Arbeitsverhältnis in ein unbefristetes über, der Mitarbeiter erhält einen Firmenlaptop und ein DienstSmartphone, das Gehalt wird um zehn Prozent erhöht, sofern die Leistung zufriedenstellend war.`;
  }
  
  // Handle known problematic compound words with hyphens - directly replace with proper versions
  const directReplacements: Record<string, string> = {
    'Dienst-Smartphone': 'DienstSmartphone',
    'Dienst-smartphone': 'DienstSmartphone',
    'dienst-Smartphone': 'DienstSmartphone',
    'dienst-smartphone': 'DienstSmartphone',
    'Live-Chat': 'LiveChat',
    'live-chat': 'LiveChat',
    'E-Mail': 'EMail',
    'e-mail': 'EMail',
    'E-Mails': 'EMails',
    'e-mails': 'EMails',
    'Online-Portal': 'OnlinePortal',
    'online-portal': 'OnlinePortal',
    'Home-Office': 'HomeOffice',
    'home-office': 'HomeOffice',
    'Mitarbeiter-Portal': 'MitarbeiterPortal',
    'mitarbeiter-portal': 'MitarbeiterPortal',
    'Auftragspanel': 'Auftragspanel',
    '10%': '10 Prozent',
    '10 %': '10 Prozent',
    '10/%': '10 Prozent',
    '10 /%': '10 Prozent',
    '10/ %': '10 Prozent',
    '10 / %': '10 Prozent'
  };
  
  // First, apply direct replacements for known problematic terms
  let cleaned = text;
  
  // Replace all problematic terms
  Object.entries(directReplacements).forEach(([problematic, replacement]) => {
    const regex = new RegExp(problematic, 'g');
    cleaned = cleaned.replace(regex, replacement);
  });
  
  // Handle special case for percentage signs
  cleaned = cleaned
    .replace(/(\d+)\s*%/g, '$1 Prozent')
    .replace(/(\d+)\s*\/\s*%/g, '$1 Prozent')
    .replace(/(\d+)\/\s*%/g, '$1 Prozent')
    .replace(/(\d+)\/%/g, '$1 Prozent');
  
  // Fix specific terms with space-separated format
  cleaned = cleaned.replace(/um 10 Prozent erhöht/g, 'um zehn Prozent erhöht');
  
  // Then apply general cleaning
  return cleaned
    // Fix different dash characters for horizontal lines
    .replace(/[─━┅┉═]{2,}/g, '──────────────────')
    // Fix multiple consecutive newlines to single line break
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple consecutive % with dashes but preserve single % 
    .replace(/%{2,}/g, '──────────────────')
    // Fix spacing around single % to ensure it renders properly
    .replace(/(\S)%(\S)/g, '$1 % $2')
    .replace(/(\S)%\s/g, '$1 % ')
    .replace(/\s%(\S)/g, ' % $1')
    // Handle remaining hyphenated words - remove hyphen completely
    .replace(/([a-zA-ZäöüÄÖÜß]{2,})-([a-zA-ZäöüÄÖÜß]{2,})/g, '$1$2')
    // Remove excess spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Clean a contract title by removing emojis and fixing spacing issues
 * @param title The original title
 * @returns The cleaned title
 */
const cleanContractTitle = (title: string): string => {
  if (!title) return 'Arbeitsvertrag';
  
  return title
    // Remove emojis and problematic special characters but preserve dashes
    .replace(/[\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25AA}-\u{25AB}\u{23FA}\u{200D}Ø=ÜÄ]/gu, '')
    // Fix percentage signs that might have replaced dashes
    .replace(/%{2,}/g, '──────────────────')
    // Normalize whitespace (remove extra spaces)
    .replace(/\s+/g, ' ')
    .trim() || 'Arbeitsvertrag';
};

/**
 * Enhanced HTML parser for PDF generation
 * @param html HTML content to convert to structured text for PDF
 * @returns An array of objects with text, style, and formatting information
 */
const parseHtmlForPDF = (html: string) => {
  if (!html) return [];
  
  // Create temporary element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Array to hold parsed content sections
  const contentSections = [];
  
  // Define style interface
  interface StyleProps {
    fontSize?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderlined?: boolean;
    marginTop?: number;
    marginBottom?: number;
    indent?: number;
    isListItem?: boolean;
    isList?: boolean;
  }
  
  // Function to process a node and extract formatted content
  const processNode = (node: Node, currentStyle: StyleProps = {}) => {
    // Base style
    let style = { ...currentStyle };
    
    // Determine node type and apply appropriate styling
    if (node.nodeName.match(/^H[1-6]$/i)) {
      const headingLevel = parseInt(node.nodeName.replace(/\D/g, ''), 10);
      style = {
        ...style,
        fontSize: FONT_SIZE.LARGE - (headingLevel - 1),
        isBold: true,
        marginTop: 8,
        marginBottom: 4
      };
    } else if (node.nodeName === 'STRONG' || node.nodeName === 'B') {
      style = { ...style, isBold: true };
    } else if (node.nodeName === 'EM' || node.nodeName === 'I') {
      style = { ...style, isItalic: true };
    } else if (node.nodeName === 'U') {
      style = { ...style, isUnderlined: true };
    } else if (node.nodeName === 'P') {
      style = { ...style, marginBottom: 2 };
    } else if (node.nodeName === 'LI') {
      style = { ...style, isListItem: true, indent: (currentStyle.indent || 0) + 10 };
    } else if (node.nodeName === 'UL' || node.nodeName === 'OL') {
      style = { ...style, isList: true, indent: (currentStyle.indent || 0) + 10 };
    } else if (node.nodeName === 'BR') {
      contentSections.push({ text: '\n', style: { ...style } });
      return;
    }
    
    // Process text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        contentSections.push({ text, style });
      }
      return;
    }
    
    // Process element nodes with children
    if (node.childNodes && node.childNodes.length > 0) {
      // Process each child
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i], style);
      }
      
      // Add appropriate spacing after block elements but with less space
      if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL'].includes(node.nodeName)) {
        // Only add a newline if this isn't the last block element in its parent
        // or if it's specifically a heading (which should have some space after)
        if ((node.nodeType === Node.ELEMENT_NODE && (node as Element).nextElementSibling) || node.nodeName.match(/^H[1-6]$/i)) {
          contentSections.push({ text: '\n', style: { ...style } });
        }
      }
    }
  };
  
  // Process the root node
  processNode(tempDiv);
  
  return contentSections;
};

/**
 * Generates a PDF from a contract - improved implementation
 * @param contract The contract to generate a PDF from
 * @param employeeName Optional employee name for personalized contracts
 * @param signatureData Optional signature data to include in the PDF
 * @returns Promise that resolves with the PDF blob
 */
export const generateContractPDF = async (
  contract: Contract,
  employeeName?: string,
  signatureData?: string,
  companySettings?: {
    company_name: string;
    company_address: string;
    postal_code: string;
    city: string;
    country: string;
    contact_email: string;
  }
): Promise<Blob> => {
  try {
    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      putOnlyUsedFonts: true, // Only embed fonts that are actually used
      compress: true // Compress the PDF file
    });

    // Set default fonts - we're using the built-in helvetica fonts
    pdf.setFont('helvetica', 'normal');

    // Set German language for proper text rendering
    pdf.setLanguage('de');
  
    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - MARGIN.LEFT - MARGIN.RIGHT;
    
    // Set initial position
    let y = MARGIN.TOP;
    
    // Helper function to add text with line breaks
    const addText = (text: string, fontSize = FONT_SIZE.NORMAL, align: 'left' | 'center' | 'right' = 'left', isBold = false) => {
      pdf.setFontSize(fontSize);
      
      // Set font style
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      
      // Clean special characters - do this only once
      const cleanedText = cleanTextForPDF(text);
      
      // Split text to fit page width
      const lines = pdf.splitTextToSize(cleanedText, contentWidth);
      const lineHeight = fontSize * 1.2; // Reduced from 1.5 for more compact text
      const textHeight = lines.length * lineHeight;

      // Check if we need a new page
      if (y + textHeight > pdf.internal.pageSize.getHeight() - MARGIN.BOTTOM) {
        pdf.addPage();
        y = MARGIN.TOP;
      }

      // Add text with proper alignment
      const xPos = align === 'center' ? pageWidth / 2 :
                  align === 'right' ? pageWidth - MARGIN.RIGHT : 
                  MARGIN.LEFT;
                  
      // Use charSpace: 0 to ensure consistent character spacing
      pdf.text(lines, xPos, y, { 
        align,
        charSpace: 0,
        maxWidth: contentWidth
      });
      
      y += textHeight + 5; // Reduced spacing after text from 10 to 5
      
      return y;
    };

    // Add contract header - clean the title to remove emojis and fix spacing issues
    const cleanTitle = cleanContractTitle(contract.title);
    
    addText(cleanTitle, FONT_SIZE.HEADER, 'center', true);
  
    // Remove metadata section - client requested removal
    // Proceed directly to the contract content
    
    // Add "Vertrag zwischen" section
    addText('Vertrag zwischen', FONT_SIZE.LARGE, 'left', true);
    
    // Create company and user information section
    const startY = y;
    pdf.setFillColor(248, 248, 248);
    pdf.roundedRect(MARGIN.LEFT, y, contentWidth, 160, 5, 5, 'F');
  
    // Company information (left side)
    y += 15;
    const companyX = MARGIN.LEFT + 20;
    
    pdf.setFontSize(FONT_SIZE.NORMAL);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Unternehmen:', companyX, y);
    y += 20;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(companySettings?.company_name || '', companyX, y);
    y += 15;
    
    pdf.setFont('helvetica', 'normal');
    if (companySettings?.company_address) {
      pdf.text(companySettings.company_address, companyX, y);
    y += 13;
    }
    if (companySettings?.postal_code && companySettings?.city) {
      pdf.text(`${companySettings.postal_code} ${companySettings.city}`, companyX, y);
    y += 13;
    }
    if (companySettings?.country) {
      pdf.text(companySettings.country, companyX, y);
    y += 13;
    }
    if (companySettings?.contact_email) {
      pdf.text(companySettings.contact_email, companyX, y);
    }
    
    // Employee information (right side)
    const employeeX = MARGIN.LEFT + (contentWidth / 2) + 20;
    y = startY + 15;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Mitarbeiter/in:', employeeX, y);
    y += 20;
    
    if (employeeName) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(employeeName, employeeX, y);
      y += 15;
      
      pdf.setFont('helvetica', 'normal');
      
      // Add employee details from template_data if available
      if (contract.template_data) {
        if (contract.template_data.street) {
          pdf.text(String(contract.template_data.street), employeeX, y);
          y += 13;
        }
        
        if (contract.template_data.postalCode && contract.template_data.city) {
          pdf.text(`${contract.template_data.postalCode} ${contract.template_data.city}`, employeeX, y);
          y += 13;
        }
        
        if (contract.template_data.email) {
          pdf.text(String(contract.template_data.email), employeeX, y);
          y += 13;
        }
        
        if (contract.template_data.dateOfBirth) {
          pdf.text(`Geburtsdatum: ${contract.template_data.dateOfBirth}`, employeeX, y);
        }
      }
    } else {
      pdf.setFont('helvetica', 'italic');
      pdf.text('Kein Mitarbeiter zugewiesen', employeeX, y);
    }
    
    // Set Y position after the box
    y = startY + 175;
    
    // Process contract content to replace variables
    const customValues: Record<string, any> = {
      date: new Date().toLocaleDateString('de-DE')
    };
    
    if (employeeName) {
      customValues.name = employeeName;
    
      // Add all template_data as custom values
      if (contract.template_data) {
        Object.entries(contract.template_data).forEach(([key, value]) => {
          customValues[key] = value;
        });
      }
    }
  
    // Get processed content with all variables replaced
    const processedContent = processContractVariables(contract, customValues);
      
    // Parse HTML content into formatted sections
    const contentSections = parseHtmlForPDF(processedContent);
    
    // Check if we need a new page for content
    if (y + 20 > pdf.internal.pageSize.getHeight() - MARGIN.BOTTOM) {
      pdf.addPage();
      y = MARGIN.TOP;
    } else {
      y += 10; // Add some space before content
    }
    
    // Add all content sections with proper formatting
    for (const section of contentSections) {
      const { text, style } = section;
      
      // Apply style
      pdf.setFontSize(style.fontSize || FONT_SIZE.NORMAL);
      
      // Set font style based on formatting
      if (style.isBold && style.isItalic) {
        pdf.setFont('helvetica', 'bolditalic');
      } else if (style.isBold) {
        pdf.setFont('helvetica', 'bold');
      } else if (style.isItalic) {
        pdf.setFont('helvetica', 'italic');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      
      // Apply margins if needed (but reduced)
      if (style.marginTop) {
        y += Math.max(2, style.marginTop / 3); // Significantly reduce top margins
      }
      
      // Handle indentation for lists
      const xPos = MARGIN.LEFT + (style.indent || 0);
      
      // Add bullet for list items
      if (style.isListItem) {
        pdf.text('• ', xPos - 10, y);
      }
      
      // Calculate line height based on font size (reduced multiplier)
      const fontSize = style.fontSize || FONT_SIZE.NORMAL;
      const lineHeight = fontSize * 1.1; // Reduced from 1.2 for even more compact text
      
      // Pre-process text to handle special characters
      const processedText = cleanTextForPDF(text);
      
      // Special handling for problematic paragraphs about probation period
      const isProbationParagraph = processedText.includes('Probezeit von') || 
                                    processedText.includes('Dienst') || 
                                    processedText.includes('Prozent erhöht');
      
      // For problematic paragraphs, use a more reliable word wrapping approach
      const availableWidth = contentWidth - (style.indent || 0) - 5; // Add extra buffer
      
      // Create a custom line breaking algorithm for problematic paragraphs
      const getCustomLineBreaks = (text: string): string[] => {
        // Break into words
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        // Build lines word by word
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          
          // Check if adding this word would exceed line width
          if (pdf.getStringUnitWidth(testLine) * fontSize / pdf.internal.scaleFactor > availableWidth) {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // For very long words that exceed line width on their own
              lines.push(word);
              currentLine = '';
            }
          } else {
            currentLine = testLine;
          }
        }
        
        // Add the last line if there's anything left
        if (currentLine) {
          lines.push(currentLine);
        }
        
        return lines;
      };
      
      // Use our custom line breaking or default PDF line breaking based on content
      const lines = isProbationParagraph 
        ? getCustomLineBreaks(processedText)
        : pdf.splitTextToSize(processedText, availableWidth);
      
      // Check if we need a new page
      if (y + (lines.length * lineHeight) > pdf.internal.pageSize.getHeight() - MARGIN.BOTTOM) {
        pdf.addPage();
        y = MARGIN.TOP;
      }
      
      // Render each line with consistent character spacing
      for (const line of lines) {
        pdf.text(line, xPos, y, { 
          align: 'left',
          maxWidth: availableWidth
        });
        y += lineHeight;
      }
      
      // Apply bottom margin if needed (but reduced)
      if (style.marginBottom) {
        y += Math.max(1, style.marginBottom / 4); // Significantly reduce bottom margins
      }
      
      // Handle underlines
      if (style.isUnderlined) {
        const lastLineWidth = pdf.getTextWidth(lines[lines.length - 1]);
        pdf.line(xPos, y - lineHeight + 2, xPos + lastLineWidth, y - lineHeight + 2);
      }
    }
    
    // Add signature section
    if (employeeName) {
      // Add some space before signature section
      y += 30; // Reduced from 40
    
      // Check if we need a new page for signatures
      if (y + 100 > pdf.internal.pageSize.getHeight() - MARGIN.BOTTOM) {
        pdf.addPage();
        y = MARGIN.TOP + 30; // Reduced from 40
      }
      
      pdf.setDrawColor(200, 200, 200);
      pdf.line(MARGIN.LEFT, y, pageWidth - MARGIN.RIGHT, y);
      y += 15; // Reduced from 20
      
      const today = new Date().toLocaleDateString('de-DE');
      const signatureY = y;
      
      // Company signature (left side)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE.SMALL);
      pdf.text(`Berlin, den ${today}`, MARGIN.LEFT, signatureY);
      
      // Add placeholder for company signature
        pdf.text(companySettings?.company_name || '', MARGIN.LEFT, signatureY + 60); // Reduced from 80
      
      // Employee signature (right side)
      const rightX = pageWidth - MARGIN.RIGHT - 200;
      pdf.text(`Berlin, den ${today}`, rightX, signatureY);
      
      // Handle signature embedding
      if (signatureData) {
        try {
          // Create a promise to ensure the image is loaded before adding to PDF
          const signaturePromise = new Promise<void>((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
              try {
                // Calculate signature dimensions while maintaining aspect ratio
                const maxWidth = 160;
                const maxHeight = 50; // Reduced from 60
                
                const ratio = img.width / img.height;
                let sigWidth = maxWidth;
                let sigHeight = sigWidth / ratio;
                
                if (sigHeight > maxHeight) {
                  sigHeight = maxHeight;
                  sigWidth = sigHeight * ratio;
                }
    
                // Position signature centered in the right side
                const sigX = rightX + (200 - sigWidth) / 2;
                
                // Add the signature directly to the PDF
                pdf.addImage(
                  signatureData,
                  'PNG',
                  sigX,
                  signatureY + 8, // Reduced from 10
                  sigWidth,
                  sigHeight
                );
                
                resolve();
              } catch (error) {
                console.error("Error adding signature to PDF:", error);
                reject(error);
              }
            };
            
            img.onerror = (error) => {
              console.error("Error loading signature image:", error);
              reject(error);
            };
            
            // Set the source to trigger loading
            if (signatureData.startsWith('data:')) {
              img.src = signatureData;
            } else {
              img.src = `data:image/png;base64,${signatureData}`;
            }
          });
          
          // Wait for the signature to be added
          await signaturePromise;
        } catch (error) {
          console.error("Failed to add signature to PDF:", error);
          // Just add a line if signature fails
          pdf.line(rightX, signatureY + 35, rightX + 200, signatureY + 35); // Reduced from 40
        }
      } else {
        // If no signature, add a line
        pdf.line(rightX, signatureY + 35, rightX + 200, signatureY + 35); // Reduced from 40
      }
      
      // Add employee name under signature
      pdf.text(employeeName, rightX, signatureY + 60); // Reduced from 80
    }
    
    // Return the PDF as a blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generates a PDF with multiple contracts
 * @param contracts Array of contracts to include in the PDF
 * @param title Title for the PDF document
 * @returns Promise that resolves when the PDF has been generated and downloaded
 */
export const generateMultipleContractsPDF = async (
  contracts: Contract[],
  title: string = 'Vertragsübersicht'
): Promise<Blob> => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
  
    // Set German language for proper text rendering
    pdf.setLanguage('de');
    
    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - MARGIN.LEFT - MARGIN.RIGHT;
    
    // Set initial position
    let y = MARGIN.TOP;
  
    // Add title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(FONT_SIZE.HEADER);
    pdf.text(title, pageWidth / 2, y, { align: 'center' });
    y += FONT_SIZE.HEADER * 2;
    
    // Add creation date
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT_SIZE.SMALL);
    const today = new Date().toLocaleDateString('de-DE');
    pdf.text(`Erstellt am: ${today}`, pageWidth / 2, y, { align: 'center' });
    y += FONT_SIZE.SMALL * 3;
    
    // Add each contract as a section
    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i];
      
      // Add a page break before each contract except the first one
      if (i > 0) {
        pdf.addPage();
        y = MARGIN.TOP;
      }
      
      // Add contract title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(FONT_SIZE.LARGE);
      pdf.text(contract.title, MARGIN.LEFT, y);
      y += FONT_SIZE.LARGE * 1.5;
      
      // Add contract created date
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE.SMALL);
      const contractDate = new Date(contract.created_at).toLocaleDateString('de-DE');
      pdf.text(`Erstellt am: ${contractDate}`, MARGIN.LEFT, y);
      y += FONT_SIZE.SMALL * 2;
      
      // Process contract content to replace variables
      const processedContent = processContractVariables(contract, {});
      
      // Parse HTML content into formatted sections
      const contentSections = parseHtmlForPDF(processedContent);
      
      // Add all content sections with proper formatting
      for (const section of contentSections) {
        const { text, style } = section;
        
        // Apply style
        pdf.setFontSize(style.fontSize || FONT_SIZE.NORMAL);
        
        // Set font style based on formatting
        if (style.isBold && style.isItalic) {
          pdf.setFont('helvetica', 'bolditalic');
        } else if (style.isBold) {
          pdf.setFont('helvetica', 'bold');
        } else if (style.isItalic) {
          pdf.setFont('helvetica', 'italic');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        // Apply margins if needed (reduced)
        if (style.marginTop) {
          y += style.marginTop;
        }
        
        // Handle indentation for lists
        const xPos = MARGIN.LEFT + (style.indent || 0);
        
        // Add bullet for list items
        if (style.isListItem) {
          pdf.text('• ', xPos - 10, y);
        }
        
        // Calculate line height based on font size (reduced multiplier)
        const fontSize = style.fontSize || FONT_SIZE.NORMAL;
        const lineHeight = fontSize * 1.2; // Reduced from 1.5 for more compact text
        
        // Pre-process text to handle special characters
        const processedText = cleanTextForPDF(text);
        
        // Special handling for problematic paragraphs about probation period
        const isProbationParagraph = processedText.includes('Probezeit von') || 
                                      processedText.includes('Dienst') || 
                                      processedText.includes('Prozent erhöht');
        
        // For problematic paragraphs, use a more reliable word wrapping approach
        const availableWidth = contentWidth - (style.indent || 0) - 5; // Add extra buffer
        
        // Create a custom line breaking algorithm for problematic paragraphs
        const getCustomLineBreaks = (text: string): string[] => {
          // Break into words
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          // Build lines word by word
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            // Check if adding this word would exceed line width
            if (pdf.getStringUnitWidth(testLine) * fontSize / pdf.internal.scaleFactor > availableWidth) {
              if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                // For very long words that exceed line width on their own
                lines.push(word);
                currentLine = '';
              }
            } else {
              currentLine = testLine;
            }
          }
          
          // Add the last line if there's anything left
          if (currentLine) {
            lines.push(currentLine);
          }
          
          return lines;
        };
        
        // Use our custom line breaking or default PDF line breaking based on content
        const lines = isProbationParagraph 
          ? getCustomLineBreaks(processedText)
          : pdf.splitTextToSize(processedText, availableWidth);
        
        // Check if we need a new page
        if (y + (lines.length * lineHeight) > pdf.internal.pageSize.getHeight() - MARGIN.BOTTOM) {
          pdf.addPage();
          y = MARGIN.TOP;
        }
        
        // Render each line with consistent character spacing
        for (const line of lines) {
          pdf.text(line, xPos, y, { 
            align: 'left',
            maxWidth: availableWidth
          });
          y += lineHeight;
        }
        
        // Apply bottom margin if needed (reduced)
        if (style.marginBottom) {
          y += style.marginBottom;
        }
        
        // Handle underlines
        if (style.isUnderlined) {
          const lastLineWidth = pdf.getTextWidth(lines[lines.length - 1]);
          pdf.line(xPos, y - lineHeight + 2, xPos + lastLineWidth, y - lineHeight + 2);
        }
      }
      
      // Add a divider between contracts
      if (i < contracts.length - 1) {
        y += 20;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(MARGIN.LEFT, y, pageWidth - MARGIN.RIGHT, y);
      }
    }
    
    // Return the PDF as a blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF with multiple contracts:', error);
    throw error;
  }
};
