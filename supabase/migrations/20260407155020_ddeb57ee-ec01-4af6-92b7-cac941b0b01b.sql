-- Allow parents to read published assessments for their linked children's classes
CREATE POLICY "Parents read assessments for linked children"
ON public.assessments FOR SELECT TO authenticated
USING (
  is_published = true
  AND class_id IN (
    SELECT sc.class_id FROM student_classes sc
    JOIN parent_students ps ON ps.student_id = sc.student_id
    WHERE ps.parent_id = auth.uid()
  )
);

-- Allow parents to read assessment results for their linked children
CREATE POLICY "Parents read results for linked children"
ON public.assessment_results FOR SELECT TO authenticated
USING (
  is_published = true
  AND student_id IN (
    SELECT ps.student_id FROM parent_students ps
    WHERE ps.parent_id = auth.uid()
  )
);

-- Allow parents to read assessment submissions for their linked children
CREATE POLICY "Parents read submissions for linked children"
ON public.assessment_submissions FOR SELECT TO authenticated
USING (
  student_id IN (
    SELECT ps.student_id FROM parent_students ps
    WHERE ps.parent_id = auth.uid()
  )
);

-- Allow parents to read students table for their linked children
CREATE POLICY "Parents read linked students"
ON public.students FOR SELECT TO authenticated
USING (
  id IN (
    SELECT ps.student_id FROM parent_students ps
    WHERE ps.parent_id = auth.uid()
  )
);