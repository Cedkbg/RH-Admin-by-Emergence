import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  message?: string;
}

export function AccessDenied({
  title = "Accès restreint",
  message = "Cette zone est réservée aux responsables habilités. Vous n'êtes pas autorisé à y accéder.",
}: Props) {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2 mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
      <Card className="p-10 text-center border-2 border-dashed">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{message}</p>
      </Card>
    </div>
  );
}
