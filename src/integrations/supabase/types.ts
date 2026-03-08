export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          expires_at: string | null
          file_attachments: string[] | null
          id: string
          is_public: boolean
          target_ids: string[] | null
          target_type: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string | null
          file_attachments?: string[] | null
          id?: string
          is_public?: boolean
          target_ids?: string[] | null
          target_type?: string | null
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string | null
          file_attachments?: string[] | null
          id?: string
          is_public?: boolean
          target_ids?: string[] | null
          target_type?: string | null
          title?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          admin_notes: string | null
          authority: string
          created_at: string
          department: string | null
          email: string
          id: string
          name: string
          phone: string | null
          preferred_date: string
          preferred_time: string
          reason: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          authority: string
          created_at?: string
          department?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          preferred_date: string
          preferred_time: string
          reason: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          authority?: string
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          preferred_date?: string
          preferred_time?: string
          reason?: string
          status?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          assessment_id: string
          created_at: string | null
          grade: string | null
          graded_by: string | null
          graded_date: string | null
          id: string
          is_published: boolean | null
          marks_obtained: number | null
          percentage: number | null
          student_id: string
          teacher_feedback: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          grade?: string | null
          graded_by?: string | null
          graded_date?: string | null
          id?: string
          is_published?: boolean | null
          marks_obtained?: number | null
          percentage?: number | null
          student_id: string
          teacher_feedback?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          grade?: string | null
          graded_by?: string | null
          graded_date?: string | null
          id?: string
          is_published?: boolean | null
          marks_obtained?: number | null
          percentage?: number | null
          student_id?: string
          teacher_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_submissions: {
        Row: {
          assessment_id: string
          comments: string | null
          created_at: string | null
          file_url: string | null
          id: string
          status: string
          student_id: string
          submission_date: string | null
        }
        Insert: {
          assessment_id: string
          comments?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          status?: string
          student_id: string
          submission_date?: string | null
        }
        Update: {
          assessment_id?: string
          comments?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          status?: string
          student_id?: string
          submission_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: string
          class_id: string | null
          created_at: string | null
          due_date: string | null
          file_url: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          max_marks: number | null
          subject_id: string | null
          teacher_id: string
          title: string
        }
        Insert: {
          assessment_type?: string
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_marks?: number | null
          subject_id?: string | null
          teacher_id: string
          title: string
        }
        Update: {
          assessment_type?: string
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_marks?: number | null
          subject_id?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          class_id: string
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          class_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          class_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
        }
        Relationships: []
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number | null
          class_teacher_id: string | null
          created_at: string
          form_level: string | null
          id: string
          name: string
          room: string | null
          stream: string | null
        }
        Insert: {
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          form_level?: string | null
          id?: string
          name: string
          room?: string | null
          stream?: string | null
        }
        Update: {
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          form_level?: string | null
          id?: string
          name?: string
          room?: string | null
          stream?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_type: string
          created_at: string
          documents: string | null
          end_date: string | null
          id: string
          salary: number | null
          staff_id: string
          start_date: string
        }
        Insert: {
          contract_type?: string
          created_at?: string
          documents?: string | null
          end_date?: string | null
          id?: string
          salary?: number | null
          staff_id: string
          start_date: string
        }
        Update: {
          contract_type?: string
          created_at?: string
          documents?: string | null
          end_date?: string | null
          id?: string
          salary?: number | null
          staff_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          academic_year: string
          class_id: string | null
          created_at: string
          enrollment_date: string | null
          id: string
          student_id: string
        }
        Insert: {
          academic_year: string
          class_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          id?: string
          student_id: string
        }
        Update: {
          academic_year?: string
          class_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          created_at: string
          exam_id: string
          grade: string | null
          id: string
          mark: number
          student_id: string
          subject_id: string
          teacher_comment: string | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          grade?: string | null
          id?: string
          mark?: number
          student_id: string
          subject_id: string
          teacher_comment?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          grade?: string | null
          id?: string
          mark?: number
          student_id?: string
          subject_id?: string
          teacher_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string
          created_at: string
          end_date: string | null
          exam_type: string
          form_level: string
          id: string
          is_published: boolean
          name: string
          start_date: string | null
          term: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          end_date?: string | null
          exam_type?: string
          form_level: string
          id?: string
          is_published?: boolean
          name: string
          start_date?: string | null
          term?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          end_date?: string | null
          exam_type?: string
          form_level?: string
          id?: string
          is_published?: boolean
          name?: string
          start_date?: string | null
          term?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_usd: number
          amount_zig: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          payment_method: string
          receipt_url: string | null
          recorded_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount_usd?: number
          amount_zig?: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          payment_method?: string
          receipt_url?: string | null
          recorded_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount_usd?: number
          amount_zig?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          payment_method?: string
          receipt_url?: string | null
          recorded_by?: string | null
          reference_number?: string | null
        }
        Relationships: []
      }
      facility_images: {
        Row: {
          caption: string | null
          created_at: string
          facility_type: string
          id: string
          image_url: string
          is_active: boolean
        }
        Insert: {
          caption?: string | null
          created_at?: string
          facility_type?: string
          id?: string
          image_url: string
          is_active?: boolean
        }
        Update: {
          caption?: string | null
          created_at?: string
          facility_type?: string
          id?: string
          image_url?: string
          is_active?: boolean
        }
        Relationships: []
      }
      fee_structures: {
        Row: {
          academic_year: string
          amount_usd: number
          amount_zig: number
          boarding_status: string
          created_at: string
          description: string | null
          form: string
          id: string
          is_active: boolean
          term: string
        }
        Insert: {
          academic_year: string
          amount_usd?: number
          amount_zig?: number
          boarding_status?: string
          created_at?: string
          description?: string | null
          form: string
          id?: string
          is_active?: boolean
          term: string
        }
        Update: {
          academic_year?: string
          amount_usd?: number
          amount_zig?: number
          boarding_status?: string
          created_at?: string
          description?: string | null
          form?: string
          id?: string
          is_active?: boolean
          term?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
        }
        Relationships: []
      }
      guardians: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          subject_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount_usd: number
          amount_zig: number
          description: string
          fee_structure_id: string | null
          id: string
          invoice_id: string
        }
        Insert: {
          amount_usd?: number
          amount_zig?: number
          description: string
          fee_structure_id?: string | null
          id?: string
          invoice_id: string
        }
        Update: {
          amount_usd?: number
          amount_zig?: number
          description?: string
          fee_structure_id?: string | null
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          academic_year: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_usd: number
          paid_zig: number
          status: string
          student_id: string
          term: string
          total_usd: number
          total_zig: number
        }
        Insert: {
          academic_year: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_usd?: number
          paid_zig?: number
          status?: string
          student_id: string
          term: string
          total_usd?: number
          total_zig?: number
        }
        Update: {
          academic_year?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_usd?: number
          paid_zig?: number
          status?: string
          student_id?: string
          term?: string
          total_usd?: number
          total_zig?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          staff_id: string
          start_date: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          assessment_type: string
          comment: string | null
          created_at: string
          id: string
          mark: number
          student_id: string
          subject_id: string
          teacher_id: string
          term: string
        }
        Insert: {
          assessment_type?: string
          comment?: string | null
          created_at?: string
          id?: string
          mark: number
          student_id: string
          subject_id: string
          teacher_id: string
          term?: string
        }
        Update: {
          assessment_type?: string
          comment?: string | null
          created_at?: string
          id?: string
          mark?: number
          student_id?: string
          subject_id?: string
          teacher_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_type: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_type?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_type?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_usd: number
          amount_zig: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          receipt_number: string
          recorded_by: string | null
          reference_number: string | null
          student_id: string
        }
        Insert: {
          amount_usd?: number
          amount_zig?: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_number: string
          recorded_by?: string | null
          reference_number?: string | null
          student_id: string
        }
        Update: {
          amount_usd?: number
          amount_zig?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_number?: string
          recorded_by?: string | null
          reference_number?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_timetables: {
        Row: {
          activity: string
          activity_type: string
          created_at: string
          day_of_week: number
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          time_slot: string
          user_id: string
        }
        Insert: {
          activity: string
          activity_type?: string
          created_at?: string
          day_of_week: number
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          time_slot: string
          user_id: string
        }
        Update: {
          activity?: string
          activity_type?: string
          created_at?: string
          day_of_week?: number
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          time_slot?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_name: string | null
          created_at: string
          email: string | null
          full_name: string
          grade: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          class_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          class_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      school_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          address: string | null
          bank_details: string | null
          bio: string | null
          category: string
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string | null
          emergency_contact: string | null
          employment_date: string | null
          full_name: string
          id: string
          national_id: string | null
          nssa_number: string | null
          paye_number: string | null
          phone: string | null
          photo_url: string | null
          qualifications: string | null
          role: string | null
          staff_number: string | null
          status: string | null
          subjects_taught: string[] | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          bio?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          employment_date?: string | null
          full_name: string
          id?: string
          national_id?: string | null
          nssa_number?: string | null
          paye_number?: string | null
          phone?: string | null
          photo_url?: string | null
          qualifications?: string | null
          role?: string | null
          staff_number?: string | null
          status?: string | null
          subjects_taught?: string[] | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          bio?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          employment_date?: string | null
          full_name?: string
          id?: string
          national_id?: string | null
          nssa_number?: string | null
          paye_number?: string | null
          phone?: string | null
          photo_url?: string | null
          qualifications?: string | null
          role?: string | null
          staff_number?: string | null
          status?: string | null
          subjects_taught?: string[] | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      student_classes: {
        Row: {
          class_id: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_restrictions: {
        Row: {
          applied_at: string
          applied_by: string | null
          id: string
          is_active: boolean
          removed_at: string | null
          restriction_type: string
          student_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          id?: string
          is_active?: boolean
          removed_at?: string | null
          restriction_type: string
          student_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          id?: string
          is_active?: boolean
          removed_at?: string | null
          restriction_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_restrictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_number: string
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          emergency_contact: string | null
          enrollment_date: string | null
          form: string
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          has_medical_alert: boolean
          id: string
          medical_conditions: string | null
          profile_photo_url: string | null
          status: string
          stream: string | null
          subject_combination: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_number: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          emergency_contact?: string | null
          enrollment_date?: string | null
          form?: string
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          has_medical_alert?: boolean
          id?: string
          medical_conditions?: string | null
          profile_photo_url?: string | null
          status?: string
          stream?: string | null
          subject_combination?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_number?: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          emergency_contact?: string | null
          enrollment_date?: string | null
          form?: string
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          has_medical_alert?: boolean
          id?: string
          medical_conditions?: string | null
          profile_photo_url?: string | null
          status?: string
          stream?: string | null
          subject_combination?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          class_id: string | null
          created_at: string
          description: string | null
          download_count: number
          expiry_date: string | null
          file_url: string | null
          id: string
          is_published: boolean
          link_url: string | null
          material_type: string
          subject_id: string | null
          tags: string[] | null
          teacher_id: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean
          link_url?: string | null
          material_type?: string
          subject_id?: string | null
          tags?: string[] | null
          teacher_id: string
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean
          link_url?: string | null
          material_type?: string
          subject_id?: string | null
          tags?: string[] | null
          teacher_id?: string
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          department: string | null
          form_levels: string[] | null
          id: string
          is_examinable: boolean | null
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          department?: string | null
          form_levels?: string[] | null
          id?: string
          is_examinable?: boolean | null
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          department?: string | null
          form_levels?: string[] | null
          id?: string
          is_examinable?: boolean | null
          name?: string
        }
        Relationships: []
      }
      timetable: {
        Row: {
          class_id: string
          day_of_week: number
          id: string
          subject_id: string | null
          time_slot: string
        }
        Insert: {
          class_id: string
          day_of_week: number
          id?: string
          subject_id?: string | null
          time_slot: string
        }
        Update: {
          class_id?: string
          day_of_week?: number
          id?: string
          subject_id?: string | null
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          academic_year: string | null
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          term: string | null
        }
        Insert: {
          academic_year?: string | null
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
        }
        Update: {
          academic_year?: string | null
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_exam_rankings: {
        Args: { p_exam_id: string; p_student_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "parent" | "teacher" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "parent", "teacher", "admin"],
    },
  },
} as const
