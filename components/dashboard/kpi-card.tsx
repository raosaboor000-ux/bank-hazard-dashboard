import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  title: string;
  value: string;
  helper: string;
};

export function KpiCard({ title, value, helper }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger className="block w-full">
        <Card className="hover-lift fade-in-up text-left">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{value}</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>{helper}</TooltipContent>
    </Tooltip>
  );
}
