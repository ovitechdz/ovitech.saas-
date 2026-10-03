import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Mail, MapPin, MessageCircle, Phone, Trash2, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TEAM, type TeamMember } from "@/lib/team";
import { resizePhoto, useTeamPhotoStore } from "@/lib/team-photos";
import { cn } from "@/lib/cn";
import { t as pres, type PresentationLang } from "@/lib/presentation";
import { FARM } from "@/lib/seed";
import { useAppLang, useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/team")({ component: TeamPage });

function MemberPhoto({
  member,
  size = "sm",
  className,
}: {
  member: TeamMember;
  size?: "sm" | "lg";
  className?: string;
}) {
  const photo = useTeamPhotoStore((s) => s.photos[member.id]);
  const t = useAppT();
  if (photo) {
    return (
      <img
        src={photo}
        alt={t("app.team.photoOf", { name: member.name })}
        className={cn(
          "shrink-0 rounded-full border border-gold/30 object-cover",
          size === "sm" ? "size-12" : "size-24",
          className,
        )}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-leaf/15 font-display text-gold",
        size === "sm" ? "size-12 text-lg" : "size-24 text-3xl",
        className,
      )}
    >
      {member.initials}
    </div>
  );
}

function MemberCard({ member, lang }: { member: TeamMember; lang: PresentationLang }) {
  const t = useAppT();
  const setPhoto = useTeamPhotoStore((s) => s.setPhoto);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const Icon = member.icon;

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await resizePhoto(file);
      setPhoto(member.id, dataUrl);
      toast.success(t("app.team.uploadSuccess"));
    } catch {
      toast.error(t("app.team.uploadError"));
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  return (
    <Card
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="group relative flex cursor-pointer flex-col p-5 transition-colors hover:border-gold/40"
      onClick={() => setOpen(true)}
    >
      <div className="flex items-center gap-3">
        <MemberPhoto member={member} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight">{member.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gold">
            <Icon className="size-3.5" aria-hidden="true" />
            {pres(lang, `member.${member.id}Role`)}
          </p>
        </div>
        <button
          type="button"
          className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-surface text-muted opacity-70 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          aria-label={t("app.team.uploadPhoto")}
          onClick={(e) => {
            e.stopPropagation();
            uploadRef.current?.click();
          }}
        >
          <Camera className="size-4" aria-hidden="true" />
        </button>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0])}
          aria-label={t("app.team.uploadPhoto")}
        />
      </div>

      <p className="mt-3 flex-1 text-sm text-muted">{pres(lang, `member.${member.id}Blurb`)}</p>
      <p className="mt-2 flex items-center gap-2 text-xs text-subtle">
        <MapPin className="size-3.5 shrink-0 text-gold/70" aria-hidden="true" />
        <span className="truncate">{pres(lang, `member.${member.id}Loc`)}</span>
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="mt-3 self-start px-0 text-xs font-medium uppercase tracking-wide text-gold"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {t("app.team.moreInfo")}
      </Button>

      <MemberDialog member={member} open={open} onOpenChange={setOpen} lang={lang} />
    </Card>
  );
}

function MemberDialog({
  member,
  open,
  onOpenChange,
  lang,
}: {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: PresentationLang;
}) {
  const t = useAppT();
  const photo = useTeamPhotoStore((s) => s.photos[member.id]);
  const setPhoto = useTeamPhotoStore((s) => s.setPhoto);
  const clearPhoto = useTeamPhotoStore((s) => s.clearPhoto);
  const uploadRef = useRef<HTMLInputElement>(null);
  const Icon = member.icon;

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await resizePhoto(file);
      setPhoto(member.id, dataUrl);
      toast.success(t("app.team.uploadSuccess"));
    } catch {
      toast.error(t("app.team.uploadError"));
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm" />
        <Dialog.Content
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-bg-elevated p-6 shadow-2xl outline-none"
        >
          <div className="flex items-start gap-4">
            <MemberPhoto member={member} size="lg" />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-xl leading-tight">
                {member.name}
              </Dialog.Title>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gold">
                <Icon className="size-4" aria-hidden="true" />
                {pres(lang, `member.${member.id}Role`)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-subtle">
                <MapPin className="size-3.5 text-gold/70" aria-hidden="true" />
                {pres(lang, `member.${member.id}Loc`)}
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                aria-label={t("shell.close")}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="subtle" onClick={() => uploadRef.current?.click()}>
                  <Camera className="size-4" aria-hidden="true" />
                  {t("app.team.uploadPhoto")}
                </Button>
                {photo && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      clearPhoto(member.id);
                      toast.success(t("app.team.uploadSuccess"));
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("app.team.removePhoto")}
                  </Button>
                )}
                <input
                  ref={uploadRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                  aria-label={t("app.team.uploadPhoto")}
                />
              </div>
              <p className="text-xs text-subtle">{t("app.team.uploadNote")}</p>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gold">
                {t("app.team.kicker")}
              </p>
              <p className="mt-2 text-muted">{pres(lang, `member.${member.id}Detail`)}</p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="font-display text-sm">{t("app.team.contactSection")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/70 text-green-400 hover:bg-green-700/20 hover:text-green-300"
                  asChild
                >
                  <a href={`https://wa.me/${member.whatsapp}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    {t("app.team.whatsapp")}
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${member.mail}`}>
                    <Mail className="size-4" aria-hidden="true" />
                    {t("app.team.email")}
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${member.phone}`}>
                    <Phone className="size-4" aria-hidden="true" />
                    {t("app.team.phone")}
                  </a>
                </Button>
              </div>
              <div className="mt-3 space-y-1 text-xs text-subtle">
                <p className="flex items-center gap-2">
                  <MessageCircle className="size-3.5 text-gold/70" aria-hidden="true" />
                  <a
                    href={`https://wa.me/${member.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-gold"
                  >
                    +{member.whatsapp}
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="size-3.5 text-gold/70" aria-hidden="true" />
                  <a href={`mailto:${member.mail}`} className="truncate hover:text-gold">
                    {member.mail}
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-3.5 text-gold/70" aria-hidden="true" />
                  <a href={`tel:${member.phone}`} className="font-mono hover:text-gold">
                    {member.phoneDisplay}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TeamPage() {
  const t = useAppT();
  const { lang } = useAppLang();
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gold">
            <Users className="size-4" aria-hidden="true" />
            {FARM.document} · {t("app.team.kicker")}
          </p>
          <h1 className="mt-2 font-display text-4xl">{t("app.team.title")}</h1>
          <p className="mt-4 text-muted">{t("app.team.lead")}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {TEAM.map((member) => (
            <MemberCard key={member.id} member={member} lang={lang} />
          ))}
        </div>
      </div>
    </div>
  );
}