import { Contract } from '../types/database';

/**
 * Replace template variables in contract content with actual values
 * @param contract The contract containing content and template data
 * @param customValues Custom values to use for variable replacement
 * @returns The processed content with variables replaced
 */
export const processContractVariables = (
  contract: Contract,
  customValues: Record<string, any> = {}
): string => {
  if (!contract || !contract.content) {
    return '';
  }

  let processedContent = contract.content;
  
  // Check if content is HTML
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(processedContent);
  
  // For HTML content, use DOM manipulation
  if (isHtml) {
    try {
      // Parse the HTML content
      const parser = new DOMParser();
      const doc = parser.parseFromString(processedContent, 'text/html');
      
      // Prepare all values for replacement
      const allValues: Record<string, any> = {
        // Default values
        date: new Date().toLocaleDateString('de-DE'),
        startdatum: new Date().toLocaleDateString('de-DE'),
        datum: new Date().toLocaleDateString('de-DE'),
        unterschriftsdatum: new Date().toLocaleDateString('de-DE'),
        // Template values
        ...(contract.template_data || {}),
        // Custom values (override template values)
        ...customValues
      };
      
      // Function to process a text node
      const processTextNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          const regex = /{{(.*?)}}/g;
          let newText = node.textContent;
          let match;
          
          while ((match = regex.exec(node.textContent)) !== null) {
            const key = match[1].trim();
            const value = allValues[key];
            
            if (value !== undefined) {
              // Format the value properly
              const formattedValue = formatVariableValue(value, key);
              
              // Replace in the text
              newText = newText.replace(match[0], formattedValue);
            } else {
              // If no value found, replace with empty string
              newText = newText.replace(match[0], '');
            }
          }
          
          if (newText !== node.textContent) {
            node.textContent = newText;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Recursively process child nodes
          Array.from(node.childNodes).forEach(childNode => {
            processTextNode(childNode);
          });
        }
      };
      
      // Process the entire document
      processTextNode(doc.body);
      
      // Get the processed HTML
      processedContent = doc.body.innerHTML;
    } catch (e) {
      console.error('Error processing HTML content:', e);
      // Fall back to regex-based replacement if HTML parsing fails
    }
  } else {
    // For plain text content, use regex replacement
    
    // Fix special character issues - ensure dashes are preserved
    processedContent = processedContent
      .replace(/[─━┅┉═]{2,}/g, '──────────────────')  // Fix different dash characters
      .replace(/%{2,}/g, '──────────────────');      // Replace %%%% with dashes if it already converted
    
    // Always add current date as a default value
    const today = new Date().toLocaleDateString('de-DE');
    
    const defaultValues: Record<string, any> = {
      date: today,
      startdatum: today,
      datum: today,
      unterschriftsdatum: today
    };
    
    // First apply template data if available
    if (contract.template_data && typeof contract.template_data === 'object') {
      Object.entries(contract.template_data).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return; // Skip null or undefined values
        }
        
        // Format the value properly based on the type
        const formattedValue = formatVariableValue(value, key);
        
        // Replace all occurrences with proper formatting
        processedContent = processedContent.replace(
          new RegExp(`{{${key}}}`, 'gi'), // Case insensitive to match any capitalization
          formattedValue
        );
      });
    }
    
    // Then apply custom values that override template defaults
    Object.entries(customValues).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return; // Skip null or undefined values
      }
      
      // Format the value based on the type
      const formattedValue = formatVariableValue(value, key);
      
      // Replace all occurrences with proper formatting (case insensitive)
      processedContent = processedContent.replace(
        new RegExp(`{{${key}}}`, 'gi'),
        formattedValue
      );
    });
    
    // Handle standard placeholders with default values
    Object.entries(defaultValues).forEach(([key, value]) => {
      processedContent = processedContent.replace(
        new RegExp(`{{${key}}}`, 'gi'),
        String(value)
      );
    });
    
    // Replace any remaining template variables with empty strings
    processedContent = processedContent.replace(/{{.*?}}/g, '');
    
    // Preserve paragraph structure by ensuring proper line breaks
    processedContent = processedContent.replace(/\n\s*\n/g, '\n\n'); // Normalize multiple line breaks
  }
  
  return processedContent;
};

/**
 * Extract all variable names from contract content, including HTML content
 * @param content Contract content with variables
 * @returns Array of variable names
 */
export const extractVariables = (content: string): string[] => {
  if (!content) return [];
  
  const variables = new Set<string>();
  
  // First attempt to parse as HTML (for rich text editor content)
  try {
    // Create a DOM parser and parse the content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    // Function to process a text node
    const processTextNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const regex = /{{(.*?)}}/g;
        let match;
        
        while ((match = regex.exec(node.textContent)) !== null) {
          if (match[1] && match[1].trim()) {
            variables.add(match[1].trim());
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Recursively process child nodes for element nodes
        node.childNodes.forEach(childNode => {
          processTextNode(childNode);
        });
      }
    };
    
    // Start processing from the body
    processTextNode(doc.body);
    
  } catch (e) {
    // Fallback to regex-based extraction if HTML parsing fails
    const regex = /{{(.*?)}}/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (match[1] && match[1].trim()) {
        variables.add(match[1].trim());
      }
    }
  }
  
  return Array.from(variables);
};

/**
 * Format a value based on its type and key name
 * @param value The value to format
 * @param key The key name that might provide context about the value type
 * @returns Formatted string value
 */
export const formatVariableValue = (value: any, key: string): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle date values
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('datum')) {
    try {
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime())) {
        return dateValue.toLocaleDateString('de-DE');
      }
    } catch (e) {
      // Fall through to default handling
    }
  }
  
  // Handle objects
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      // Fall through to default handling
    }
  }
  
  // Default handling - convert to string
  return String(value);
}; 