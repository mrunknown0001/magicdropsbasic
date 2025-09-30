import { z } from 'zod';

export const personalInfoSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  passwordConfirm: z.string(),
  firstName: z.string().min(2, 'Vorname ist erforderlich'),
  lastName: z.string().min(2, 'Nachname ist erforderlich'),
  dateOfBirth: z.string().refine(value => {
    const date = new Date(value);
    const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 18;
  }, 'Sie müssen mindestens 18 Jahre alt sein'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Passwörter stimmen nicht überein',
  path: ['passwordConfirm'],
});

export const addressSchema = z.object({
  street: z.string().min(5, 'Straße ist erforderlich'),
  postalCode: z.string().regex(/^\d{5}$/, 'PLZ muss 5 Ziffern haben'),
  city: z.string().min(2, 'Stadt ist erforderlich'),
  nationality: z.string().min(2, 'Nationalität ist erforderlich'),
});

export const contractSchema = z.object({
  contractId: z.string().min(1, 'Bitte wählen Sie einen Vertrag aus'),
  acceptTerms: z.boolean().refine(val => val, 'Sie müssen den Vertrag akzeptieren'),
  signatureData: z.string().optional(),
});

export type PersonalInfoInputs = z.infer<typeof personalInfoSchema>;
export type AddressInputs = z.infer<typeof addressSchema>;
export type ContractInputs = z.infer<typeof contractSchema>;
