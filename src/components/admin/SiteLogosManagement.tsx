// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, RotateCcw, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const sectionLabels: Record<string, string> = {
  affiliated: "Affiliated With (Footer)",
  highlights: "Homepage Highlights",
  quicklinks: "Quick Links",
};

const TARGET_SIZE = 512;

/** Resize image to a 512×512 transparent PNG, contained (no crop). */
async function resizeToSquarePng(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);
  // Contain
  const ratio = Math.min(TARGET_SIZE / img.width, TARGET_SIZE / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (TARGET_SIZE - w) / 2;
  const y = (TARGET_SIZE - h) / 2;
  ctx.drawImage(img, x, y, w, h);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png", 0.95));
}

export default function SiteLogosManagement() {
  const { toast } = useToast();
  const [logos, setLogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_logos")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load logos", description: error.message, variant: "destructive" });
    } else {
      setLogos(data || []);
    }
    setLoading(false);
  };

  const handleFileSelect = async (logo: any, file: File | undefined) => {
    if (!file) return;
    setUploadingId(logo.id);
    try {
      const blob = await resizeToSquarePng(file);
      const path = `logos/${logo.slot_key}_${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("school-media")
        .upload(path, blob, { cacheControl: "3600", upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("school-media").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("site_logos")
        .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", logo.id);
      if (dbErr) throw dbErr;
      toast({ title: "Logo updated", description: `${logo.label} — auto-resized to ${TARGET_SIZE}×${TARGET_SIZE}px.` });
      fetchLogos();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingId(null);
      if (fileRefs.current[logo.id]) fileRefs.current[logo.id]!.value = "";
    }
  };

  const updateField = async (logo: any, patch: Partial<any>) => {
    const { error } = await supabase
      .from("site_logos")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", logo.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setLogos((prev) => prev.map((l) => (l.id === logo.id ? { ...l, ...patch } : l)));
    }
  };

  const clearLogo = async (logo: any) => {
    await updateField(logo, { image_url: null });
    toast({ title: "Logo cleared", description: "Default crest will be shown." });
  };

  const sections = ["affiliated", "highlights", "quicklinks"];

  if (loading) {
    return <p className="text-sm text-muted-foreground italic">Loading logos…</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Site Logos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload custom logos for the public homepage and footer. Images are automatically resized to a consistent {TARGET_SIZE}×{TARGET_SIZE}px transparent PNG. Clear a logo to fall back to the school crest.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="affiliated">
        <TabsList className="bg-muted">
          {sections.map((s) => (
            <TabsTrigger key={s} value={s}>
              {sectionLabels[s]}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section} value={section} className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {logos
                .filter((l) => l.section === section)
                .map((logo) => (
                  <Card key={logo.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex h-32 items-center justify-center rounded-md border bg-muted/30 p-3">
                        {logo.image_url ? (
                          <img
                            src={logo.image_url}
                            alt={logo.label}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                            <ImagePlus className="h-6 w-6" />
                            <span>Using crest fallback</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={logo.label || ""}
                            onChange={(e) =>
                              setLogos((prev) =>
                                prev.map((l) => (l.id === logo.id ? { ...l, label: e.target.value } : l))
                              )
                            }
                            onBlur={(e) => updateField(logo, { label: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sub-label / description</Label>
                          <Input
                            value={logo.sub_label || ""}
                            onChange={(e) =>
                              setLogos((prev) =>
                                prev.map((l) => (l.id === logo.id ? { ...l, sub_label: e.target.value } : l))
                              )
                            }
                            onBlur={(e) => updateField(logo, { sub_label: e.target.value })}
                          />
                        </div>
                      </div>

                      <input
                        ref={(el) => (fileRefs.current[logo.id] = el)}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleFileSelect(logo, e.target.files?.[0])}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={uploadingId === logo.id}
                          onClick={() => fileRefs.current[logo.id]?.click()}
                        >
                          <Upload className="mr-1 h-3.5 w-3.5" />
                          {uploadingId === logo.id ? "Resizing…" : logo.image_url ? "Replace" : "Upload"}
                        </Button>
                        {logo.image_url && (
                          <Button size="sm" variant="outline" onClick={() => clearLogo(logo)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
