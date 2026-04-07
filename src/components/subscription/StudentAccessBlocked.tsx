import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Phone } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

export default function StudentAccessBlocked() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4">
            <img src={schoolLogo} alt="School Logo" className="h-16 w-auto mx-auto" />
          </div>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Lock className="h-7 w-7 text-amber-600" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Portal Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Access to the student portal requires an active parent subscription.
            Please ask your parent or guardian to complete payment to unlock your portal.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>Contact the school office for assistance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
