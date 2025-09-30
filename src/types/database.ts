export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  role: 'admin' | 'employee';
  date_of_birth?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  nationality?: string;
  contract_id?: string;
  contract_signed_at?: string;
  banned_until?: string | null;
  tax_number?: string;
  social_security_number?: string;
  health_insurance?: string;
  iban?: string;
  bic?: string;
  recipient_name?: string;
  kyc_status?: 'pending' | 'in_review' | 'approved' | 'rejected';
  kyc_verified_at?: string;
  kyc_verified_by?: string;
  kyc_documents?: Record<string, any>;
  // Per-user payment mode fields
  payment_mode?: 'vertragsbasis' | 'verguetung';
  payment_mode_set_at?: string;
  payment_mode_set_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  id: string;
  company_name: string;
  website_name: string;
  website_url?: string;
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  contact_email?: string;
  contact_phone?: string;
  support_email?: string;
  support_phone?: string;
  registration_number?: string;
  euid?: string;
  court_location?: string;
  managing_director?: string;
  responsible_person?: string;
  company_address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  impressum_content?: string;
  privacy_policy_content?: string;
  terms_content?: string;
  // KYC Requirements
  kyc_required_for_tasks?: boolean;
  kyc_requirement_message?: string;
  // Enhanced Legal & GDPR Fields
  data_protection_officer?: string;
  privacy_contact_email?: string;
  company_legal_form?: string;
  // Email Delay Settings
  email_delay_enabled?: boolean;
  email_delay_hours?: number;
  created_at: string;
  updated_at: string;
}

// Helper type for settings update operations
export type SettingsUpdate = Partial<Omit<Settings, 'id' | 'created_at' | 'updated_at'>>;

// Payment System Interfaces
export interface WorkerBalance {
  id: string;
  worker_id: string;
  current_balance: number;
  total_earned: number;
  total_paid_out: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  worker_id: string;
  task_assignment_id?: string;
  payout_request_id?: string;
  transaction_type: 'task_payment' | 'payout' | 'adjustment';
  amount: number;
  description: string;
  created_by?: string;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  worker_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  payment_method?: Record<string, any>;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  type: 'bankdrop' | 'exchanger' | 'platzhalter' | string;
  payment_amount: number;
  priority: 'low' | 'medium' | 'high';
  estimated_hours?: number;
  steps?: Array<{
    title: string;
    description: string;
    order: number;
  }>;
  required_attachments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  play_store_url?: string;
  app_store_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_starter_job?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  client?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  task_template_id?: string;
  payment_amount?: number;
  type?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // These fields will be joined from profiles table
  user_name?: string;
  user_email?: string;
}

export interface Contract {
  id: string;
  title: string;
  category: string;
  content: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  template_data?: Record<string, any>;
  version_number?: number;
  is_template?: boolean;
  parent_id?: string | null;
  version?: string;
  status?: string;
}

export interface ContractAssignment {
  id: string;
  contract_id: string;
  user_id: string;
  assigned_at: string;
  signed_at: string | null;
  signature_data?: string;
  status: 'pending' | 'signed' | 'rejected';
  rejection_reason?: string;
  updated_at?: string;
  contract?: Contract;
  user_email?: string;
  contract_title?: string;
}

export interface TaskAssignment {
  id: string;
  task_template_id: string;
  assignee_id: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'completed' | 'rejected' | 'canceled';
  created_at: string;
  updated_at: string;
  created_by?: string;
  task_id?: string;
  task_template?: TaskTemplate;
  profile?: Profile;
  current_step?: number;
  video_chat_status?: 'not_started' | 'accepted' | 'declined' | 'completed';
  document_step_required?: boolean;
  document_step_completed?: boolean;
  phone_number_id?: string;
  app_task_id?: string;
  video_call_rating_completed?: boolean;
  video_call_rating_data?: Record<string, any>;
  demo_data?: Record<string, any>;
  video_chat_code?: string;
  demo_email?: string;
  demo_password?: string;
  ident_code?: string;
  ident_url?: string;
  // New submission workflow fields
  submission_data?: Record<string, any>;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  // Payment fields for Vergütung mode
  custom_payment_amount?: number;
  payment_status?: 'pending' | 'approved' | 'paid';
  payment_approved_at?: string;
  payment_approved_by?: string;
}

export interface TaskRating {
  id: string;
  task_assignment_id: string;
  user_id: string;
  rating_data: Record<string, any>;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  rating_type?: 'initial' | 'video_call';
}

export type PhoneProvider = 'sms_activate' | 'receive_sms_online' | 'smspva' | 'anosim' | 'gogetsms';

export interface PhoneNumber {
  id: string;
  phone_number: string;
  rent_id?: string;
  service: string;
  country: string;
  end_date: string;
  assignee_id: string | null;
  status: string;
  provider: PhoneProvider;
  external_url?: string;
  access_key?: string;
  created_at: string;
  updated_at: string;
  // Anosim-specific fields
  order_id?: string;           // Anosim Order ID
  order_booking_id?: string;   // Anosim Order Booking ID
  provider_id?: string;        // Anosim Provider ID
  auto_renewal?: boolean;      // Anosim auto-renewal status
}

export interface PhoneMessage {
  id: string;
  phone_number_id: string;
  sender: string;
  message: string;
  received_at: string;
  message_source: 'api' | 'scraping';
  raw_html?: string;
  last_scraped_at?: string;
}

export interface JobApplication {
  id: string;
  // Personal Information
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  // Address Information
  street: string;
  postal_code: string;
  city: string;
  country: string;
  nationality?: string;
  // Application Status
  status: 'pending' | 'approved' | 'rejected';
  // Application Data
  motivation_text?: string;
  experience_text?: string;
  // Admin Notes
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  // Email Tracking
  email_status?: 'pending' | 'sent' | 'failed';
  email_sent_at?: string;
  email_scheduled_at?: string;
  approved_at?: string;
  rejected_at?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contract_assignments: {
        Row: {
          assigned_at: string
          contract_id: string
          id: string
          rejection_reason: string | null
          signature_data: string | null
          signed_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          contract_id: string
          id?: string
          rejection_reason?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          contract_id?: string
          id?: string
          rejection_reason?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          parent_id: string | null
          template_data: Json | null
          title: string
          updated_at: string | null
          version: string | null
          version_number: number | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          parent_id?: string | null
          template_data?: Json | null
          title: string
          updated_at?: string | null
          version?: string | null
          version_number?: number | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          parent_id?: string | null
          template_data?: Json | null
          title?: string
          updated_at?: string | null
          version?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          application_id: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          max_retries: number | null
          recipient_email: string
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          recipient_email: string
          retry_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          recipient_email?: string
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          availability: string | null
          bic: string | null
          city: string
          country: string | null
          created_at: string | null
          date_of_birth: string
          email: string
          email_scheduled_at: string | null
          email_sent_at: string | null
          email_status: string | null
          experience_text: string | null
          first_name: string
          health_insurance: string | null
          iban: string | null
          id: string
          last_name: string
          motivation_text: string | null
          nationality: string | null
          phone: string
          postal_code: string
          preferred_job_type: string | null
          recipient_name: string | null
          rejected_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_security_number: string | null
          status: string | null
          street: string
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          availability?: string | null
          bic?: string | null
          city: string
          country?: string | null
          created_at?: string | null
          date_of_birth: string
          email: string
          email_scheduled_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          experience_text?: string | null
          first_name: string
          health_insurance?: string | null
          iban?: string | null
          id?: string
          last_name: string
          motivation_text?: string | null
          nationality?: string | null
          phone: string
          postal_code: string
          preferred_job_type?: string | null
          recipient_name?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_security_number?: string | null
          status?: string | null
          street: string
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          availability?: string | null
          bic?: string | null
          city?: string
          country?: string | null
          created_at?: string | null
          date_of_birth?: string
          email?: string
          email_scheduled_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          experience_text?: string | null
          first_name?: string
          health_insurance?: string | null
          iban?: string | null
          id?: string
          last_name?: string
          motivation_text?: string | null
          nationality?: string | null
          phone?: string
          postal_code?: string
          preferred_job_type?: string | null
          recipient_name?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_security_number?: string | null
          status?: string | null
          street?: string
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      phone_messages: {
        Row: {
          created_at: string
          id: string
          last_scraped_at: string | null
          message: string
          message_source: string | null
          phone_number_id: string
          raw_html: string | null
          received_at: string
          sender: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          message: string
          message_source?: string | null
          phone_number_id: string
          raw_html?: string | null
          received_at?: string
          sender: string
        }
        Update: {
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          message?: string
          message_source?: string | null
          phone_number_id?: string
          raw_html?: string | null
          received_at?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_messages_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          access_key: string | null
          assignee_id: string | null
          auto_renewal: boolean | null
          country: string
          created_at: string
          end_date: string
          expires_at: string | null
          external_url: string | null
          id: string
          last_message_check: string | null
          last_scraped_at: string | null
          messages_count: number | null
          order_booking_id: string | null
          order_id: string | null
          phone_number: string
          provider: Database["public"]["Enums"]["phone_provider"] | null
          provider_id: string | null
          rent_id: string | null
          rent_time: string | null
          rental_status: string | null
          service: string
          status: string
          updated_at: string
        }
        Insert: {
          access_key?: string | null
          assignee_id?: string | null
          auto_renewal?: boolean | null
          country: string
          created_at?: string
          end_date: string
          expires_at?: string | null
          external_url?: string | null
          id?: string
          last_message_check?: string | null
          last_scraped_at?: string | null
          messages_count?: number | null
          order_booking_id?: string | null
          order_id?: string | null
          phone_number: string
          provider?: Database["public"]["Enums"]["phone_provider"] | null
          provider_id?: string | null
          rent_id?: string | null
          rent_time?: string | null
          rental_status?: string | null
          service: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_key?: string | null
          assignee_id?: string | null
          auto_renewal?: boolean | null
          country?: string
          created_at?: string
          end_date?: string
          expires_at?: string | null
          external_url?: string | null
          id?: string
          last_message_check?: string | null
          last_scraped_at?: string | null
          messages_count?: number | null
          order_booking_id?: string | null
          order_id?: string | null
          phone_number?: string
          provider?: Database["public"]["Enums"]["phone_provider"] | null
          provider_id?: string | null
          rent_id?: string | null
          rent_time?: string | null
          rental_status?: string | null
          service?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          banned_until: string | null
          bic: string | null
          city: string | null
          contract_id: string | null
          contract_signed_at: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          health_insurance: string | null
          iban: string | null
          id: string
          kyc_documents: Json | null
          kyc_status: string | null
          kyc_verified_at: string | null
          kyc_verified_by: string | null
          last_name: string
          nationality: string | null
          postal_code: string | null
          recipient_name: string | null
          role: string
          social_security_number: string | null
          status_manually_set: boolean | null
          street: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          banned_until?: string | null
          bic?: string | null
          city?: string | null
          contract_id?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          health_insurance?: string | null
          iban?: string | null
          id: string
          kyc_documents?: Json | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          last_name?: string
          nationality?: string | null
          postal_code?: string | null
          recipient_name?: string | null
          role: string
          social_security_number?: string | null
          status_manually_set?: boolean | null
          street?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          banned_until?: string | null
          bic?: string | null
          city?: string | null
          contract_id?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          health_insurance?: string | null
          iban?: string | null
          id?: string
          kyc_documents?: Json | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          last_name?: string
          nationality?: string | null
          postal_code?: string | null
          recipient_name?: string | null
          role?: string
          social_security_number?: string | null
          status_manually_set?: boolean | null
          street?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          accent_color: string | null
          city: string | null
          company_address: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          court_location: string | null
          created_at: string | null
          email_delay_enabled: boolean | null
          email_delay_hours: number | null
          euid: string | null
          favicon_url: string | null
          id: string
          impressum_content: string | null
          kyc_required_for_tasks: boolean | null
          kyc_requirement_message: string | null
          logo_url: string | null
          managing_director: string | null
          postal_code: string | null
          primary_color: string | null
          privacy_policy_content: string | null
          registration_number: string | null
          responsible_person: string | null
          support_email: string | null
          support_phone: string | null
          terms_content: string | null
          updated_at: string | null
          website_name: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          city?: string | null
          company_address?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          court_location?: string | null
          created_at?: string | null
          email_delay_enabled?: boolean | null
          email_delay_hours?: number | null
          euid?: string | null
          favicon_url?: string | null
          id?: string
          impressum_content?: string | null
          kyc_required_for_tasks?: boolean | null
          kyc_requirement_message?: string | null
          logo_url?: string | null
          managing_director?: string | null
          postal_code?: string | null
          primary_color?: string | null
          privacy_policy_content?: string | null
          registration_number?: string | null
          responsible_person?: string | null
          support_email?: string | null
          support_phone?: string | null
          terms_content?: string | null
          updated_at?: string | null
          website_name?: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          city?: string | null
          company_address?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          court_location?: string | null
          created_at?: string | null
          email_delay_enabled?: boolean | null
          email_delay_hours?: number | null
          euid?: string | null
          favicon_url?: string | null
          id?: string
          impressum_content?: string | null
          kyc_required_for_tasks?: boolean | null
          kyc_requirement_message?: string | null
          logo_url?: string | null
          managing_director?: string | null
          postal_code?: string | null
          primary_color?: string | null
          privacy_policy_content?: string | null
          registration_number?: string | null
          responsible_person?: string | null
          support_email?: string | null
          support_phone?: string | null
          terms_content?: string | null
          updated_at?: string | null
          website_name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          admin_notes: string | null
          app_store_url: string | null
          assignee_id: string
          created_at: string
          created_by: string | null
          current_step: number | null
          demo_data: Json | null
          demo_email: string | null
          demo_password: string | null
          document_step_completed: boolean | null
          document_step_required: boolean | null
          due_date: string
          id: string
          ident_code: string | null
          ident_url: string | null
          phone_number_id: string | null
          play_store_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_data: Json | null
          submitted_at: string | null
          task_id: string | null
          task_template_id: string
          updated_at: string
          video_call_rating_completed: boolean | null
          video_call_rating_data: Json | null
          video_chat_code: string | null
          video_chat_status: string | null
        }
        Insert: {
          admin_notes?: string | null
          app_store_url?: string | null
          assignee_id: string
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          demo_data?: Json | null
          demo_email?: string | null
          demo_password?: string | null
          document_step_completed?: boolean | null
          document_step_required?: boolean | null
          due_date: string
          id?: string
          ident_code?: string | null
          ident_url?: string | null
          phone_number_id?: string | null
          play_store_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_data?: Json | null
          submitted_at?: string | null
          task_id?: string | null
          task_template_id: string
          updated_at?: string
          video_call_rating_completed?: boolean | null
          video_call_rating_data?: Json | null
          video_chat_code?: string | null
          video_chat_status?: string | null
        }
        Update: {
          admin_notes?: string | null
          app_store_url?: string | null
          assignee_id?: string
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          demo_data?: Json | null
          demo_email?: string | null
          demo_password?: string | null
          document_step_completed?: boolean | null
          document_step_required?: boolean | null
          due_date?: string
          id?: string
          ident_code?: string | null
          ident_url?: string | null
          phone_number_id?: string | null
          play_store_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_data?: Json | null
          submitted_at?: string | null
          task_id?: string | null
          task_template_id?: string
          updated_at?: string
          video_call_rating_completed?: boolean | null
          video_call_rating_data?: Json | null
          video_chat_code?: string | null
          video_chat_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          public_url: string | null
          storage_bucket: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          public_url?: string | null
          storage_bucket: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          public_url?: string | null
          storage_bucket?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating_data: Json
          rating_type: string | null
          submitted_at: string | null
          task_assignment_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating_data: Json
          rating_type?: string | null
          submitted_at?: string | null
          task_assignment_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating_data?: Json
          rating_type?: string | null
          submitted_at?: string | null
          task_assignment_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_ratings_task_assignment_id_fkey"
            columns: ["task_assignment_id"]
            isOneToOne: false
            referencedRelation: "task_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          app_store_url: string | null
          created_at: string
          created_by: string
          description: string
          estimated_hours: number | null
          id: string
          is_starter_job: boolean | null
          payment_amount: number
          play_store_url: string | null
          priority: string
          required_attachments: Json | null
          steps: Json | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          app_store_url?: string | null
          created_at?: string
          created_by: string
          description: string
          estimated_hours?: number | null
          id?: string
          is_starter_job?: boolean | null
          payment_amount?: number
          play_store_url?: string | null
          priority?: string
          required_attachments?: Json | null
          steps?: Json | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          app_store_url?: string | null
          created_at?: string
          created_by?: string
          description?: string
          estimated_hours?: number | null
          id?: string
          is_starter_job?: boolean | null
          payment_amount?: number
          play_store_url?: string | null
          priority?: string
          required_attachments?: Json | null
          steps?: Json | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          client: string
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          payment_amount: number | null
          priority: string
          status: string
          task_template_id: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          client: string
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          payment_amount?: number | null
          priority: string
          status: string
          task_template_id?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          client?: string
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          payment_amount?: number | null
          priority?: string
          status?: string
          task_template_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_phone_number: {
        Args: { p_phone_number_id: string; p_assignee_id: string }
        Returns: {
          access_key: string | null
          assignee_id: string | null
          country: string
          created_at: string
          end_date: string
          expires_at: string | null
          external_url: string | null
          id: string
          last_message_check: string | null
          last_scraped_at: string | null
          messages_count: number | null
          phone_number: string
          provider: Database["public"]["Enums"]["phone_provider"] | null
          rent_id: string | null
          rent_time: string | null
          rental_status: string | null
          service: string
          status: string
          updated_at: string
        }
      }
      assign_starter_jobs_to_user: {
        Args: { p_user_id: string }
        Returns: {
          assigned_count: number
          assignments: Json
        }[]
      }
      complete_user_profile: {
        Args: {
          p_user_id: string
          p_first_name: string
          p_last_name: string
          p_email: string
          p_street?: string
          p_postal_code?: string
          p_city?: string
          p_nationality?: string
          p_date_of_birth?: string
          p_contract_id?: string
          p_contract_signed_at?: string
          p_role?: string
        }
        Returns: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: string
          street: string
          postal_code: string
          city: string
          nationality: string
          date_of_birth: string
          contract_id: string
          contract_signed_at: string
          created_at: string
          updated_at: string
        }[]
      }
      create_signed_contract_assignment: {
        Args: {
          p_contract_id: string
          p_user_id: string
          p_signature_data: string
          p_status?: string
        }
        Returns: {
          assignment_id: string
          contract_id: string
          user_id: string
          assigned_at: string
          signed_at: string
          signature_data: string
          status: string
        }[]
      }
      create_user_manually: {
        Args: {
          p_email: string
          p_password: string
          p_user_id: string
          p_role?: string
        }
        Returns: undefined
      }
      execute_sql: {
        Args: { query: string }
        Returns: Json
      }
      get_all_task_templates: {
        Args: Record<PropertyKey, never>
        Returns: {
          app_store_url: string | null
          created_at: string
          created_by: string
          description: string
          estimated_hours: number | null
          id: string
          is_starter_job: boolean | null
          payment_amount: number
          play_store_url: string | null
          priority: string
          required_attachments: Json | null
          steps: Json | null
          title: string
          type: string
          updated_at: string
        }[]
      }
      get_phone_messages: {
        Args: { p_phone_number_id: string }
        Returns: {
          created_at: string
          id: string
          last_scraped_at: string | null
          message: string
          message_source: string | null
          phone_number_id: string
          raw_html: string | null
          received_at: string
          sender: string
        }[]
      }
      get_phone_numbers: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_key: string | null
          assignee_id: string | null
          auto_renewal: boolean | null
          country: string
          created_at: string
          end_date: string
          expires_at: string | null
          external_url: string | null
          id: string
          last_message_check: string | null
          last_scraped_at: string | null
          messages_count: number | null
          order_booking_id: string | null
          order_id: string | null
          phone_number: string
          provider: Database["public"]["Enums"]["phone_provider"] | null
          provider_id: string | null
          rent_id: string | null
          rent_time: string | null
          rental_status: string | null
          service: string
          status: string
          updated_at: string
        }[]
      }
      get_profiles_with_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          first_name: string
          last_name: string
          email: string
          role: string
          created_at: string
          updated_at: string
        }[]
      }
      get_profiles_with_emails_by_ids: {
        Args: { profile_ids: string[] }
        Returns: {
          id: string
          first_name: string
          last_name: string
          email: string
          role: string
          created_at: string
          updated_at: string
        }[]
      }
      get_public_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          accent_color: string | null
          city: string | null
          company_address: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          court_location: string | null
          created_at: string | null
          email_delay_enabled: boolean | null
          email_delay_hours: number | null
          euid: string | null
          favicon_url: string | null
          id: string
          impressum_content: string | null
          kyc_required_for_tasks: boolean | null
          kyc_requirement_message: string | null
          logo_url: string | null
          managing_director: string | null
          postal_code: string | null
          primary_color: string | null
          privacy_policy_content: string | null
          registration_number: string | null
          responsible_person: string | null
          support_email: string | null
          support_phone: string | null
          terms_content: string | null
          updated_at: string | null
          website_name: string
          website_url: string | null
        }[]
      }
      get_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          accent_color: string | null
          city: string | null
          company_address: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          court_location: string | null
          created_at: string | null
          email_delay_enabled: boolean | null
          email_delay_hours: number | null
          euid: string | null
          favicon_url: string | null
          id: string
          impressum_content: string | null
          kyc_required_for_tasks: boolean | null
          kyc_requirement_message: string | null
          logo_url: string | null
          managing_director: string | null
          postal_code: string | null
          primary_color: string | null
          privacy_policy_content: string | null
          registration_number: string | null
          responsible_person: string | null
          support_email: string | null
          support_phone: string | null
          terms_content: string | null
          updated_at: string | null
          website_name: string
          website_url: string | null
        }[]
      }
      migrate_store_urls_to_templates: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_settings: {
        Args:
          | {
              p_company_name?: string
              p_website_name?: string
              p_website_url?: string
              p_primary_color?: string
              p_accent_color?: string
              p_logo_url?: string
              p_favicon_url?: string
            }
          | {
              p_company_name?: string
              p_website_name?: string
              p_website_url?: string
              p_primary_color?: string
              p_accent_color?: string
              p_logo_url?: string
              p_favicon_url?: string
              p_contact_email?: string
              p_contact_phone?: string
              p_support_email?: string
              p_support_phone?: string
              p_registration_number?: string
              p_euid?: string
              p_court_location?: string
              p_managing_director?: string
              p_responsible_person?: string
              p_company_address?: string
              p_postal_code?: string
              p_city?: string
              p_country?: string
              p_impressum_content?: string
              p_privacy_policy_content?: string
              p_terms_content?: string
            }
        Returns: {
          accent_color: string | null
          city: string | null
          company_address: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          court_location: string | null
          created_at: string | null
          email_delay_enabled: boolean | null
          email_delay_hours: number | null
          euid: string | null
          favicon_url: string | null
          id: string
          impressum_content: string | null
          logo_url: string | null
          managing_director: string | null
          postal_code: string | null
          primary_color: string | null
          privacy_policy_content: string | null
          registration_number: string | null
          responsible_person: string | null
          support_email: string | null
          support_phone: string | null
          terms_content: string | null
          updated_at: string | null
          website_name: string
          website_url: string | null
        }
      }
      update_task_assignment_video_chat_status: {
        Args: {
          p_assignment_id: string
          p_user_id: string
          p_status: string
          p_current_step: number
          p_code?: string
        }
        Returns: {
          admin_notes: string | null
          app_store_url: string | null
          assignee_id: string
          created_at: string
          created_by: string | null
          current_step: number | null
          demo_data: Json | null
          demo_email: string | null
          demo_password: string | null
          document_step_completed: boolean | null
          document_step_required: boolean | null
          due_date: string
          id: string
          ident_code: string | null
          ident_url: string | null
          phone_number_id: string | null
          play_store_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_data: Json | null
          submitted_at: string | null
          task_id: string | null
          task_template_id: string
          updated_at: string
          video_call_rating_completed: boolean | null
          video_call_rating_data: Json | null
          video_chat_code: string | null
          video_chat_status: string | null
        }[]
      }
      update_video_chat_status: {
        Args: {
          p_assignment_id: string
          p_status: string
          p_video_code?: string
        }
        Returns: {
          admin_notes: string | null
          app_store_url: string | null
          assignee_id: string
          created_at: string
          created_by: string | null
          current_step: number | null
          demo_data: Json | null
          demo_email: string | null
          demo_password: string | null
          document_step_completed: boolean | null
          document_step_required: boolean | null
          due_date: string
          id: string
          ident_code: string | null
          ident_url: string | null
          phone_number_id: string | null
          play_store_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_data: Json | null
          submitted_at: string | null
          task_id: string | null
          task_template_id: string
          updated_at: string
          video_call_rating_completed: boolean | null
          video_call_rating_data: Json | null
          video_chat_code: string | null
          video_chat_status: string | null
        }[]
      }
    }
    Enums: {
      phone_provider: "sms_activate" | "receive_sms_online" | "smspva" | "anosim" | "gogetsms"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Global Search Types
export type SearchResultType = 'employee' | 'bankdrop' | 'task' | 'phone' | 'submission' | 'contract';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchCategory {
  id: string;
  name: string;
  type: SearchResultType | 'all';
  count?: number;
  icon?: string;
}

export interface SearchFilters {
  category: SearchResultType | 'all';
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchState {
  searchTerm: string;
  results: SearchResult[];
  categories: SearchCategory[];
  filters: SearchFilters;
  isSearching: boolean;
  lastSearchTime: number;
  searchHistory: string[];
}





// Knowledge Base Interfaces
export interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeArticle {
  id: string;
  category_id: string;
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  keywords?: string[];
  is_published: boolean;
  view_count: number;
  helpful_votes: number;
  unhelpful_votes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: KnowledgeCategory;
  relevance_score?: number;
  
  // AI-specific fields
  ai_training_enabled?: boolean;
  context_priority?: number;
  response_template?: string;
  conversation_examples?: any[];
  ai_effectiveness_score?: number;
  last_ai_usage?: string;
  ai_usage_count?: number;
}

export interface KnowledgeEmbedding {
  id: string;
  article_id: string;
  content_chunk: string;
  embedding: number[] | Record<string, any>;
  chunk_index?: number;
  token_count?: number;
  created_at: string;
}

// AI Knowledge Management Interfaces
export interface AITrainingExample {
  id: string;
  article_id: string;
  question: string;
  expected_answer: string;
  context_tags: string[];
  difficulty_level: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AIKnowledgeMetric {
  id: string;
  article_id: string;
  chat_conversation_id: string;
  usage_type: 'context_included' | 'direct_reference' | 'similarity_match';
  relevance_score: number;
  user_feedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
  response_quality_score?: number;
  created_at: string;
}

export interface AIPerformanceLog {
  id: string;
  conversation_id: string;
  user_id: string;
  question: string;
  ai_response: string;
  knowledge_articles_used: string[];
  response_time_ms: number;
  context_size: number;
  model_used: string;
  user_satisfaction?: number;
  created_at: string;
}

// Chat Manager Settings Interface
export interface ChatManagerSettings {
  id: string;
  manager_name: string;
  manager_title: string;
  manager_avatar_url?: string;
  manager_bio?: string;
  is_active: boolean;
  chat_enabled?: boolean;
  created_at: string;
  updated_at: string;
}


// AI Response Interfaces
export interface AIResponse {
  response: string;
  knowledgeUsed: boolean;
  articlesReferenced: number;
  confidence?: number;
  sources?: string[];
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Chat System Interfaces
export interface ChatConversation {
  id: string;
  title?: string;
  conversation_type: 'support' | 'task_related' | 'general';
  participants: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  metadata: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'file' | 'image' | 'audio' | 'system';
  content: string;
  metadata: Record<string, any>;
  reply_to?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  chat_attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  storage_bucket: string;
  thumbnail_path?: string;
  created_at: string;
}

export interface ChatFollowUp {
  id: string;
  conversation_id: string;
  user_id: string;
  original_message_id: string;
  auto_reply_message_id: string;
  user_question_summary: string;
  detected_topic: string;
  urgency_level: 'low' | 'normal' | 'high' | 'urgent';
  promised_return_time: string;
  actual_return_time?: string;
  status: 'pending' | 'sent' | 'completed' | 'cancelled' | 'failed';
  follow_up_sent_at?: string;
  follow_up_message_id?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}
