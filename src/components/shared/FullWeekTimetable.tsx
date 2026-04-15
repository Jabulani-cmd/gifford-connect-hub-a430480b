// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Printer, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTimeSlots, type TimeSlot } from "@/hooks/useTimeSlots";
import { printBrandedHtml, downloadBrandedPdf } from "@/lib/export-pdf";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

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
}: Props) {
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const { timeSlots, loading: slotsLoading } = useTimeSlots();


  const getCell = useMemo(() => {
    return (startTime: string, dayIndex: number) => {
      const entry = entries.find(
        (t) =>
          t.start_time === startTime &&
          (t.day_of_week === dayIndex || t.day_of_week === dayIndex + 1)
      );
      return entry;
    };
  }, [entries]);

  const getSportsCell = useMemo(() => {
    return (startTime: string, dayIndex: number) => {
      const entry = sportsSchedule.find(
        (t) =>
          t.start_time === startTime &&
          (t.day_of_week === dayIndex || t.day_of_week === dayIndex + 1)
      );
      return entry;
    };
  }, [sportsSchedule]);

  const buildTimetableHtml = () => {
    let html = `<table style="font-size:11px"><thead><tr><th style="width:100px">Time</th>`;
    days.forEach(d => { html += `<th style="text-align:center">${d}</th>`; });
    html += `</tr></thead><tbody>`;
    timeSlots.forEach(slot => {
      const isBreak = slot.slot_type === "break";
      const isSports = slot.slot_type === "sports";
      html += `<tr${isBreak ? ' style="background:#f5f5f5"' : ''}>`;
      html += `<td style="font-weight:600;white-space:nowrap">${slot.start_time}–${slot.end_time}${isBreak ? '<br><em style="font-size:9px;color:#888">' + (slot.label || 'Break') + '</em>' : ''}${isSports ? '<br><em style="font-size:9px;color:#888">Sports/Clubs</em>' : ''}</td>`;
      if (isBreak) {
        html += `<td colspan="5" style="text-align:center;font-style:italic;color:#888">${slot.label || "Break"}</td>`;
      } else {
        days.forEach((_, di) => {
          const entry = isSports ? getSportsCell(slot.start_time, di) : getCell(slot.start_time, di);
          if (entry) {
            html += `<td style="text-align:center"><strong>${entry.subjects?.name || entry.activity_name || "—"}</strong>`;
            if (entry.staff?.full_name) html += `<br><span style="font-size:9px;color:#666">${entry.staff.full_name}</span>`;
            if (entry.room || entry.venue) html += `<br><span style="font-size:8px;background:#f0f0f0;padding:1px 4px;border-radius:3px">${entry.room || entry.venue}</span>`;
            html += `</td>`;
          } else {
            html += `<td style="text-align:center;color:#ccc">—</td>`;
          }
        });
      }
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    if (sportsActivities.length > 0) {
      html += `<div style="margin-top:16px"><strong>Sports & Activities:</strong> ${sportsActivities.join(", ")}</div>`;
    }
    return html;
  };

  const handlePrint = () => {
    const html = buildTimetableHtml();
    printBrandedHtml(printTitle || title, html, { landscape: true });
  };

  const handleDownload = async () => {
    const headers = ["Time", ...days];
    const rows: string[][] = [];
    timeSlots.forEach(slot => {
      const isBreak = slot.slot_type === "break";
      const isSports = slot.slot_type === "sports";
      const row: string[] = [`${slot.start_time}–${slot.end_time}`];
      if (isBreak) {
        days.forEach(() => row.push(slot.label || "Break"));
      } else {
        days.forEach((_, di) => {
          const entry = isSports ? getSportsCell(slot.start_time, di) : getCell(slot.start_time, di);
          if (entry) {
            let cell = entry.subjects?.name || entry.activity_name || "—";
            if (entry.staff?.full_name) cell += ` (${entry.staff.full_name})`;
            if (entry.room || entry.venue) cell += ` [${entry.room || entry.venue}]`;
            row.push(cell);
          } else {
            row.push("—");
          }
        });
      }
      rows.push(row);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base font-heading">
              <Calendar className="h-5 w-5" />
              {title}
            </CardTitle>
            {showPrintDownload && entries.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-1 h-4 w-4" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-1 h-4 w-4" /> Download PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px] text-xs font-semibold">Time</TableHead>
                {days.map((d, i) => (
                  <TableHead
                    key={d}
                    className={`text-center text-xs font-semibold ${
                      today === i + 1 ? "bg-secondary/10 text-secondary" : ""
                    }`}
                  >
                    {d}
                    {today === i + 1 && (
                      <span className="ml-1 text-[9px] font-normal">(Today)</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((slot, si) => {
                const isBreak = slot.slot_type === "break";
                const isSports = slot.slot_type === "sports";
                return (
                <TableRow
                  key={si}
                  className={
                    isBreak
                      ? "bg-muted/40"
                      : isSports
                        ? "bg-accent/5"
                        : ""
                  }
                >
                  <TableCell className="whitespace-nowrap py-2 text-xs font-medium">
                    {slot.start_time}–{slot.end_time}
                    {isBreak && (
                      <span className="block text-[10px] text-muted-foreground italic">
                        {slot.label || "Break"}
                      </span>
                    )}
                    {isSports && (
                      <span className="block text-[10px] text-muted-foreground italic">
                        Sports/Clubs
                      </span>
                    )}
                  </TableCell>
                  {isBreak ? (
                    <TableCell
                      colSpan={5}
                      className="py-2 text-center text-xs italic text-muted-foreground"
                    >
                      {slot.label || "Break"}
                    </TableCell>
                  ) : (
                    days.map((_, di) => {
                      const entry = isSports
                        ? getSportsCell(slot.start_time, di)
                        : getCell(slot.start_time, di);

                      return (
                        <TableCell
                          key={di}
                          className={`py-2 text-center text-xs ${
                            today === di + 1 ? "bg-secondary/5" : ""
                          }`}
                        >
                          {entry ? (
                            <div>
                              <span className="font-medium">
                                {entry.subjects?.name || entry.activity_name || "—"}
                              </span>
                              {entry.staff?.full_name && (
                                <span className="block text-[10px] text-muted-foreground">
                                  {entry.staff.full_name}
                                </span>
                              )}
                              {(entry.room || entry.venue) && (
                                <Badge
                                  variant="outline"
                                  className="mt-0.5 px-1 py-0 text-[8px]"
                                >
                                  {entry.room || entry.venue}
                                </Badge>
                              )}
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
