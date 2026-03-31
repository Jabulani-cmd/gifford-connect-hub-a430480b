import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  label: string | null;
  slot_type: string;
  display_order: number;
}

const FALLBACK_SLOTS: Omit<TimeSlot, "id">[] = [
  { start_time: "07:30", end_time: "08:10", label: null, slot_type: "lesson", display_order: 1 },
  { start_time: "08:10", end_time: "08:50", label: null, slot_type: "lesson", display_order: 2 },
  { start_time: "08:50", end_time: "09:30", label: null, slot_type: "lesson", display_order: 3 },
  { start_time: "09:30", end_time: "09:50", label: "Break", slot_type: "break", display_order: 4 },
  { start_time: "09:50", end_time: "10:30", label: null, slot_type: "lesson", display_order: 5 },
  { start_time: "10:30", end_time: "11:10", label: null, slot_type: "lesson", display_order: 6 },
  { start_time: "11:10", end_time: "11:50", label: null, slot_type: "lesson", display_order: 7 },
  { start_time: "11:50", end_time: "12:30", label: null, slot_type: "lesson", display_order: 8 },
  { start_time: "12:30", end_time: "13:10", label: null, slot_type: "lesson", display_order: 9 },
  { start_time: "13:10", end_time: "13:50", label: "Lunch", slot_type: "break", display_order: 10 },
  { start_time: "13:50", end_time: "14:30", label: null, slot_type: "lesson", display_order: 11 },
  { start_time: "14:30", end_time: "15:10", label: null, slot_type: "lesson", display_order: 12 },
  { start_time: "15:10", end_time: "15:30", label: "Break", slot_type: "break", display_order: 13 },
  { start_time: "15:30", end_time: "16:10", label: null, slot_type: "sports", display_order: 14 },
  { start_time: "16:10", end_time: "17:00", label: null, slot_type: "sports", display_order: 15 },
];

export function useTimeSlots() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = async () => {
    const { data } = await supabase
      .from("timetable_time_slots")
      .select("*")
      .order("display_order");
    
    if (data && data.length > 0) {
      setTimeSlots(data as TimeSlot[]);
    } else {
      // Use fallback if no DB slots
      setTimeSlots(FALLBACK_SLOTS.map((s, i) => ({ ...s, id: `fallback-${i}` })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const lessonSlots = timeSlots.filter(s => s.slot_type === "lesson");
  const sportsSlots = timeSlots.filter(s => s.slot_type === "sports");
  const allSlots = timeSlots;

  return { timeSlots: allSlots, lessonSlots, sportsSlots, loading, refetch: fetchSlots };
}
