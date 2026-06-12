CREATE OR REPLACE FUNCTION public.wipe_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE
    public.notifications,
    public.audit_logs,
    public.parent_students,
    public.portal_subscriptions,
    public.portal_payments,
    public.paynow_transactions,
    public.online_payments,
    public.payments,
    public.invoice_items,
    public.invoices,
    public.fee_structures,
    public.attendance,
    public.assessment_results,
    public.assessment_submissions,
    public.assessment_attempts,
    public.assessment_questions,
    public.assessments,
    public.homework,
    public.lesson_plans,
    public.marks,
    public.exam_results,
    public.exam_timetable_entries,
    public.exams,
    public.term_reports,
    public.term_registrations,
    public.timetable_overrides,
    public.timetable_entries,
    public.timetable_drafts,
    public.timetable,
    public.personal_timetables,
    public.class_subjects,
    public.student_classes,
    public.enrollments,
    public.guardians,
    public.health_visits,
    public.bed_allocations,
    public.student_restrictions,
    public.student_verification_codes,
    public.parent_communication_logs,
    public.communication_logs,
    public.textbook_issues,
    public.study_materials,
    public.teacher_resources,
    public.announcements,
    public.events,
    public.conversation_participants,
    public.messages,
    public.conversations,
    public.leave_requests,
    public.contracts,
    public.students,
    public.classes,
    public.subjects,
    public.subject_period_requirements
  RESTART IDENTITY CASCADE;
END;
$$;

REVOKE ALL ON FUNCTION public.wipe_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipe_demo_data() TO service_role;