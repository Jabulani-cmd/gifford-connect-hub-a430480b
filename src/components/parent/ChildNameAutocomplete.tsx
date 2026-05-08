import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Match {
  full_name: string;
  form: string | null;
  admission_number: string;
}

interface Props {
  admissionNumber: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Name input with autocomplete. Once an admission number is entered AND the
 * parent types at least 1 character of the child's name, the edge function
 * returns matching student names (server-side guard prevents bulk enumeration).
 */
export default function ChildNameAutocomplete({
  admissionNumber,
  value,
  onChange,
  placeholder = "Child's Full Name",
  id,
}: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setConfirmed(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const adm = admissionNumber.trim();
    const q = value.trim();
    if (adm.length < 4 || q.length < 1) {
      setMatches([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("manage-users", {
          body: {
            action: "lookup-child",
            admission_number: adm,
            name_query: q,
          },
        });
        if (error) throw error;
        const list: Match[] = data?.matches || [];
        setMatches(list);
        setOpen(list.length > 0);
        // Auto-confirm visual cue if exact match
        if (list.length === 1 && list[0].full_name.toLowerCase() === q.toLowerCase()) {
          setConfirmed(true);
        }
      } catch {
        setMatches([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [admissionNumber, value]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (m: Match) => {
    onChange(m.full_name);
    setOpen(false);
    setConfirmed(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => matches.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : confirmed ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : null}
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {matches.map((m) => (
            <button
              type="button"
              key={m.admission_number}
              onClick={() => select(m)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <div className="font-medium">{m.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {m.admission_number}
                {m.form ? ` • ${m.form}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
