export interface PageVariants {
  initial: { opacity: number; x: number };
  in: { opacity: number; x: number };
  out: { opacity: number; x: number };
}

export interface PageTransition {
  type: string;
  ease: string;
  duration: number;
}

export const pageVariants: PageVariants;
export const pageTransition: PageTransition;
