import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";
import type { AdminDetailViewProps } from "@/src/types";

export function AdminDetailView({ detail }: AdminDetailViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-white/8 bg-[#1b1714] text-[#ece6dd]">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl text-[#f3ede5]">{detail.title}</CardTitle>
              {detail.subtitle ? <p className="text-sm text-[#8f8579]">{detail.subtitle}</p> : null}
            </div>
            {detail.badges?.length ? (
              <div className="flex flex-wrap gap-2">
                {detail.badges.map(badge => (
                  <Badge key={badge} variant="secondary">
                    {badge}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {detail.sections.map(section => (
        <Card key={section.title} className="border-white/8 bg-[#1b1714] text-[#ece6dd]">
          <CardHeader className="gap-1">
            <CardTitle className="text-lg text-[#f3ede5]">{section.title}</CardTitle>
            {section.description ? <p className="text-sm text-[#8f8579]">{section.description}</p> : null}
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-6">
            {section.fields?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {section.fields.map(field => (
                  <div key={`${section.title}-${field.label}`} className="rounded-lg border border-white/8 bg-white/4 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8f8579]">{field.label}</p>
                    <p className="mt-1 text-sm text-[#ece6dd]">{field.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {section.items?.length ? (
              <div className="space-y-3">
                {section.items.map(item => (
                  <div
                    key={`${section.title}-${item.label}-${item.description ?? ""}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/8 bg-white/3 p-3"
                  >
                    <div>
                      <p className="font-medium text-[#f3ede5]">{item.label}</p>
                      {item.description ? <p className="text-sm text-[#8f8579]">{item.description}</p> : null}
                    </div>
                    {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {!section.fields?.length && !section.items?.length ? (
              <p className="text-sm text-[#8f8579]">{section.emptyMessage ?? "Nenhum dado disponivel."}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
