"use client"

// HOW DID WE DO — the client's own verdict, on a request we have answered.
//
// THE OWNER, 2026-09-06: "let's store sentiment (1-3) on the portal for how did
// we do it to see if client is happy", then "sentiment they can add a text
// (optional)". Team migration 0067 is the table, workers/content/src/lib/help-
// ratings.ts is the door and its three rulings; this is the only place a person
// is ever asked.
//
// ── QUIET, AND ONLY WHEN THE QUESTION MAKES SENSE ───────────────────────────
//
// It draws NOTHING until the ticket is `resolved`. That is not this component
// being tactful — the door refuses a rating on anything else, in words, because
// "how did we do" is a question in the past tense about work that is finished
// and asking it mid-flight measures impatience into the same column. The screen
// simply agrees with the door rather than being the place the rule lives.
//
// AND IT NEVER NAGS. A score with no words is a complete rating: the words are
// an EXTRA the owner added in a second message, so the comment box appears after
// a face is chosen, is empty, is labelled optional, and nothing anywhere refuses
// or re-asks on its absence. Once somebody has answered, the card thanks them
// and stops asking — their own answer stays on screen, and pressing a different
// face writes a NEW row rather than editing the old one, which is the whole
// shape of 0067: a later change of mind must not overwrite the record of how we
// did at the time.
//
// ── IT SHOWS THEM THEIR OWN ANSWER AND NOBODY ELSE'S ────────────────────────
//
// The door's read is narrowed to this caller's own rows, in the statement. A
// colleague's private "1 out of 3" is a personal statement rather than a fact
// about the ticket the way a reply is, so there is nothing here that could draw
// one even by accident — the redaction is not a decision this screen makes.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Card } from "@shared/ui/components/card/card"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { toast } from "@shared/ui/components/sonner/sonner"
import { PaperPlaneTilt, Smiley, SmileyMeh, SmileySad } from "@shared/ui/foundations/icons"

import type { TicketRating } from "@shared/types"
import { reportError } from "@shared/web/log"
import { primeCache, useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { ApiFailure, support } from "@/lib/api"
import { cacheKeys } from "@/lib/live-resources"

/** THE THREE POINTS OF THE SCALE, in the order a person reads them: worst on the
 * left, best on the right, which is the direction every scale in this product
 * already runs. The glyphs come from the kit and nowhere else (R39), under
 * Phosphor's own names. */
const FACES = [
  { score: 1 as const, Icon: SmileySad },
  { score: 2 as const, Icon: SmileyMeh },
  { score: 3 as const, Icon: Smiley },
]

export function TicketRating({ ticketId, resolved }: { ticketId: string; resolved: boolean }) {
  const { t } = useLanguage()
  // THE HOOKS SIT ABOVE THE EARLY RETURN, deliberately — the same rule
  // ticket-screen.tsx states about its own: a hook under a conditional return
  // changes the hook count the first day that return fires, and this one fires
  // the instant the agency answers the ticket while somebody is looking at it.
  const ratingQ = useCached<{ ratings: TicketRating[]; mine: TicketRating | null }>(
    cacheKeys.rating(ticketId),
    () => support.rating(ticketId)
  )
  const [picked, setPicked] = React.useState<1 | 2 | 3 | null>(null)
  const [words, setWords] = React.useState("")
  const [sending, setSending] = React.useState(false)

  const mine = ratingQ.data?.mine ?? null

  async function say(score: 1 | 2 | 3, comment: string) {
    if (sending) return
    setSending(true)
    try {
      const r = await support.rate(ticketId, score, comment.trim() || undefined)
      // Re-prime rather than invalidate: the answer they just gave IS the
      // standing one, and this person should not watch their own card reload.
      primeCache(cacheKeys.rating(ticketId), {
        ratings: [r.rating, ...(ratingQ.data?.ratings ?? [])],
        mine: r.rating,
      })
      setPicked(null)
      setWords("")
      toast.success(t("Thanks for telling us."))
    } catch (e) {
      reportError("portal-ticket.rate", e)
      toast.error(e instanceof ApiFailure ? e.message : t("Couldn't send that. Try again."))
    } finally {
      setSending(false)
    }
  }

  // Nothing at all until the request is answered, and nothing while the read is
  // in flight: an empty card that turns into a question is a flicker on a screen
  // somebody came to read a reply on.
  if (!resolved || ratingQ.data === undefined) return null

  return (
    <Card className="flex flex-col gap-3 p-4">
      <span className="text-caption text-muted-foreground">{t("How did we do?")}</span>
      <div className="flex flex-wrap items-center gap-2">
        {FACES.map(({ score, Icon }) => {
          const chosen = (picked ?? mine?.score) === score
          return (
            <Button
              key={score}
              type="button"
              size="sm"
              variant={chosen ? "default" : "secondary"}
              disabled={sending}
              // A score on its own is a complete rating (0067). Pressing a face
              // when there is nothing to add SENDS — the comment box below is
              // for the person who wants one, never a step on the way.
              onClick={() => (picked === score ? void say(score, words) : setPicked(score))}
            >
              <Icon className="size-3.5" />
              {score === 1 ? t("Not great") : score === 2 ? t("Fine") : t("Great")}
            </Button>
          )
        })}
      </div>

      {picked === null ? (
        mine ? (
          // Their standing answer, and its words if they wrote any. No edit
          // control: pressing a different face above writes a new row, which is
          // the honest way to change your mind about something that already
          // happened.
          <p className="text-muted-foreground text-caption">
            {mine.comment ? mine.comment : t("Thanks for telling us.")}
          </p>
        ) : null
      ) : (
        <div className="flex flex-col gap-2">
          <Textarea
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder={t("Anything you'd like to add? (optional)")}
            aria-label={t("Anything you'd like to add? (optional)")}
            rows={2}
            className="resize-none"
            disabled={sending}
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={sending} onClick={() => void say(picked, words)}>
              <PaperPlaneTilt className="size-3.5" />
              {sending ? t("Sending…") : t("Send")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
