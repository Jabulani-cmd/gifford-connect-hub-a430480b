CREATE OR REPLACE FUNCTION public.wipe_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  TRUNCATE TABLE
    public.announcements,
    public.appointments,
    public.assessment_attempts,
    public.assessment_questions,
    public.assessment_results,
    public.assessment_submissions,
    public.assessments,
    public.attendance,
    public.audit_logs,
    public.bank_transactions,
    public.bed_allocations,
    public.class_subjects,
    public.classes,
    public.communication_logs,
    public.contracts,
    public.conversation_participants,
    public.conversations,
    public.enrollments,
    public.events,
    public.exam_results,
    public.exam_timetable_entries,
    public.exams,
    public.expenses,
    public.fee_structures,
    public.finance_approval_requests,
    public.guardians,
    public.health_visits,
    public.homework,
    public.hostels,
    public.inventory_categories,
    public.inventory_items,
    public.inventory_transactions,
    public.invoice_items,
    public.invoices,
    public.leave_requests,
    public.lesson_plans,
    public.marks,
    public.meetings,
    public.messages,
    public.notifications,
    public.online_payments,
    public.parent_communication_logs,
    public.parent_students,
    public.payments,
    public.paynow_transactions,
    public.personal_timetables,
    public.petty_cash,
    public.portal_payments,
    public.portal_subscriptions,
    public.rooms,
    public.school_projects,
    public.sports_schedule,
    public.staff,
    public.student_classes,
    public.student_restrictions,
    public.student_verification_codes,
    public.students,
    public.study_materials,
    public.subject_period_requirements,
    public.subjects,
    public.supplier_invoices,
    public.supplier_payments,
    public.teacher_resources,
    public.teaching_venues,
    public.term_registrations,
    public.term_reports,
    public.textbook_issues,
    public.timetable,
    public.timetable_drafts,
    public.timetable_entries,
    public.timetable_overrides,
    public.timetable_time_slots,
    public.user_blocks,
    public.user_reports
  RESTART IDENTITY CASCADE;
END;
$function$;

REVOKE ALL ON FUNCTION public.wipe_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipe_demo_data() TO service_role;

COMMENT ON FUNCTION public.wipe_demo_data() IS
  'Atomically truncates operational demo/application data with RESTART IDENTITY CASCADE. Excludes auth users, profiles, user_roles, legacy users, public website content/settings, contact_messages, sms_templates, and subscription_plans so permanent access/configuration data is preserved.';