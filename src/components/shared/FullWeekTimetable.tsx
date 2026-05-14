// @ts-nocheck
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Trophy, Printer, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { printBrandedHtml, downloadBrandedPdf } from "@/lib/export-pdf";
import { normalizeTimetableTime, timetableDayMatches, timetableShortDayLabels, timetableUsesZeroBasedDays } from "@/lib/timetable";

const days = timetableShortDayLabels;

interface TimetableEntry {
  day_of_week: number;
  start_time: string;
  end_time?: string;
  subjects?: { name: string } | null;
  staff?: { full_name: string } | null;
  room?: string | null;
  activity_name?: string;
  venue?: string;
}

interface OverrideEntry {
  override_date: string; // YYYY-MM-DD
  class_id?: string | null;
  start_time: string;
  is_cancelled?: boolean;
  subjects?: { name: string } | null;
  staff?: { full_name: string } | null;
  room?: string | null;
  reason?: string | null;
}

interface Props {
  entries: TimetableEntry[];
  sportsSchedule?: TimetableEntry[];
  sportsActivities?: string[];
  title?: string;
  loading?: boolean;
  noClassMessage?: string;
  hasClass?: boolean;
  showPrintDownload?: boolean;
  printTitle?: string;
  termStartDate?: string | null;
  termEndDate?: string | null;
  overrides?: OverrideEntry[];
  defaultView?: "week" | "month" | "term";
}

// Helpers
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function mondayOf(d: Date) {
  const x = new Date(d);
  const dow = x.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtRange(monday: Date) {
  const fri = addDays(monday, 4);
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${monday.toLocaleDateString(undefined, opt)} – ${fri.toLocaleDateString(undefined, opt)}`;
}

export default function FullWeekTimetable({
  entries,
  sportsSchedule = [],
  sportsActivities = [],
  title = "Class Timetable",
  loading = false,
  noClassMessage = "No class assignment found.",
  hasClass = true,
  showPrintDownload = true,
  printTitle,
  termStartDate = null,
  termEndDate = null,
  overrides = [],
  defaultView = "week",
}: Props) {
  const today = new Date();
  const todayDow = today.getDay();
  const { timeSlots, loading: slotsLoading } = useTimeSlots();
  const [view, setView] = useState<"week" | "month" | "term">(defaultView);

  const zeroBasedDays = useMemo(
    () => timetableUsesZeroBasedDays([...entries, ...sportsSchedule]),
    [entries, sportsSchedule],
  );

  const hasTerm = !!(termStartDate && termEndDate);

  // Build list of week-start Mondays for the chosen view
  const weeks = useMemo<Date[]>(() => {
    if (!hasTerm) return [mondayOf(today)];
    const start = new Date(termStartDate!);
    const end = new Date(termEndDate!);
    const allMondays: Date[] = [];
    let cur = mondayOf(start);
    while (cur <= end) {
      if (addDays(cur, 4) >= start) allMondays.push(new Date(cur));
      cur = addDays(cur, 7);
    }
    if (allMondays.length === 0) allMondays.push(mondayOf(today));

    if (view === "term") return allMondays;

    // pick "current" week: closest to today, clamped to term
    const todayMon = mondayOf(today).getTime();
    let idx = allMondays.findIndex((m) => m.getTime() === todayMon);
    if (idx === -1) {
      idx = allMondays.findIndex((m) => m.getTime() > todayMon);
      if (idx === -1) idx = allMondays.length - 1;
    }
    if (view === "week") return [allMondays[idx]];
    // month view: current + next 3 (or last 4 of term)
    const startIdx = Math.min(idx, Math.max(0, allMondays.length - 4));
    return allMondays.slice(startIdx, startIdx + 4);
  }, [hasTerm, termStartDate, termEndDate, view, today.toDateString()]);

  const getCell = (startTime: string, dayIndex: number) =>
    entries.find(
      (t) =>
        normalizeTimetableTime(t.start_time) === normalizeTimetableTime(startTime) &&
        timetableDayMatches(t.day_of_week, dayIndex, zeroBasedDays),
    );

  const getSportsCell = (startTime: string, dayIndex: number) =>
    sportsSchedule.find(
      (t) =>
        normalizeTimetableTime(t.start_time) === normalizeTimetableTime(startTime) &&
        timetableDayMatches(t.day_of_week, dayIndex, zeroBasedDays),
    );

  const getOverride = (dateStr: string, startTime: string) =>
    overrides.find(
      (o) =>
        o.override_date === dateStr &&
        normalizeTimetableTime(o.start_time) === normalizeTimetableTime(startTime),
    );

  const buildTimetableHtml = () => {
    let html = "";
    weeks.forEach((mon) => {
      html += `<h3 style="margin:14px 0 4px;font-size:13px">Week of ${fmtRange(mon)}</h3>`;
      html += `<table style="font-size:11px;width:100%;border-collapse:collapse"><thead><tr><th style="width:90px">Time</th>`;
      days.forEach((d, i) => {
        const dt = addDays(mon, i);
        html += `<th style="text-align:center">${d}<br><span style="font-size:9px;color:#666">${dt.getDate()}/${dt.getMonth() + 1}</span></th>`;
      });
      html += `</tr></thead><tbody>`;
      timeSlots.forEach((slot) => {
        const isBreak = slot.slot_type === "break";
        const isSports = slot.slot_type === "sports";
        html += `<tr${isBreak ? ' style="background:#f5f5f5"' : ""}>`;
        html += `<td style="font-weight:600;white-space:nowrap">${slot.start_time}–${slot.end_time}</td>`;
        if (isBreak) {
          html += `<td colspan="5" style="text-align:center;font-style:italic;color:#888">${slot.label || "Break"}</td>`;
        } else {
          days.forEach((_, di) => {
            const dateStr = ymd(addDays(mon, di));
            const ov = getOverride(dateStr, slot.start_time);
            if (ov) {
              if (ov.is_cancelled) {
                html += `<td style="text-align:center;background:#fee">CANCELLED${ov.reason ? `<br><span style="font-size:9px">${ov.reason}</span>` : ""}</td>`;
              } else {
                html += `<td style="text-align:center;background:#fff8e6"><strong>${ov.subjects?.name || "—"}</strong><br><span style="font-size:9px;color:#666">${ov.staff?.full_name || ""}</span><br><span style="font-size:8px">${ov.room || ""}</span></td>`;
              }
            } else {
              const entry = isSports ? getSportsCell(slot.start_time, di) : getCell(slot.start_time, di);
              if (entry) {
                html += `<td style="text-align:center"><strong>${entry.subjects?.name || entry.activity_name || "—"}</strong><br><span style="font-size:9px;color:#666">${entry.staff?.full_name || ""}</span><br><span style="font-size:8px">${entry.room || entry.venue || ""}</span></td>`;
              } else {
                html += `<td style="text-align:center;color:#ccc">—</td>`;
              }
            }
          });
        }
        html += `</tr>`;
      });
      html += `</tbody></table>`;
    });
    if (sportsActivities.length > 0) {
      html += `<div style="margin-top:16px"><strong>Sports & Activities:</strong> ${sportsActivities.join(", ")}</div>`;
    }
    return html;
  };

  const handlePrint = () => {
    printBrandedHtml(printTitle || title, buildTimetableHtml(), { landscape: true });
  };

  const handleDownload = async () => {
    const headers = ["Week", "Time", ...days];
    const rows: string[][] = [];
    weeks.forEach((mon) => {
      timeSlots.forEach((slot) => {
        const isBreak = slot.slot_type === "break";
        const isSports = slot.slot_type === "sports";
        const row: string[] = [fmtRange(mon), `${slot.start_time}–${slot.end_time}`];
        if (isBreak) {
          days.forEach(() => row.push(slot.label || "Break"));
        } else {
          days.forEach((_, di) => {
            const dateStr = ymd(addDays(mon, di));
            const ov = getOverride(dateStr, slot.start_time);
            if (ov) {
              row.push(ov.is_cancelled ? `CANCELLED${ov.reason ? ` (${ov.reason})` : ""}` : `${ov.subjects?.name || "—"} (${ov.staff?.full_name || "—"}) [${ov.room || "—"}]`);
            } else {
              const entry = isSports ? getSportsCell(slot.start_time, di) : getCell(slot.start_time, di);
              row.push(entry ? `${entry.subjects?.name || entry.activity_name || "—"} (${entry.staff?.full_name || "—"}) [${entry.room || entry.venue || "—"}]` : "—");
            }
          });
        }
        rows.push(row);
      });
    });
    await downloadBrandedPdf(printTitle || title, headers, rows, `${(printTitle || title).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  if (loading || slotsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!hasClass) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{noClassMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const renderWeek = (monday: Date, key: any) => (
    <Card key={key}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-heading">
            <Calendar className="h-4 w-4" />
            Week of {fmtRange(monday)}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px] text-xs font-semibold">Time</TableHead>
              {days.map((d, i) => {
                const dt = addDays(monday, i);
                const isToday = ymd(dt) === ymd(today);
                return (
                  <TableHead
                    key={d}
                    className={`text-center text-xs font-semibold ${isToday ? "bg-secondary/10 text-secondary" : ""}`}
                  >
                    {d}
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {dt.getDate()}/{dt.getMonth() + 1}
                    </span>
                    {isToday && <span className="block text-[9px] font-normal">(Today)</span>}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeSlots.map((slot, si) => {
              const isBreak = slot.slot_type === "break";
              const isSports = slot.slot_type === "sports";
              return (
                <TableRow
                  key={si}
                  className={isBreak ? "bg-muted/40" : isSports ? "bg-accent/5" : ""}
                >
                  <TableCell className="whitespace-nowrap py-2 text-xs font-medium">
                    {slot.start_time}–{slot.end_time}
                    {isBreak && <span className="block text-[10px] text-muted-foreground italic">{slot.label || "Break"}</span>}
                    {isSports && <span className="block text-[10px] text-muted-foreground italic">Sports/Clubs</span>}
                  </TableCell>
                  {isBreak ? (
                    <TableCell colSpan={5} className="py-2 text-center text-xs italic text-muted-foreground">
                      {slot.label || "Break"}
                    </TableCell>
                  ) : (
                    days.map((_, di) => {
                      const dt = addDays(monday, di);
                      const dateStr = ymd(dt);
                      const isToday = dateStr === ymd(today);
                      const ov = getOverride(dateStr, slot.start_time);
                      const entry = isSports ? getSportsCell(slot.start_time, di) : getCell(slot.start_time, di);
                      const effective = ov && !ov.is_cancelled
                        ? { subjects: ov.subjects, staff: ov.staff, room: ov.room }
                        : entry;
                      return (
                        <TableCell
                          key={di}
                          className={`py-2 text-center text-xs ${isToday ? "bg-secondary/5" : ""} ${ov ? (ov.is_cancelled ? "bg-destructive/10" : "bg-yellow-500/10") : ""}`}
                        >
                          {ov?.is_cancelled ? (
                            <div>
                              <Badge variant="destructive" className="text-[9px]">Cancelled</Badge>
                              {ov.reason && <span className="block text-[9px] text-muted-foreground">{ov.reason}</span>}
                            </div>
                          ) : effective ? (
                            <div>
                              <span className="font-medium">
                                {effective.subjects?.name || (effective as any).activity_name || "—"}
                              </span>
                              {ov && <Badge variant="outline" className="ml-1 px-1 py-0 text-[8px]">Override</Badge>}
                              <span className="block text-[10px] text-muted-foreground">
                                {effective.staff?.full_name || (isSports ? "Coach TBA" : "Teacher TBA")}
                              </span>
                              <Badge variant="outline" className="mt-0.5 px-1 py-0 text-[8px]">
                                {effective.room || (effective as any).venue || "Venue TBA"}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      );
                    })
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {hasTerm && (
            <Badge variant="outline" className="text-[10px]">
              Term: {termStartDate} → {termEndDate}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasTerm && (
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="term">Whole Term</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {showPrintDownload && entries.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-1 h-4 w-4" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {entries.length === 0 && (
        <div className="rounded-md border border-dashed border-secondary/40 bg-secondary/5 p-3 text-center text-xs text-muted-foreground">
          <Calendar className="mx-auto mb-1 h-5 w-5 text-secondary/60" />
          No timetable has been published yet. Ask the admin to use the AI Timetable Generator in the Admin Portal.
        </div>
      )}

      {weeks.map((m, i) => renderWeek(m, i))}

      {sportsActivities.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-secondary" />
              <h3 className="text-sm font-semibold">Sports & Activities</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {sportsActivities.map((sport) => (
                <Badge key={sport} variant="secondary" className="text-xs">
                  {sport}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
