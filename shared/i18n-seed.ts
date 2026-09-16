// THE SEED — the words a machine must not be allowed to choose.
//
// The catalogue beside this file is GENERATED: a script extracts every English
// string out of the two front doors and asks a model for the rest of the
// world's languages (`scripts/i18n-extract.mjs` → `scripts/i18n-translate.mjs`).
// This file is the exception, and it is hand-written on purpose.
//
// WHERE THE GERMAN CAME FROM. The vocabulary block below is not translated: it
// is LIFTED from the agency's own legacy data (`glide/data/agency.choices.json`
// and `agency.program.json`), where every ticket type, sprint type and delivery
// programme already carried the German the agency has been using with German
// clients for years. "Issue" is `Problem`, not `Ausgabe`. "Request" is
// `Anfrage`, not `Bitte`. No machine would have chosen those, and a translator
// starting from the English would have got them wrong — which is the argument
// for reading a client's own words back to them rather than inventing new ones.
//
// Spanish and Catalan are Aurora's languages and hers to correct. They are
// written here in the register the German set: plain, short, no formality
// escalation, sentence case, the same word for the same thing every time.
//
// THE SEED ALWAYS WINS, AND NOW IT WINS ON SCREEN. Two seams put it over the
// machine's output, per LANGUAGE rather than per string, so a regeneration can
// never quietly replace `Problem` with `Ausgabe`: the generator at build time,
// and `SPOKEN` in shared/i18n.ts at RUN time. The runtime half did not exist
// until 2026-08-19 — the app imported the generated catalogue and nothing else,
// so this file's own promise was true of a build and false of a screen, and the
// only way to spend a word into the app was to spend money on the model.
// It also never SPENDS on these: a string with a seed entry for a language is
// already done, so it is not sent to the model.
//
// HOW TO CORRECT A TRANSLATION. Here — never in the generated file. Put the
// English exactly as it appears on screen, including its full stop, then the
// languages you are sure of. That is the whole job: it is on screen at the next
// reload, with no generator run and nothing spent. Anything you leave out stays
// English until somebody writes it or the generator next fills it in.

import type { Catalogue } from "./i18n"

export const SEED: Catalogue = {
  /* ── The vocabulary ──────────────────────────────────────────────────────
   * The glossary's own words. These appear as headings, as nav labels, as the
   * subject of half the sentences below, so they are translated once here and
   * everything else stays consistent with them by using the same English. */
  Accounts: { de: "Kunden", es: "Cuentas", ca: "Comptes" },
  Account: { de: "Kunde", es: "Cuenta", ca: "Compte" },
  Contacts: { de: "Kontakte", es: "Contactos", ca: "Contactes" },
  Contact: { de: "Kontakt", es: "Contacto", ca: "Contacte" },
  Tickets: { de: "Tickets", es: "Tickets", ca: "Tickets" },
  Ticket: { de: "Ticket", es: "Ticket", ca: "Ticket" },
  Stories: { de: "Aufgaben", es: "Historias", ca: "Històries" },
  Story: { de: "Aufgabe", es: "Historia", ca: "Història" },
  Sprints: { de: "Sprints", es: "Sprints", ca: "Sprints" },
  Sprint: { de: "Sprint", es: "Sprint", ca: "Sprint" },
  Tasks: { de: "To-dos", es: "Tareas", ca: "Tasques" },
  Task: { de: "To-do", es: "Tarea", ca: "Tasca" },
  Apps: { de: "Apps", es: "Apps", ca: "Apps" },
  App: { de: "App", es: "App", ca: "App" },
  Processes: { de: "Prozesse", es: "Procesos", ca: "Processos" },
  Process: { de: "Prozess", es: "Proceso", ca: "Procés" },
  Meetings: { de: "Termine", es: "Reuniones", ca: "Reunions" },
  Meeting: { de: "Termin", es: "Reunión", ca: "Reunió" },
  "Work logs": { de: "Zeiterfassung", es: "Registros de tiempo", ca: "Registres de temps" },
  "Knowledge base": {
    de: "Wissensdatenbank",
    es: "Base de conocimiento",
    ca: "Base de coneixement",
  },
  Settings: { de: "Einstellungen", es: "Ajustes", ca: "Configuració" },
  Home: { de: "Start", es: "Inicio", ca: "Inici" },
  Members: { de: "Mitglieder", es: "Miembros", ca: "Membres" },
  Deadline: { de: "Frist", es: "Fecha límite", ca: "Data límit" },
  Department: { de: "Abteilung", es: "Departamento", ca: "Departament" },
  Overview: { de: "Übersicht", es: "Resumen", ca: "Resum" },
  Activity: { de: "Verlauf", es: "Actividad", ca: "Activitat" },

  /* ── Ticket types ─── the German here is the agency's own, from Glide. ──── */

  /* ── Sprint types and delivery programmes ─── also lifted, not translated. ─ */

  /* ── Story types ─────────────────────────────────────────────────────────── */
  Change: { de: "Änderung", es: "Cambio", ca: "Canvi" },

  /* ── Departments ─────────────────────────────────────────────────────────── */

  /* ── Statuses ────────────────────────────────────────────────────────────── */
  Open: { de: "Offen", es: "Abierto", ca: "Obert" },
  Triage: { de: "Sichtung", es: "Clasificación", ca: "Classificació" },
  Scheduled: { de: "Geplant", es: "Programado", ca: "Programat" },
  "In progress": { de: "In Arbeit", es: "En curso", ca: "En curs" },
  /* THE CONTACTS SCREEN'S SECOND TAB (client, 2026-09-09: "also tabs here: All,
   * In portal") — the contacts who can sign in to the client portal. Filed
   * beside the statuses because that is what it is: a state a contact is in,
   * not a place. "Portal" is the glossary's own word and stays untranslated
   * inside the phrase in all three, the way "Sprint" and "Ticket" do above —
   * the agency says "das Portal" to its German clients. */
  "In portal": { de: "Im Portal", es: "En el portal", ca: "Al portal" },
  /* THE CONTACTS TABLE'S FOURTH COLUMN (client, 16 Sep 2026: "add a column to
   * show if they are in the portal or not") — its header word and its own
   * badge's two states. Same loanword treatment as "In portal" two lines up:
   * "Portal" stays "Portal" in all three. */
  Portal: { de: "Portal", es: "Portal", ca: "Portal" },
  "No portal": { de: "Kein Portal", es: "Sin portal", ca: "Sense portal" },
  Ready: { de: "Fertig", es: "Listo", ca: "Llest" },
  Resolved: { de: "Erledigt", es: "Resuelto", ca: "Resolt" },
  Done: { de: "Erledigt", es: "Hecho", ca: "Fet" },
  Active: { de: "Aktiv", es: "Activo", ca: "Actiu" },
  Archived: { de: "Archiviert", es: "Archivado", ca: "Arxivat" },

  /* ── The verbs on buttons ────────────────────────────────────────────────── */
  Submit: { de: "Absenden", es: "Enviar", ca: "Enviar" },
  Save: { de: "Speichern", es: "Guardar", ca: "Desar" },
  Cancel: { de: "Abbrechen", es: "Cancelar", ca: "Cancel·lar" },
  Edit: { de: "Bearbeiten", es: "Editar", ca: "Editar" },
  Delete: { de: "Löschen", es: "Eliminar", ca: "Eliminar" },
  Search: { de: "Suchen", es: "Buscar", ca: "Cercar" },
  Filter: { de: "Filtern", es: "Filtrar", ca: "Filtrar" },
  Close: { de: "Schließen", es: "Cerrar", ca: "Tancar" },
  /* THE WORKSPACE TAB SET'S OWN CLOSE VERB (2026-09-06, kit v1.2.59's
   * `BreadcrumbFoldersProps.closeLabel`). Not just "Close": the kit joins this
   * with the crumb's own label to announce WHICH tab a button shuts ("Close
   * tab: Halloway"), so the verb itself has to say "tab" rather than leave the
   * join to carry that word alone — see `app-shell.tsx`'s `closeLabel` prop. */
  "Close tab": { de: "Tab schließen", es: "Cerrar pestaña", ca: "Tancar pestanya" },
  /* THE STRIP'S OWN CLOSE-ALL VERB (2026-09-16, kit v1.2.92's own
   * `BreadcrumbFoldersProps.closeAllLabel`). Announced whole, with no crumb
   * to join against — it closes every tab but the one she is on, not one
   * named tab — so it needs no second half the way `"Close tab"` does. */
  "Close all tabs": { de: "Alle Tabs schließen", es: "Cerrar todas las pestañas", ca: "Tancar totes les pestanyes" },
  Back: { de: "Zurück", es: "Atrás", ca: "Enrere" },
  "Start timer": {
    de: "Zeit starten",
    es: "Iniciar temporizador",
    ca: "Iniciar temporitzador",
  },
  "Stop timer": { de: "Zeit stoppen", es: "Detener temporizador", ca: "Aturar temporitzador" },
  /* The portal's sign-in heading, which is now the whole sentence rather than
   * "Sign in to" + the brand name — the lockup above it says whose door this
   * is, so the heading only has to say what the screen is for. Written here
   * rather than left for the generator: all three are the second half of the
   * generated "Sign in to" (`Anmelden bei` / `Iniciar sesión en` /
   * `Iniciar sessió a`) with the preposition dropped, and they match the
   * "Sign out" already in the catalogue (`Abmelden` / `Cerrar sesión` /
   * `Tancar sessió`) verb for verb. Nothing was spent to know that. */
  "Sign in": { de: "Anmelden", es: "Iniciar sesión", ca: "Iniciar sessió" },

  /* ── The language switcher itself ────────────────────────────────────────── */
  Language: { de: "Sprache", es: "Idioma", ca: "Idioma" },
  "Language changed.": { de: "Sprache geändert.", es: "Idioma cambiado.", ca: "Idioma canviat." },

  /* ── Settings › Appearance's own live preview caption, added 2026-09-14 —
   * the artifact's own sentence (`appearance-layouts.html`, option 3), kept
   * neutral in every language rather than switching to direct address, the
   * same register "That didn't save. Try again." already keeps below. */
  "Live preview — updates as you press a control": {
    de: "Live-Vorschau — aktualisiert sich mit jeder Auswahl.",
    es: "Vista previa en directo — se actualiza con cada selección.",
    ca: "Previsualització en directe — s'actualitza amb cada selecció.",
  },

  /* ── Settings › Appearance's Save bar, added 2026-09-14 alongside the panel
   * itself — the debt R44 let in on the same day (`TRANSLATION_CEILING`'s own
   * "RAISED 41 -> 43" note) paid back here rather than left for the next
   * translation pass. "Discard" reads as Save's natural partner in each
   * language — the same infinitive-as-label register Save and Cancel already
   * use (`Speichern`/`Abbrechen`, `Guardar`/`Cancelar`, `Desar`/`Cancel·lar`)
   * — and shares its root with "Discarded" already in the catalogue
   * (`Verworfen`/`Descartado`/`Descartat`). The caption stays in the neutral,
   * third-person register the Live preview caption above already set rather
   * than switching to direct address, and reuses the section headers exactly
   * as this same panel and its toasts already translate them (Language/Size/
   * Appearance/Background → Sprache·Größe·Darstellung·Hintergrund,
   * Idioma·Tamaño·Apariencia·Fondo, Idioma·Mida·Aparença·Fons; Save →
   * Speichern/Guardar/Desar). */
  Discard: { de: "Verwerfen", es: "Descartar", ca: "Descartar" },

  /* ── The pinned unsaved-changes bar's own flag sentence, added 2026-09-14
   * alongside `UnsavedChangesBar` (kit v1.2.82) — the same register the
   * neighbouring entries in this block already keep: German stays formal
   * (Sie), Spanish and Catalan stay informal (tú/tens), matching "No invites
   * waiting for you." two hundred lines below (tienes/tens). Hand-translated
   * here rather than left for `TRANSLATION_CEILING` to absorb — the house
   * rule for a new string landing the same day as its own ceiling check. */
  "You have unsaved changes": {
    de: "Sie haben ungespeicherte Änderungen.",
    es: "Tienes cambios sin guardar.",
    ca: "Tens canvis sense desar.",
  },
  "Language changes right away. Size, appearance and background wait for Save.": {
    de: "Die Sprache ändert sich sofort. Größe, Darstellung und Hintergrund warten auf Speichern.",
    es: "El idioma cambia de inmediato. Tamaño, apariencia y fondo esperan a guardar.",
    ca: "L'idioma canvia de seguida. Mida, aparença i fons esperen a desar.",
  },

  /* ── The one unsaved-changes confirm, added 2026-09-14 beside
   * `settings-screen.tsx`'s `handleTabChange` (a dirty Appearance or Team ›
   * Roles draft, thrown away in silence by a tab switch) and widened
   * 2026-09-15 to `web/lib/nav.ts`'s `guardNavigate` and
   * `use-host-nav.ts`'s Back handling — the SAME kit `AlertDialog` (R59) now
   * raised by leaving Settings altogether (a nav-rail press, a record link,
   * closing the Settings tab, the browser's own Back), not only by switching
   * tabs inside it — see `unsaved-changes-dialog.tsx`. The question follows
   * the same "infinitive/¿…?/Vols…?" shape "Switch off this module?" and
   * "Deactivate this profile?" already use a few hundred lines below, and
   * "Discard" here shares its German/Spanish/Catalan root with the bar's own
   * `Discard` entry above rather than inventing a second word for the same
   * act. */
  "Discard your unsaved changes?": {
    de: "Ungespeicherte Änderungen verwerfen?",
    es: "¿Descartar los cambios sin guardar?",
    ca: "Vols descartar els canvis sense desar?",
  },
  "Leaving throws away what you changed here.": {
    de: "Beim Verlassen gehen deine Änderungen hier verloren.",
    es: "Si sales, perderás los cambios que hiciste aquí.",
    ca: "Si surts, perdràs els canvis que has fet aquí.",
  },
  "Keep editing": {
    de: "Weiter bearbeiten",
    es: "Seguir editando",
    ca: "Continuar editant",
  },
  "Discard changes": {
    de: "Änderungen verwerfen",
    es: "Descartar cambios",
    ca: "Descartar canvis",
  },

  "That didn't save. Try again.": {
    de: "Das wurde nicht gespeichert. Bitte erneut versuchen.",
    es: "No se ha guardado. Inténtalo de nuevo.",
    ca: "No s'ha desat. Torna-ho a provar.",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },

  /* ── Carried across by hand ───────────────────────────────────────────────
   * Everything ABOVE is the agency's own vocabulary, READ OUT of their legacy
   * data — words somebody is already sure of. Everything BELOW was translated
   * here, by hand, string by string, because the generator that would otherwise
   * have done it spends the owner's own model key. Same care, different
   * provenance, and somebody correcting the Spanish should know which of the two
   * they are looking at: above, correcting a word means the agency changed its
   * mind; below, it means a translation was wrong.
   *
   * These are all twenty-eight languages rather than the vocabulary's three,
   * because there is no machine pass behind them to fill the rest in. */

  /* The strings the people→contact/member split renamed (R6, glossary). The
   * distinction has to survive translation: a `contact` is a person at a client,
   * a `member` is one of ours, and a language given one word for both would put
   * a client's name in a staff picker. Each is translated to the word its own
   * screen means, anchored on Contacts and Members above. */
  "Members on it": {
    de: "Beteiligte Mitglieder",
    es: "Miembros implicados",
    ca: "Membres implicats",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "No contacts found.": {
    de: "Keine Kontakte gefunden.",
    es: "No se encontraron contactos.",
    ca: "No s'ha trobat cap contacte.",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Only the members on one app": {
    de: "Nur die Mitglieder in einer App",
    es: "Solo los miembros en una aplicación",
    ca: "Només els membres d'una aplicació",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Search contacts…": {
    de: "Kontakte durchsuchen…",
    es: "Buscar contactos…",
    ca: "Cercar contactes…",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Search members…": {
    de: "Mitglieder durchsuchen…",
    es: "Buscar miembros…",
    ca: "Cercar membres…",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "The companies and contacts we work with": {
    de: "Die Unternehmen und Kontakte, mit denen wir zusammenarbeiten",
    es: "Las empresas y contactos con los que trabajamos",
    ca: "Les empreses i contactes amb els quals treballem",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Their contacts": {
    de: "Ihre Kontakte",
    es: "Sus contactos",
    ca: "Els seus contactes",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Which app's members": {
    de: "Welche Mitglieder der App",
    es: "Los miembros de qué app",
    ca: "De quina aplicació són els membres",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Who we are: our material, our team, and the details that go on a contract.": {
    de: "Wer wir sind: unser Material, unser Team und die Details, die in einen Vertrag gehören.",
    es: "Quiénes somos: nuestro material, nuestro equipo y los detalles que van en un contrato.",
    ca: "Qui som: el nostre material, el nostre equip i els detalls que van en un contracte.",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Keep in the loop": { de: "Auf dem Laufenden halten", es: "Mantener informado", ca: "Mantenir al corrent" },
  "You can add members, but no one is ever removed.": {
    de: "Du kannst Mitglieder hinzufügen, aber niemand wird je entfernt.",
    es: "Puedes añadir miembros, pero nadie se elimina nunca.",
    ca: "Pots afegir membres, però ningú no es retira mai.",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },

  /* The audit line under every record detail. MOVED here unchanged from the
   * generated catalogue, where commit 5125f94 hand-wrote it: correct work, in
   * the one file whose header says it is overwritten. `{name}` and `{when}` are
   * holes, and several of these languages need them in the other order — which
   * is why the sentence is one entry rather than three fragments. */
  "Created by {name}": {
    de: "Erstellt von {name}",
    es: "Creado por {name}",
    ca: "Creat per {name}",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Created {when}": {
    de: "Erstellt {when}",
    es: "Creado {when}",
    ca: "Creat {when}",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Last edited by {name}": {
    de: "Zuletzt bearbeitet von {name}",
    es: "Última edición por {name}",
    ca: "Última edició per {name}",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "Last edited {when}": {
    de: "Zuletzt bearbeitet {when}",
    es: "Última edición {when}",
    ca: "Última edició {when}",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },

  /* The accounts strip, grouped by company. */
  "A company you work with. Everyone there goes on its Contacts tab.": {
    de: "Ein Unternehmen, mit dem Sie zusammenarbeiten. Alle dort stehen im Tab Kontakte.",
    es: "Una empresa con la que trabajas. Todos los de allí van en su pestaña Contactos.",
    ca: "Una empresa amb qui treballes. Tothom d'allà va a la seva pestanya Contactes.",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "No company yet": {
    de: "Noch kein Unternehmen",
    es: "Sin empresa aún",
    ca: "Encara sense empresa",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  /* ── The relative time, and the counts beside it ───────────────────────────
   * `formatRelative` lives in shared/web/format.ts and returned four ENGLISH
   * strings to nine call sites across both front doors, because the extractor
   * was six hand-written folders and that was not one of them (R28, and the
   * walk is the front doors' own import closure now). So a German reader was
   * told *Erstellt von Aurora · 5d ago* on every record in the app.
   *
   * TERSE ON PURPOSE. Seven of the nine sites are tight — table cells with
   * `tabular-nums`, attachment meta lines, message-bubble timestamps — so each
   * language abbreviates as far as it naturally does and no further.
   *
   * ONE HOLE, NOT THREE FRAGMENTS. German puts the preposition in front (*vor 5
   * Min.*) and Japanese puts everything behind the number (*5分前*); neither is
   * reachable by gluing a number to a unit to a word, which is also why the two
   * count phrases below are whole sentences rather than a `t("of")` in the
   * middle of two numbers.
   *
   * ONE IMPERFECTION, STATED. `fill` has no plurals by design ("a translator
   * gets a sentence with holes in it"), so "vor {count} Tagen" is wrong for
   * exactly n=1 in the languages that inflect. The English key sidesteps it by
   * abbreviating; German reads far better in full six days out of seven, and a
   * plural engine is a change to shared/i18n.ts, not to a word. */
  "just now": {
    de: "gerade eben",
    es: "ahora mismo",
    ca: "ara mateix",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "{count}m ago": {
    de: "vor {count} Min.",
    es: "hace {count} min",
    ca: "fa {count} min",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "{count}h ago": {
    de: "vor {count} Std.",
    es: "hace {count} h",
    ca: "fa {count} h",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "{count}d ago": {
    de: "vor {count} Tagen",
    es: "hace {count} d",
    ca: "fa {count} d",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "{done} of {total} done": {
    de: "{done} von {total} erledigt",
    es: "{done} de {total} hechos",
    ca: "{done} de {total} fets",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  "{done} / {due} done": {
    de: "{done} / {due} erledigt",
    es: "{done} / {due} hechos",
    ca: "{done} / {due} fets",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  /* ── The two seams both front doors render, out of shared/web/ ─────────────
   * The size section and the size steps themselves (shared/scale.ts). Already
   * wrapped in `t(...)` at the call site, in no catalogue for a year, and only
   * the language screen ever looked translated — because the three lines above
   * it in this file happened to have been written by hand. */
  Compact: {
    de: "Kompakt",
    es: "Compacto",
    ca: "Compacte",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  Large: {
    de: "Groß",
    es: "Grande",
    ca: "Gran",
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  },
  /* ── Carried across by hand, the overnight round ─────────────────────────
   * Sentences the app said with no translation at all, so every reader saw
   * English. Written here rather than in the generated catalogue because the
   * seed is the layer that survives a regeneration and wins at runtime. */
  "+{n} more": { de: "+{n} weitere", es: "+{n} más", ca: "+{n} més"},
  "1 step takes longer than it used to and has no explanation yet.": { de: "1 Schritt dauert länger als früher und hat noch keine Erklärung.", es: "1 paso tarda más que antes y aún no tiene explicación.", ca: "1 pas triga més que abans i encara no té explicació."},
  "A block of delivery work for one account, with a start, an end and a price.": { de: "Ein Block an Lieferarbeit für einen Kunden, mit Beginn, Ende und Preis.", es: "Un bloque de trabajo de entrega para una cuenta, con un inicio, un final y un precio.", ca: "Un bloc de treball d'entrega per a un compte, amb un inici, un final i un preu."},
  "A new version of the app is ready.": { de: "Eine neue Version der App ist bereit.", es: "Hay una nueva versión de la app lista.", ca: "Hi ha una nova versió de l'app a punt."},
  "A system we built for somebody. Processes live inside one.": { de: "Ein System, das wir für jemanden gebaut haben. Prozesse leben darin.", es: "Un sistema que construimos para alguien. Los procesos viven dentro de uno.", ca: "Un sistema que hem construït per a algú. Els processos viuen a dins."},
  "A way of working inside one of your apps. You'll add its steps next.": { de: "Eine Arbeitsweise innerhalb einer Ihrer Apps. Die Schritte fügen Sie als Nächstes hinzu.", es: "Una forma de trabajar dentro de una de tus apps. A continuación añadirás sus pasos.", ca: "Una manera de treballar dins d'una de les teves apps. Tot seguit hi afegiràs els passos."},
  "Accept": { de: "Annehmen", es: "Aceptar", ca: "Acceptar"},
  "Access rights saved.": { de: "Zugriffsrechte gespeichert.", es: "Permisos de acceso guardados.", ca: "Drets d'accés desats."},
  "Access taken away": { de: "Zugriff entzogen", es: "Acceso retirado", ca: "Accés retirat"},
  "Add a deliverable": { de: "Ergebnis hinzufügen", es: "Añadir un entregable", ca: "Afegir un lliurable"},
  "Add a step": { de: "Schritt hinzufügen", es: "Añadir un paso", ca: "Afegir un pas"},
  "Add an account": { de: "Kunde hinzufügen", es: "Añadir una cuenta", ca: "Afegir un compte"},
  "Add to the knowledge base": { de: "Zur Wissensdatenbank hinzufügen", es: "Añadir a la base de conocimiento", ca: "Afegir a la base de coneixement"},
  "Already answered.": { de: "Bereits beantwortet.", es: "Ya respondido.", ca: "Ja respost."},
  "Answered, and they've been told.": { de: "Beantwortet, und sie wurden informiert.", es: "Respondido, y se les ha avisado.", ca: "Respost, i se'ls ha avisat."},
  "Anything you put here is something the assistant may use to answer questions, and it will name this source when it does.": { de: "Alles, was Sie hier ablegen, darf der Assistent zum Beantworten von Fragen verwenden, und er nennt dabei diese Quelle.", es: "Todo lo que pongas aquí lo puede usar el asistente para responder preguntas, y nombrará esta fuente cuando lo haga.", ca: "Tot el que hi posis ho pot fer servir l'assistent per respondre preguntes, i anomenarà aquesta font quan ho faci."},
  "App archived.": { de: "App archiviert.", es: "App archivada.", ca: "App arxivada."},
  "App restored.": { de: "App wiederhergestellt.", es: "App restaurada.", ca: "App restaurada."},
  "Archived.": { de: "Archiviert.", es: "Archivado.", ca: "Arxivat."},
  "Arrange a meeting": { de: "Termin vereinbaren", es: "Concertar una reunión", ca: "Concertar una reunió"},
  "Ask": { de: "Fragen", es: "Preguntar", ca: "Preguntar"},
  "Asset": { de: "Markenasset", es: "Activo de marca", ca: "Recurs de marca"},
  "Auto-matched": { de: "Automatisch zugeordnet", es: "Emparejado automáticamente", ca: "Emparellat automàticament"},
  "Back in Meetings.": { de: "Wieder in den Terminen.", es: "De vuelta en Reuniones.", ca: "Un altre cop a Reunions."},
  "Binned, nothing was counted.": { de: "Verworfen, es wurde nichts gezählt.", es: "Descartado, no se contó nada.", ca: "Descartat, no s'ha comptat res."},
  "Can't show this one": { de: "Kann das hier nicht anzeigen", es: "No se puede mostrar este", ca: "No es pot mostrar aquest"},
  "Cancelled, the record and its notes are kept.": { de: "Abgesagt, der Datensatz und seine Notizen bleiben erhalten.", es: "Cancelado, se conservan el registro y sus notas.", ca: "Cancel·lat, es conserven el registre i les seves notes."},
  "Change what it says, who has it, or what it touches.": { de: "Ändern Sie, was darin steht, wer sie hat und worauf sie zugreift.", es: "Cambia lo que dice, quién lo tiene y a qué llega.", ca: "Canvia el que diu, qui el té i a què arriba."},
  "Change what it's called, or where it has got to.": { de: "Ändern Sie, wie es heißt oder wie weit es ist.", es: "Cambia cómo se llama o en qué punto está.", ca: "Canvia com es diu o en quin punt està."},
  "Choose a company": { de: "Unternehmen wählen", es: "Elige una empresa", ca: "Tria una empresa"},
  "Choose a person": { de: "Person wählen", es: "Elige una persona", ca: "Tria una persona"},
  "Clear": { de: "Zurücksetzen", es: "Borrar", ca: "Esborrar"},
  "Collapse": { de: "Einklappen", es: "Contraer", ca: "Redueix"},
  "Contact moved.": { de: "Kontakt verschoben.", es: "Contacto movido.", ca: "Contacte mogut."},
  "Continue": { de: "Weiter", es: "Continuar", ca: "Continuar"},
  "Correct this source": { de: "Diese Quelle korrigieren", es: "Corregir esta fuente", ca: "Corregeix aquesta font"},
  "Correct this time": { de: "Diese Zeit korrigieren", es: "Corregir este tiempo", ca: "Corregeix aquest temps"},
  "Correct what it is, when it was, or where it lives.": { de: "Korrigieren Sie, was es ist, wann es war oder wo es liegt.", es: "Corrige qué es, cuándo fue o dónde está.", ca: "Corregeix què és, quan va ser o on és."},
  "Couldn't add it to the knowledge base.": { de: "Es konnte nicht zur Wissensdatenbank hinzugefügt werden.", es: "No se pudo añadir a la base de conocimiento.", ca: "No s'ha pogut afegir a la base de coneixement."},
  "Couldn't add that contact.": { de: "Der Kontakt konnte nicht hinzugefügt werden.", es: "No se pudo añadir ese contacto.", ca: "No s'ha pogut afegir aquest contacte."},
  "Couldn't add that file.": { de: "Die Datei konnte nicht hinzugefügt werden.", es: "No se pudo añadir ese archivo.", ca: "No s'ha pogut afegir aquest fitxer."},
  "Couldn't add that task.": { de: "Das To-do konnte nicht hinzugefügt werden.", es: "No se pudo añadir esa tarea.", ca: "No s'ha pogut afegir aquesta tasca."},
  "Couldn't add that value.": { de: "Der Wert konnte nicht hinzugefügt werden.", es: "No se pudo añadir ese valor.", ca: "No s'ha pogut afegir aquest valor."},
  "Couldn't add them to the ticket.": { de: "Sie konnten dem Ticket nicht hinzugefügt werden.", es: "No se pudo añadirles al ticket.", ca: "No s'ha pogut afegir-los al ticket."},
  "Couldn't arrange that.": { de: "Das konnte nicht vereinbart werden.", es: "No se pudo concertar eso.", ca: "No s'ha pogut concertar."},
  "Couldn't ask for that.": { de: "Danach konnte nicht gefragt werden.", es: "No se pudo pedir eso.", ca: "No s'ha pogut demanar."},
  "Couldn't change that sprint.": { de: "Der Sprint konnte nicht geändert werden.", es: "No se pudo cambiar ese sprint.", ca: "No s'ha pogut canviar aquest sprint."},
  "Couldn't change that task.": { de: "Das To-do konnte nicht geändert werden.", es: "No se pudo cambiar esa tarea.", ca: "No s'ha pogut canviar aquesta tasca."},
  "Couldn't change that.": { de: "Das konnte nicht geändert werden.", es: "No se pudo cambiar eso.", ca: "No s'ha pogut canviar."},
  "Couldn't change the role.": { de: "Die Rolle konnte nicht geändert werden.", es: "No se pudo cambiar el rol.", ca: "No s'ha pogut canviar el rol."},
  "Couldn't create the team.": { de: "Das Team konnte nicht erstellt werden.", es: "No se pudo crear el equipo.", ca: "No s'ha pogut crear l'equip."},
  "Couldn't create the token.": { de: "Das Token konnte nicht erstellt werden.", es: "No se pudo crear el token.", ca: "No s'ha pogut crear el token."},
  "Couldn't disconnect that.": { de: "Die Verbindung konnte nicht getrennt werden.", es: "No se pudo desconectar eso.", ca: "No s'ha pogut desconnectar."},
  "Couldn't do that.": { de: "Das konnte nicht ausgeführt werden.", es: "No se pudo hacer eso.", ca: "No s'ha pogut fer."},
  "Couldn't finish that connection.": { de: "Die Verbindung konnte nicht abgeschlossen werden.", es: "No se pudo completar esa conexión.", ca: "No s'ha pogut completar aquesta connexió."},
  "Couldn't load the deliverables.": { de: "Die Ergebnisse konnten nicht geladen werden.", es: "No se pudieron cargar los entregables.", ca: "No s'han pogut carregar els lliurables."},
  "Couldn't load the time.": { de: "Die Zeiterfassung konnte nicht geladen werden.", es: "No se pudieron cargar los registros de tiempo.", ca: "No s'han pogut carregar els registres de temps."},
  "Couldn't log that time.": { de: "Die Zeit konnte nicht erfasst werden.", es: "No se pudo registrar ese tiempo.", ca: "No s'ha pogut registrar aquest temps."},
  "Couldn't mark that done.": { de: "Das konnte nicht als erledigt markiert werden.", es: "No se pudo marcar eso como hecho.", ca: "No s'ha pogut marcar com a fet."},
  "Couldn't move the contact.": { de: "Der Kontakt konnte nicht verschoben werden.", es: "No se pudo mover el contacto.", ca: "No s'ha pogut moure el contacte."},
  "Couldn't plan the import.": { de: "Der Import konnte nicht geplant werden.", es: "No se pudo planificar la importación.", ca: "No s'ha pogut planificar la importació."},
  "Couldn't post your reply.": { de: "Ihre Antwort konnte nicht gesendet werden.", es: "No se pudo publicar tu respuesta.", ca: "No s'ha pogut publicar la teva resposta."},
  "Couldn't raise the ticket.": { de: "Das Ticket konnte nicht erstellt werden.", es: "No se pudo crear el ticket.", ca: "No s'ha pogut crear el ticket."},
  "Couldn't read the transcript.": { de: "Das Transkript konnte nicht gelesen werden.", es: "No se pudo leer la transcripción.", ca: "No s'ha pogut llegir la transcripció."},
  "Couldn't read your Google material just now.": { de: "Ihre Google-Materialien konnten gerade nicht gelesen werden.", es: "No se pudo leer tu material de Google en este momento.", ca: "Ara mateix no s'ha pogut llegir el teu material de Google."},
  "Couldn't record that.": { de: "Das konnte nicht erfasst werden.", es: "No se pudo registrar eso.", ca: "No s'ha pogut registrar."},
  "Couldn't revoke the token.": { de: "Das Token konnte nicht widerrufen werden.", es: "No se pudo revocar el token.", ca: "No s'ha pogut revocar el token."},
  "Couldn't save access rights.": { de: "Die Zugriffsrechte konnten nicht gespeichert werden.", es: "No se pudieron guardar los permisos de acceso.", ca: "No s'han pogut desar els drets d'accés."},
  "Couldn't save that correction.": { de: "Die Korrektur konnte nicht gespeichert werden.", es: "No se pudo guardar esa corrección.", ca: "No s'ha pogut desar aquesta correcció."},
  "Couldn't save that.": { de: "Das konnte nicht gespeichert werden.", es: "No se pudo guardar eso.", ca: "No s'ha pogut desar."},
  "Couldn't save the account.": { de: "Der Kunde konnte nicht gespeichert werden.", es: "No se pudo guardar la cuenta.", ca: "No s'ha pogut desar el compte."},
  "Couldn't save the app.": { de: "Die App konnte nicht gespeichert werden.", es: "No se pudo guardar la app.", ca: "No s'ha pogut desar l'app."},
  "Couldn't save the meeting.": { de: "Der Termin konnte nicht gespeichert werden.", es: "No se pudo guardar la reunión.", ca: "No s'ha pogut desar la reunió."},
  "Couldn't save the notes.": { de: "Die Notizen konnten nicht gespeichert werden.", es: "No se pudieron guardar las notas.", ca: "No s'han pogut desar les notes."},
  "Couldn't save the profile.": { de: "Das Profil konnte nicht gespeichert werden.", es: "No se pudo guardar el perfil.", ca: "No s'ha pogut desar el perfil."},
  "Couldn't save the role.": { de: "Die Rolle konnte nicht gespeichert werden.", es: "No se pudo guardar el rol.", ca: "No s'ha pogut desar el rol."},
  "Couldn't save the source.": { de: "Die Quelle konnte nicht gespeichert werden.", es: "No se pudo guardar la fuente.", ca: "No s'ha pogut desar la font."},
  "Couldn't save the sprint.": { de: "Der Sprint konnte nicht gespeichert werden.", es: "No se pudo guardar el sprint.", ca: "No s'ha pogut desar el sprint."},
  "Couldn't save the step.": { de: "Der Schritt konnte nicht gespeichert werden.", es: "No se pudo guardar el paso.", ca: "No s'ha pogut desar el pas."},
  "Couldn't save the story.": { de: "Die Aufgabe konnte nicht gespeichert werden.", es: "No se pudo guardar la historia.", ca: "No s'ha pogut desar la història."},
  "Couldn't save the team.": { de: "Das Team konnte nicht gespeichert werden.", es: "No se pudo guardar el equipo.", ca: "No s'ha pogut desar l'equip."},
  "Couldn't save the ticket.": { de: "Das Ticket konnte nicht gespeichert werden.", es: "No se pudo guardar el ticket.", ca: "No s'ha pogut desar el ticket."},
  "Couldn't save those details.": { de: "Die Details konnten nicht gespeichert werden.", es: "No se pudieron guardar esos detalles.", ca: "No s'han pogut desar aquests detalls."},
  "Couldn't save your profile.": { de: "Ihr Profil konnte nicht gespeichert werden.", es: "No se pudo guardar tu perfil.", ca: "No s'ha pogut desar el teu perfil."},
  "Couldn't search just now. Try again.": { de: "Die Suche hat gerade nicht funktioniert. Bitte versuchen Sie es erneut.", es: "No se pudo buscar en este momento. Inténtalo de nuevo.", ca: "Ara mateix no s'ha pogut cercar. Torna-ho a provar."},
  "Couldn't send that for review.": { de: "Das konnte nicht zur Prüfung gesendet werden.", es: "No se pudo enviar eso a revisión.", ca: "No s'ha pogut enviar a revisió."},
  "Couldn't send that.": { de: "Das konnte nicht gesendet werden.", es: "No se pudo enviar eso.", ca: "No s'ha pogut enviar."},
  "Couldn't send the invite, please try again.": { de: "Die Einladung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.", es: "No se pudo enviar la invitación, inténtalo de nuevo.", ca: "No s'ha pogut enviar la invitació, torna-ho a provar."},
  "Couldn't set that.": { de: "Das konnte nicht gesetzt werden.", es: "No se pudo establecer eso.", ca: "No s'ha pogut establir."},
  "Couldn't start that timer.": { de: "Die Zeit konnte nicht gestartet werden.", es: "No se pudo iniciar ese temporizador.", ca: "No s'ha pogut iniciar aquest temporitzador."},
  "Couldn't start the sprint.": { de: "Der Sprint konnte nicht gestartet werden.", es: "No se pudo iniciar el sprint.", ca: "No s'ha pogut iniciar el sprint."},
  "Couldn't start the timer.": { de: "Die Zeit konnte nicht gestartet werden.", es: "No se pudo iniciar el temporizador.", ca: "No s'ha pogut iniciar el temporitzador."},
  "Couldn't stop sharing that.": { de: "Die Freigabe konnte nicht beendet werden.", es: "No se pudo dejar de compartir eso.", ca: "No s'ha pogut deixar de compartir."},
  "Couldn't stop that timer.": { de: "Die Zeit konnte nicht gestoppt werden.", es: "No se pudo detener ese temporizador.", ca: "No s'ha pogut aturar aquest temporitzador."},
  "Couldn't switch. Try again.": { de: "Der Wechsel hat nicht geklappt. Bitte versuchen Sie es erneut.", es: "No se pudo cambiar. Inténtalo de nuevo.", ca: "No s'ha pogut canviar. Torna-ho a provar."},
  "Couldn't translate that.": { de: "Das konnte nicht übersetzt werden.", es: "No se pudo traducir eso.", ca: "No s'ha pogut traduir."},
  "Couldn't update the profile.": { de: "Das Profil konnte nicht aktualisiert werden.", es: "No se pudo actualizar el perfil.", ca: "No s'ha pogut actualitzar el perfil."},
  "Couldn't update the role.": { de: "Die Rolle konnte nicht aktualisiert werden.", es: "No se pudo actualizar el rol.", ca: "No s'ha pogut actualitzar el rol."},
  "Couldn't update the source.": { de: "Die Quelle konnte nicht aktualisiert werden.", es: "No se pudo actualizar el origen.", ca: "No s'ha pogut actualitzar l'origen."},
  "Couldn't upload that file.": { de: "Die Datei konnte nicht hochgeladen werden.", es: "No se pudo subir ese archivo.", ca: "No s'ha pogut pujar aquest fitxer."},
  "Couldn't withdraw that.": { de: "Das konnte nicht zurückgezogen werden.", es: "No se pudo retirar eso.", ca: "No s'ha pogut retirar això."},
  "Couldn't write that draft.": { de: "Der Entwurf konnte nicht geschrieben werden.", es: "No se pudo escribir ese borrador.", ca: "No s'ha pogut escriure aquest esborrany."},
  "Create a role": { de: "Eine Rolle erstellen", es: "Crear un rol", ca: "Crear un rol"},
  "Creating your team…": { de: "Ihr Team wird erstellt…", es: "Creando tu equipo…", ca: "Creant el teu equip…"},
  "Creating…": { de: "Wird erstellt…", es: "Creando…", ca: "Creant…"},
  "Date": { de: "Datum", es: "Fecha", ca: "Data"},
  "Date of the material": { de: "Datum des Materials", es: "Fecha del material", ca: "Data del material"},
  "Deactivating…": { de: "Wird deaktiviert…", es: "Desactivando…", ca: "Desactivant…"},
  "Deliverable updated.": { de: "Ergebnis aktualisiert.", es: "Entregable actualizado.", ca: "Lliurable actualitzat."},
  "Demo walkthrough": { de: "Demo-Rundgang", es: "Recorrido de demostración", ca: "Recorregut de demostració"},
  "Describe the problem you're facing. Chat with others, or use this ticket as a forum to discuss solutions.": { de: "Beschreiben Sie das Problem, das Sie haben. Tauschen Sie sich mit anderen aus, oder nutzen Sie dieses Ticket als Forum, um Lösungen zu besprechen.", es: "Describe el problema que tienes. Habla con otras personas, o usa este ticket como foro para discutir soluciones.", ca: "Descriu el problema que tens. Parla amb altres persones, o fes servir aquest ticket com a fòrum per debatre solucions."},
  "Disconnected here. Remove {brand} in your Google account too.": { de: "Hier getrennt. Entfernen Sie {brand} auch in Ihrem Google-Konto.", es: "Desconectado aquí. Quita {brand} también en tu cuenta de Google.", ca: "Desconnectat aquí. Treu {brand} també del teu compte de Google."},
  "Disconnected.": { de: "Getrennt.", es: "Desconectado.", ca: "Desconnectat."},
  // THE PRIORITY LEVEL, level 4 — the Tasks table/board redesign, 2026-09-15.
  // Same word `PRIORITY_LABEL` (shared/departments.ts) has always named; now a
  // real catalogue position because `tasks-screen.tsx` reads it through a
  // literal `t("Do it now")` (see that file's own `priorityWord`) rather than
  // a dynamic lookup no catalogue entry could ever answer.
  "Do it now": { de: "Sofort erledigen", es: "Hazlo ya", ca: "Fes-ho ja"},
  "Edit app": { de: "App bearbeiten", es: "Editar app", ca: "Editar app"},
  "Edit process": { de: "Prozess bearbeiten", es: "Editar proceso", ca: "Editar procés"},
  "Edit step": { de: "Schritt bearbeiten", es: "Editar paso", ca: "Editar pas"},
  "Edit story": { de: "Aufgabe bearbeiten", es: "Editar historia", ca: "Editar història"},
  "Edit this account": { de: "Diesen Kunden bearbeiten", es: "Editar esta cuenta", ca: "Editar aquest compte"},
  "Edit this deliverable": { de: "Dieses Ergebnis bearbeiten", es: "Editar este entregable", ca: "Editar aquest lliurable"},
  "Edit this meeting": { de: "Diesen Termin bearbeiten", es: "Editar esta reunión", ca: "Editar aquesta reunió"},
  "Edit this role": { de: "Diese Rolle bearbeiten", es: "Editar este rol", ca: "Editar aquest rol"},
  "Edit this sprint": { de: "Diesen Sprint bearbeiten", es: "Editar este sprint", ca: "Editar aquest sprint"},
  "Edit this ticket": { de: "Dieses Ticket bearbeiten", es: "Editar este ticket", ca: "Editar aquest ticket"},
  "Entries": { de: "Einträge", es: "Entradas", ca: "Entrades"},
  "Every entry here is the same kind of work.": { de: "Jeder Eintrag hier ist dieselbe Art von Arbeit.", es: "Cada entrada aquí es el mismo tipo de trabajo.", ca: "Cada entrada d'aquí és el mateix tipus de feina."},
  "Every ticket a client raises shows here while it is being worked on.": { de: "Jedes Ticket, das ein Kunde stellt, wird hier angezeigt, während es bearbeitet wird.", es: "Cada ticket que un cliente plantea aparece aquí mientras se está trabajando en él.", ca: "Tot ticket que presenta un client es mostra aquí mentre s'hi està treballant."},
  "Expand": { de: "Ausklappen", es: "Expandir", ca: "Expandir"},
  "Filed.": { de: "Abgelegt.", es: "Registrado.", ca: "Registrat."},
  "Fix what was written down. The change is kept in the record's history, with your name on it.": { de: "Korrigieren Sie, was festgehalten wurde. Die Änderung bleibt im Verlauf des Datensatzes stehen, mit Ihrem Namen daran.", es: "Corrige lo que se anotó. El cambio queda en el historial del registro, con tu nombre.", ca: "Corregeix el que es va anotar. El canvi queda a l'historial del registre, amb el teu nom."},
  "For work already finished. Say when it started and when it stopped, we work out the rest.": { de: "Für Arbeit, die bereits erledigt ist. Sagen Sie, wann sie begann und wann sie endete, den Rest rechnen wir aus.", es: "Para trabajo ya terminado. Di cuándo empezó y cuándo terminó, del resto nos encargamos.", ca: "Per a feina ja acabada. Digues quan va començar i quan va acabar, la resta la calculem nosaltres."},
  "Hours by kind of work": { de: "Stunden nach Art der Arbeit", es: "Horas por tipo de trabajo", ca: "Hores per tipus de feina"},
  "Hours by person": { de: "Stunden nach Person", es: "Horas por persona", ca: "Hores per persona"},
  "Hours logged": { de: "Erfasste Stunden", es: "Horas registradas", ca: "Hores registrades"},
  "Important": { de: "Wichtig", es: "Importante", ca: "Important"},
  "In use": { de: "In Verwendung", es: "En uso", ca: "En ús"},
  "It no longer happens": { de: "Es passiert nicht mehr", es: "Ya no ocurre", ca: "Ja no passa"},
  "It starts with no access, you'll choose what it can do in the next step.": { de: "Sie beginnt ohne Zugriff, im nächsten Schritt wählen Sie, was sie darf.", es: "Empieza sin ningún acceso, en el siguiente paso elegirás lo que puede hacer.", ca: "Comença sense cap accés, al pas següent triaràs què pot fer."},
  "Joining…": { de: "Wird beigetreten…", es: "Uniéndote…", ca: "Unint-te…"},
  "Just you": { de: "Nur Sie", es: "Solo tú", ca: "Només tu"},
  "Leave blank to list your spaces": { de: "Leer lassen, um Ihre Spaces aufzulisten", es: "Déjalo en blanco para ver tus espacios", ca: "Deixa-ho en blanc per veure els teus espais"},
  "Leave this blank to use the file's own name": { de: "Leer lassen, um den Dateinamen zu übernehmen", es: "Déjalo en blanco para usar el nombre del propio archivo", ca: "Deixa-ho en blanc per fer servir el nom del propi fitxer"},
  "Link": { de: "Link", es: "Enlace", ca: "Enllaç"},
  "Link or file": { de: "Link oder Datei", es: "Enlace o archivo", ca: "Enllaç o fitxer"},
  "Look": { de: "Suchen", es: "Buscar", ca: "Cercar"},
  "Looking…": { de: "Wird gesucht…", es: "Buscando…", ca: "Cercant…"},
  "Marta Bergman": { de: "Marta Bergman", es: "Marta Bergman", ca: "Marta Bergman"},
  "Member": { de: "Mitglied", es: "Miembro", ca: "Membre"},
  "Most recent first": { de: "Neueste zuerst", es: "Más recientes primero", ca: "Els més recents primer"},
  "Most steps": { de: "Meiste Schritte", es: "Más pasos", ca: "Més passos"},
  "Never used yet": { de: "Noch nie verwendet", es: "Nunca usada aún", ca: "Encara mai utilitzada"},
  "New contact": { de: "Neuer Kontakt", es: "Nuevo contacto", ca: "Nou contacte"},
  "Newest first": { de: "Neueste zuerst", es: "Los más nuevos primero", ca: "Els més nous primer"},
  "Next month": { de: "Nächster Monat", es: "Mes siguiente", ca: "Mes següent"},
  "No account matched.": { de: "Kein Kunde gefunden.", es: "Ninguna cuenta coincide.", ca: "Cap compte coincideix."},
  "No app matched.": { de: "Keine App gefunden.", es: "Ninguna app coincide.", ca: "Cap app coincideix."},
  "No company matched.": { de: "Kein Unternehmen gefunden.", es: "Ninguna empresa coincide.", ca: "Cap empresa coincideix."},
  "No date": { de: "Kein Datum", es: "Sin fecha", ca: "Sense data"},
  "No date on it": { de: "Kein Datum daran", es: "No tiene fecha", ca: "No té data"},
  "No role matched.": { de: "Keine Rolle gefunden.", es: "Ningún rol coincide.", ca: "Cap rol coincideix."},
  "No sprints start this month.": { de: "In diesem Monat beginnt kein Sprint.", es: "Ningún sprint empieza este mes.", ca: "Aquest mes no comença cap sprint."},
  "No steps yet. Add the first one and say how long it takes and how often it happens, that is what a saving is measured from.": { de: "Noch keine Schritte. Fügen Sie den ersten hinzu und sagen Sie, wie lange er dauert und wie oft er vorkommt, daran wird die Ersparnis gemessen.", es: "Aún no hay pasos. Añade el primero y di cuánto tarda y cada cuánto ocurre, de ahí se mide el ahorro.", ca: "Encara no hi ha passos. Afegeix el primer i digues quant dura i cada quant passa, d'aquí es mesura l'estalvi."},
  "No ticket": { de: "Kein Ticket", es: "Sin ticket", ca: "Sense ticket"},
  "No ticket matched.": { de: "Kein Ticket gefunden.", es: "Ningún ticket coincide.", ca: "Cap ticket coincideix."},
  // SPLIT FROM "No values yet. Add your first above.", 2026-09-03 (R50) —
  // this screen's genuinely-empty state moved to `CollectionEmptyState`,
  // whose own button already says "Add the first" (translated once, as its
  // own catalogue entry), so this title carries only the first half now.
  "No values yet.": { de: "Noch keine Werte.", es: "Aún no hay valores.", ca: "Encara no hi ha valors."},
  "No work written down against this ticket yet.": { de: "Es wurde noch keine Arbeit für dieses Ticket festgehalten.", es: "Aún no hay trabajo anotado en este ticket.", ca: "Encara no hi ha feina anotada en aquest ticket."},
  "Nobody here matched.": { de: "Niemand hier passt dazu.", es: "Nadie coincide aquí.", ca: "Aquí no coincideix ningú."},
  "None of this time was logged in the last eight weeks.": { de: "Von dieser Zeit wurde in den letzten acht Wochen nichts erfasst.", es: "Nada de este tiempo se registró en las últimas ocho semanas.", ca: "Res d'aquest temps s'ha registrat en les últimes vuit setmanes."},
  "Nothing has been handed over on this app yet.": { de: "Zu dieser App wurde noch nichts übergeben.", es: "Todavía no se ha entregado nada en esta app.", ca: "Encara no s'ha lliurat res en aquesta app."},
  "Nothing in Meetings this month.": { de: "Diesen Monat keine Termine.", es: "Nada en Reuniones este mes.", ca: "Res a Reunions aquest mes."},
  "Nothing logged yet": { de: "Noch nichts erfasst", es: "Aún no se ha registrado nada", ca: "Encara no s'ha registrat res"},
  "Nothing matched.": { de: "Nichts gefunden.", es: "Nada coincide.", ca: "Res no coincideix."},
  "Nothing matched “{term}”.": { de: "Nichts passt zu „{term}“.", es: "Nada coincide con «{term}».", ca: "Res no coincideix amb «{term}»."},
  "Nothing new to bring in.": { de: "Es gibt nichts Neues zu importieren.", es: "No hay nada nuevo que importar.", ca: "No hi ha res nou per importar."},
  "Nothing to read yet.": { de: "Noch nichts zu lesen.", es: "Nada que leer todavía.", ca: "Encara no hi ha res per llegir."},
  "Nothing was deleted, this puts it back in front of the assistant.": { de: "Es wurde nichts gelöscht, damit steht es dem Assistenten wieder zur Verfügung.", es: "No se borró nada, esto vuelve a ponerlo delante del asistente.", ca: "No s'ha esborrat res, això el torna a posar davant de l'assistent."},
  "Older versions can be read but never edited, every saving is a subtraction from them, so they stay exactly as they were agreed.": { de: "Ältere Versionen können gelesen, aber nie bearbeitet werden. Jede Ersparnis ist eine Subtraktion von ihnen, deshalb bleiben sie genau so, wie sie vereinbart wurden.", es: "Las versiones anteriores se pueden leer pero nunca editar, cada ahorro es una resta a partir de ellas, así que quedan exactamente como se acordaron.", ca: "Les versions anteriors es poden llegir però mai editar, cada estalvi és una resta a partir d'elles, així que queden exactament com es van acordar."},
  "One person has worked on this.": { de: "Eine Person hat daran gearbeitet.", es: "Una persona ha trabajado en esto.", ca: "Una persona hi ha treballat."},
  "One piece of work, on one app. Start with the app and the rest narrows to it.": { de: "Ein Stück Arbeit, in einer App. Beginnen Sie mit der App, alles Weitere richtet sich danach.", es: "Una pieza de trabajo, en una sola app. Empieza por la app y el resto se acota a ella.", ca: "Una peça de feina, en una sola app. Comença per l'app i la resta s'hi ajusta."},
  "Open the file": { de: "Datei öffnen", es: "Abrir el archivo", ca: "Obrir el fitxer"},
  "Open the original": { de: "Original öffnen", es: "Abrir el original", ca: "Obrir l'original"},
  "Open the record": { de: "Datensatz öffnen", es: "Abrir el registro", ca: "Obrir el registre"},
  "Open {name}": { de: "{name} öffnen", es: "Abrir {name}", ca: "Obrir {name}"},
  "Pick a role.": { de: "Wählen Sie eine Rolle.", es: "Elige un rol.", ca: "Tria un rol."},
  "Pick an existing group or start a new one, then add the value.": { de: "Wählen Sie eine bestehende Gruppe oder legen Sie eine neue an, und fügen Sie dann den Wert hinzu.", es: "Elige un grupo existente o crea uno nuevo, y después añade el valor.", ca: "Tria un grup existent o crea'n un de nou, i després afegeix el valor."},
  "Picture": { de: "Bild", es: "Imagen", ca: "Imatge"},
  // THE TASKS TAB, 2026-09-15 — the client's ruling replaced List/Calendar/
  // Upcoming with this one: every open task that is not overdue, dated or not
  // (`tasks-screen.tsx`'s own header has the full definition).
  "Planned": { de: "Geplant", es: "Planificado", ca: "Planificat"},
  "Planned by the assistant": { de: "Vom Assistenten geplant", es: "Planificado por el asistente", ca: "Planificat per l'assistent"},
  "Portal access": { de: "Portalzugang", es: "Acceso al portal", ca: "Accés al portal"},
  "Previous month": { de: "Vorheriger Monat", es: "Mes anterior", ca: "Mes anterior"},
  "Priority order": { de: "Nach Priorität", es: "Por orden de prioridad", ca: "Per ordre de prioritat"},
  "Put away.": { de: "Weggelegt.", es: "Apartado.", ca: "Apartat."},
  "Put back.": { de: "Zurückgelegt.", es: "Devuelto a la lista.", ca: "Tornat a la llista."},
  "Put somebody on duty": { de: "Jemanden in den Dienst einteilen", es: "Poner a alguien de servicio", ca: "Posar algú de guàrdia"},
  "Raise a ticket": { de: "Ein Ticket erstellen", es: "Crear un ticket", ca: "Obrir un ticket"},
  "Raised as": { de: "Eingegangen als", es: "Recibido como", ca: "Rebut com a"},
  "Recently added": { de: "Zuletzt hinzugefügt", es: "Añadido recientemente", ca: "Afegit recentment"},

  /* APPENDED BY THE client→account RENAME LANE, 9 Sep 2026, and it is not that
   * lane's own string. The tickets sort menu gained "Recently closed" in the
   * concurrent sort-columns lane; the rename lane ran `npm run lang`, which
   * extracted it, and R44's ceiling is 0 in all three — so the choice was to
   * translate it here or to raise a ceiling that may only fall. Same register
   * as its siblings above: past participle plus adverb, sentence case. */
  "Recently closed": { de: "Zuletzt geschlossen", es: "Cerrado recientemente", ca: "Tancat recentment"},
  "Recently changed": { de: "Zuletzt geändert", es: "Modificado recientemente", ca: "Modificat recentment"},
  "Recording that it stopped is how its whole time becomes a saving. The step keeps its place in this version and in every older one, nothing is deleted.": { de: "Wenn Sie festhalten, dass er nicht mehr stattfindet, wird seine ganze Zeit zur Ersparnis. Der Schritt behält seinen Platz in dieser und in jeder älteren Version, nichts wird gelöscht.", es: "Registrar que dejó de ocurrir es lo que convierte todo su tiempo en ahorro. El paso mantiene su sitio en esta versión y en todas las anteriores, no se borra nada.", ca: "Registrar que ha deixat de passar és el que converteix tot el seu temps en estalvi. El pas manté el seu lloc en aquesta versió i en totes les anteriors, no s'esborra res."},
  "Rename": { de: "Umbenennen", es: "Renombrar", ca: "Reanomenar"},
  "Replace the file": { de: "Datei ersetzen", es: "Sustituir el archivo", ca: "Substituir el fitxer"},
  "Rename it or say more about what it covers.": { de: "Benennen Sie ihn um oder beschreiben Sie genauer, was er umfasst.", es: "Cámbiale el nombre o explica mejor qué abarca.", ca: "Canvia-li el nom o explica millor què abasta."},
  "Rename it or update what it's for. You set what it can do over in the grid.": { de: "Benennen Sie sie um oder aktualisieren Sie, wofür sie da ist. Was sie darf, legen Sie drüben im Raster fest.", es: "Cámbiale el nombre o actualiza para qué sirve. Lo que puede hacer se define en la cuadrícula.", ca: "Canvia-li el nom o actualitza per a què serveix. El que pot fer es defineix a la graella."},
  "Restored.": { de: "Wiederhergestellt.", es: "Restaurado.", ca: "Restaurat."},
  "Revoking…": { de: "Wird widerrufen…", es: "Revocando…", ca: "Revocant…"},
  "Role activated.": { de: "Rolle aktiviert.", es: "Rol activado.", ca: "Rol activat."},
  "Role deactivated.": { de: "Rolle deaktiviert.", es: "Rol desactivado.", ca: "Rol desactivat."},
  "Save role": { de: "Rolle speichern", es: "Guardar rol", ca: "Desar rol"},
  "Save to Gmail drafts": { de: "In Gmail-Entwürfe speichern", es: "Guardar en borradores de Gmail", ca: "Desar als esborranys de Gmail"},
  "Saved.": { de: "Gespeichert.", es: "Guardado.", ca: "Desat."},
  "Saving…": { de: "Wird gespeichert…", es: "Guardando…", ca: "Desant…"},
  "Say what kind an entry is when you log it, and the split shows here.": { de: "Sagen Sie beim Erfassen, welche Art ein Eintrag ist, dann erscheint die Aufteilung hier.", es: "Di de qué tipo es cada registro al anotarlo y el reparto aparecerá aquí.", ca: "Digues de quin tipus és cada registre en anotar-lo i el repartiment apareixerà aquí."},
  "Search apps…": { de: "Apps durchsuchen…", es: "Buscar apps…", ca: "Cercar apps…"},
  "Search companies…": { de: "Unternehmen durchsuchen…", es: "Buscar empresas…", ca: "Cercar empreses…"},
  "Search departments…": { de: "Abteilungen durchsuchen…", es: "Buscar departamentos…", ca: "Cercar departaments…"},
  "Search reasons…": { de: "Gründe durchsuchen…", es: "Buscar motivos…", ca: "Cercar motius…"},
  "Search roles…": { de: "Rollen durchsuchen…", es: "Buscar roles…", ca: "Cercar rols…"},
  "Search sprints…": { de: "Sprints durchsuchen…", es: "Buscar sprints…", ca: "Cercar sprints…"},
  "Search types…": { de: "Typen durchsuchen…", es: "Buscar tipos…", ca: "Cercar tipus…"},
  "Search versions…": { de: "Versionen durchsuchen…", es: "Buscar versiones…", ca: "Cercar versions…"},
  "Search what we handed over…": { de: "Übergebenes durchsuchen…", es: "Buscar lo que entregamos…", ca: "Cercar el que hem lliurat…"},
  "Searching…": { de: "Wird gesucht…", es: "Buscando…", ca: "Cercant…"},
  "Sending…": { de: "Wird gesendet…", es: "Enviando…", ca: "Enviant…"},
  "Set up your profile": { de: "Ihr Profil einrichten", es: "Configura tu perfil", ca: "Configura el teu perfil"},
  "Share a folder": { de: "Einen Ordner freigeben", es: "Compartir una carpeta", ca: "Compartir una carpeta"},
  "Share a space": { de: "Einen Space freigeben", es: "Compartir un espacio", ca: "Compartir un espai"},
  "Some of this couldn't be translated, so it's showing as it was written.": { de: "Ein Teil davon ließ sich nicht übersetzen und wird so angezeigt, wie er geschrieben wurde.", es: "Una parte no se ha podido traducir, así que se muestra tal como se escribió.", ca: "Una part no s'ha pogut traduir, així que es mostra tal com es va escriure."},
  "Someone brand new goes in under New contact instead.": { de: "Eine ganz neue Person legen Sie stattdessen unter Neuer Kontakt an.", es: "Una persona totalmente nueva se añade en Nuevo contacto.", ca: "Una persona totalment nova s'afegeix a Nou contacte."},
  "Someone who has left": { de: "Jemand, der nicht mehr da ist", es: "Alguien que ya no está", ca: "Algú que ja no hi és"},
  "Someone with a login": { de: "Jemand mit einem Zugang", es: "Alguien con acceso", ca: "Algú amb accés"},
  "Something we handed over on this app: a doc, a recording, an SOP.": { de: "Etwas, das wir bei dieser App übergeben haben: ein Dokument, eine Aufzeichnung, eine Arbeitsanweisung.", es: "Algo que entregamos en esta app: un documento, una grabación, un procedimiento.", ca: "Alguna cosa que hem lliurat en aquesta app: un document, un enregistrament, un procediment."},
  "Something went wrong. Try again.": { de: "Etwas ist schiefgelaufen. Bitte erneut versuchen.", es: "Algo ha salido mal. Inténtalo de nuevo.", ca: "Alguna cosa ha anat malament. Torna-ho a provar."},
  "Sprint completed.": { de: "Sprint abgeschlossen.", es: "Sprint completado.", ca: "Sprint completat."},
  "Sprint reopened.": { de: "Sprint wieder geöffnet.", es: "Sprint reabierto.", ca: "Sprint reobert."},
  "Step added.": { de: "Schritt hinzugefügt.", es: "Paso añadido.", ca: "Pas afegit."},
  "Step recorded as no longer done.": { de: "Schritt als nicht mehr erledigt vermerkt.", es: "Paso registrado como ya no hecho.", ca: "Pas registrat com que ja no es fa."},
  "Step updated.": { de: "Schritt aktualisiert.", es: "Paso actualizado.", ca: "Pas actualitzat."},
  "Still reading your older meetings, press again to go further back.": { de: "Ihre älteren Termine werden noch gelesen, drücken Sie erneut, um weiter zurückzugehen.", es: "Todavía estamos leyendo tus reuniones más antiguas; pulsa otra vez para ir más atrás.", ca: "Encara estem llegint les teves reunions més antigues; prem un altre cop per anar més enrere."},
  "Stopped, kept in full.": { de: "Gestoppt, vollständig behalten.", es: "Detenido, se ha guardado completo.", ca: "Aturat, s'ha desat sencer."},
  "Taken back out.": { de: "Wieder herausgenommen.", es: "Se ha vuelto a sacar.", ca: "S'ha tornat a treure."},
  "Team switched": { de: "Team gewechselt", es: "Equipo cambiado", ca: "Equip canviat"},
  "The agency": { de: "Die Agentur", es: "La agencia", ca: "L'agència"},
  "The assistant can use this again.": { de: "Der Assistent kann dies wieder verwenden.", es: "El asistente puede volver a usar esto.", ca: "L'assistent pot tornar a fer servir això."},
  "The assistant stops reading it. Nothing is deleted, and the sweep won't put it back.": { de: "Der Assistent liest es nicht mehr. Nichts wird gelöscht, und der Abgleich holt es nicht zurück.", es: "El asistente deja de leerlo. No se borra nada, y el barrido no lo volverá a traer.", ca: "L'assistent deixa de llegir-ho. No s'esborra res, i el repàs no ho tornarà a portar."},
  "The assistant will no longer use this.": { de: "Der Assistent verwendet dies nicht mehr.", es: "El asistente ya no usará esto.", ca: "L'assistent ja no farà servir això."},
  "The companies they're a contact of. Who they work for is on the Overview.": { de: "Die Unternehmen, deren Kontakt sie sind. Wo sie arbeiten, steht in der Übersicht.", es: "Las empresas de las que es contacto. Para quién trabaja está en el Resumen.", ca: "Les empreses de les quals és contacte. Per a qui treballa és al Resum."},
  "The company they work for. Being a contact of a company is a separate thing, and the same person can be a contact of several.": { de: "Das Unternehmen, für das sie arbeiten. Kontakt eines Unternehmens zu sein ist etwas anderes, und dieselbe Person kann Kontakt mehrerer sein.", es: "La empresa para la que trabaja. Ser contacto de una empresa es otra cosa, y la misma persona puede ser contacto de varias.", ca: "L'empresa per a la qual treballa. Ser contacte d'una empresa és una altra cosa, i la mateixa persona pot ser contacte de diverses."},
  "The import didn't finish.": { de: "Der Import wurde nicht abgeschlossen.", es: "La importación no ha terminado.", ca: "La importació no ha acabat."},
  "The team can read it": { de: "Das Team kann es lesen", es: "El equipo puede leerlo", ca: "L'equip ho pot llegir"},
  "The total above covers all of it. This picture fills in as new time lands.": { de: "Die Summe oben umfasst alles. Dieses Bild füllt sich, sobald neue Zeit hinzukommt.", es: "El total de arriba lo incluye todo. Este reparto se va completando a medida que llega tiempo nuevo.", ca: "El total de dalt ho inclou tot. Aquesta imatge es va completant a mesura que arriba temps nou."},
  // ADDED 11 SEP 2026 with the module settings page's own Import CSV. Hand-written
  // here rather than left to the generator because R44's ceiling is 19/19/19 and
  // may only fall: an untranslated sentence would have pushed it to 20.
  // `{groups}` is the hole, not a word — the list of groups is data.
  "This import adds values to {groups} only. Rows in any other group are skipped.": { de: "Dieser Import fügt nur Werte zu {groups} hinzu. Zeilen aus anderen Gruppen werden übersprungen.", es: "Esta importación solo añade valores a {groups}. Las filas de cualquier otro grupo se omiten.", ca: "Aquesta importació només afegeix valors a {groups}. Les files de qualsevol altre grup s'ometen."},
  "This is your work with us.": { de: "Das ist Ihre Arbeit mit uns.", es: "Este es tu trabajo con nosotros.", ca: "Aquesta és la teva feina amb nosaltres."},
  "This one is kept in step with the record it came from, so its words are edited there. You can still change where it is filed and who can use it.": { de: "Diese wird mit dem Datensatz, aus dem sie stammt, in Einklang gehalten, ihre Worte werden also dort bearbeitet. Wo sie abgelegt ist und wer sie nutzen darf, können Sie weiterhin ändern.", es: "Esta se mantiene al día con el registro del que procede, así que su texto se edita allí. Aún puedes cambiar dónde está archivada y quién puede usarla.", ca: "Aquesta es manté al dia amb el registre del qual prové, així que el seu text s'edita allà. Encara pots canviar on està arxivada i qui la pot fer servir."},
  "This picture appears once a second person logs time against it.": { de: "Dieses Bild erscheint, sobald eine zweite Person Zeit darauf erfasst.", es: "Este reparto aparece en cuanto una segunda persona registra tiempo aquí.", ca: "Aquesta imatge apareix quan una segona persona hi registra temps."},
  "This source doesn't have a map to draw.": { de: "Für diese Quelle gibt es keine Karte zum Zeichnen.", es: "Esta fuente no tiene un mapa que dibujar.", ca: "Aquesta font no té cap mapa per dibuixar."},
  "This version has no steps recorded.": { de: "Für diese Version sind keine Schritte erfasst.", es: "Esta versión no tiene pasos registrados.", ca: "Aquesta versió no té passos registrats."},
  "Ticked off. It's under All tasks.": { de: "Abgehakt. Es steht unter Alle Aufgaben.", es: "Marcado. Está en Todas las tareas.", ca: "Marcat. És a Totes les tasques."},
  "Today": { de: "Heute", es: "Hoy", ca: "Avui"},
  /* ── MEETINGS: THIS WEEK / MINE / EVERYONE'S (client ruling, 2026-09-15) ──
   * meetings-screen.tsx's own header block carries her words. New words, hand
   * translated here rather than left to the generator. */
  "Everyone's": { de: "Alle", es: "De todos", ca: "De tothom" },
  /* THE GLOSSARY RENAME, "Meeting purpose" → "Meeting type", read into this
   * screen (`shared/glossary.ts` carries the rename itself; this lane only
   * hand-seeds the two new labels meetings-screen.tsx now shows). Compound
   * German the same way "Personality type" → "Persönlichkeitstyp" already is. */
  "Meeting type": { de: "Termintyp", es: "Tipo de reunión", ca: "Tipus de reunió" },
  "Meeting types": { de: "Termintypen", es: "Tipos de reunión", ca: "Tipus de reunió" },
  /* THE MEETINGS TABLE'S OWN TWO COLUMNS (16 Sep 2026: "I want it exactly
   * like the one in tickets"). Both words carried this same seed once, for
   * the AM-rebuild's seven-column table 2026-09-15 — pruned the same
   * evening when that table was retired in favour of `shared/web/
   * list-compat.tsx`'s `List` (`node scripts/i18n-prune.mjs`, run against a
   * tree with no reader left for either). Back a second time, hand
   * translated rather than left to the generator, the same as their first
   * seeding. "Time" is the column, not a duration — Zeit/Hora/Hora, not
   * Dauer/Duración/Durada. */
  "Time": { de: "Zeit", es: "Hora", ca: "Hora" },
  "Attendees": { de: "Teilnehmer", es: "Asistentes", ca: "Assistents" },
  "Transcript read.": { de: "Mitschrift gelesen.", es: "Transcripción leída.", ca: "Transcripció llegida."},
  "Try fewer words, or clear the filters.": { de: "Weniger Wörter versuchen oder die Filter zurücksetzen.", es: "Prueba con menos palabras o borra los filtros.", ca: "Prova amb menys paraules o esborra els filtres."},
  "Update the details you hold for them.": { de: "Aktualisieren Sie die Angaben, die Sie zu dieser Person haben.", es: "Actualiza los datos que tienes de esta persona.", ca: "Actualitza les dades que en tens."},
  "Update what you're asking for. Everyone on the ticket will see the change.": { de: "Aktualisieren Sie, worum Sie bitten. Alle beim Ticket sehen die Änderung.", es: "Actualiza lo que estás pidiendo. Todos los que están en el ticket verán el cambio.", ca: "Actualitza el que demanes. Tothom qui és al ticket veurà el canvi."},
  "Uploaded file": { de: "Hochgeladene Datei", es: "Archivo subido", ca: "Fitxer pujat"},
  "Uploading…": { de: "Wird hochgeladen…", es: "Subiendo…", ca: "Pujant…"},
  "Urgent": { de: "Dringend", es: "Urgente", ca: "Urgent"},
  "Video, handover doc, SOP…": { de: "Video, Übergabedokument, Arbeitsanweisung…", es: "Vídeo, documento de entrega, procedimiento…", ca: "Vídeo, document de lliurament, procediment…"},
  "We can't find that ticket.": { de: "Wir finden dieses Ticket nicht.", es: "No encontramos ese ticket.", ca: "No trobem aquest ticket."},
  "We'll email you a six-digit code, or you can use Google. No password to remember.": { de: "Wir senden Ihnen einen sechsstelligen Code per E-Mail, oder Sie nutzen Google. Kein Passwort zum Merken.", es: "Te enviaremos por correo un código de seis dígitos, o puedes usar Google. Sin contraseña que recordar.", ca: "T'enviarem per correu un codi de sis xifres, o pots fer servir Google. Cap contrasenya per recordar."},
  "What I read": { de: "Was ich gelesen habe", es: "Lo que he leído", ca: "El que he llegit"},
  "What it's called, when it runs, and what it was sold for. The account and the app it covers stay as they are.": { de: "Wie er heißt, wann er läuft und wofür er verkauft wurde. Der Kunde und die App, die er abdeckt, bleiben unverändert.", es: "Cómo se llama, cuándo se ejecuta y por cuánto se vendió. La cuenta y la app que cubre se quedan como están.", ca: "Com es diu, quan s'executa i per quant es va vendre. El compte i l'app que cobreix es queden com estan."},
  "What was asked": { de: "Was gefragt wurde", es: "Lo que se pidió", ca: "El que es va demanar"},
  // THE PRIORITY LEVEL, level 1 — see "Do it now"'s own note above; the same
  // pair, opposite ends of the scale.
  "Whenever": { de: "Irgendwann", es: "Cuando sea", ca: "Quan sigui"},
  "Where the tickets are sitting": { de: "Wo die Tickets gerade stehen", es: "Dónde están los tickets", ca: "On són els tickets"},
  "Which account is it for?": { de: "Für welchen Kunden ist es?", es: "¿Para qué cuenta es?", ca: "Per a quin compte és?"},
  "Working…": { de: "Wird bearbeitet…", es: "Trabajando…", ca: "Treballant…"},
  "Write a profile": { de: "Ein Profil schreiben", es: "Escribir un perfil", ca: "Escriure un perfil"},
  "Write it again": { de: "Neu schreiben", es: "Escribirlo otra vez", ca: "Tornar-ho a escriure"},
  "Write up what was decided while it is still fresh, the notes are the part worth keeping.": { de: "Halten Sie fest, was entschieden wurde, solange es frisch ist, die Notizen sind der Teil, der bleibt.", es: "Anota lo que se decidió mientras lo tienes fresco; las notas son la parte que merece la pena guardar.", ca: "Anota el que s'ha decidit mentre encara ho tens fresc; les notes són la part que val la pena guardar."},
  "Writing…": { de: "Wird geschrieben…", es: "Escribiendo…", ca: "Escrivint…"},
  "You're not in a team": { de: "Sie sind in keinem Team", es: "No estás en ningún equipo", ca: "No ets a cap equip"},
  "e.g. Question": { de: "z. B. Frage", es: "p. ej. Pregunta", ca: "p. ex. Pregunta"},
  "each time": { de: "pro Durchlauf", es: "cada vez", ca: "cada vegada"},
  "explained": { de: "erklärt", es: "explicado", ca: "explicat"},
  "folder": { de: "Ordner", es: "carpeta", ca: "carpeta"},
  "logged": { de: "erfasst", es: "registrado", ca: "registrat"},
  "no explanation yet": { de: "noch keine Erklärung", es: "sin explicación aún", ca: "encara sense explicació"},
  "not billable": { de: "nicht abrechenbar", es: "no facturable", ca: "no facturable"},
  "not done now": { de: "wird nicht mehr gemacht", es: "ya no se hace", ca: "ja no es fa"},
  "not needed now": { de: "wird nicht mehr gebraucht", es: "ya no hace falta", ca: "ja no cal"},
  "running": { de: "läuft", es: "en curso", ca: "en curs"},
  "something": { de: "etwas", es: "algo", ca: "alguna cosa"},
  "space": { de: "Space", es: "espacio", ca: "espai"},
  "this account": { de: "diesem Kunden", es: "esta cuenta", ca: "aquest compte"},
  "this team": { de: "dieses Team", es: "este equipo", ca: "aquest equip"},
  "this version": { de: "diese Version", es: "esta versión", ca: "aquesta versió"},
  "today": { de: "heute", es: "hoy", ca: "avui"},
  "your current team": { de: "Ihr aktuelles Team", es: "tu equipo actual", ca: "el teu equip actual"},
  "your team has explained this below": { de: "Ihr Team hat dies unten erklärt", es: "tu equipo lo ha explicado abajo", ca: "el teu equip ho ha explicat a sota"},
  "your team is writing an explanation": { de: "Ihr Team schreibt gerade eine Erklärung", es: "tu equipo está escribiendo una explicación", ca: "el teu equip està escrivint una explicació"},
  "{label} won't be part of this ticket any more. You can always send it again.": { de: "{label} gehört nicht mehr zu diesem Ticket. Sie können es jederzeit erneut senden.", es: "{label} ya no formará parte de este ticket. Siempre puedes volver a enviarlo.", ca: "{label} ja no formarà part d'aquest ticket. Sempre el pots tornar a enviar."},
  "{name} is now in your accounts, but not a contact here: {reason} Use Add contact to finish.": { de: "{name} ist jetzt in Ihren Kunden, aber hier kein Kontakt: {reason} Verwenden Sie Kontakt hinzufügen, um abzuschließen.", es: "{name} ya está en tus cuentas, pero aquí no es un contacto: {reason} Usa Añadir contacto para terminar.", ca: "{name} ja és als teus comptes, però aquí no és un contacte: {reason} Fes servir Afegir contacte per acabar."},
  "{name} is now in your accounts, but we couldn't make them a contact here. Use Add contact to finish.": { de: "{name} ist jetzt in Ihren Kunden, aber wir konnten die Person hier nicht zum Kontakt machen. Verwenden Sie Kontakt hinzufügen, um abzuschließen.", es: "{name} ya está en tus cuentas, pero no hemos podido hacerlo contacto aquí. Usa Añadir contacto para terminar.", ca: "{name} ja és als teus comptes, però no hem pogut fer-lo contacte aquí. Fes servir Afegir contacte per acabar."},

  /* ── WRITTEN BY HAND ON 2026-08-20, AND THE REASON IS THE OWNER'S RULE ─────
   *
   * 137 sentences the app says had NO entry anywhere — not in the generated
   * catalogue, not here — so every one of them shipped in English to somebody
   * who had chosen German. R28 keeps the catalogue matching the code; it cannot
   * make a MODEL RUN, and the generator beside it (`scripts/i18n-translate.mjs`)
   * spends the owner's own Anthropic key.
   *
   * HIS RULING, 20 Aug 2026: "Why does this require my Anthropic key? Why can't
   * you just do it? … only for human input, like things that are inputted by
   * humans and input text fields, can you use the Anthropic API key, and only
   * during runtime." The key pays for what a PERSON asks the assistant at the
   * moment they ask it. Translating the app's own furniture is build work, and
   * build work is written, not bought.
   *
   * So these are written here rather than generated there, in the seed, because
   * the catalogue says DO NOT HAND-EDIT and means it — anything put there is
   * lost the next time the generator runs, while the seed is resolved OVER the
   * catalogue at run time and survives.
   *
   * TWO ENTRIES ARE DELIBERATELY IDENTICAL IN ALL 28. `#RRGGBB` is a colour
   * FORMAT, not prose. `Einstellungen` is the placeholder in the "German name"
   * field on the module form — it is an EXAMPLE OF GERMAN, and translating it
   * would destroy the only thing it does. */
  "#RRGGBB": { de: "#RRGGBB", es: "#RRGGBB", ca: "#RRGGBB"},
  "1 account matches": { de: "1 Kunde passt", es: "1 cuenta coincide", ca: "1 compte coincideix"},
  "1 meeting matches": { de: "1 Besprechung passt", es: "1 reunión coincide", ca: "1 reunió coincideix"},
  "1 process matches": { de: "1 Prozess passt", es: "1 proceso coincide", ca: "1 procés coincideix"},
  "1 source matches": { de: "1 Quelle passt", es: "1 fuente coincide", ca: "1 font coincideix"},
  "1 story matches": { de: "1 Story passt", es: "1 historia coincide", ca: "1 història coincideix"},
  "1 ticket matches": { de: "1 Ticket passt", es: "1 ticket coincide", ca: "1 tiquet coincideix"},
  "A conversation, with what you mean to cover. It is kept here — {brand} reads your calendar and never writes to it.": { de: "Ein Gespräch mit dem, was Sie besprechen wollen. Es wird hier festgehalten – {brand} liest Ihren Kalender und schreibt nie hinein.", es: "Una conversación, con lo que quieres tratar. Se guarda aquí: {brand} lee tu calendario y nunca escribe en él.", ca: "Una conversa, amb allò que vols tractar. Es desa aquí: {brand} llegeix el teu calendari i mai no hi escriu."},
  "A section of this app, like Settings or Documents. Tickets say which one they are about.": { de: "Ein Bereich dieser App, etwa Einstellungen oder Dokumente. Tickets nennen den Bereich, um den es geht.", es: "Una sección de esta aplicación, como Ajustes o Documentos. Los tickets indican a cuál se refieren.", ca: "Una secció d'aquesta aplicació, com Configuració o Documents. Els tiquets indiquen a quina es refereixen."},
  "Activate profile": { de: "Profil aktivieren", es: "Activar perfil", ca: "Activa el perfil"},
  "Add": { de: "Hinzufügen", es: "Añadir", ca: "Afegir"},
  "Add a module": { de: "Modul hinzufügen", es: "Añadir un módulo", ca: "Afegir un mòdul"},
  "Add module": { de: "Modul hinzufügen", es: "Añadir módulo", ca: "Afegir mòdul"},
  "Add someone new to your accounts and make them a contact of {name}.": { de: "Fügen Sie eine neue Person zu Ihren Kunden hinzu und machen Sie sie zu einem Kontakt von {name}.", es: "Añade a alguien nuevo a tus cuentas y hazle contacto de {name}.", ca: "Afegeix algú nou als teus comptes i fes-lo contacte de {name}."},
  "Added {name}.": { de: "{name} hinzugefügt.", es: "{name} añadido.", ca: "{name} afegit."},
  "Anyone at this company with portal access will be able to open “{title}”. You can hide it again at any time.": { de: "Jede Person dieses Unternehmens mit Portalzugang kann „{title}“ öffnen. Sie können es jederzeit wieder verbergen.", es: "Cualquier persona de esta empresa con acceso al portal podrá abrir «{title}». Puedes ocultarlo de nuevo cuando quieras.", ca: "Qualsevol persona d'aquesta empresa amb accés al portal podrà obrir «{title}». El pots tornar a amagar quan vulguis."},
  "Anyone here whose role can read it. Their questions can be answered from it too.": { de: "Alle hier, deren Rolle es lesen darf. Auch ihre Fragen können daraus beantwortet werden.", es: "Cualquiera aquí cuyo rol pueda leerlo. Sus preguntas también pueden responderse a partir de ello.", ca: "Qualsevol d'aquí el rol del qual el pugui llegir. Les seves preguntes també es poden respondre a partir d'això."},
  "Choose a part of your system": { de: "Wählen Sie einen Teil Ihres Systems", es: "Elige una parte de tu sistema", ca: "Tria una part del teu sistema"},
  "Choose an app first": { de: "Wählen Sie zuerst eine App", es: "Elige primero una aplicación", ca: "Tria primer una aplicació"},
  "Choose an app first.": { de: "Wählen Sie zuerst eine App.", es: "Elige primero una aplicación.", ca: "Tria primer una aplicació."},
  /* The ticket form's "Raised by" row, when no client has been named yet — the
   * exact sibling of the line above it, one field further down the same form,
   * so it is deliberately the same sentence with one noun changed. Written by
   * hand rather than sent to the model for that reason: the two have to match. */
  "Choose an account first.": { de: "Wählen Sie zuerst einen Kunden.", es: "Elige primero una cuenta.", ca: "Tria primer un compte."},
  "Colour": { de: "Farbe", es: "Color", ca: "Color"},
  "Compare with": { de: "Vergleichen mit", es: "Comparar con", ca: "Compara amb"},
  "Connect everything": { de: "Alles verbinden", es: "Conectar todo", ca: "Connecta-ho tot"},
  // THE GOOGLE CARD'S OWN TWO SENTENCES, 2026-09-11. They replace "Connect
  // your own Google account. …", which stood here until the client's fourth
  // "nothing on white background" ruling folded the section's eyebrow, its
  // sentence and its connect row into one contained card (R67 amendment 4).
  // The privacy promise is word-for-word the same promise; the one-approval
  // fact joined it from the row that is gone. Hand-written here rather than
  // left to the generator because R44's ceiling is exact and may only fall —
  // two new English strings with no answer would have pushed it up.
  "Connect to Google": { de: "Google verbinden", es: "Conectar con Google", ca: "Connecta amb Google"},
  "Drive, Gmail, Calendar and Chat in one approval, on your own Google account — {brand} never uses anyone else's, and the assistant working for you sees exactly what you can see. Google keeps one approval per app, so connecting them one at a time switches the others off.": { de: "Drive, Gmail, Kalender und Chat mit einer einzigen Freigabe, auf Ihrem eigenen Google-Konto – {brand} nutzt nie das von jemand anderem, und der Assistent, der für Sie arbeitet, sieht genau das, was Sie sehen können. Google speichert nur eine Freigabe pro App: Wenn Sie die Dienste einzeln verbinden, schalten Sie die anderen damit ab.", es: "Drive, Gmail, Calendario y Chat con una sola autorización, en tu propia cuenta de Google: {brand} nunca usa la de otra persona, y el asistente que trabaja para ti ve exactamente lo que tú puedes ver. Google guarda una sola autorización por aplicación, así que conectarlos de uno en uno apaga los demás.", ca: "Drive, Gmail, Calendari i Chat amb una sola autorització, al teu propi compte de Google: {brand} mai no fa servir el d'una altra persona, i l'assistent que treballa per a tu veu exactament el que tu pots veure. Google desa una sola autorització per aplicació, així que connectar-los d'un en un apaga els altres."},
  "Couldn't accept the invite.": { de: "Einladung konnte nicht angenommen werden.", es: "No se pudo aceptar la invitación.", ca: "No s'ha pogut acceptar la invitació."},
  "Couldn't attach that.": { de: "Das konnte nicht angehängt werden.", es: "No se pudo adjuntar eso.", ca: "No s'ha pogut adjuntar això."},
  "Couldn't load your invites.": { de: "Ihre Einladungen konnten nicht geladen werden.", es: "No se pudieron cargar tus invitaciones.", ca: "No s'han pogut carregar les teves invitacions."},
  "Couldn't load {what}.": { de: "{what} konnte nicht geladen werden.", es: "No se pudo cargar {what}.", ca: "No s'ha pogut carregar {what}."},
  "Couldn't switch that module off.": { de: "Dieses Modul konnte nicht ausgeschaltet werden.", es: "No se pudo desactivar ese módulo.", ca: "No s'ha pogut desactivar aquest mòdul."},
  "Couldn't take that off.": { de: "Das konnte nicht entfernt werden.", es: "No se pudo quitar eso.", ca: "No s'ha pogut treure això."},
  "Deactivate profile": { de: "Profil deaktivieren", es: "Desactivar perfil", ca: "Desactiva el perfil"},
  "Disconnect your Google account?": { de: "Google-Konto trennen?", es: "¿Desconectar tu cuenta de Google?", ca: "Vols desconnectar el teu compte de Google?"},
  "Does \"{step}\" still happen?": { de: "Findet „{step}“ noch statt?", es: "¿«{step}» sigue ocurriendo?", ca: "«{step}» encara passa?"},
  "Edit this module": { de: "Dieses Modul bearbeiten", es: "Editar este módulo", ca: "Edita aquest mòdul"},
  "Einstellungen": { de: "Einstellungen", es: "Einstellungen", ca: "Einstellungen"},
  "Everything in it, including whatever you put there later.": { de: "Alles darin, auch alles, was Sie später hinzufügen.", es: "Todo lo que contiene, incluido lo que añadas más adelante.", ca: "Tot el que conté, inclòs el que hi afegeixis més endavant."},
  "German name": { de: "Deutscher Name", es: "Nombre en alemán", ca: "Nom en alemany"},
  "Impact": { de: "Wirkung", es: "Impacto", ca: "Impacte"},
  "In the knowledge base": { de: "In der Wissensdatenbank", es: "En la base de conocimiento", ca: "A la base de coneixement"},
  "Invites waiting for you": { de: "Einladungen, die auf Sie warten", es: "Invitaciones que te esperan", ca: "Invitacions que t'esperen"},
  "It stops being offered when somebody files a ticket. Every ticket already filed against it keeps it, and nothing is deleted.": { de: "Es wird beim Erstellen eines Tickets nicht mehr angeboten. Jedes bereits dazu erstellte Ticket behält es, und nichts wird gelöscht.", es: "Dejará de ofrecerse al crear un ticket. Todos los tickets ya creados lo conservan y no se borra nada.", ca: "Deixarà d'oferir-se en crear un tiquet. Tots els tiquets ja creats el conserven i no s'esborra res."},
  "Last used {when}": { de: "Zuletzt verwendet {when}", es: "Usado por última vez {when}", ca: "Usat per última vegada {when}"},
  "Main": { de: "Haupt", es: "Principal", ca: "Principal"},
  "Module": { de: "Modul", es: "Módulo", ca: "Mòdul"},
  "Modules": { de: "Module", es: "Módulos", ca: "Mòduls"},
  "Needs {gaps} before it can be triaged": { de: "Benötigt {gaps}, bevor es triagiert werden kann", es: "Necesita {gaps} antes de poder triarse", ca: "Necessita {gaps} abans de poder-se triar"},
  "No accounts match": { de: "Keine Kunden passen", es: "No hay cuentas que coincidan", ca: "Cap compte coincideix"},
  "No invites waiting for you.": { de: "Keine Einladungen, die auf Sie warten.", es: "No tienes invitaciones pendientes.", ca: "No tens invitacions pendents."},
  // THE CHOICES SCREEN'S PROTECTION VOCABULARY (client, 2026-09-10 — "find an
  // accurate word for what Default means … Find a good word and rename it").
  // These five replaced six entries that all said Standard / predeterminado /
  // predeterminat, which translated the promise the English word was wrongly
  // making: nothing here is pre-selected, the flag refuses a deactivation.
  "No meetings match": { de: "Keine Besprechungen passen", es: "No hay reuniones que coincidan", ca: "Cap reunió coincideix"},
  "No module": { de: "Kein Modul", es: "Sin módulo", ca: "Cap mòdul"},
  "No processes match": { de: "Keine Prozesse passen", es: "No hay procesos que coincidan", ca: "Cap procés coincideix"},
  "No sources match": { de: "Keine Quellen passen", es: "No hay fuentes que coincidan", ca: "Cap font coincideix"},
  "No stories match": { de: "Keine Storys passen", es: "No hay historias que coincidan", ca: "Cap història coincideix"},
  "No tickets match": { de: "Keine Tickets passen", es: "No hay tickets que coincidan", ca: "Cap tiquet coincideix"},
  "No type said": { de: "Kein Typ angegeben", es: "Sin tipo indicado", ca: "Sense tipus indicat"},
  "Nobody from our side is on this yet.": { de: "Von unserer Seite ist noch niemand dabei.", es: "Todavía no hay nadie de nuestro lado.", ca: "Encara no hi ha ningú del nostre costat."},
  "Nobody from the client's side is on this yet.": { de: "Von Kundenseite ist noch niemand dabei.", es: "Todavía no hay nadie del lado del cliente.", ca: "Encara no hi ha ningú del costat del client."},
  "Not in the knowledge base yet": { de: "Noch nicht in der Wissensdatenbank", es: "Aún no está en la base de conocimiento", ca: "Encara no és a la base de coneixement"},
  "Not in this version": { de: "Nicht in dieser Version", es: "No está en esta versión", ca: "No és en aquesta versió"},
  "Nothing attached yet.": { de: "Noch nichts angehängt.", es: "Aún no hay nada adjunto.", ca: "Encara no hi ha res adjunt."},
  "Nothing shared yet — {scope}": { de: "Noch nichts freigegeben – {scope}", es: "Aún no se ha compartido nada — {scope}", ca: "Encara no s'ha compartit res — {scope}"},
  "Nothing — just show this one": { de: "Nichts – nur diese anzeigen", es: "Nada, solo mostrar esta", ca: "Res, mostra només aquesta"},
  "Only the ones you pick. Nothing else in the folder they sit in.": { de: "Nur die von Ihnen ausgewählten. Nichts anderes aus dem Ordner, in dem sie liegen.", es: "Solo los que elijas. Nada más de la carpeta en la que están.", ca: "Només els que triïs. Res més de la carpeta on són."},
  "Only you, and the assistant when it is answering you.": { de: "Nur Sie – und der Assistent, wenn er Ihnen antwortet.", es: "Solo tú, y el asistente cuando te responde.", ca: "Només tu, i l'assistent quan et respon."},
  "Or paste a link": { de: "Oder Link einfügen", es: "O pega un enlace", ca: "O enganxa un enllaç"},
  "Profile activated.": { de: "Profil aktiviert.", es: "Perfil activado.", ca: "Perfil activat."},
  "Profile deactivated.": { de: "Profil deaktiviert.", es: "Perfil desactivado.", ca: "Perfil desactivat."},
  "Reading this month…": { de: "Diesen Monat wird gelesen…", es: "Leyendo este mes…", ca: "Llegint aquest mes…"},
  "Reading what's attached…": { de: "Anhänge werden gelesen…", es: "Leyendo lo adjunto…", ca: "Llegint el que hi ha adjunt…"},
  "Renaming it updates every ticket filed against it.": { de: "Eine Umbenennung wirkt sich auf jedes dazu erstellte Ticket aus.", es: "Al renombrarlo se actualizan todos los tickets creados sobre él.", ca: "En canviar-li el nom s'actualitzen tots els tiquets creats sobre ell."},
  "Search modules…": { de: "Module suchen…", es: "Buscar módulos…", ca: "Cerca mòduls…"},
  "Somebody": { de: "Jemand", es: "Alguien", ca: "Algú"},
  "Protected": { de: "Geschützt", es: "Protegido", ca: "Protegit"},
  "Switch it off": { de: "Ausschalten", es: "Desactivarlo", ca: "Desactiva'l"},
  "Switch off": { de: "Ausschalten", es: "Desactivar", ca: "Desactivar"},
  "Switch off this module?": { de: "Dieses Modul ausschalten?", es: "¿Desactivar este módulo?", ca: "Vols desactivar aquest mòdul?"},
  "Tailored digital operating systems for mature businesses.": { de: "Maßgeschneiderte digitale Betriebssysteme für etablierte Unternehmen.", es: "Sistemas operativos digitales a medida para empresas consolidadas.", ca: "Sistemes operatius digitals a mida per a empreses consolidades."},
  "Task updated.": { de: "Aufgabe aktualisiert.", es: "Tarea actualizada.", ca: "Tasca actualitzada."},
  "The assistant can now use \"{title}\".": { de: "Der Assistent kann „{title}“ jetzt verwenden.", es: "El asistente ya puede usar «{title}».", ca: "L'assistent ja pot fer servir «{title}»."},
  "Theirs": { de: "Ihre", es: "Suyo", ca: "Seu"},
  "This app has no modules yet.": { de: "Diese App hat noch keine Module.", es: "Esta aplicación aún no tiene módulos.", ca: "Aquesta aplicació encara no té mòduls."},
  "This can take a few minutes.": { de: "Das kann ein paar Minuten dauern.", es: "Esto puede tardar unos minutos.", ca: "Això pot trigar uns minuts."},
  "Time saved, and one place to look.": { de: "Gesparte Zeit und ein einziger Ort zum Nachsehen.", es: "Tiempo ahorrado y un único sitio donde mirar.", ca: "Temps estalviat i un únic lloc on mirar."},
  "What is it about?": { de: "Worum geht es?", es: "¿De qué se trata?", ca: "De què tracta?"},
  "What it does": { de: "Was es tut", es: "Qué hace", ca: "Què fa"},
  "What it gives them": { de: "Was es ihnen bringt", es: "Qué les aporta", ca: "Què els aporta"},
  "Where the team manages their own preferences.": { de: "Wo das Team seine eigenen Einstellungen verwaltet.", es: "Donde el equipo gestiona sus propias preferencias.", ca: "On l'equip gestiona les seves preferències."},
  "Your invite has been accepted, so nothing is waiting on you. Open the portal at the address your invite came from, and sign in with this same email address.": { de: "Ihre Einladung wurde angenommen, es wartet also nichts auf Sie. Öffnen Sie das Portal unter der Adresse, von der Ihre Einladung kam, und melden Sie sich mit derselben E-Mail-Adresse an.", es: "Tu invitación ya está aceptada, así que no hay nada pendiente. Abre el portal en la dirección desde la que llegó tu invitación e inicia sesión con este mismo correo.", ca: "La teva invitació ja està acceptada, així que no hi ha res pendent. Obre el portal a l'adreça des d'on va arribar la invitació i inicia sessió amb aquest mateix correu."},
  "an account": { de: "ein Kunde", es: "una cuenta", ca: "un compte"},
  "a ticket type": { de: "ein Tickettyp", es: "un tipo de ticket", ca: "un tipus de tiquet"},
  "an app": { de: "eine App", es: "una aplicación", ca: "una aplicació"},
  "expired {date}": { de: "abgelaufen am {date}", es: "caducado el {date}", ca: "caducat el {date}"},
  "last used {when}": { de: "zuletzt verwendet {when}", es: "usado por última vez {when}", ca: "usat per última vegada {when}"},
  "never used": { de: "nie verwendet", es: "nunca usado", ca: "mai usat"},
  "open ticket": { de: "offenes Ticket", es: "ticket abierto", ca: "tiquet obert"},
  "open tickets": { de: "offene Tickets", es: "tickets abiertos", ca: "tiquets oberts"},
  "who raised it": { de: "wer es gemeldet hat", es: "quién lo planteó", ca: "qui ho va plantejar"},
  "works until {date}": { de: "gültig bis {date}", es: "válido hasta el {date}", ca: "vàlid fins al {date}"},
  "{count} accounts match": { de: "{count} Kunden passen", es: "{count} cuentas coinciden", ca: "{count} comptes coincideixen"},
  "{count} meetings match": { de: "{count} Besprechungen passen", es: "{count} reuniones coinciden", ca: "{count} reunions coincideixen"},
  "{count} processes match": { de: "{count} Prozesse passen", es: "{count} procesos coinciden", ca: "{count} processos coincideixen"},
  "{count} sources match": { de: "{count} Quellen passen", es: "{count} fuentes coinciden", ca: "{count} fonts coincideixen"},
  "{count} stories match": { de: "{count} Storys passen", es: "{count} historias coinciden", ca: "{count} històries coincideixen"},
  "{count} tickets match": { de: "{count} Tickets passen", es: "{count} tickets coinciden", ca: "{count} tiquets coincideixen"},
  "{count} waiting to be read": { de: "{count} warten auf Bearbeitung", es: "{count} esperando ser leídos", ca: "{count} esperant ser llegits"},
  "{count} waiting to be read, the oldest {days} days": { de: "{count} warten auf Bearbeitung, das älteste seit {days} Tagen", es: "{count} esperando ser leídos, el más antiguo desde hace {days} días", ca: "{count} esperant ser llegits, el més antic fa {days} dies"},
  "{created} added · {skipped} skipped · {failed} failed": { de: "{created} hinzugefügt · {skipped} übersprungen · {failed} fehlgeschlagen", es: "{created} añadidos · {skipped} omitidos · {failed} fallidos", ca: "{created} afegits · {skipped} omesos · {failed} fallits"},
  "{name} is on triage this week": { de: "{name} macht diese Woche die Triage", es: "{name} está de triaje esta semana", ca: "{name} fa el triatge aquesta setmana"},

  /* ── THE TICKET STRIP'S NEW TABS AND THEIR TWO SECOND BODIES (2026-09-06) ──
     Thirteen sentences, hand-written here in all three languages in the same
     commit that adds them, so R44's ceiling does not move: a string seeded in
     German, Spanish and Catalan is ANSWERED, and the count of unanswered
     strings is what the pin records.

     THE VOCABULARY FOLLOWS THE GERMAN THE AGENCY ALREADY USES with its German
     clients, per this file's own rule about lifting rather than translating:
     a ticket stays "Ticket", a stage word stays plain and short, and "Board"
     is the word German product teams say for a Kanban board — "Tafel" would be
     a blackboard.

     "Ready" AND "Waiting" ARE STAGES, NOT ADJECTIVES, which is why they are
     not "Bereit"/"Wartend": the tab names a PILE of tickets, and the German for
     that pile is what the agency already says about work that is finished and
     unsent ("Fertig") and work where the ball is with the client
     ("Wartet auf Kunde" is the sentence; the tab has room for "Wartend" only,
     and the icon beside it carries the rest). Aurora's Spanish and Catalan
     follow the same register: short, sentence case, one word per tab. */
  /* "Ready" AND "Scheduled" ARE NOT REPEATED HERE — both were already seeded in
     the Statuses block near the top of this file ("Fertig", "Geplant"), which is
     where a ticket's own stage words belong, and a second entry would be a
     second answer waiting to disagree. The tab and the Kanban column read those.
     "Triaged" is genuinely new: the block has "Triage" (the act) and never had
     the state a ticket is left in by it. */
  "Triaged": { de: "Gesichtet", es: "Clasificado", ca: "Classificat" },
  "Waiting": { de: "Wartend", es: "En espera", ca: "En espera" },
  "Board": { de: "Board", es: "Tablero", ca: "Tauler" },
  "Split": { de: "Geteilt", es: "Dividido", ca: "Dividit" },
  "No tickets here yet.": {
    de: "Hier gibt es noch keine Tickets.",
    es: "Aquí todavía no hay tickets.",
    ca: "Aquí encara no hi ha tiquets.",
  },
  "Nothing at this stage.": {
    de: "Nichts in dieser Phase.",
    es: "Nada en esta fase.",
    ca: "Res en aquesta fase.",
  },
  /* THE BOARD'S TWO FOOTNOTES, REWORDED 2026-09-07 — and reseeded in the same
     edit, which is the whole point of doing it here. The client asked for a
     fifth column ("in open, include status ready and waiting"), and Waiting is
     a PREDICATE rather than a stage, so its cards are repeats of cards in the
     four columns beside it. Both sentences now say so. A reader who adds five
     columns up would otherwise get a number larger than the tab's own badge,
     and the alternative — hiding a waiting ticket from the stage it is really
     in — would make the four stage columns lie about the work.
     The two sentences these replace were seeded, so the ceiling does not move:
     `TRANSLATION_CEILING` counts strings with NO answer, and each of these has
     three. Rewording seeded copy costs nothing but the rewording. */
  "Cards are the tickets that matched, as far as they have loaded. Waiting repeats cards from the stages before it. Click a card to open the ticket.": {
    de: "Die Karten sind die Treffer, so weit sie geladen sind. Wartend wiederholt Karten aus den Phasen davor. Klicken Sie auf eine Karte, um das Ticket zu öffnen.",
    es: "Las tarjetas son los tickets que coinciden, hasta donde se han cargado. En espera repite tarjetas de las fases anteriores. Haz clic en una tarjeta para abrir el ticket.",
    ca: "Les targetes són els tiquets que coincideixen, fins on s'han carregat. En espera repeteix targetes de les fases anteriors. Fes clic en una targeta per obrir el tiquet.",
  },
  "Each of the first four columns counts every open ticket at that stage. Waiting repeats those same tickets — the ones where a client owes us an answer — so the columns don't add up to the total. Click a card to open the ticket.": {
    de: "Jede der ersten vier Spalten zählt alle offenen Tickets in dieser Phase. Wartend wiederholt dieselben Tickets — die, bei denen ein Kunde uns eine Antwort schuldet — deshalb ergeben die Spalten zusammen nicht die Gesamtzahl. Klicken Sie auf eine Karte, um das Ticket zu öffnen.",
    es: "Cada una de las primeras cuatro columnas cuenta todos los tickets abiertos en esa fase. En espera repite esos mismos tickets — aquellos en los que un cliente nos debe una respuesta — así que las columnas no suman el total. Haz clic en una tarjeta para abrir el ticket.",
    ca: "Cadascuna de les quatre primeres columnes compta tots els tiquets oberts en aquesta fase. En espera repeteix aquests mateixos tiquets — aquells en què un client ens deu una resposta — així que les columnes no sumen el total. Fes clic en una targeta per obrir el tiquet.",
  },
  /* THE FIFTH COLUMN'S EMPTY LINE. Not "Nothing at this stage." above, because
     waiting is not a stage — the honest empty sentence here is that no client
     owes us an answer, which is good news rather than an absence of rows. */
  "Nothing is waiting on a client.": {
    de: "Es wartet nichts auf einen Kunden.",
    es: "No hay nada a la espera de un cliente.",
    ca: "No hi ha res a l'espera d'un client.",
  },
  "Open the ticket": { de: "Ticket öffnen", es: "Abrir el ticket", ca: "Obre el tiquet" },
  "Ready tickets": { de: "Fertige Tickets", es: "Tickets listos", ca: "Tiquets llestos" },
  "The ticket you are reading": {
    de: "Das Ticket, das Sie gerade lesen",
    es: "El ticket que estás leyendo",
    ca: "El tiquet que estàs llegint",
  },
  "Up and down move between tickets. Enter opens the one you are reading.": {
    de: "Mit Auf und Ab wechseln Sie zwischen Tickets. Mit Enter öffnen Sie das gerade gelesene.",
    es: "Arriba y abajo cambian de ticket. Enter abre el que estás leyendo.",
    ca: "Amunt i avall canvien de tiquet. Enter obre el que estàs llegint.",
  },
  /* ── The screen engine + notes editor, moved app-side by the design-kit swap
     (2026-08-24). These sentences lived in the old library, exempt from the
     walk; moving the code moved the words into R28's territory, and these are
     their translations — hand-written here so no generator run (and no API
     spend) stands between the swap and a German reader. Register per the note
     above: plain, short, sentence case. */
  "Bold": { de: "Fett", es: "Negrita", ca: "Negreta" },
  "Italic": { de: "Kursiv", es: "Cursiva", ca: "Cursiva" },
  "Highlight": { de: "Hervorheben", es: "Resaltar", ca: "Ressaltar" },
  "Bullet list": { de: "Aufzählung", es: "Lista con viñetas", ca: "Llista amb pics" },
  "Numbered list": { de: "Nummerierte Liste", es: "Lista numerada", ca: "Llista numerada" },
  "Separator": { de: "Trennlinie", es: "Separador", ca: "Separador" },
  "Showing {shown} of {total}": { de: "{shown} von {total} angezeigt", es: "Mostrando {shown} de {total}", ca: "Es mostren {shown} de {total}" },
  "Page {page} of {pages}": { de: "Seite {page} von {pages}", es: "Página {page} de {pages}", ca: "Pàgina {page} de {pages}" },
  "Prev": { de: "Zurück", es: "Anterior", ca: "Anterior" },
  "Next": { de: "Weiter", es: "Siguiente", ca: "Següent" },
  "Sort": { de: "Sortieren", es: "Ordenar", ca: "Ordenar" },
  "Filters": { de: "Filter", es: "Filtros", ca: "Filtres" },
  "Min": { de: "Min.", es: "Mín.", ca: "Mín." },
  "Max": { de: "Max.", es: "Máx.", ca: "Màx." },
  "Actions": { de: "Aktionen", es: "Acciones", ca: "Accions" },
  "Are you sure?": { de: "Sind Sie sicher?", es: "¿Está seguro?", ca: "N'esteu segur?" },
  "AI drafted": { de: "KI-Entwurf", es: "Borrador de IA", ca: "Esborrany d'IA" },
  // The waves toolbar and the theme control, hand-written for the same reason
  // everything else here is: the machine translator spends the owner's own key.
  "Appearance": { de: "Darstellung", es: "Apariencia", ca: "Aparença" },
  "Plan a sprint": { de: "Sprint planen", es: "Planificar un sprint", ca: "Planificar un sprint" },
  "Search waves…": { de: "Wellen durchsuchen…", es: "Buscar waves…", ca: "Cercar waves…" },
  "Sort by": { de: "Sortieren nach", es: "Ordenar por", ca: "Ordenar per" },
  "Start": { de: "Start", es: "Inicio", ca: "Inici" },
  "Sprint planned, and it is in this wave.": {
    de: "Sprint geplant und in dieser Welle.",
    es: "Sprint planificado y dentro de esta wave.",
    ca: "Sprint planificat i dins d'aquesta wave.",
  },
  "When it runs": { de: "Wann sie läuft", es: "Cuándo se ejecuta", ca: "Quan s'executa" },
  // Where a new step lands. "Beside" is the whole gesture that draws a fork, so
  // it is a sentence with a hole rather than a word beside a name — the hole is
  // the only shape a translator can move.
  // The step form's shape question, asked in whole sentences because a fragment
  // is not something a translator can reorder around anything.
  "It is an alternative to": {
    de: "Es ist eine Alternative zu",
    es: "Es una alternativa a",
    ca: "És una alternativa a",
  },
  "This way is taken when": {
    de: "Dieser Weg wird gewählt, wenn",
    es: "Este camino se toma cuando",
    ca: "Aquest camí es pren quan",
  },
  // The flowchart's own line on a step that sends the work back. `{n}` is the
  // step NUMBER a reader can see on the box above, so the hole stays a hole in
  // every language and the sentence reorders around it.
  "sends it back to step {n}": {
    de: "geht zurück zu Schritt {n}",
    es: "lo devuelve al paso {n}",
    ca: "el retorna al pas {n}",
  },
  /* ── The client's thread, on the kit's own conversation ────────────────
   * Six sentences the portal's ticket screen gained when its hand-rolled
   * thread was replaced by `structures/portal-conversation`: the shape's three
   * registers, the approval band's note, and the composer's line saying who
   * reads what you type (kit ch27.10). The agency's NAME is a hole, because
   * this base is forked per product and a hardcoded "kwapso" would be wrong in
   * the second one — and because a hole is the only shape a translator can
   * reorder. */
  "No replies yet": { de: "Noch keine Antworten", es: "Aún no hay respuestas", ca: "Encara no hi ha respostes" },
  "Write below and we'll see it.": {
    de: "Schreiben Sie unten, dann sehen wir es.",
    es: "Escribe abajo y lo veremos.",
    ca: "Escriu a sota i ho veurem.",
  },
  "We can't show this right now": {
    de: "Das lässt sich gerade nicht anzeigen",
    es: "Ahora mismo no podemos mostrar esto",
    ca: "Ara mateix no podem mostrar això",
  },
  "Try again in a moment.": {
    de: "Bitte in einem Moment erneut versuchen.",
    es: "Inténtalo de nuevo en un momento.",
    ca: "Torna-ho a provar d'aquí a un moment.",
  },
  "{name} will see this": { de: "{name} sieht das", es: "{name} lo verá", ca: "{name} ho veurà" },

  /* ── Filled 2026-08-30 via Workers AI (feat/i18n-fill) ──────
   * 308 strings that had no translation in any of the three languages,
   * translated through the app's own Cloudflare allowance (@cf/openai/gpt-oss-120b
   * over the ai/run REST door), grounded in shared/glossary.ts, and spot-checked
   * by hand. See the commit body for the neuron spend and the spot check. */
  "1 role": { de: "1 Rolle", es: "1 rol", ca: "1 rol" },
  "1 sprint": { de: "1 Sprint", es: "1 sprint", ca: "1 sprint" },
  "A job in their company. Leave the cost empty if nobody knows it yet.": {
    de: "Ein Auftrag in ihrem Unternehmen. Lassen Sie die Kosten leer, falls niemand den Betrag kennt.",
    es: "Un trabajo en su empresa. Deja el costo vacío si nadie lo sabe todavía.",
    ca: "Una feina a la seva empresa. Deixa el preu buit si ningú el coneix encara.",
  },
  "A link on its own gives the assistant nothing to read — we don't open the page for you. Paste or write what it says above and this source is good to go.": {
    de: "Ein Link allein liefert dem Assistenten nichts zum Lesen — wir öffnen die Seite nicht für Sie. Fügen Sie ein, was oben steht, oder schreiben Sie es, dann ist diese Quelle fertig.",
    es: "Un enlace por sí solo no le da nada al asistente para leer — no abrimos la página por ti. Pega o escribe lo que dice arriba y esta fuente queda lista.",
    ca: "Un enllaç per si sol no dóna res a l'assistent per llegir — no obrim la pàgina per a tu. Enganxa o escriu el que diu a dalt i aquesta font queda llesta.",
  },
  "A meeting we already hold": {
    de: "Ein Termin, den wir bereits halten",
    es: "Una reunión que ya tenemos",
    ca: "Una reunió que ja tenim",
  },
  "A package of sprints an account bought. You'll plan the sprints inside it next.": {
    de: "Ein Paket aus Sprints, das ein Kunde gekauft hat. Sie planen als Nächstes die Sprints darin.",
    es: "Un paquete de sprints que una cuenta compró. A continuación planearás los sprints dentro de él.",
    ca: "Un paquet de sprints que un compte ha comprat. A continuació planificaràs els sprints dins d'ell.",
  },
  "A part of their company, like Operations or Finance.": {
    de: "Ein Teil ihres Unternehmens, zum Beispiel Operations oder Finanzen.",
    es: "Una parte de su empresa, como Operaciones o Finanzas.",
    ca: "Una part de la seva empresa, com Operacions o Finances.",
  },
  "A price needs a number.": {
    de: "Ein Preis benötigt eine Zahl.",
    es: "Un precio necesita un número.",
    ca: "Un preu necessita un número.",
  },
  "A signpost, not a rule. Nothing about either map's times or savings changes because of it.": {
    de: "Ein Hinweis, keine Regel. Nichts an den Zeiten oder Einsparungen beider Karten ändert sich dadurch.",
    es: "Una señal, no una regla. Nada de los tiempos o ahorros de ninguno de los mapas cambia por ello.",
    ca: "Una senyal, no una regla. Res dels temps o estalvis de cap dels mapes canvia a causa seva.",
  },
  "Access switched on, and we've emailed them the link.": {
    de: "Zugriff aktiviert, und wir haben ihnen den Link per E‑Mail geschickt.",
    es: "Acceso activado, y les hemos enviado el enlace por correo.",
    ca: "Accés activat, i els hem enviat l'enllaç per correu.",
  },
  "Access switched on.": { de: "Zugriff aktiviert.", es: "Acceso activado.", ca: "Accés activat." },
  "Access switched on. We couldn't send the email, tell them the address yourself.": {
    de: "Zugriff aktiviert. Wir konnten die E‑Mail nicht senden, teilen Sie ihnen die Adresse selbst mit.",
    es: "Acceso activado. No pudimos enviar el correo, diles la dirección tú mismo.",
    ca: "Accés activat. No hem pogut enviar el correu, digues-los l'adreça tu mateix.",
  },
  "Add a department": {
    de: "Abteilung hinzufügen",
    es: "Añade un departamento",
    ca: "Afegeix un departament",
  },
  "Add a role": { de: "Rolle hinzufügen", es: "Añade un rol", ca: "Afegeix un rol" },
  "Add a tool": { de: "Werkzeug hinzufügen", es: "Añade una herramienta", ca: "Afegeix una eina" },
  "Add department": {
    de: "Abteilung hinzufügen",
    es: "Añadir departamento",
    ca: "Afegir departament",
  },
  "Add or edit their roles and tools": {
    de: "Rollen und Werkzeuge hinzufügen oder bearbeiten",
    es: "Añade o edita sus roles y herramientas",
    ca: "Afegeix o edita els seus rols i eines",
  },
  "Add role": { de: "Rolle hinzufügen", es: "Añade rol", ca: "Afegeix rol" },
  "Add tool": { de: "Werkzeug hinzufügen", es: "Añade herramienta", ca: "Afegeix eina" },
  "Added by Gmail": {
    de: "Hinzugefügt von Gmail",
    es: "Añadido por Gmail",
    ca: "Afegit per Gmail",
  },
  "All of your mail": { de: "Alle Ihre E-Mails", es: "Todo tu correo", ca: "Tot el teu correu" },
  "Already in reach. Take it away on the card behind this one.": {
    de: "Bereits erreichbar. Entfernen Sie es auf der Karte dahinter.",
    es: "Ya está al alcance. Quítalo en la tarjeta detrás de esta.",
    ca: "Ja és a l'abast. Retira'l a la targeta que hi ha darrere d'aquesta.",
  },
  "Already syncing on another device. Try again in a moment.": {
    de: "Synchronisiert bereits auf einem anderen Gerät. Versuchen Sie es in einem Moment erneut.",
    es: "Ya se está sincronizando en otro dispositivo. Inténtalo de nuevo en un momento.",
    ca: "Ja s'està sincronitzant en un altre dispositiu. Torna-ho a intentar d'aquí a un moment.",
  },
  "Also held by somebody who is no longer a contact here.": {
    de: "Auch gehalten von jemandem, der hier kein Kontakt mehr ist.",
    es: "También retenido por alguien que ya no es un contacto aquí.",
    ca: "També retenit per algú que ja no és un contacte aquí.",
  },
  "Also in a department that has been switched off.": {
    de: "Auch in einer Abteilung, die deaktiviert wurde.",
    es: "También en un departamento que ha sido desactivado.",
    ca: "També en un departament que s'ha desactivat.",
  },
  "An admin can invite you back — ask them to send a new invite to this email address.": {
    de: "Ein Administrator kann Sie erneut einladen — bitten Sie ihn, eine neue Einladung an diese E‑Mail‑Adresse zu senden.",
    es: "Un administrador puede invitarte de nuevo — pídele que envíe una nueva invitación a esta dirección de correo.",
    ca: "Un administrador pot tornar a convidar-te — demana-li que enviï una nova invitació a aquesta adreça de correu.",
  },
  "Anything a step uses. Set what it costs afterwards, from the day that price started.": {
    de: "Alles, was ein Schritt verwendet. Legen Sie anschließend fest, was es kostet, ab dem Tag, an dem der Preis begann.",
    es: "Cualquier cosa que use un paso. Establece su costo después, a partir del día en que empezó el precio.",
    ca: "Qualsevol cosa que utilitzi un pas. Defineix el seu cost després, a partir del dia que va començar el preu.",
  },
  "Applying will put {kept} of {total} steps on the map.": {
    de: "Durch Anwenden werden {kept} von {total} Schritten auf die Karte gesetzt.",
    es: "Aplicar pondrá {kept} de {total} pasos en el mapa.",
    ca: "Aplicar posarà {kept} de {total} passos al mapa.",
  },
  "Archived tickets keep their history and stay searchable. They don't count toward the figures above.": {
    de: "Archivierte Tickets behalten ihre Historie und bleiben durchsuchbar. Sie werden nicht in die obigen Zahlen einbezogen.",
    es: "Los tickets archivados conservan su historial y siguen siendo buscables. No cuentan para las cifras anteriores.",
    ca: "Els tickets arxivats conserven el seu historial i segueixen sent cercables. No compten per a les xifres anteriors.",
  },
  "As it is today": { de: "Wie es heute ist", es: "Como es hoy", ca: "Com és avui" },
  "As it was on": { de: "Wie es war am", es: "Como era el", ca: "Com era el" },
  "Ask about this record…": {
    de: "Fragen Sie zu diesem Datensatz…",
    es: "Pregunta sobre este registro…",
    ca: "Pregunta sobre aquest registre…",
  },
  /* The assistant's own "+" tab and its scope picker (client ruling,
   * 15 Sep 2026 — see web/lib/agent-conversation-tabs.ts and
   * web/components/assistant/agent-scope-picker.tsx). TRANSLATION_CEILING
   * stays at 0/0/0, so every one of these carries all three languages. */
  "New conversation": { de: "Neue Unterhaltung", es: "Nueva conversación", ca: "Nova conversa" },
  "What should this conversation read?": {
    de: "Was soll dieses Gespräch lesen?",
    es: "¿Qué debe leer esta conversación?",
    ca: "Què ha de llegir aquesta conversa?",
  },
  "This record": { de: "Dieser Datensatz", es: "Este registro", ca: "Aquest registre" },
  "Picks up the record you're viewing": {
    de: "Greift auf den Datensatz zu, den Sie sich gerade ansehen",
    es: "Toma el registro que estás viendo",
    ca: "Agafa el registre que estàs veient",
  },
  "Articles and indexed files": {
    de: "Artikel und indexierte Dateien",
    es: "Artículos y archivos indexados",
    ca: "Articles i fitxers indexats",
  },
  "Everything (today's default)": {
    de: "Alles (heutige Standardeinstellung)",
    es: "Todo (opción predeterminada actual)",
    ca: "Tot (opció predeterminada actual)",
  },
  "All six sources, untick later": {
    de: "Alle sechs Quellen, später abwählen",
    es: "Las seis fuentes, puedes desmarcarlas después",
    ca: "Les sis fonts, les pots desmarcar després",
  },
  "Open conversations": { de: "Offene Unterhaltungen", es: "Conversaciones abiertas", ca: "Converses obertes" },
  /* The pinned clock tab and its own body (client ruling, 15 Sep 2026, same
   * day — see web/lib/agent-conversation-tabs.ts and
   * web/components/assistant/agent-history-tab.tsx). "Today" and "Earlier"
   * were already seeded elsewhere in this file; these are the other two day
   * buckets plus the tab's own label, search placeholder and row meta line. */
  "History": { de: "Verlauf", es: "Historial", ca: "Historial" },
  "Search conversations…": {
    de: "Unterhaltungen durchsuchen…",
    es: "Buscar conversaciones…",
    ca: "Cerca converses…",
  },
  "Yesterday": { de: "Gestern", es: "Ayer", ca: "Ahir" },
  "Last week": { de: "Letzte Woche", es: "La semana pasada", ca: "La setmana passada" },
  "Created {created} · Last used {lastUsed}": {
    de: "Erstellt {created} · Zuletzt verwendet {lastUsed}",
    es: "Creado {created} · Usado por última vez {lastUsed}",
    ca: "Creat {created} · Usat per última vegada {lastUsed}",
  },
  "Asking a question needs the assistant": {
    de: "Um eine Frage zu stellen, benötigen Sie den Assistenten",
    es: "Para hacer una pregunta necesitas el asistente",
    ca: "Per fer una pregunta necessites l'assistent",
  },
  "Audit date moved.": {
    de: "Audit-Datum verschoben.",
    es: "Fecha de auditoría cambiada.",
    ca: "Data d’auditoria canviada.",
  },
  "Back to today": { de: "Zurück zu heute", es: "Volver a hoy", ca: "Torna a avui" },
  "Birthdays": { de: "Geburtstage", es: "Cumpleaños", ca: "Aniversaris" },
  "Bring back": { de: "Zurückbringen", es: "Recuperar", ca: "Recuperar" },
  "Change the audit date": {
    de: "Audit-Datum ändern",
    es: "Cambiar la fecha de auditoría",
    ca: "Canvia la data d’auditoria",
  },
  "Change the date": { de: "Datum ändern", es: "Cambiar la fecha", ca: "Canvia la data" },
  "Changes a step you already have": {
    de: "Ändert einen Schritt, den Sie bereits haben",
    es: "Cambia un paso que ya tienes",
    ca: "Canvia un pas que ja tens",
  },
  "Choose what {brand} may read": {
    de: "Wählen Sie, was {brand} lesen darf",
    es: "Elige lo que {brand} puede leer",
    ca: "Tria el que {brand} pot llegir",
  },
  "Clear filters": { de: "Filter löschen", es: "Borrar filtros", ca: "Esborra filtres" },
  "Compare": { de: "Vergleichen", es: "Comparar", ca: "Comparar" },
  "Connect a process": {
    de: "Einen Prozess verbinden",
    es: "Conectar un proceso",
    ca: "Connecta un procés",
  },
  "Connected processes": {
    de: "Verbundene Prozesse",
    es: "Procesos conectados",
    ca: "Processos connectats",
  },
  "Cost": { de: "Kosten", es: "Costo", ca: "Cost" },
  "Cost an hour": { de: "Kosten pro Stunde", es: "Costo por hora", ca: "Cost per hora" },
  "Cost an hour not set yet": {
    de: "Kosten pro Stunde noch nicht festgelegt",
    es: "Costo por hora no establecido aún",
    ca: "Cost per hora encara no establert",
  },
  "Couldn't apply that.": {
    de: "Das konnte nicht angewendet werden.",
    es: "No se pudo aplicar eso.",
    ca: "No s’ha pogut aplicar això.",
  },
  "Couldn't change that wave.": {
    de: "Diese Wave konnte nicht geändert werden.",
    es: "No se pudo cambiar esa wave.",
    ca: "No s’ha pogut canviar aquesta wave.",
  },
  "Couldn't connect those.": {
    de: "Diese konnten nicht verbunden werden.",
    es: "No se pudieron conectar esos.",
    ca: "No s’han pogut connectar aquests.",
  },
  "Couldn't delete it.": {
    de: "Das konnte nicht gelöscht werden.",
    es: "No se pudo eliminar eso.",
    ca: "No s’ha pogut eliminar això.",
  },
  "Couldn't disconnect those.": {
    de: "Diese konnten nicht getrennt werden.",
    es: "No se pudieron desconectar esos.",
    ca: "No s’han pogut desconnectar aquests.",
  },
  "Couldn't list those.": {
    de: "Diese konnten nicht aufgelistet werden.",
    es: "No se pudieron listar esos.",
    ca: "No s’han pogut llistar aquests.",
  },
  "Couldn't load the wave.": {
    de: "Die Wave konnte nicht geladen werden.",
    es: "No se pudo cargar la wave.",
    ca: "No s’ha pogut carregar la wave.",
  },
  "Couldn't load the waves.": {
    de: "Die Waves konnten nicht geladen werden.",
    es: "No se pudieron cargar las Waves.",
    ca: "No s’han pogut carregar les Waves.",
  },
  "Couldn't move the date.": {
    de: "Das Datum konnte nicht verschoben werden.",
    es: "No se pudo mover la fecha.",
    ca: "No s’ha pogut moure la data.",
  },
  "Couldn't read that call.": {
    de: "Den Aufruf konnte nicht gelesen werden.",
    es: "No se pudo leer esa llamada.",
    ca: "No s’ha pogut llegir aquesta trucada.",
  },
  "Couldn't save the wave.": {
    de: "Die Wave konnte nicht gespeichert werden.",
    es: "No se pudo guardar la wave.",
    ca: "No s’ha pogut guardar la wave.",
  },
  "Couldn't throw that away.": {
    de: "Das konnte nicht verworfen werden.",
    es: "No se pudo desechar eso.",
    ca: "No s’ha pogut rebutjar això.",
  },
  "Delete \"{step}\" completely?": {
    de: "\"{step}\" vollständig löschen?",
    es: "¿Eliminar \"{step}\" completamente?",
    ca: "¿Eliminar \"{step}\" completament?",
  },
  "Delete it": { de: "Löschen Sie es", es: "Elimínalo", ca: "Elimina-ho" },
  "Departments": { de: "Abteilungen", es: "Departamentos", ca: "Departaments" },
  "Dispatch clerk": {
    de: "Versandmitarbeiter",
    es: "Empleado de envíos",
    ca: "Empleat d'enviaments",
  },
  "Edit a department": {
    de: "Abteilung bearbeiten",
    es: "Editar departamento",
    ca: "Editar departament",
  },
  "Edit a role": { de: "Rolle bearbeiten", es: "Editar rol", ca: "Editar rol" },
  "Edit a tool": { de: "Werkzeug bearbeiten", es: "Editar herramienta", ca: "Editar eina" },
  "Edit wave": { de: "Wave bearbeiten", es: "Editar wave", ca: "Editar wave" },
  "Email them the link to sign in": {
    de: "Senden Sie ihnen den Link zum Anmelden",
    es: "Envíales el enlace para iniciar sesión",
    ca: "Envia'ls l'enllaç per iniciar sessió",
  },
  "Enter your code": {
    de: "Geben Sie Ihren Code ein",
    es: "Introduce tu código",
    ca: "Introdueix el teu codi",
  },
  "Every": { de: "Alle", es: "Cada", ca: "Cada" },
  "Every message in the mailbox is in reach. This is how it works today.": {
    de: "Jede Nachricht im Postfach ist erreichbar. So funktioniert es heute.",
    es: "Cada mensaje en el buzón está al alcance. Así funciona hoy.",
    ca: "Cada missatge a la bústia està al abast. Així funciona avui.",
  },
  "Every saving on this map is measured from this day, here and on the client's own portal. Moving it changes those figures without changing a single step.": {
    de: "Jede Einsparung auf dieser map wird ab diesem Tag, hier und im Portal des Kunden gemessen. Das Verschieben ändert diese Zahlen, ohne einen einzigen Schritt zu ändern.",
    es: "Cada ahorro en este map se mide a partir de hoy, aquí y en el portal propio del cliente. Moverlo cambia esas cifras sin modificar un solo paso.",
    ca: "Cada estalvi en aquest map es mesura a partir d'avui, aquí i al portal propi del client. Moure'l canvia aquestes xifres sense canviar cap pas.",
  },
  "Flights and bookings Gmail put there itself.": {
    de: "Flüge und Buchungen, die Gmail dort selbst ablegt.",
    es: "Vuelos y reservas que Gmail coloca allí mismo.",
    ca: "Vols i reserves que Gmail posa allà mateix.",
  },
  "Flow": { de: "Ablauf", es: "Flujo", ca: "Flux" },
  "Focus time": { de: "Fokuszeit", es: "Tiempo de foco", ca: "Temps de focus" },
  "For a step added by mistake: it disappears from the map and its history, as if it was never added, and this cannot be undone. A step that is already part of an agreed version, or that another step sends work back to, can only be switched off.": {
    de: "Für einen versehentlich hinzugefügten Schritt: Er verschwindet aus der Karte und seinem Verlauf, als wäre er nie hinzugefügt worden, und das kann nicht rückgängig gemacht werden. Ein Schritt, der bereits Teil einer vereinbarten Version ist oder zu dem ein anderer Schritt die Arbeit zurücksendet, kann nur deaktiviert werden.",
    es: "Para un paso añadido por error: desaparece del mapa y su historial, como si nunca se hubiera añadido, y no se puede deshacer. Un paso que ya forma parte de una versión acordada o al que otro paso envía trabajo de vuelta, solo se puede desactivar.",
    ca: "Per a un pas afegit per error: desapareix del mapa i del seu historial, com si mai s’hagués afegit, i no es pot desfer. Un pas que ja forma part d’una versió acordada o al qual un altre pas envia treball enrere, només es pot desactivar.",
  },
  "From": { de: "Von", es: "De", ca: "De" },
  "From the day this price started. An older map keeps reading the price that applied then.": {
    de: "Ab dem Tag, an dem dieser Preis begann. Eine ältere Karte liest weiterhin den Preis, der damals galt.",
    es: "Desde el día en que empezó este precio. Un mapa antiguo sigue leyendo el precio que se aplicaba entonces.",
    ca: "Des del dia en què va començar aquest preu. Un mapa antic continua llegint el preu que s’aplicava llavors.",
  },
  "From your contacts, every year.": {
    de: "Von Ihren Kontakten, jedes Jahr.",
    es: "De tus contactos, cada año.",
    ca: "Des dels teus contactes, cada any.",
  },
  "Held by": { de: "Verwaltet von", es: "Mantenido por", ca: "Mantingut per" },
  "Home, office, elsewhere.": {
    de: "Zuhause, Büro, anderswo.",
    es: "Casa, oficina, otro lugar.",
    ca: "Casa, oficina, altre lloc.",
  },
  "Hours a month, by app": {
    de: "Stunden pro Monat, nach App",
    es: "Horas al mes, por app",
    ca: "Hores al mes, per app",
  },
  "Hours a month, by process": {
    de: "Stunden pro Monat, nach Prozess",
    es: "Horas al mes, por proceso",
    ca: "Hores al mes, per procés",
  },
  "How much to read": { de: "Wie viel zu lesen", es: "Cuánto leer", ca: "Quant a llegir" },
  "How often it happens": {
    de: "Wie oft es passiert",
    es: "Con qué frecuencia ocurre",
    ca: "Com sovint passa",
  },
  "HubSpot": { de: "HubSpot", es: "HubSpot", ca: "HubSpot" },
  "I couldn't answer that one.": {
    de: "Ich konnte das nicht beantworten.",
    es: "No pude responder a esa.",
    ca: "No vaig poder respondre a aquesta.",
  },
  "In reach": { de: "In Reichweite", es: "Alcanzable", ca: "A l'abast" },
  "It carries on after everything": {
    de: "Es geht nach allem weiter",
    es: "Continúa después de todo",
    ca: "Continua després de tot",
  },
  "It carries on from": { de: "Es geht weiter von", es: "Continúa desde", ca: "Continua des de" },
  "It carries on from one side of a split": {
    de: "Es geht von einer Seite einer Teilung weiter",
    es: "Continúa desde un lado de una división",
    ca: "Continua des d'un costat d'una divisió",
  },
  "It hands its work to": {
    de: "Es übergibt seine Arbeit an",
    es: "Entrega su trabajo a",
    ca: "Passa la seva feina a",
  },
  "It has paused for a moment to catch up. Give it a minute and ask again — nothing you did caused this and nothing was lost.": {
    de: "Es hat kurz pausiert, um aufzuholen. Geben Sie ihm eine Minute und fragen Sie erneut – nichts, was Sie getan haben, hat das verursacht, und es ging nichts verloren.",
    es: "Se ha detenido un momento para ponerse al día. Déle un minuto y pregunte de nuevo — nada de lo que hiciste causó esto y no se perdió nada.",
    ca: "S'ha aturat un moment per posar-se al dia. Dona-li un minut i torna a preguntar — res del que vas fer va causar això i no s'ha perdut res.",
  },
  "It is one side of a split": {
    de: "Es ist eine Seite einer Teilung",
    es: "Es un lado de una división",
    ca: "És un costat d'una divisió",
  },
  "It stops being offered when a sprint is filed, and stays on the record with everything already in it. You can bring it back.": {
    de: "Es wird nicht mehr angeboten, wenn ein Sprint archiviert wird, und bleibt im Datensatz mit allen bereits enthaltenen Informationen. Sie können es zurückholen.",
    es: "Deja de estar disponible cuando se archiva un sprint, y permanece en el registro con todo lo que ya contiene. Puedes recuperarlo.",
    ca: "Deixa d'estar disponible quan s'arxiva un sprint i queda al registre amb tot el que ja conté. Pots tornar-lo a recuperar.",
  },
  "It stops being offered, and nothing that already refers to it changes. You can bring it back.": {
    de: "Es wird nicht mehr angeboten, und nichts, das bereits darauf verweist, ändert sich. Sie können es zurückholen.",
    es: "Deja de estar disponible, y nada que ya haga referencia a ello cambia. Puedes recuperarlo.",
    ca: "Deixa d'estar disponible, i res que ja en faci referència canvia. Pots tornar-lo a recuperar.",
  },
  "Its connection was refused, so trying again won't help. Someone who looks after the account behind the assistant will need to switch it back on.": {
    de: "Seine Verbindung wurde verweigert, daher hilft ein erneuter Versuch nicht. Jemand, der das Konto hinter dem Assistenten verwaltet, muss es wieder aktivieren.",
    es: "Su conexión fue rechazada, así que intentar de nuevo no servirá. Alguien que administre la cuenta detrás del asistente tendrá que volver a activarla.",
    ca: "La seva connexió va ser refusada, així que tornar a intentar-ho no servirà. Algú que gestioni el compte darrere de l'assistent haurà de tornar-lo a activar.",
  },
  "Keep all": { de: "Alle behalten", es: "Mantener todo", ca: "Mantenir tot" },
  "Keeping": { de: "Behalten", es: "Manteniendo", ca: "Mantenint" },
  "Keeping {kept} of {total}.": {
    de: "Behalte {kept} von {total}.",
    es: "Manteniendo {kept} de {total}.",
    ca: "Mantenint {kept} de {total}.",
  },
  "Leave all out": { de: "Alle weglassen", es: "Dejar todo fuera", ca: "Deixar tot fora" },
  "Leave blank to list your calendars": {
    de: "Leer lassen, um Ihre Kalender aufzulisten",
    es: "Déjalo en blanco para listar tus calendarios",
    ca: "Deixa en blanc per llistar els teus calendaris",
  },
  "Leave blank to list your labels": {
    de: "Leer lassen, um Ihre Labels aufzulisten",
    es: "Déjalo en blanco para listar tus etiquetas",
    ca: "Deixa en blanc per llistar les teves etiquetes",
  },
  "Leaving out": { de: "Auslassen", es: "Omitiendo", ca: "Ometent" },
  "Let go of what was already read": {
    de: "Lassen Sie das los, was bereits gelesen wurde",
    es: "Deja lo que ya se ha leído",
    ca: "Deixa el que ja s'ha llegit",
  },
  "Mail outside those labels is never fetched, not even to be ignored. Name none and no mail is read at all.": {
    de: "E-Mails außerhalb dieser Labels werden niemals abgerufen, nicht einmal zum Ignorieren. Benennen Sie keine, und es werden keine E-Mails gelesen.",
    es: "El correo fuera de esas etiquetas nunca se recupera, ni siquiera para ignorarlo. No nombres ninguna y no se leerá ningún correo.",
    ca: "El correu fora d'aquestes etiquetes mai s'ha d'obtenir, ni tan sols per ignorar-lo. No en nomenis cap i no es llegirà cap correu.",
  },
  "Mail to or from someone on one of your accounts, plus Google's own notices about shared documents and recordings. Narrow it further to particular labels below.": {
    de: "E-Mails an oder von jemandem aus einem Ihrer Konten, plus Googles eigene Benachrichtigungen zu geteilten Dokumenten und Aufzeichnungen. Eingrenzen Sie es weiter zu bestimmten Labels unten.",
    es: "Correo a o de alguien de una de tus cuentas, más los avisos propios de Google sobre documentos y grabaciones compartidas. Limítalo más a etiquetas específicas a continuación.",
    ca: "Correu a o des de algú d'un dels teus comptes, més els avisos de Google sobre documents i gravacions compartides. Restringeix-ho més a etiquetes concretes a continuació.",
  },
  "Map the processes, build two automations, test, train.": {
    de: "Prozesse abbilden, zwei Automatisierungen erstellen, testen, schulen.",
    es: "Mapea los procesos, crea dos automatizaciones, prueba, forma.",
    ca: "Mapa els processos, crea dues automatitzacions, prova, forma.",
  },
  "Matched to {name} on this account's record.": {
    de: "Zu {name} im Datensatz dieses Kunden zugeordnet.",
    es: "Coincide con {name} en el registro de esta cuenta.",
    ca: "Coincideix amb {name} al registre d'aquest compte.",
  },
  "Measured from": { de: "Gemessen von", es: "Medido desde", ca: "Mesurat des de" },
  "Meetings and appointments": {
    de: "Termine und Verabredungen",
    es: "Reuniones y citas",
    ca: "Reunions i cites",
  },
  "No Google services are connected. Connect them in Settings first.": {
    de: "Keine Google-Dienste sind verbunden. Verbinden Sie sie zuerst in den Einstellungen.",
    es: "No hay servicios de Google conectados. Conéctalos primero en Configuración.",
    ca: "No hi ha serveis de Google connectats. Connecta'ls primer a Configuració.",
  },
  "No calendar is named, so no calendar is read at all.": {
    de: "Kein Kalender ist benannt, daher wird kein Kalender gelesen.",
    es: "No hay ningún calendario nombrado, así que no se lee ningún calendario.",
    ca: "No hi ha cap calendari anomenat, així que no es llegeix cap calendari.",
  },
  "No frequency agreed": {
    de: "Keine Frequenz vereinbart",
    es: "No se acordó frecuencia",
    ca: "No s'ha acordat freqüència",
  },
  "No label is named, so no mail is read at all.": {
    de: "Kein Label ist benannt, daher wird keine E-Mail gelesen.",
    es: "No hay ninguna etiqueta nombrada, así que no se lee ningún correo.",
    ca: "No hi ha cap etiqueta anomenada, així que no es llegeix cap correu.",
  },
  "No money yet — none of these steps says what an hour of the person doing it costs.": {
    de: "Noch kein Geld — keiner dieser Schritte sagt, was eine Stunde der ausführenden Person kostet.",
    es: "Aún no hay dinero — ninguno de estos pasos indica cuánto cuesta una hora de la persona que lo hace.",
    ca: "Encara no hi ha diners — cap d’aquests passos indica quant costa una hora de la persona que l’executa.",
  },
  "No price set yet": {
    de: "Noch kein Preis festgelegt",
    es: "Aún no hay precio",
    ca: "Encara no hi ha preu",
  },
  "No sprint matched.": {
    de: "Kein Sprint gefunden.",
    es: "No se ha encontrado ningún sprint.",
    ca: "No s'ha trobat cap sprint.",
  },
  "No sprints planned yet": {
    de: "Noch keine Sprints geplant",
    es: "Aún no hay sprints planificados",
    ca: "Encara no hi ha sprints planificats",
  },
  "No time agreed": {
    de: "Keine Zeit vereinbart",
    es: "No se ha acordado tiempo",
    ca: "No s'ha acordat cap temps",
  },
  // SPLIT INTO TITLE + DESCRIPTION, 2026-09-03 (R50) — waves-screen.tsx's
  // genuinely-empty state moved from a single sentence to `CollectionEmptyState`
  // (a bold title, then a separate description), which reads the two halves
  // through two `t(...)` calls rather than one. The translations below are the
  // same two halves this entry used to carry combined; nothing was re-thought.
  "No waves yet.": {
    de: "Noch keine Waves.",
    es: "Aún no hay waves.",
    ca: "Encara no hi ha waves.",
  },
  "A wave is a package of sprints an account bought: sell it first, plan the sprints inside it afterwards.": {
    de: "Eine Wave ist ein Paket von Sprints, das ein Kunde gekauft hat: zuerst verkaufen, die Sprints darin danach planen.",
    es: "Una wave es un paquete de sprints que una cuenta ha comprado: véndela primero, planifica los sprints dentro de ella después.",
    ca: "Una wave és un paquet de sprints que un compte ha comprat: ven-la primer, planifica els sprints dins d'ella després.",
  },
  "Nobody named yet": {
    de: "Noch niemand benannt",
    es: "Aún no hay nadie nombrado",
    ca: "Encara no hi ha ningú anomenat",
  },
  "Not one of this account's roles yet. Keeping it changes nothing until somebody records the role.": {
    de: "Noch keine der Rollen dieses Kunden. Das Beibehalten ändert nichts, bis jemand die Rolle erfasst.",
    es: "Aún no hay ninguno de los roles de esta cuenta. Mantenerlo no cambia nada hasta que alguien registre el rol.",
    ca: "Encara no hi ha cap dels rols d'aquest compte. Mantenir-lo no canvia res fins que algú registri el rol.",
  },
  "Not one of this account's tools yet. Keeping it changes nothing until somebody records the tool.": {
    de: "Noch keines der Werkzeuge dieses Kunden. Das Beibehalten ändert nichts, bis jemand das Werkzeug erfasst.",
    es: "Aún no hay ninguna de las herramientas de esta cuenta. Mantenerla no cambia nada hasta que alguien registre la herramienta.",
    ca: "Encara no hi ha cap de les eines d'aquest compte. Mantenir-la no canvia res fins que algú registri l'eina.",
  },
  "Nothing connected. A process that hands its work to another can say so here.": {
    de: "Nichts verbunden. Ein Prozess, der seine Arbeit an einen anderen übergibt, kann das hier angeben.",
    es: "Nada conectado. Un proceso que entrega su trabajo a otro puede indicarlo aquí.",
    ca: "Res connectat. Un procés que entrega la seva feina a un altre pot dir-ho aquí.",
  },
  "Nothing has come back from a client yet.": {
    de: "Noch nichts von einem Kunden zurückgekommen.",
    es: "Aún no ha regresado nada de un cliente.",
    ca: "Encara no ha tornat res d'un client.",
  },
  "Nothing here is on the record yet. Keep what is right, leave out what is not, then apply.": {
    de: "Hier ist noch nichts im Protokoll. Behalten Sie, was richtig ist, lassen Sie, was nicht stimmt, weg und wenden Sie es dann an.",
    es: "Aquí todavía no hay nada registrado. Conserva lo que es correcto, omite lo que no lo es y luego aplícalo.",
    ca: "Encara aquí no hi ha res registrat. Conserva el que és correcte, deixa fora el que no ho és i després aplica-ho.",
  },
  "Nothing is named, so nothing at all would be read. Name one above, or choose the other answer.": {
    de: "Nichts ist benannt, also würde überhaupt nichts gelesen werden. Nennen Sie eines oben oder wählen Sie die andere Antwort.",
    es: "Nada está nombrado, así que no se leería nada. Nombra uno arriba, o elige la otra respuesta.",
    ca: "Res està anomenat, així que no es llegiria res. Anomena’n un a dalt, o tria l’altra resposta.",
  },
  "Nothing is written to the map. You get a proposal to go through, and only what you keep is saved.": {
    de: "Nichts wird auf die Karte geschrieben. Sie erhalten einen Vorschlag zum Durchgehen, und nur das, was Sie behalten, wird gespeichert.",
    es: "Nada se escribe en el mapa. Obtienes una propuesta para revisar, y solo lo que guardas se guarda.",
    ca: "Res s’escriu al mapa. Obteniu una proposta per revisar-la, i només el que guardeu es desa.",
  },
  "Nothing is wrong with your team — this copy of the app hasn't been connected to the assistant yet. Whoever set it up can finish that, and everything else here keeps working in the meantime.": {
    de: "Nichts ist falsch an Ihrem Team — diese Kopie der App wurde noch nicht mit dem Assistant verbunden. Wer sie eingerichtet hat, kann das noch abschließen, und alles andere hier funktioniert in der Zwischenzeit weiter.",
    es: "No hay nada malo con tu team — esta copia de la App aún no está conectada al assistant. Quien la configuró puede terminarlo, y todo lo demás aquí sigue funcionando mientras tanto.",
    ca: "No hi ha res de malament amb el teu team — aquesta còpia de la App encara no s’ha connectat al assistant. Qui la va configurar pot acabar-ho, i tot el que hi ha aquí continua funcionant mentrestant.",
  },
  "Nothing named yet": {
    de: "Noch nichts benannt",
    es: "Nada nombrado todavía",
    ca: "Res anomenat encara",
  },
  "Notice": { de: "Hinweis", es: "Aviso", ca: "Avís" },
  "Nowhere — it carries on": {
    de: "Nirgendwo — es geht weiter",
    es: "En ninguna parte — sigue adelante",
    ca: "Enlloc — continua",
  },
  "Older versions stay exactly as they were agreed.": {
    de: "Ältere Versionen bleiben genau wie vereinbart.",
    es: "Las versiones anteriores se mantienen exactamente como se acordó.",
    ca: "Les versions anteriors es mantenen exactament com es va acordar.",
  },
  "One app is behind this figure.": {
    de: "Eine App steht hinter dieser Zahl.",
    es: "Una App está detrás de esta cifra.",
    ca: "Una App està darrere d’aquest número.",
  },
  "One map has no role on any of its steps, so there is no rate to price it with.": {
    de: "Eine Karte hat keine Rolle in einem ihrer Schritte, daher gibt es keinen Satz, mit dem sie bepreist werden kann.",
    es: "Un mapa no tiene role en ninguno de sus pasos, por lo que no hay tarifa con la que poder valorarlo.",
    ca: "Un mapa no té role en cap dels seus passos, de manera que no hi ha tarifa amb la qual valorar-lo.",
  },
  "One map is behind this figure.": {
    de: "Eine Karte steht hinter dieser Zahl.",
    es: "Un mapa está detrás de esta cifra.",
    ca: "Un mapa està darrere d’aquest número.",
  },
  "Only the calendars you name": {
    de: "Nur die Kalender, die Sie benennen",
    es: "Solo los calendarios que nombres",
    ca: "Només els calendaris que nomenis",
  },
  "Only the labels you name": {
    de: "Nur die Labels, die Sie benennen",
    es: "Solo las etiquetas que nombres",
    ca: "Només les etiquetes que nomenis",
  },
  "Or paste what was said": {
    de: "Oder fügen Sie ein, was gesagt wurde",
    es: "O pega lo que se dijo",
    ca: "O enganxa el que s’ha dit",
  },
  "Ordinary entries. Almost everything.": {
    de: "Gewöhnliche Einträge. Fast alles.",
    es: "Entradas ordinarias. Casi todo.",
    ca: "Entrades ordinàries. Gairebé tot.",
  },
  "Organisation": { de: "Organisation", es: "Organización", ca: "Organització" },
  "Out of office": { de: "Abwesend", es: "Fuera de la oficina", ca: "Fora de l'oficina" },
  "Pagination": { de: "Paginierung", es: "Paginación", ca: "Paginació" },
  "Paste the notes or the transcript of the call.": {
    de: "Fügen Sie die Notizen oder das Transkript des Anrufs ein.",
    es: "Pega las notas o la transcripción de la llamada.",
    ca: "Enganxa les notes o la transcripció de la trucada.",
  },
  "Pick a meeting": {
    de: "Wählen Sie ein Meeting aus",
    es: "Elige una reunión",
    ca: "Tria una reunió",
  },
  "Pick a process": {
    de: "Wählen Sie einen Prozess aus",
    es: "Elige un proceso",
    ca: "Tria un procés",
  },
  "Pick at least one kind, or switch the whole connection off instead.": {
    de: "Wählen Sie mindestens eine Art aus, oder schalten Sie stattdessen die gesamte Verbindung aus.",
    es: "Elige al menos un tipo, o apaga toda la conexión en su lugar.",
    ca: "Tria almenys un tipus, o desactiva tota la connexió en el seu lloc.",
  },
  "Price": { de: "Preis", es: "Precio", ca: "Preu" },
  "Put a sprint in this wave": {
    de: "Fügen Sie einen Sprint in diese Wave ein",
    es: "Añade un sprint a esta wave",
    ca: "Afegeix un sprint a aquesta wave",
  },
  "Read a call": { de: "Lesen Sie einen Anruf", es: "Lee una llamada", ca: "Llegeix una trucada" },
  "Read a call into this map": {
    de: "Lesen Sie einen Anruf in diese Karte ein",
    es: "Lee una llamada en este mapa",
    ca: "Llegeix una trucada en aquest mapa",
  },
  "Rename it, or say more about what the package covers.": {
    de: "Benennen Sie es um, oder geben Sie mehr an, was das Paket abdeckt.",
    es: "Renómbralo, o indica más sobre lo que cubre el paquete.",
    ca: "Canvia el nom, o indica més sobre què cobreix el paquet.",
  },
  "Roles": { de: "Rollen", es: "Roles", ca: "Rols" },
  "Saved. Two sprints in this wave run over each other.": {
    de: "Gespeichert. Zwei Sprints in dieser Wave überschneiden sich.",
    es: "Guardado. Dos sprints en esta wave se superponen.",
    ca: "Desat. Dos sprints en aquesta wave es superposen.",
  },
  "Saved. {count} sources let go — the assistant will read them again from the start.": {
    de: "Gespeichert. {count} Quellen freigegeben — der Assistent wird sie erneut von Anfang an lesen.",
    es: "Guardado. {count} fuentes liberadas — el asistente las volverá a leer desde el principio.",
    ca: "Desat. {count} fonts alliberades — l’assistent les tornarà a llegir des del principi.",
  },
  "Search accounts…": { de: "Kunden durchsuchen…", es: "Buscar cuentas…", ca: "Cerca comptes…" },
  "Sections": { de: "Abschnitte", es: "Secciones", ca: "Seccions" },
  "Sell a wave": { de: "Verkaufen Sie eine Wave", es: "Vende una wave", ca: "Ven una wave" },
  "Sends the work back to": {
    de: "Sendet die Arbeit zurück an",
    es: "Envía el trabajo de vuelta a",
    ca: "Envia la feina de tornada a",
  },
  "Sent back by the client": {
    de: "Vom Kunden zurückgesendet",
    es: "Enviado de vuelta por el cliente",
    ca: "Enviat de tornada per el client",
  },
  "Sent {date}": { de: "Gesendet {date}", es: "Enviado {date}", ca: "Enviat {date}" },
  "Somebody had already dealt with this one. Nothing was changed.": {
    de: "Jemand hatte das bereits bearbeitet. Es wurde nichts geändert.",
    es: "Alguien ya había tratado este. No se cambió nada.",
    ca: "Algú ja havia tractat aquest. No s'ha canviat res.",
  },
  "Something got in the way just now. Try again in a moment, and tell an admin if it keeps happening.": {
    de: "Etwas hat gerade den Weg versperrt. Versuchen Sie es in einem Moment erneut und informieren Sie einen Administrator, falls es weiterhin passiert.",
    es: "Algo se interpuso justo ahora. Inténtalo de nuevo en un momento y avisa a un administrador si sigue ocurriendo.",
    ca: "Alguna cosa s'ha interposat just ara. Torna-ho a provar d'aquí a un moment i avisa a un administrador si continua passant.",
  },
  "Sprints inside it": { de: "Sprints darin", es: "Sprints dentro", ca: "Sprints dins" },
  "Step deleted.": { de: "Schritt gelöscht.", es: "Paso eliminado.", ca: "Pas eliminat." },
  "Steps side by side are branches of one decision.": {
    de: "Schritte nebeneinander sind Zweige einer Entscheidung.",
    es: "Los pasos uno al lado del otro son ramas de una decisión.",
    ca: "Els passos costat a costat són branques d'una decisió.",
  },
  "Switch this off?": { de: "Dies ausschalten?", es: "¿Desactivar esto?", ca: "Desactivar això?" },
  "Switch this wave off?": {
    de: "Diese Wave ausschalten?",
    es: "¿Desactivar esta Wave?",
    ca: "Desactivar aquesta Wave?",
  },
  "Switched off": { de: "Ausgeschaltet", es: "Apagado", ca: "Apagat" },
  "Take it out": { de: "Nehmen Sie es heraus", es: "Sácalo", ca: "Treu‑lo" },
  "Take out": { de: "Entfernen", es: "Sacar", ca: "Treure" },
  "Taken out.": { de: "Entfernt.", es: "Sacado.", ca: "Treure." },
  "That can be right — it is saved either way. Change a sprint's dates if it is not.": {
    de: "Das kann richtig sein — es wird in jedem Fall gespeichert. Ändern Sie die Daten des Sprints, wenn das nicht der Fall ist.",
    es: "Eso puede estar bien — se guarda de cualquier manera. Cambia las fechas del sprint si no lo está.",
    ca: "Això pot estar bé — es guarda de totes maneres. Canvia les dates del sprint si no ho està.",
  },
  "That didn't load. Refresh the page, and tell us if it keeps happening.": {
    de: "Das hat nicht geladen. Aktualisieren Sie die Seite und sagen Sie uns, ob es weiterhin passiert.",
    es: "No se cargó. Actualiza la página y dinos si sigue ocurriendo.",
    ca: "No s'ha carregat. Actualitza la pàgina i digues‑nos si continua passant.",
  },
  "That didn't save. Try again, and tell us if it keeps happening.": {
    de: "Das hat nicht gespeichert. Versuchen Sie es erneut und sagen Sie uns, ob es weiterhin passiert.",
    es: "No se guardó. Inténtalo de nuevo y dinos si sigue ocurriendo.",
    ca: "No s'ha desat. Prova‑ho de nou i digues‑nos si continua passant.",
  },
  "The assistant couldn't be reached": {
    de: "Der Assistent konnte nicht erreicht werden",
    es: "No se pudo contactar al asistente",
    ca: "No s'ha pogut contactar amb l'assistent",
  },
  "The assistant has been turned off": {
    de: "Der Assistent wurde ausgeschaltet",
    es: "El asistente ha sido desactivado",
    ca: "L'assistent ha estat desactivat",
  },
  "The assistant is being asked a lot at once": {
    de: "Der Assistent wird gleichzeitig stark nachgefragt",
    es: "Al asistente le están preguntando mucho a la vez",
    ca: "L'assistent està rebent moltes preguntes al mateix temps",
  },
  "The assistant is very busy": {
    de: "Der Assistent ist sehr beschäftigt",
    es: "El asistente está muy ocupado",
    ca: "L'assistent està molt ocupat",
  },
  "The assistant isn't switched on here": {
    de: "Der Assistent ist hier nicht eingeschaltet",
    es: "El asistente no está activado aquí",
    ca: "L'assistent no està activat aquí",
  },
  "The assistant opens with your question, answers from the knowledge base, and marks each claim with the source it came from — press a mark's source to read the passage itself. Each question uses one of the team's assistant credits.": {
    de: "Der Assistent öffnet mit Ihrer Frage, antwortet aus der Wissensdatenbank und markiert jede Aussage mit der Quelle, aus der sie stammt — klicken Sie auf die Quelle einer Markierung, um den jeweiligen Abschnitt zu lesen. Jede Frage verwendet einen der Assistent‑Credits Ihres Teams.",
    es: "El asistente se abre con tu pregunta, responde desde la base de conocimiento y marca cada afirmación con la fuente de la que proviene — pulsa la fuente de una marca para leer el pasaje completo. Cada pregunta usa uno de los créditos del asistente del equipo.",
    ca: "L'assistent s'obre amb la teva pregunta, respon des de la base de coneixement i marca cada afirmació amb la font d'on prové — prem la font d'una marca per llegir el fragment. Cada pregunta utilitza un dels crèdits de l'assistent de l'equip.",
  },
  "The assistant stops answering from any calendar entry it has already read, and reads your calendar again from the start under the new answer. That takes a while and it costs some of the team's AI allowance.": {
    de: "Der Assistent hört auf, aus bereits gelesenen Kalendereinträgen zu antworten, und liest Ihren Kalender erneut von Anfang an unter der neuen Antwort. Das dauert eine Weile und verbraucht einen Teil des KI‑Kontingents Ihres Teams.",
    es: "El asistente deja de responder a partir de cualquier entrada de calendario que ya haya leído, y vuelve a leer tu calendario desde el principio con la nueva respuesta. Eso lleva un tiempo y consume parte del presupuesto de IA del equipo.",
    ca: "L'assistent deixa de respondre a partir de qualsevol entrada del calendari que ja hagi llegit, i torna a llegir el teu calendari des del principi amb la nova resposta. Això triga una estona i consumeix part del pressupost d'IA de l'equip.",
  },
  "The assistant stops answering from any mail it has already read, and reads your mailbox again from the start under the new answer. That takes a while and it costs some of the team's AI allowance.": {
    de: "Der Assistent hört auf, aus bereits gelesenen E‑Mails zu antworten, und liest Ihr Postfach erneut von Anfang an unter der neuen Antwort. Das dauert eine Weile und verbraucht einen Teil des KI‑Kontingents Ihres Teams.",
    es: "El asistente deja de responder a partir de cualquier correo que ya haya leído, y vuelve a leer tu bandeja de entrada desde el principio con la nueva respuesta. Eso lleva un tiempo y consume parte del presupuesto de IA del equipo.",
    ca: "L'assistent deixa de respondre a partir de qualsevol correu que ja hagi llegit, i torna a llegir la teva safata d'entrada des del principi amb la nova resposta. Això triga una estona i consumeix part del pressupost d'IA de l'equip.",
  },
  "The assistant's own account has run out": {
    de: "Der eigene Kunde des Assistant ist aufgebraucht",
    es: "La cuenta propia del assistant se ha agotado",
    ca: "El compte propi de l’assistant s’ha esgotat",
  },
  "The blocks that say you are away.": {
    de: "Die Blöcke, die anzeigen, dass Sie abwesend sind.",
    es: "Los bloques que indican que estás ausente.",
    ca: "Els blocs que indiquen que estàs absent.",
  },
  "The call didn't name what the work is done in.": {
    de: "Der Anruf hat nicht angegeben, in welchem Umfeld die Arbeit erledigt wird.",
    es: "La llamada no indicó en qué se realiza el trabajo.",
    ca: "La trucada no va indicar en què es fa la feina.",
  },
  "The call didn't name who does the work.": {
    de: "Der Anruf hat nicht genannt, wer die Arbeit ausführt.",
    es: "La llamada no indicó quién hace el trabajo.",
    ca: "La trucada no va indicar qui fa la feina.",
  },
  "The day the audit happened": {
    de: "Der Tag, an dem das Audit stattgefunden hat",
    es: "El día en que ocurrió la auditoría",
    ca: "El dia en què va tenir lloc l’auditoria",
  },
  "The first number must be lower than the second.": {
    de: "Die erste Zahl muss kleiner sein als die zweite.",
    es: "El primer número debe ser menor que el segundo.",
    ca: "El primer número ha de ser menor que el segon.",
  },
  "The job, and what an hour of it costs them. Leave the cost empty if nobody knows it yet.": {
    de: "Der Job und was sie pro Stunde dafür zahlen. Lassen Sie die Kosten leer, wenn niemand sie bisher kennt.",
    es: "El trabajo y lo que les cuesta por hora. Deja el coste vacío si nadie lo conoce aún.",
    ca: "La feina i el que els costa per hora. Deixa el cost buit si ningú el coneix encara.",
  },
  "The money covers {priced} of {total} steps — the rest have no hourly cost yet.": {
    de: "Das Geld deckt {priced} von {total} Schritten ab — der Rest hat noch keinen Stundenpreis.",
    es: "El dinero cubre {priced} de {total} pasos — el resto aún no tiene costo por hora.",
    ca: "Els diners cobreixen {priced} de {total} passos — la resta encara no té cost horari.",
  },
  "The steps of this process, in order": {
    de: "Die Schritte dieses Prozesses, in der richtigen Reihenfolge",
    es: "Los pasos de este proceso, en orden",
    ca: "Els passos d'aquest procés, en ordre",
  },
  "The work, and how it is going.": {
    de: "Die Arbeit und wie sie voranschreitet.",
    es: "El trabajo y cómo va.",
    ca: "La feina i com va.",
  },
  "This can ADD calendars {brand} cannot see today, as well as leaving your main one out. Name none and no calendar is read at all.": {
    de: "Dies kann ADD-Kalender hinzufügen, die {brand} heute nicht sehen kann, und gleichzeitig Ihren Hauptkalender auslassen. Nennen Sie keinen und es wird kein Kalender gelesen.",
    es: "Esto puede ADD calendarios que {brand} no puede ver hoy, además de excluir tu principal. No nombres ninguno y no se leerá ningún calendario.",
    ca: "Això pot ADD calendaris que {brand} no pot veure avui, a més d’excloure el teu principal. No en nomenis cap i no es llegirà cap calendari.",
  },
  "This isn't your team's assistant credits — those are untouched. The account the assistant itself runs on needs topping up before it can answer again.": {
    de: "Dies sind nicht die Assistant-Guthaben Ihres Teams — diese bleiben unverändert. Der Kunde, auf dem der Assistant selbst läuft, muss aufgeladen werden, bevor er wieder antworten kann.",
    es: "Estos no son los créditos del assistant de tu equipo — están intactos. La cuenta en la que funciona el assistant necesita recargarse antes de que pueda responder de nuevo.",
    ca: "Aquests no són els crèdits de l’assistant del teu equip — estan intactes. El compte en què funciona l’assistant necessita ser recarregat abans que pugui respondre de nou.",
  },
  "This map changed on": {
    de: "Diese Karte wurde geändert am",
    es: "Este mapa cambió el",
    ca: "Aquest mapa es va canviar el",
  },
  "This map had no steps on that day.": {
    de: "Diese Karte hatte an diesem Tag keine Schritte.",
    es: "Este mapa no tenía pasos ese día.",
    ca: "Aquest mapa no tenia passos aquell dia.",
  },
  "This map has only ever said one thing. There is nothing to slide through yet.": {
    de: "Diese Karte hat bisher nur eine Sache gesagt. Es gibt noch nichts, durch das man scrollen könnte.",
    es: "Este mapa solo ha dicho una cosa. No hay nada por lo que deslizarse todavía.",
    ca: "Aquest mapa només ha dit una cosa. Encara no hi ha res per desplaçar‑se.",
  },
  "This picture appears once a second app is giving time back.": {
    de: "Dieses Bild erscheint, sobald eine zweite App Zeit zurückgibt.",
    es: "Esta imagen aparece cuando una segunda app devuelve tiempo.",
    ca: "Aquesta imatge apareix quan una segona app retorna temps.",
  },
  "This picture appears once a second map is giving time back.": {
    de: "Dieses Bild erscheint, sobald eine zweite Karte Zeit zurückgibt.",
    es: "Esta imagen aparece cuando un segundo mapa devuelve tiempo.",
    ca: "Aquesta imatge apareix quan un segon mapa retorna temps.",
  },
  "This usually clears in a minute or two. Ask again shortly and it should go through.": {
    de: "Das wird normalerweise in ein bis zwei Minuten erledigt. Fragen Sie in Kürze noch einmal, dann sollte es klappen.",
    es: "Esto suele resolverse en uno o dos minutos. Pregunta de nuevo en breve y debería pasar.",
    ca: "Això normalment s'acaba en un minut o dos. Pregunta de nou en breu i hauria de funcionar.",
  },
  "Throw it away": { de: "Entfernen Sie es", es: "Échalo", ca: "Llença‑ho" },
  "Thrown away. Nothing reached the map.": {
    de: "Entfernt. Nichts hat die Karte erreicht.",
    es: "Eliminado. Nada alcanzó el mapa.",
    ca: "Eliminat. Res va arribar al mapa.",
  },
  "Time given back, measured from": {
    de: "Zurückgegebene Zeit, gemessen ab",
    es: "Tiempo devuelto, medido desde",
    ca: "Temps retornat, mesurat des de",
  },
  "Time you have blocked out to work.": {
    de: "Zeit, die Sie für die Arbeit reserviert haben.",
    es: "Tiempo que has bloqueado para trabajar.",
    ca: "Temps que has blocat per treballar.",
  },
  "Tool": { de: "Tool", es: "Tool", ca: "Tool" },
  "Total": { de: "Gesamt", es: "Total", ca: "Total" },
  "Try asking": { de: "Versuchen Sie zu fragen", es: "Intenta preguntar", ca: "Intenta preguntar" },
  "Two sprints in this wave run over each other.": {
    de: "Zwei Sprints in dieser Wave laufen übereinander.",
    es: "Dos sprints en esta wave se solapan.",
    ca: "Dos sprints en aquesta wave es superposen.",
  },
  "Use the address your account is registered to.": {
    de: "Verwenden Sie die Adresse, unter der Ihr Kunde registriert ist.",
    es: "Usa la dirección a la que está registrada tu cuenta.",
    ca: "Utilitza l'adreça a la qual està registrada el teu compte.",
  },
  "Wave": { de: "Wave", es: "Wave", ca: "Wave" },
  "Wave brought back.": {
    de: "Wave zurückgebracht.",
    es: "Wave restaurado.",
    ca: "Wave restaurada.",
  },
  "Wave name": { de: "Wave-Name", es: "Nombre de Wave", ca: "Nom de Wave" },
  "Wave sold.": { de: "Wave verkauft.", es: "Wave vendido.", ca: "Wave venuda." },
  "Wave switched off.": {
    de: "Wave ausgeschaltet.",
    es: "Wave desactivado.",
    ca: "Wave desactivada.",
  },
  "Wave updated.": { de: "Wave aktualisiert.", es: "Wave actualizado.", ca: "Wave actualitzada." },
  "Waves": { de: "Waves", es: "Waves", ca: "Waves" },
  "We couldn't check what you're allowed to see. Refresh the page, and tell us if it keeps happening.": {
    de: "Wir konnten nicht prüfen, was Sie sehen dürfen. Aktualisieren Sie die Seite und teilen Sie uns mit, ob es weiterhin passiert.",
    es: "No pudimos comprobar lo que puedes ver. Actualiza la página y cuéntanos si sigue ocurriendo.",
    ca: "No vam poder comprovar què pots veure. Refresca la pàgina i explica'ns si continua passant.",
  },
  "We sent six digits to {email}.": {
    de: "Wir haben sechs Ziffern an {email} gesendet.",
    es: "Enviamos seis dígitos a {email}.",
    ca: "Hem enviat sis dígits a {email}.",
  },
  "What it is done in": { de: "Wo es erledigt wird", es: "En qué se hace", ca: "En què es fa" },
  "What it may read": { de: "Was es lesen könnte", es: "Qué puede leer", ca: "Què pot llegir" },
  "What {brand} may read in your calendar": {
    de: "Was {brand} in Ihrem Kalender lesen kann",
    es: "Qué puede leer {brand} en tu calendario",
    ca: "Què pot llegir {brand} al teu calendari",
  },
  "What {brand} may read in your mail": {
    de: "Was {brand} in Ihrer Mail lesen kann",
    es: "Qué puede leer {brand} en tu correo",
    ca: "Què pot llegir {brand} al teu correu",
  },
  "What the call proposed": {
    de: "Was der Anruf vorgeschlagen hat",
    es: "Qué propuso la llamada",
    ca: "Què va proposar la trucada",
  },
  "What the connection is": {
    de: "Was die Verbindung ist",
    es: "Qué es la conexión",
    ca: "Què és la connexió",
  },
  "What the package is for": {
    de: "Wofür das Paket ist",
    es: "Para qué es el paquete",
    ca: "Per a què serveix el paquet",
  },
  "What they call it. Its price is set separately, from the day that price started.": {
    de: "Wie sie es nennen. Der Preis wird separat festgelegt, ab dem Tag, an dem der Preis begann.",
    es: "Cómo lo llaman. Su precio se establece por separado, desde el día en que el precio empezó.",
    ca: "Com l’anomenen. El preu s’estableix per separat, des del dia que el preu va començar.",
  },
  "What this part of their company is called.": {
    de: "Wie dieser Teil ihres Unternehmens genannt wird.",
    es: "Cómo se llama esta parte de tu empresa.",
    ca: "Com es diu aquesta part de la teva empresa.",
  },
  "What this tool costs": {
    de: "Was dieses Tool kostet",
    es: "Lo que cuesta esta herramienta",
    ca: "El que costa aquesta eina",
  },
  "What was already read": {
    de: "Was bereits gelesen wurde",
    es: "Lo que ya se leyó",
    ca: "El que ja s’ha llegit",
  },
  "What you've sent us": {
    de: "Was Sie uns gesendet haben",
    es: "Lo que nos has enviado",
    ca: "El que ens has enviat",
  },
  "Whatever you leave out is never fetched at all, so it never reaches {brand} even for a moment.": {
    de: "Alles, was Sie weglassen, wird nie abgeholt, sodass es nie für einen Moment {brand} erreicht.",
    es: "Todo lo que omitas nunca se recupera, así que nunca llega a {brand} ni por un momento.",
    ca: "Tot el que deixis fora mai s’obté, de manera que mai arriba a {brand} ni un moment.",
  },
  "Where does this step sit?": {
    de: "Wo dieser Schritt sitzt?",
    es: "¿Dónde se sitúa este paso?",
    ca: "On es troba aquest pas?",
  },
  "Where you are working": {
    de: "Wo Sie arbeiten",
    es: "¿Dónde estás trabajando?",
    ca: "On estàs treballant",
  },
  "Which day to show this map as it was on": {
    de: "Welcher Tag, an dem diese Karte angezeigt werden soll",
    es: "Qué día mostrar este mapa tal como estaba",
    ca: "Quin dia mostrar aquest mapa tal com era",
  },
  "Which kinds of entry": {
    de: "Welche Arten von Einträgen",
    es: "Qué tipos de entrada",
    ca: "Quins tipus d’entrada",
  },
  "Your Google Calendar entries as meetings, and your Drive, Gmail, Calendar and Chat for the knowledge base.": {
    de: "Ihre Google‑Kalender‑Einträge als Termine und Ihr Drive, Gmail, Kalender und Chat für die Wissensdatenbank.",
    es: "Tus entradas del Calendario de Google como reuniones, y tu Drive, Gmail, Calendario y Chat para la base de conocimiento.",
    ca: "Les teves entrades del Calendari de Google com a reunions, i el teu Drive, Gmail, Calendari i Xat per a la base de coneixement.",
  },
  "Your Google Calendar entries, brought in as meetings.": {
    de: "Ihre Google‑Kalender‑Einträge, als Termine übernommen.",
    es: "Tus entradas del Calendario de Google, importadas como reuniones.",
    ca: "Les teves entrades del Calendari de Google, importades com a reunions.",
  },
  "Your Google Drive, Gmail, Calendar and Chat, so the knowledge base can answer from them.": {
    de: "Ihr Google‑Drive, Gmail, Kalender und Chat, damit die Wissensdatenbank daraus antworten kann.",
    es: "Tu Drive de Google, Gmail, Calendario y Chat, para que la base de conocimiento pueda responder desde ellos.",
    ca: "El teu Drive de Google, Gmail, Calendari i Xat, perquè la base de coneixement pugui respondre des d’ells.",
  },
  "Your main calendar": {
    de: "Ihr Hauptkalender",
    es: "Tu calendario principal",
    ca: "El teu calendari principal",
  },
  "Your main calendar only. Your other calendars are not read. This is how it works today.": {
    de: "Nur Ihr Hauptkalender. Ihre anderen Kalender werden nicht gelesen. So funktioniert es heute.",
    es: "Solo tu calendario principal. Tus otros calendarios no se leen. Así funciona hoy.",
    ca: "Només el teu calendari principal. Els teus altres calendaris no es llegeixen. Així funciona avui.",
  },
  "Your main calendar, read only. {brand} never adds, changes or cancels anything in it. Name other calendars below to include them too.": {
    de: "Ihr Hauptkalender, schreibgeschützt. {brand} fügt nie etwas hinzu, ändert oder storniert nichts darin. Benennen Sie unten weitere Kalender, um sie ebenfalls einzubeziehen.",
    es: "Tu calendario principal, solo lectura. {brand} nunca añade, cambia o cancela nada en él. Nombra otros calendarios abajo para incluirlos también.",
    ca: "El teu calendari principal, només de lectura. {brand} mai afegeix, canvia o cancel·la res dins. Nomena altres calendaris a continuació per incloure'ls també.",
  },
  "Your role can read the knowledge base — every source is here, and so is the record behind it — but asking it a question goes through the assistant, which your role can't use. A team admin can turn that on for your role.": {
    de: "Ihre Rolle kann die Wissensdatenbank lesen — jede Quelle ist hier, ebenso der dahinterstehende Datensatz —, aber das Stellen einer Frage erfolgt über den Assistenten, den Ihre Rolle nicht nutzen kann. Ein Team-Administrator kann das für Ihre Rolle aktivieren.",
    es: "Tu rol puede leer la base de conocimiento — cada fuente está aquí, al igual que el registro detrás de ella —, pero hacerle una pregunta pasa por el asistente, que tu rol no puede usar. Un administrador del equipo puede activarlo para tu rol.",
    ca: "El teu rol pot llegir la base de coneixement — cada font és aquí, i també el registre que hi ha darrere —, però fer‑li una pregunta passa per l'assistent, que el teu rol no pot utilitzar. Un administrador de l'equip pot activar‑ho per al teu rol.",
  },
  "a year": { de: "ein Jahr", es: "un año", ca: "un any" },
  "done {date}": { de: "erledigt {date}", es: "hecho {date}", ca: "fet {date}" },
  "due {date}": { de: "fällig {date}", es: "vencimiento {date}", ca: "venciment {date}" },
  "e.g. Onboarding package": {
    de: "z. B. Onboarding-Paket",
    es: "p. ej. paquete de incorporación",
    ca: "p. ex. paquet d'incorporació",
  },
  "e.g. if the claim is rejected": {
    de: "z. B. wenn der Anspruch abgelehnt wird",
    es: "p. ej. si la reclamación es rechazada",
    ca: "p. ex. si la reclamació és rebutjada",
  },
  "e.g. the last step here is the first step there": {
    de: "z. B. der letzte Schritt hier ist der erste Schritt dort",
    es: "p. ej. el último paso aquí es el primer paso allí",
    ca: "p. ex. l'últim pas aquí és el primer pas allà",
  },
  "hands its work here": {
    de: "übergibt seine Arbeit hier",
    es: "entrega su trabajo aquí",
    ca: "entrega la seva feina aquí",
  },
  "hands its work to": {
    de: "übergibt seine Arbeit an",
    es: "entrega su trabajo a",
    ca: "entrega la seva feina a",
  },
  "maps have no role on any of their steps, so there is no rate to price them with.": {
    de: "Maps haben keine Rolle bei ihren Schritten, daher gibt es keine Rate, mit der man sie bepreisen könnte.",
    es: "Los maps no tienen rol en ninguno de sus pasos, así que no hay tarifa con la que puedan cotizarse.",
    ca: "Els maps no tenen rol en cap dels seus passos, així que no hi ha cap tarifa amb la qual es puguin preusificar.",
  },
  "no date": { de: "kein Datum", es: "sin fecha", ca: "sense data" },
  "no hourly cost yet": {
    de: "noch keine stündlichen Kosten",
    es: "todavía sin coste horario",
    ca: "encara sense cost horari",
  },
  "no step has a role yet": {
    de: "kein Schritt hat noch eine Rolle",
    es: "aún ningún paso tiene rol",
    ca: "encara cap pas té rol",
  },
  "only when": { de: "nur wenn", es: "solo cuando", ca: "només quan" },
  "otherwise": { de: "ansonsten", es: "de lo contrario", ca: "altrament" },
  "roles": { de: "Rollen", es: "roles", ca: "rols" },
  "sprints": { de: "Sprints", es: "Sprints", ca: "Sprints" },
  "that record says “{status}” right now": {
    de: "Dieser Datensatz sagt gerade “{status}”",
    es: "Ese registro dice “{status}” ahora mismo",
    ca: "Aquest registre diu “{status}” ara mateix",
  },
  "the audit date": {
    de: "Das Prüfungsdatum",
    es: "La fecha de auditoría",
    ca: "La data d’auditoria",
  },
  "times a day": { de: "mal pro Tag", es: "veces al día", ca: "vegades al dia" },
  "times a month": { de: "mal pro Monat", es: "veces al mes", ca: "vegades al mes" },
  "times a week": { de: "mal pro Woche", es: "veces a la semana", ca: "vegades a la setmana" },
  "times a year": { de: "mal pro Jahr", es: "veces al año", ca: "vegades a l'any" },
  "{added} added, {revised} changed. The rest was left out.": {
    de: "{added} hinzugefügt, {revised} geändert. Der Rest wurde weggelassen.",
    es: "{added} añadidos, {revised} cambiados. El resto se dejó fuera.",
    ca: "{added} afegits, {revised} canviats. La resta es va deixar fora.",
  },
  "{count} a day": { de: "{count} pro Tag", es: "{count} al día", ca: "{count} al dia" },
  "{count} a month": { de: "{count} pro Monat", es: "{count} al mes", ca: "{count} al mes" },
  "{count} a week": {
    de: "{count} pro Woche",
    es: "{count} a la semana",
    ca: "{count} a la setmana",
  },
  "{count} a year": { de: "{count} pro Jahr", es: "{count} al año", ca: "{count} a l'any" },
  "{count} results": {
    de: "{count} Ergebnisse",
    es: "{count} resultados",
    ca: "{count} resultats",
  },
  "{n} times a day": { de: "{n} mal pro Tag", es: "{n} veces al día", ca: "{n} vegades al dia" },
  "{n} times a month": {
    de: "{n} mal pro Monat",
    es: "{n} veces al mes",
    ca: "{n} vegades al mes",
  },
  "{n} times a week": {
    de: "{n} mal pro Woche",
    es: "{n} veces a la semana",
    ca: "{n} vegades a la setmana",
  },
  "{n} times a year": { de: "{n} mal pro Jahr", es: "{n} veces al año", ca: "{n} vegades a l'any" },
  "{priced} of {total} steps priced": {
    de: "{priced} von {total} Schritten bepreist",
    es: "{priced} de {total} pasos tarifados",
    ca: "{priced} de {total} passos tarifats",
  },
  "“Invite a member as a Viewer”, or “what changed this week?”": {
    de: "“Laden Sie ein Mitglied als Viewer ein”, oder “Was hat sich diese Woche geändert?”",
    es: "“Invita a un miembro como Viewer”, o “¿Qué cambió esta semana?”",
    ca: "“Convida un membre com a Viewer”, o “Què ha canviat aquesta setmana?”",
  },
  "Nothing mapped yet.": {
    de: "Noch nichts zugeordnet.",
    es: "Nada mapeado todavía.",
    ca: "Res assignat encara.",
  },

  /* ── The import wizard, written by hand 2026-08-31 (feat/import-on-kit-wizard)
   * The screen moved onto the kit's own five-step ImportWizard, which named two
   * steps that had never been on screen before (the plan, and the write itself),
   * so the rail's five words and the run step's own lines are new copy.
   * HAND-WRITTEN RATHER THAN GENERATED, because R44's ceiling is 0 in all three
   * languages and scripts/i18n-translate.mjs spends the owner's personal key —
   * a lane may not raise the ceiling to pay for its own feature. Same register
   * as the rest of this file: Sie in German, tú in Spanish and Catalan, sentence
   * case, the same word for the same thing throughout. ─────────────────────── */
  "Your files": { de: "Ihre Dateien", es: "Tus archivos", ca: "Els teus fitxers" },
  "Match the columns": { de: "Spalten zuordnen", es: "Empareja las columnas", ca: "Fes coincidir les columnes" },
  "Check and commit": { de: "Prüfen und starten", es: "Revisa y confirma", ca: "Revisa i confirma" },
  "Writing": { de: "Schreiben", es: "Escribiendo", ca: "S'està escrivint" },
  "The report": { de: "Der Bericht", es: "El informe", ca: "L'informe" },
  "Import steps": { de: "Import-Schritte", es: "Pasos de la importación", ca: "Passos de la importació" },
  "Importing your data": {
    de: "Ihre Daten werden importiert",
    es: "Importando tus datos",
    ca: "S'estan important les teves dades",
  },
  "Writing {count} row(s). Each one is checked exactly as if you typed it in yourself.": {
    de: "{count} Zeile(n) werden geschrieben. Jede wird genau so geprüft, als hätten Sie sie selbst eingetippt.",
    es: "Escribiendo {count} fila(s). Cada una se comprueba exactamente como si la hubieras escrito tú.",
    ca: "S'estan escrivint {count} fila(es). Cadascuna es comprova exactament com si l'haguessis escrit tu.",
  },
  "{files} file(s) · {rows} row(s). Planning uses the assistant (a few credits), so you can review before anything is written.": {
    de: "{files} Datei(en) · {rows} Zeile(n). Die Planung nutzt den Assistenten (ein paar Credits), damit Sie alles prüfen können, bevor etwas geschrieben wird.",
    es: "{files} archivo(s) · {rows} fila(s). La planificación usa el asistente (unos pocos créditos), así puedes revisarlo antes de que se escriba nada.",
    ca: "{files} fitxer(s) · {rows} fila(es). La planificació fa servir l'assistent (uns quants crèdits), així ho pots revisar abans que s'escrigui res.",
  },
  "{skipped} of {total} row(s) will be skipped": {
    de: "{skipped} von {total} Zeile(n) werden übersprungen",
    es: "Se omitirán {skipped} de {total} fila(s)",
    ca: "S'ometran {skipped} de {total} fila(es)",
  },
  "And {count} more — download the list above.": {
    de: "Und {count} weitere — laden Sie die Liste oben herunter.",
    es: "Y {count} más: descarga la lista de arriba.",
    ca: "I {count} més: descarrega la llista de dalt.",
  },
  "Rejected rows ({count})": {
    de: "Abgelehnte Zeilen ({count})",
    es: "Filas rechazadas ({count})",
    ca: "Files rebutjades ({count})",
  },
  "Imported {count} row(s).": {
    de: "{count} Zeile(n) importiert.",
    es: "Se han importado {count} fila(s).",
    ca: "S'han importat {count} fila(es).",
  },
  "Couldn't read that file.": {
    de: "Diese Datei konnte nicht gelesen werden.",
    es: "No se pudo leer ese archivo.",
    ca: "No s'ha pogut llegir aquest fitxer.",
  },
  /* The run step's error register. No full stop on the eyebrow or the title —
   * they are labels, not sentences, and the kit draws them as such. The sibling
   * entry "The import didn't finish." (with a full stop) is the toast, and both
   * are live: this one heads the register, that one is said in passing. */
  "The import stopped": {
    de: "Der Import wurde angehalten",
    es: "La importación se ha detenido",
    ca: "La importació s'ha aturat",
  },
  "The import didn't finish": {
    de: "Der Import wurde nicht abgeschlossen",
    es: "La importación no ha terminado",
    ca: "La importació no ha acabat",
  },
  "Back to the plan": { de: "Zurück zum Plan", es: "Volver al plan", ca: "Torna al pla" },

  /* THE RAIL'S TWO NEW SECTION HEADINGS (client feedback, 31 Aug 2026 —
   * lib/pages.ts, NAV_GROUP_LABELS). "Accounts" already had a seed entry;
   * these two are the rest of the three named sections. */

  /* THE RECORD FOOTER'S ACTIVITY COLUMN AND THE DOOR ON ITS EYEBROW ROW
   * (7 Sep 2026 — record-chrome.tsx, screen-renderer.tsx, activity-rail.tsx).
   *
   * "Latest activity" is the column's own heading, and it was said in ENGLISH
   * to every reader until this line: nothing passed `activityLabel`, so the
   * heading fell through to the vendored `RecordDetail`'s own default, and the
   * translation walk never opens `shared/ui/` (R28). It is passed and
   * translated now at both hosts, beside the door on its row. (Until design
   * kit v1.2.69, vendored 8 Sep 2026, `RecordChrome` dropped `activityAction`
   * and record-chrome.tsx had to build the label and the door as ONE node to
   * get the door onto the row at all; the kit forwards the real slot now, so
   * the label is a plain `t("Latest activity")` at both hosts. The reason it
   * is passed is unchanged — the vendored default is English.)
   *
   * "All activity · {count}" is the door. The MIDDOT and the HOLE are both
   * load-bearing: the count is `formatCount`'s output (R16 — "48", "1.3k",
   * "1m+"), and it goes in a hole rather than being concatenated so a
   * translator can put the number where their language wants it. The German
   * takes "Aktivität" rather than the vocabulary block's "Verlauf" for
   * consistency with every other activity sentence already in the catalogue
   * ("Noch keine Aktivität.", "Weitere Aktivitäten laden"), which is what a
   * reader of this rail actually sees around it. */
  "Latest activity": { de: "Letzte Aktivität", es: "Actividad reciente", ca: "Activitat recent" },
  "All activity · {count}": {
    de: "Gesamte Aktivität · {count}",
    es: "Toda la actividad · {count}",
    ca: "Tota l'activitat · {count}",
  },

  /* THE RECORD FOOTER'S ADD-A-NOTE FIELD (ch27.8), record-chrome.tsx /
   * use-record-activity.ts. */
  "Add a note": { de: "Notiz hinzufügen", es: "Añadir una nota", ca: "Afegir una nota" },
  "Note added.": { de: "Notiz hinzugefügt.", es: "Nota añadida.", ca: "Nota afegida." },
  "Couldn't add the note. Try again.": {
    de: "Notiz konnte nicht hinzugefügt werden. Bitte versuche es erneut.",
    es: "No se pudo añadir la nota. Inténtalo de nuevo.",
    ca: "No s'ha pogut afegir la nota. Torna-ho a provar.",
  },

  /* ── THE SOURCE CHIPS (1 Sep 2026) ───────────────────────────────────────
   *
   * Hand-written here rather than left to the generator, for the reason this
   * file exists: two of the four are words a machine would translate and must
   * not. "Google Drive" is a PRODUCT and its translation is itself — the bare
   * word "Drive" is already in the generated catalogue as a disk drive
   * ("Laufwerk", "Unidad"), which is exactly the collision the chip label
   * avoids by naming the service. "App records" is the app's own rows, not
   * "records" in the sense of a recording. And nothing was spent to put them
   * here: a string with a seed entry is never sent to the model at all. */
  "Google Drive": { de: "Google Drive", es: "Google Drive", ca: "Google Drive" },
  "App records": { de: "App-Einträge", es: "Registros de la app", ca: "Registres de l'app" },
  "Knowledge articles": {
    de: "Wissensartikel",
    es: "Artículos de conocimiento",
    ca: "Articles de coneixement",
  },
  /* ── THE RAIL'S TWO GROUPS (1 Sep 2026) ──────────────────────────────────
   *
   * The words above each half of the sidebar, and they are the OWNER'S two: he
   * replaced "Every day" and "Now and then" with the adjectives on the day they
   * shipped. Hand-written here because a one-word heading is where a generator
   * is least reliable — it has no sentence to take the register from — and
   * because German wants one word for each of these and would be given a phrase.
   *
   * `Gelegentlich` is carried over unchanged from "Now and then": it was already
   * the right German for this half, and the English moving does not move it. */

  /* ── THE RELATIONSHIP MAP (1 Sep 2026) ───────────────────────────────────
   *
   * Hand-written for the same reason the chips were: nothing is spent on a
   * string that already has a seed entry, and two of these are sentences a
   * generator would render stiffly. "Connections" is the tab; the rest are the
   * controls and the two things the map says about itself — that it is showing
   * the closest few, and that there is nothing linked yet. Both of those are
   * honesty rather than decoration: a map that draws forty of three hundred and
   * says nothing has answered a different question. */
  Connections: { de: "Verbindungen", es: "Conexiones", ca: "Connexions" },
  "{count} connected": {
    de: "{count} verbunden",
    es: "{count} conectados",
    ca: "{count} connectats",
  },
  "Showing the closest few — there are more.": {
    de: "Es werden nur die nächsten gezeigt — es gibt mehr.",
    es: "Se muestran solo los más cercanos: hay más.",
    ca: "Només es mostren els més propers: n'hi ha més.",
  },
  "Nothing is linked to this yet.": {
    de: "Damit ist noch nichts verknüpft.",
    es: "Todavía no hay nada vinculado a esto.",
    ca: "Encara no hi ha res vinculat a això.",
  },
  "Zoom in": { de: "Vergrößern", es: "Acercar", ca: "Apropar" },
  "Zoom out": { de: "Verkleinern", es: "Alejar", ca: "Allunyar" },
  "Fit the whole map": {
    de: "Ganze Karte anzeigen",
    es: "Ver el mapa entero",
    ca: "Veure el mapa sencer",
  },
  /* ── THE WHOLE KNOWLEDGE BASE AS ONE PICTURE (8 Sep 2026) ────────────────
   * The Shape view beside the knowledge list. Same register as the
   * neighbourhood map above it: plain, short, sentence case, and the same word
   * for the same thing — "Karte"/"mapa" for the picture, "Quellen"/"fuentes"/
   * "fonts" for what the assistant may read, which is the word the knowledge
   * list already uses ("{count} sources match"). */
  Shape: { de: "Form", es: "Forma", ca: "Forma" },
  /* THE ACCOUNTS SCREEN'S OWN VIEW SWITCH (14 Sep 2026, client ruling: "for
   * accounts main: use gallery and add table as alternate view"). Same
   * register as "Shape" above it — plain, short, the ordinary word a
   * 45–55-year-old manager already uses for each shape. */
  Gallery: { de: "Galerie", es: "Galería", ca: "Galeria" },
  "{count} sources": { de: "{count} Quellen", es: "{count} fuentes", ca: "{count} fonts" },
  "A map of the whole knowledge base, grouped by account": {
    de: "Eine Karte der ganzen Wissensbasis, nach Konto gruppiert",
    es: "Un mapa de toda la base de conocimiento, agrupada por cuenta",
    ca: "Un mapa de tota la base de coneixement, agrupada per compte",
  },
  /* The cap, said out loud — and the second sentence is the load-bearing one:
   * the dots are a sample and the sizes are not. */
  "Drawing the {drawn} most recently touched. Every group is sized by its full count.": {
    de: "Es werden die {drawn} zuletzt bearbeiteten gezeigt. Jede Gruppe ist nach ihrer vollen Anzahl bemessen.",
    es: "Se dibujan las {drawn} más recientes. Cada grupo se dimensiona por su total completo.",
    ca: "Es dibuixen les {drawn} més recents. Cada grup es dimensiona pel seu total complet.",
  },
  /* The aggregation fence, said out loud. "Konto"/"cuenta"/"compte" is the
   * glossary's Account, and the second half says whose limit it is. */
  "Grouping by account is off, because you cannot open accounts.": {
    de: "Die Gruppierung nach Konto ist aus, weil Sie Konten nicht öffnen können.",
    es: "La agrupación por cuenta está desactivada, porque no puedes abrir cuentas.",
    ca: "L'agrupació per compte està desactivada, perquè no pots obrir comptes.",
  },
  "Nothing in the knowledge base yet.": {
    de: "Noch nichts in der Wissensbasis.",
    es: "Todavía no hay nada en la base de conocimiento.",
    ca: "Encara no hi ha res a la base de coneixement.",
  },
  /* ── A CALL'S OWN CONNECTIONS TAB (9 Sep 2026) ───────────────────────────
   * The meeting screen's map. Same register as the knowledge base's beside it:
   * plain, short, sentence case. "Call" rather than "meeting" in the empty
   * sentence because the reader is standing ON the meeting and the word for
   * what came out of it is the conversation, not the record. */
  "Nothing is filed against this call yet.": {
    de: "Zu diesem Gespräch ist noch nichts abgelegt.",
    es: "Todavía no hay nada archivado sobre esta llamada.",
    ca: "Encara no hi ha res arxivat sobre aquesta trucada.",
  },
  /* The long one says what WOULD fill it, in two clauses: what Google has to
   * say for an artefact to arrive, and the three fields that show here anyway. */
  "Emails, chat logs and transcripts join a call when Google says which event they belong to. The account, the system and the reason we met show here too, once they are set.":
    {
      de: "E-Mails, Chatverläufe und Mitschriften gehören zu einem Gespräch, wenn Google sagt, zu welchem Termin sie gehören. Kunde, System und der Grund des Treffens erscheinen hier ebenfalls, sobald sie gesetzt sind.",
      es: "Los correos, los chats y las transcripciones se unen a una llamada cuando Google dice a qué evento pertenecen. La cuenta, el sistema y el motivo de la reunión también aparecen aquí, una vez definidos.",
      ca: "Els correus, els xats i les transcripcions s'uneixen a una trucada quan Google diu a quin esdeveniment pertanyen. El compte, el sistema i el motiu de la reunió també apareixen aquí, un cop definits.",
    },
  "This meeting doesn't have a map to draw.": {
    de: "Für dieses Meeting gibt es keine Karte.",
    es: "Esta reunión no tiene un mapa que dibujar.",
    ca: "Aquesta reunió no té cap mapa per dibuixar.",
  },
  "Nothing is filed under an account yet.": {
    de: "Noch nichts unter einem Konto abgelegt.",
    es: "Todavía no hay nada archivado bajo una cuenta.",
    ca: "Encara no hi ha res arxivat sota un compte.",
  },
  /* Read aloud, never drawn — the picture's own name. */
  "A map of what this record is connected to": {
    de: "Eine Karte davon, womit dieser Eintrag verbunden ist",
    es: "Un mapa de con qué está conectado este registro",
    ca: "Un mapa d'amb què està connectat aquest registre",
  },
  /* THE TAB'S OWN FAILURE (8 Sep 2026) — the map's read can fail like any
   * other, and this is the sentence that says so instead of leaving the
   * loading skeleton on screen forever. Written here, beside the rest of the
   * map's words, for the same "{count} connected" / "Nothing is linked to
   * this yet." register. */
  "Couldn't load this record's connections.": {
    de: "Verbindungen dieses Eintrags konnten nicht geladen werden.",
    es: "No se pudieron cargar las conexiones de este registro.",
    ca: "No s'han pogut carregar les connexions d'aquest registre.",
  },
  /* The group's accessible name — read aloud, never drawn. */
  "Which sources the assistant reads": {
    de: "Welche Quellen der Assistent liest",
    es: "Qué fuentes lee el asistente",
    ca: "Quines fonts llegeix l'assistent",
  },
  /* PICKING UP AN IMPORT THAT DIED (6 Sep 2026). Written here rather than left
     to accumulate as ceiling debt because these three sentences are the only
     thing standing between a person and importing their file twice — an English
     sentence on a German screen is a sentence they may not act on, and the
     action it is asking for is the one that prevents duplicate rows. */
  "Carry on from where it stopped": {
    de: "Dort weitermachen, wo es aufgehört hat",
    es: "Continuar donde se detuvo",
    ca: "Continuar on s'ha aturat",
  },
  "It got part of the way through. Carry on from where it stopped — sending the file again would add everything it already wrote a second time.":
    {
      de: "Es ist ein Stück weit gekommen. Machen Sie dort weiter, wo es aufgehört hat — die Datei erneut zu senden würde alles bereits Geschriebene ein zweites Mal hinzufügen.",
      es: "Avanzó una parte. Continúe donde se detuvo: volver a enviar el archivo añadiría por segunda vez todo lo que ya escribió.",
      ca: "Ha avançat una part. Continueu on s'ha aturat: tornar a enviar el fitxer afegiria per segona vegada tot el que ja havia escrit.",
    },
  /* The placeholders are the contract — {done} and {count} must survive intact. */
  "{done} of {count} row(s) written. Each one is checked exactly as if you typed it in yourself.": {
    de: "{done} von {count} Zeile(n) geschrieben. Jede wird genau so geprüft, als hätten Sie sie selbst eingegeben.",
    es: "{done} de {count} fila(s) escritas. Cada una se comprueba exactamente como si la hubiera escrito usted.",
    ca: "{done} de {count} fila/es escrites. Cadascuna es comprova exactament com si l'haguéssiu escrita vós.",
  },

  /* THE LIVE-CONNECTION STRIP (shared/web/live-status.tsx). Hand-written here
   * rather than left for the generator, because the generator spends the
   * owner's own key and R44 will not let an untranslated string ship: two new
   * sentences would have pushed all three ceilings up by two, which is the
   * "accepted debt" exit rather than the right one for copy this short.
   *
   * "Live" is the hard word. It is not `Live` in German here — a person is
   * being told their screen has stopped keeping itself up to date, and
   * "aktualisiert sich gerade nicht" says that in the plain register the rest
   * of this file uses. Same choice in Spanish and Catalan: describe what has
   * stopped happening, rather than borrow an English adjective for it. */
  "Not updating live right now — you may not be seeing the latest changes.": {
    de: "Aktualisiert sich gerade nicht — du siehst möglicherweise nicht die neuesten Änderungen.",
    es: "Ahora mismo no se actualiza solo — puede que no estés viendo los últimos cambios.",
    ca: "Ara mateix no s'actualitza sol — potser no estàs veient els darrers canvis.",
  },
  "Refresh": {
    de: "Aktualisieren",
    es: "Actualizar",
    ca: "Actualitza",
  },
  /* ── THE TICKETS DASHBOARD (6 Sep 2026) ──────────────────────────────────
     Written here rather than left to accumulate as ceiling debt (R44), and for
     a reason particular to this screen: a dashboard is read at a glance and
     never re-read. A list in the wrong language is still a list — the rows are
     names and dates, and a reader recognises them. A CHART in the wrong
     language is a picture with a caption somebody skips, and the captions here
     are the half that says what the picture may NOT be used for: which months
     were dropped, which tickets have no record of what they arrived as, that
     the weekend does not count. Those are the sentences that stop a number
     being misread, so they are the last ones that should ship in English to
     somebody who chose German.

     THE HOLES ARE THE CONTRACT — {count}, {moved}, {counted}, {median}, {low},
     {high} and {max} must survive intact and keep their names. */
  "The open work": {
    de: "Die offene Arbeit",
    es: "El trabajo abierto",
    ca: "La feina oberta",
  },
  "{count} past the three-day line": {
    de: "{count} über der Drei-Tage-Grenze",
    es: "{count} por encima del límite de tres días",
    ca: "{count} per sobre del límit de tres dies",
  },
  "No system named": {
    de: "Kein System genannt",
    es: "Sin sistema indicado",
    ca: "Sense sistema indicat",
  },
  "Who has more": {
    de: "Wer mehr hat",
    es: "Quién tiene más",
    ca: "Qui en té més",
  },
  "Raised as, then triaged as": {
    de: "Eingegangen als, dann eingeordnet als",
    es: "Entró como, y se clasificó como",
    ca: "Va entrar com a, i es va classificar com a",
  },
  "Became": {
    de: "Wurde zu",
    es: "Pasó a ser",
    ca: "Va passar a ser",
  },
  "{moved} of {counted} tickets left triage as a different kind from the one they arrived as.": {
    de: "{moved} von {counted} Tickets haben die Sichtung als andere Art verlassen, als sie eingegangen sind.",
    es: "{moved} de {counted} tickets salieron de la clasificación con un tipo distinto del que entraron.",
    ca: "{moved} de {counted} tiquets van sortir de la classificació amb un tipus diferent del que van entrar.",
  },
  "How long a ticket takes to close": {
    de: "Wie lange ein Ticket bis zum Abschluss braucht",
    es: "Cuánto tarda un ticket en cerrarse",
    ca: "Quant triga un tiquet a tancar-se",
  },
  /* THE TREND IS A PANEL OF ITS OWN NOW, so its heading is a heading (client,
     6 Sep 2026: "same style as How long a ticket takes to close put text above
     the mountain graph 'Tendency'"). One word, and it is a NOUN in all three —
     the thing the line shows, not a direction it is going. */
  "Tendency": {
    de: "Tendenz",
    es: "Tendencia",
    ca: "Tendència",
  },
  /* FOUR PANEL SUBTITLES AND TWO SUB-HEADINGS WERE RETIRED HERE, 6 Sep 2026 —
     client: "rmoeve all subtitles: Every open ticket, as one pipeline per kind
     down a shared set of stages. Open tickets against the thing you built. Open
     work by client, for the kinds that wait for a client to confirm. What your
     morning is actually spent on." and "in the how logn ticket takes to close
     remove subtitle 'What it is now' and 'Which way it is going'". Their seed
     entries went with them for the same reason the caption below did: a
     sentence the app no longer says is a sentence being translated on every
     build for a screen nobody can read it on. "And {count} more systems." went
     the same day and for a different reason — the panel stopped dropping rows
     at all, so there is nothing left for it to confess. */
  /* THE "WORKING DAYS ONLY" CAPTION WAS RETIRED HERE, 6 Sep 2026 — client:
     "remove the subtitle 'working days only.' It's not needed. We already know
     it." The SENTENCE is gone; the arithmetic it described has not moved an
     inch (`shared/business-days.ts` is still under both reads on that panel).
     Its seed entry goes with it rather than being left behind to be translated
     on every build for a screen that no longer says it — R28's ORPHAN clause,
     applied on this side of the pipeline. */
  "{count} closed": {
    de: "{count} abgeschlossen",
    es: "{count} cerrados",
    ca: "{count} tancats",
  },
  /* ONE MONTH OF THE TREND, said twice from one string — inside the hover card
     the client asked for ("when I hover over the graphic on a specific day, it
     has a little modal that gives me the info for this date") and, joined with
     the month and the kind, as the accessible NAME of the hit area that opens
     it. Seeded in all three rather than left to the next translation run, for
     the reason the block above this one gives: this screen has no rows, so its
     sentences are the whole of what a reader gets, and the count a median was
     taken over is precisely the half that stops the median being misread.
     {median} and {count} must survive intact and keep their names. */
  "{median} days, from {count} closed": {
    de: "{median} Tage, aus {count} abgeschlossenen",
    es: "{median} días, de {count} cerrados",
    ca: "{median} dies, de {count} tancats",
  },
  "Middle ticket {median} days · middle half {low} to {high} · longest {max}": {
    de: "Mittleres Ticket {median} Tage · mittlere Hälfte {low} bis {high} · längstes {max}",
    es: "Ticket central {median} días · mitad central {low} a {high} · el más largo {max}",
    ca: "Tiquet central {median} dies · meitat central {low} a {high} · el més llarg {max}",
  },
  /* THE WINDOW BECAME SIX MONTHS AND THE SENTENCE MOVED WITH IT (client, 6 Sep
     2026: "for this how long, only consider the latest 6 months"). The days
     version was retired rather than left behind: it named a window that no
     longer exists, and an entry nothing says is translated on every build for a
     screen that cannot show it — R28's ORPHAN clause, applied on this side of
     the pipeline. {count} is `CLOSURE_WINDOW_MONTHS` and must keep its name. */
  "Nothing has closed in the last {count} months.": {
    de: "In den letzten {count} Monaten wurde nichts abgeschlossen.",
    es: "No se ha cerrado nada en los últimos {count} meses.",
    ca: "No s'ha tancat res en els darrers {count} mesos.",
  },
  "The middle ticket, month by month": {
    de: "Das mittlere Ticket, Monat für Monat",
    es: "El ticket central, mes a mes",
    ca: "El tiquet central, mes a mes",
  },
  /* THE FLOOR'S TWO SENTENCES WERE RETIRED HERE, 7 Sep 2026 — client: "Only
     months with at least 8 of a kind are thrown. No, even if it's only 1, it
     should appear there."

     They were "Only a month where at least {count} of a kind closed is drawn —
     a middle ticket out of six is one ticket wearing a statistic." and "No kind
     has closed at least {count} tickets in two of the last months, so there is
     no trend to draw yet." The first explained a subtraction the door no longer
     makes; the second named the floor as the reason a young team has no trend,
     when the real reason is that a line needs two points. Both went with the
     rule rather than being left behind to be translated on every build for a
     screen that no longer says them — R28's ORPHAN clause, applied on this side
     of the pipeline, and the same disposal the "working days only" caption got
     one block up. The reasoning the first one carried is not lost: it is kept in
     full where `CLOSURE_TREND_MIN_CLOSURES` used to be defined, in
     `shared/types.ts`. Both were seeded in all three languages, so retiring them
     moves no ceiling (R44). */
  "Nothing has closed in two different months yet, so there is no trend to draw.": {
    de: "In zwei verschiedenen Monaten wurde noch nichts abgeschlossen — es gibt also noch keinen Verlauf zu zeichnen.",
    es: "Todavía no se ha cerrado nada en dos meses distintos, así que aún no hay tendencia que dibujar.",
    ca: "Encara no s'ha tancat res en dos mesos diferents, així que encara no hi ha tendència a dibuixar.",
  },
  /* ONE ROW OF A RANKED CHART, said twice from one string — inside the hover
     card the client asked for ("i want that when i hover on client i see the
     details of the numbers of tickets") and, joined with the row's name and its
     kind, as the accessible NAME of the bar that opens it. Both ranked panels
     use it, so "Which app" and "Who has more" cannot become two readings of one
     gesture. Seeded in all three in the same change that adds it, so R44's
     ceiling does not move: this screen has no rows on it, so its sentences are
     the whole of what a reader gets. {count} is what is still open and {total}
     is everything ever raised — both names must survive intact, and the order
     matters to the sentence in every language here. */
  "{count} open of {total}": {
    de: "{count} von {total} offen",
    es: "{count} abiertos de {total}",
    ca: "{count} oberts de {total}",
  },
  "Couldn't load the dashboard.": {
    de: "Das Dashboard konnte nicht geladen werden.",
    es: "No se ha podido cargar el panel.",
    ca: "No s'ha pogut carregar el tauler.",
  },
  /* A CORRECTION, NOT A NEW STRING. The generated catalogue answered "Type"
     with "Eingeben" — the VERB, "to type on a keyboard" — which is what a
     machine does with a one-word English string that is two different words.
     It is the label on the ticket dashboard's second filter and on the ticket
     list's own, so a German reader was being offered a chip that said "Enter".
     The seed wins at run time (SPOKEN, shared/i18n.ts), so this fixes it on
     screen without a generator run and without spending anything. */
  "Type": { de: "Typ", es: "Tipo", ca: "Tipus" },

  /* ── The ticket composer's two sends, and the five seconds before either of
     them happens (client ruling, 6 Sep 2026) ─────────────────────────────────
     Eight sentences, written here in all three languages in the same change
     that adds them, so R44's ceiling does not move: an untranslated string is
     debt, and this feature is not the place to take any on. Two of the eight
     are the accessible NAME of the wordless send — the tooltip and the
     aria-label say the same two words on purpose (label-in-name), so they are
     one entry read twice and a translator must keep them one. */
  "Send reply": { de: "Antwort senden", es: "Enviar respuesta", ca: "Enviar resposta" },
  "Send and close": { de: "Senden und schließen", es: "Enviar y cerrar", ca: "Enviar i tancar" },
  "Sending your reply": {
    de: "Ihre Antwort wird gesendet",
    es: "Enviando tu respuesta",
    ca: "Enviant la teva resposta",
  },
  "Sending and closing": {
    de: "Wird gesendet und geschlossen",
    es: "Enviando y cerrando",
    ca: "Enviant i tancant",
  },
  /* The receipt under the pending bubble, where a timestamp goes once it is
     real. `{seconds}` is a bare number and stays one in every language. */
  "Sending in {seconds}": {
    de: "Wird in {seconds} gesendet",
    es: "Se envía en {seconds}",
    ca: "S'envia en {seconds}",
  },
  "Sent.": { de: "Gesendet.", es: "Enviado.", ca: "Enviat." },
  "This ticket is answered. Reply anyway…": {
    de: "Dieses Ticket ist beantwortet. Trotzdem antworten…",
    es: "Este ticket está respondido. Responder igualmente…",
    ca: "Aquest tiquet està respost. Respondre igualment…",
  },
  "Nothing was sent. Your words are back in the composer.": {
    de: "Es wurde nichts gesendet. Ihr Text steht wieder im Eingabefeld.",
    es: "No se ha enviado nada. Tu texto ha vuelto al campo de respuesta.",
    ca: "No s'ha enviat res. El teu text ha tornat al camp de resposta.",
  },

  /* ── The sign-in code, said out loud (2026-09-07) ──────────────────────────
   *
   * Two sentences nobody reading the screen will ever see: both are the
   * accessible names on `shared/web/code-input.tsx`, the six-box code field on
   * the way in to both front doors. They are SEEDED rather than left for the
   * next translation run — the pattern the tickets-dashboard lane set — and the
   * reason is the same one that makes this control worth fixing at all. Every
   * other untranslated string in this app sits on a screen made of rows, where
   * a name and a date are recognisable in any language. These are the only
   * words a blind reader gets on the sign-in screen, and a person who cannot
   * get past sign-in cannot reach the language switcher to fix it. Leaving them
   * English would mean the one screen with no way around it is the one screen
   * that does not speak the reader's language.
   *
   * `{position}` and `{total}` are bare numbers and stay numbers everywhere. */
  "Verification code": {
    de: "Bestätigungscode",
    es: "Código de verificación",
    ca: "Codi de verificació",
  },
  "Digit {position} of {total}": {
    de: "Ziffer {position} von {total}",
    es: "Dígito {position} de {total}",
    ca: "Dígit {position} de {total}",
  },
  /* ── The stages a ticket went through, and how the client says we did ────
   * Team migrations 0066 and 0067, 2026-09-07. Written by hand at the same
   * commit as the English, so the ceiling (R44) never rises: a string shipped
   * with no answer is an English sentence on a screen that looks finished.
   *
   * TWO REGISTERS, unchanged from the rest of this file: German keeps `Sie`,
   * Spanish and Catalan keep the second person singular. The three points of
   * the scale are ordinary words a person would say out loud about a job — not
   * "unzufrieden / neutral / zufrieden", which is a survey talking, and this is
   * one question at the bottom of a request somebody raised. */
  "Stages": { de: "Phasen", es: "Etapas", ca: "Etapes"},
  "Still here": { de: "Noch hier", es: "Sigue aquí", ca: "Encara aquí"},
  "Reopened": { de: "Wieder geöffnet", es: "Reabierto", ca: "Reobert"},
  "New": { de: "Neu", es: "Nuevo", ca: "Nou"},
  "Waiting on you": { de: "Wartet auf Sie", es: "Esperando tu respuesta", ca: "Esperant la teva resposta"},
  /* The compact day count on a stage row. A letter rather than the word, so a
   * six-rung strip stays one line per rung on a phone — the same shape
   * `formatRelative`'s own "{count}d ago" already uses, and translated the same
   * way (T for Tage, d for días / dies). */
  "{count}d": { de: "{count} T", es: "{count} d", ca: "{count} d"},
  "How did we do?": { de: "Wie haben wir das gemacht?", es: "¿Qué tal lo hemos hecho?", ca: "Com ho hem fet?"},
  "Not great": { de: "Nicht gut", es: "No muy bien", ca: "No gaire bé"},
  "Fine": { de: "Geht so", es: "Bien", ca: "Bé"},
  "Great": { de: "Sehr gut", es: "Muy bien", ca: "Molt bé"},
  "Anything you'd like to add? (optional)": { de: "Möchten Sie noch etwas ergänzen? (optional)", es: "¿Quieres añadir algo? (opcional)", ca: "Vols afegir-hi alguna cosa? (opcional)"},
  "Send": { de: "Senden", es: "Enviar", ca: "Enviar"},
  "Thanks for telling us.": { de: "Danke für Ihre Rückmeldung.", es: "Gracias por decírnoslo.", ca: "Gràcies per dir-nos-ho."},

  /* ── THE FIELD HINTS THAT NEVER RENDERED ────────────────────────────────
   * 44 `FieldConfig`s across both front doors set `hint:`, a key the type
   * has never had (it has `helpText`) — written for a person and read by
   * nobody, silently dropped by the excess-property check's own blind spot
   * for named constants. Renamed to `helpText:` and translated here, by
   * hand, on the owner's ruling of 8 Sep 2026 (never `i18n-translate.mjs` —
   * that spends his own key). One of the 44, the New story dialog's App
   * field, was converted and catalogued alone on 8 Sep 2026 to measure the
   * class; its own translation lives in this same block, keyed by its
   * English exactly as `shared/i18n-strings.json` has it. */
  // FOUR NEW STRINGS, 16 Sep 2026, for the story form's process dropdown
  // (story-form-dialog.tsx) and its Type row — R44's ceiling stays where it
  // was, none of these are debt.
  "Add a process": { de: "Einen Prozess hinzufügen", es: "Añadir un proceso", ca: "Afegir un procés"},
  "This changes no process": { de: "Das ändert keinen Prozess", es: "Esto no cambia ningún proceso", ca: "Això no canvia cap procés"},
  "Your team has no story types set up yet.": { de: "Ihr Team hat noch keine Story-Typen eingerichtet.", es: "Tu equipo aún no tiene tipos de historia configurados.", ca: "El teu equip encara no té tipus d'història configurats."},
  // THE SAME SENTENCE WITH THE EMOJI TAKEN OUT OF IT — client, 2026-09-10
  // (*"also kill emojis!!!"*). The English key moved from "One emoji shown
  // beside this word…" to the line below when `selectable-form-dialog.tsx`
  // stopped asking for a pictograph the write door has refused since
  // `optionalMark` shipped; the three translations are the old ones with the
  // same substitution made, so the wording a German reader knows is unchanged
  // apart from the thing being asked for.
  // "MARK" AS A NOUN, WHICH IS WHAT THE FIELD IS. The generated catalogue
  // answers it with the VERB in two of the three — `Markieren` is "to mark" and
  // `Marcar` is "to mark" — which was survivable while one screen said it and
  // is not now that four do (the three Choices screens took the word on
  // 2026-09-10). `Kürzel` is the German for exactly this: a short code standing
  // for a longer name. Seeded here rather than corrected in
  // `shared/i18n-catalogue.ts`, which is generated and says so at the top.
  "Mark": { de: "Kürzel", es: "Distintivo", ca: "Distintiu"},
  "Choices": { de: "Optionen", es: "Opciones", ca: "Opcions"},
  /* ── THE CASCADING FILTER ROW (client ruling, 2026-09-09) ────────────────
   * The one sentence the narrowing itself adds. Everything else that ruling
   * needed a person to read — "Choose a client first.", "Choose an app first."
   * — was already in this app's mouth, said by the ticket form about exactly
   * the same question, so it is reused rather than re-authored (R34: one idea,
   * one sentence). This is said out loud in the toast when a filter somebody
   * deliberately set stops being possible because they moved the one it hangs
   * off: never silently, which is the whole reason it is a sentence at all.
   * Seeded in all three rather than left to the generator so the ceiling in
   * TRANSLATION_CEILING does not have to rise for it (R44 — the pin falls and
   * never rises). */
  "Cleared the {what} filter — it doesn't fit the {parent} you picked.": { de: "Filter {what} geleert — er passt nicht zur Auswahl unter {parent}.", es: "Se ha borrado el filtro {what}: no encaja con {parent} que has elegido.", ca: "S'ha esborrat el filtre {what}: no encaixa amb {parent} que has triat."},
  /* ── R44 CEILING PASS — 2026-09-09 ─────────────────────────────────────────
   * The 244 strings TRANSLATION_CEILING pinned as untranslated in each of
   * de/es/ca, answered by hand per the owner's 8 Sep 2026 ruling that
   * translation is the builder's own job and never spends his key. Register
   * matches the rest of this file: formal Sie in German, plain tú/teva in
   * Spanish and Catalan. Terminology follows the vocabulary block above —
   * "Input" (the glossary's client-facing to-do) is new to this pass and
   * renders "Angabe(n)" / "aportación(es)" / "aportació/aportacions"
   * throughout, chosen because "To-do" was already spent on the glossary's
   * separate Task concept ("To-do"/"Tareas"/"Tasques", the vocabulary block
   * above). Several of these split an existing joined title+description
   * sentence into the two separate `t(...)` calls the screen now makes; the
   * wording is carried over unchanged from the joined entry, not re-thought.
   * Placeholders checked against the English source, hole for hole. */
  "1 contact matches": { de: "1 Kontakt passt", es: "1 contacto coincide", ca: "1 contacte coincideix" },
  "1 entry matches": { de: "1 Eintrag passt", es: "1 entrada coincide", ca: "1 entrada coincideix" },
  "1 input matches": { de: "1 Angabe passt", es: "1 aportación coincide", ca: "1 aportació coincideix" },
  "A calm, light background that lets the work stand out.": { de: "Ein ruhiger, heller Hintergrund, der die Arbeit hervorhebt.", es: "Un fondo claro y tranquilo que hace destacar el trabajo.", ca: "Un fons clar i tranquil que fa destacar la feina." },
  "A colleague": { de: "Ein Kollege", es: "Un compañero", ca: "Un company" },
  "A company or a person you work with. Everything else hangs off one.": { de: "Ein Unternehmen oder eine Person, mit der Sie zusammenarbeiten. Alles andere hängt daran.", es: "Una empresa o una persona con la que trabajas. Todo lo demás cuelga de ahí.", ca: "Una empresa o una persona amb qui treballes. Tota la resta penja d'aquí." },
  "A contact is a person at one of your accounts. Open the company under Accounts and add them from its own screen.": { de: "Ein Kontakt ist eine Person bei einem Ihrer Kunden. Öffnen Sie das Unternehmen unter Kunden und fügen Sie die Person von dessen eigener Seite hinzu.", es: "Un contacto es una persona de una de tus cuentas. Abre la empresa en Cuentas y añádelo desde su propia página.", ca: "Un contacte és una persona d'un dels teus comptes. Obre l'empresa a Comptes i afegeix-lo des de la seva pròpia pàgina." },
  "A dark background of its own, whatever your light or dark setting is.": { de: "Ein eigener dunkler Hintergrund, unabhängig von Ihrer Hell-/Dunkel-Einstellung.", es: "Un fondo oscuro propio, sea cual sea tu ajuste de claro u oscuro.", ca: "Un fons fosc propi, sigui quin sigui el teu ajust de clar o fosc." },
  "A member joins by accepting an invite. Send one from Invites and they appear here once they accept.": { de: "Ein Mitglied tritt bei, indem es eine Einladung annimmt. Senden Sie eine über Einladungen, und die Person erscheint hier, sobald sie annimmt.", es: "Un miembro se une aceptando una invitación. Envía una desde Invitaciones y aparecerá aquí en cuanto la acepte.", ca: "Un membre s'uneix acceptant una invitació. Envia'n una des d'Invitacions i apareixerà aquí quan l'accepti." },
  "A role carries what an hour of it costs them, which is what turns a process map's minutes into money.": { de: "Eine Rolle gibt an, was eine Stunde davon kostet, und das wandelt die Minuten der Prozesskarte in Geld um.", es: "Un rol indica cuánto cuesta una hora de él, lo que convierte los minutos del mapa de proceso en dinero.", ca: "Un rol indica quant costa una hora d'aquest, el que converteix els minuts del mapa de procés en diners." },
  "A short word or initial": { de: "Ein kurzes Wort oder eine Initiale", es: "Una palabra corta o una inicial", ca: "Una paraula curta o una inicial" },
  "A ticket is something someone has asked us for. Raise one here, or wait for a client to raise one from their portal.": { de: "Ein Ticket ist etwas, worum uns jemand gebeten hat. Erstellen Sie hier eines, oder warten Sie, bis ein Kunde eines über sein Portal einreicht.", es: "Un ticket es algo que alguien nos ha pedido. Crea uno aquí, o espera a que un cliente cree uno desde su portal.", ca: "Un tiquet és una cosa que algú ens ha demanat. Crea'n un aquí, o espera que un client en creï un des del seu portal." },
  "Access switched back on.": { de: "Zugriff wieder aktiviert.", es: "Acceso reactivado.", ca: "Accés reactivat." },
  "Access taken away.": { de: "Zugriff entzogen.", es: "Acceso retirado.", ca: "Accés retirat." },
  "Add the first": { de: "Das erste hinzufügen", es: "Añade el primero", ca: "Afegeix el primer" },
  "Add the parts of their company, so a role can say where it sits.": { de: "Fügen Sie die Bereiche ihres Unternehmens hinzu, damit eine Rolle angeben kann, wo sie sitzt.", es: "Añade las partes de su empresa, para que un rol pueda indicar dónde está.", ca: "Afegeix les parts de la seva empresa, perquè un rol pugui indicar on es troba." },
  "Add the sections this app is divided into, so tickets can say which one they are about.": { de: "Fügen Sie die Bereiche hinzu, in die diese App gegliedert ist, damit Tickets den Bereich nennen können.", es: "Añade las secciones en que se divide esta aplicación para que los tickets puedan indicarlas.", ca: "Afegeix les seccions en què es divideix aquesta aplicació perquè els tiquets les puguin indicar." },
  "Add them as a contact from the company's own page.": { de: "Fügen Sie sie als Kontakt von der eigenen Seite des Unternehmens hinzu.", es: "Añádelos como contacto desde la página de la empresa.", ca: "Afegeix-los com a contacte des de la pàgina pròpia de l'empresa." },
  "Add what they run on, so a step that replaces one can subtract what it costs.": { de: "Fügen Sie hinzu, worauf sie laufen, damit ein Schritt, der einen ersetzt, die Kosten abziehen kann.", es: "Añade en qué se ejecutan, para que un paso que reemplace a una pueda restar lo que cuesta.", ca: "Afegeix en què s'executen, perquè un pas que en substitueixi un pugui restar el que costa." },
  "Add your first account": { de: "Fügen Sie Ihren ersten Kunden hinzu", es: "Añade tu primera cuenta", ca: "Afegeix el teu primer compte" },
  "Add {person} back": { de: "„{person}“ wieder hinzufügen", es: "Volver a añadir a {person}", ca: "Torna a afegir {person}" },
  "An app": { de: "Eine App", es: "Una app", ca: "Una app" },
  "Any {what}": { de: "Alle {what}", es: "Cualquier {what}", ca: "Qualsevol {what}" },
  "Archive this ticket?": { de: "Dieses Ticket archivieren?", es: "¿Archivar este ticket?", ca: "Vols arxivar aquest tiquet?" },
  "Archive {name}?": { de: "„{name}“ archivieren?", es: "¿Archivar «{name}»?", ca: "Vols arxivar «{name}»?" },
  "Assign": { de: "Zuweisen", es: "Asignar", ca: "Assignar" },
  "Awaiting your input": { de: "Wartet auf Ihre Angaben", es: "Pendiente de tu aportación", ca: "Pendent de la teva aportació" },
  "Background": { de: "Hintergrund", es: "Fondo", ca: "Fons" },
  "Bring a spreadsheet in": { de: "Eine Tabelle importieren", es: "Importar una hoja de cálculo", ca: "Importar un full de càlcul" },
  "Calm, and out of the way.": { de: "Ruhig und unaufdringlich.", es: "Tranquilo y discreto.", ca: "Tranquil i discret." },
  "Cancel {title}?": { de: "„{title}“ absagen?", es: "¿Cancelar «{title}»?", ca: "Vols cancel·lar «{title}»?" },
  "Change category": { de: "Kategorie ändern", es: "Cambiar categoría", ca: "Canviar categoria" },
  // NOT THIS LANE'S OWN COPY — found untranslated by this same session's run
  // of `node scripts/i18n-extract.mjs` (story-detail.tsx / story-form-dialog.tsx,
  // a story "category" field this session did not build and does not own).
  // Translated anyway, plainly, rather than left red: R44's ceiling is pinned
  // at 0 and a session that runs the extractor inherits keeping it there,
  // the same way `npm run lang` would for anybody who ran it next.
  "Category": { de: "Kategorie", es: "Categoría", ca: "Categoria" },
  // THE STORIES TAB STRIP, 15 Sep 2026 — `tasks-screen.tsx`'s own tab words,
  // ported one collection along, plus "Backlog" (the client's own correction
  // over the design proposal's "All" — documents/UI-RULEBOOK.md K entry).
  // "story" keeps the vocabulary this file already settled on above
  // (`Aufgabe` / `historia` / `història`).
  "Backlog": { de: "Backlog", es: "Backlog", ca: "Backlog" },
  "No sprint": { de: "Kein Sprint", es: "Sin sprint", ca: "Sense sprint" },
  "No stories with a due date yet.": { de: "Noch keine Aufgaben mit Fälligkeitsdatum.", es: "Aún no hay historias con fecha de vencimiento.", ca: "Encara no hi ha històries amb data de venciment." },
  "Nothing on this list yet.": { de: "Noch nichts auf dieser Liste.", es: "Aún no hay nada en esta lista.", ca: "Encara no hi ha res en aquesta llista." },
  "Now": { de: "Jetzt", es: "Ahora", ca: "Ara" },
  "Order": { de: "Reihenfolge", es: "Orden", ca: "Ordre" },
  "Stories by status": { de: "Aufgaben nach Status", es: "Historias por estado", ca: "Històries per estat" },
  "Check your connection and try again.": { de: "Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.", es: "Comprueba tu conexión e inténtalo de nuevo.", ca: "Comprova la teva connexió i torna-ho a provar." },
  "Clear the search": { de: "Suche löschen", es: "Borrar la búsqueda", ca: "Esborrar la cerca" },
  "Client visibility": { de: "Sichtbarkeit für den Kunden", es: "Visibilidad para el cliente", ca: "Visibilitat per al client" },
  "Close the assistant": { de: "Assistenten schließen", es: "Cerrar el asistente", ca: "Tancar l'assistent" },
  "Contact added back.": { de: "Kontakt wieder hinzugefügt.", es: "Contacto añadido de nuevo.", ca: "Contacte tornat a afegir." },
  "Contact removed.": { de: "Kontakt entfernt.", es: "Contacto eliminado.", ca: "Contacte eliminat." },
  "Contacts now": { de: "Aktuell Kontakt", es: "Contacto actualmente", ca: "Contacte actualment" },
  "Couldn't add that contact back.": { de: "Der Kontakt konnte nicht wieder hinzugefügt werden.", es: "No se pudo volver a añadir ese contacto.", ca: "No s'ha pogut tornar a afegir aquest contacte." },
  "Couldn't archive that app.": { de: "Die App konnte nicht archiviert werden.", es: "No se pudo archivar esa app.", ca: "No s'ha pogut arxivar aquesta app." },
  "Couldn't archive the ticket.": { de: "Das Ticket konnte nicht archiviert werden.", es: "No se pudo archivar el ticket.", ca: "No s'ha pogut arxivar el tiquet." },
  "Couldn't cancel the meeting.": { de: "Der Termin konnte nicht abgesagt werden.", es: "No se pudo cancelar la reunión.", ca: "No s'ha pogut cancel·lar la reunió." },
  "Couldn't change that login.": { de: "Der Zugang konnte nicht geändert werden.", es: "No se pudo cambiar ese acceso.", ca: "No s'ha pogut canviar aquest accés." },
  "Couldn't load activity": { de: "Verlauf konnte nicht geladen werden", es: "No se pudo cargar la actividad", ca: "No s'ha pogut carregar l'activitat" },
  "Couldn't load members.": { de: "Mitglieder konnten nicht geladen werden.", es: "No se pudieron cargar los miembros.", ca: "No s'han pogut carregar els membres." },
  "Couldn't load the hours for this record.": { de: "Die Stunden für diesen Eintrag konnten nicht geladen werden.", es: "No se pudieron cargar las horas de este registro.", ca: "No s'han pogut carregar les hores d'aquest registre." },
  "Couldn't load the inputs.": { de: "Die Angaben konnten nicht geladen werden.", es: "No se pudieron cargar las aportaciones.", ca: "No s'han pogut carregar les aportacions." },
  "Couldn't load the triage queue.": { de: "Die Sichtungswarteschlange konnte nicht geladen werden.", es: "No se pudo cargar la cola de clasificación.", ca: "No s'ha pogut carregar la cua de classificació." },
  "Couldn't remove that contact.": { de: "Der Kontakt konnte nicht entfernt werden.", es: "No se pudo eliminar ese contacto.", ca: "No s'ha pogut eliminar aquest contacte." },
  "Couldn't restore that app.": { de: "Die App konnte nicht wiederhergestellt werden.", es: "No se pudo restaurar esa app.", ca: "No s'ha pogut restaurar aquesta app." },
  "Couldn't restore the meeting.": { de: "Der Termin konnte nicht wiederhergestellt werden.", es: "No se pudo restaurar la reunión.", ca: "No s'ha pogut restaurar la reunió." },
  "Dark": { de: "Dunkel", es: "Oscuro", ca: "Fosc" },
  "Dark, whatever your theme.": { de: "Dunkel, unabhängig von Ihrem Design.", es: "Oscuro, sea cual sea tu tema.", ca: "Fosc, sigui quin sigui el teu tema." },
  "Dashboard": { de: "Dashboard", es: "Panel de control", ca: "Tauler de control" },
  "Deactivate this profile?": { de: "Dieses Profil deaktivieren?", es: "¿Desactivar este perfil?", ca: "Vols desactivar aquest perfil?" },
  "Decide": { de: "Entscheiden", es: "Decidir", ca: "Decidir" },
  "Earlier": { de: "Früher", es: "Antes", ca: "Abans" },
  "Every meeting they're in will show here once one is arranged.": { de: "Jeder Termin, an dem sie beteiligt sind, erscheint hier, sobald einer vereinbart ist.", es: "Aquí aparecerá cada reunión en la que participen, en cuanto se organice una.", ca: "Aquí apareixerà cada reunió en què participin, quan se n'organitzi una." },
  "Every ticket about them will show here once one is raised.": { de: "Jedes Ticket zu ihnen erscheint hier, sobald eines eingereicht wird.", es: "Aquí aparecerá cada ticket sobre ellos, en cuanto se cree uno.", ca: "Aquí apareixerà cada tiquet sobre ells, quan se'n creï un." },
  "Everyone": { de: "Alle", es: "Todos", ca: "Tots" },
  "Filed as {type}.": { de: "Als {type} eingeordnet.", es: "Clasificado como {type}.", ca: "Classificat com a {type}." },
  "Filter by who logged it": { de: "Nach Erfasser filtern", es: "Filtrar por quién lo registró", ca: "Filtrar per qui ho ha registrat" },
  "Formatting": { de: "Formatierung", es: "Formato", ca: "Format" },
  "Give access to someone and they'll see this account's own work.": { de: "Geben Sie jemandem Zugriff und er sieht die Arbeit dieses Kontos.", es: "Dale acceso a alguien y verán el propio trabajo de esta cuenta.", ca: "Dona accés a algú i veurà el treball propi d'aquest compte." },
  "Given": { de: "Erteilt", es: "Concedido", ca: "Concedit" },
  "Go to Welcome": { de: "Zu Start gehen", es: "Ir a Inicio", ca: "Anar a Inici" },
  "How far through the queue you are": { de: "Wie weit Sie in der Warteschlange sind", es: "Cuánto llevas de la cola", ca: "Quant portes de la cua" },
  "Import a CSV instead of typing. Download a sample file first to see what a good one looks like.": { de: "Importieren Sie eine CSV-Datei, statt selbst zu tippen. Laden Sie zuerst eine Beispieldatei herunter, um zu sehen, wie eine gute aussieht.", es: "Importa un CSV en lugar de escribir. Descarga primero un archivo de ejemplo para ver cómo debería ser.", ca: "Importa un CSV en lloc d'escriure. Descarrega primer un fitxer d'exemple per veure com hauria de ser." },
  "Import a list": { de: "Liste importieren", es: "Importar una lista", ca: "Importar una llista" },
  "Ink": { de: "Tinte", es: "Tinta", ca: "Tinta" },
  "Inputs": { de: "Angaben", es: "Aportaciones", ca: "Aportacions" },
  "Integrations": { de: "Integrationen", es: "Integraciones", ca: "Integracions" },
  "Invite someone by email and choose their role. The invite waits here until they accept it.": { de: "Laden Sie jemanden per E-Mail ein und wählen Sie seine Rolle. Die Einladung wartet hier, bis sie angenommen wird.", es: "Invita a alguien por correo y elige su rol. La invitación espera aquí hasta que la acepte.", ca: "Convida algú per correu i tria el seu rol. La invitació espera aquí fins que l'accepti." },
  "It comes out of Meetings. The record and its notes stay exactly where they are, and you can put it back any time.": { de: "Es verschwindet aus Terminen. Der Eintrag und seine Notizen bleiben genau dort, wo sie sind, und Sie können es jederzeit zurückholen.", es: "Desaparece de Reuniones. El registro y sus notas se quedan exactamente donde están, y puedes recuperarlo cuando quieras.", ca: "Desapareix de Reunions. El registre i les seves notes es queden exactament on són, i el pots recuperar quan vulguis." },
  "It stops showing as a live colleague. What was written stays written, and the panel reads it back the moment it comes on again.": { de: "Er wird nicht mehr als aktiver Kollege angezeigt. Was geschrieben wurde, bleibt geschrieben, und das Panel liest es wieder ein, sobald er reaktiviert wird.", es: "Deja de mostrarse como compañero activo. Lo que se escribió sigue escrito, y el panel vuelve a leerlo en cuanto se reactiva.", ca: "Deixa de mostrar-se com a company actiu. El que es va escriure continua escrit, i el panell ho torna a llegir tan bon punt es reactiva." },
  "It stops showing in the everyday lists. Everything on it, its work and its history, stays exactly where it is, and you can bring it back any time.": { de: "Es verschwindet aus den alltäglichen Listen. Alles darin, seine Arbeit und sein Verlauf, bleibt genau dort, wo es ist, und Sie können es jederzeit zurückholen.", es: "Deja de aparecer en las listas del día a día. Todo lo que contiene, su trabajo y su historial, se queda exactamente donde está, y puedes recuperarlo cuando quieras.", ca: "Deixa d'aparèixer a les llistes del dia a dia. Tot el que conté, la seva feina i el seu historial, es queda exactament on és, i el pots recuperar quan vulguis." },
  "It stops showing in the everyday lists. The conversation and its history stay exactly as they are, and you can take it back out any time.": { de: "Es verschwindet aus den alltäglichen Listen. Die Unterhaltung und ihr Verlauf bleiben genau, wie sie sind, und Sie können es jederzeit wieder hervorholen.", es: "Deja de aparecer en las listas del día a día. La conversación y su historial se quedan tal como están, y puedes recuperarlo cuando quieras.", ca: "Deixa d'aparèixer a les llistes del dia a dia. La conversa i el seu historial es queden tal com estan, i el pots recuperar quan vulguis." },
  "Last 30 days": { de: "Letzte 30 Tage", es: "Últimos 30 días", ca: "Últims 30 dies" },
  "Last 7 days": { de: "Letzte 7 Tage", es: "Últimos 7 días", ca: "Últims 7 dies" },
  "Last 90 days": { de: "Letzte 90 Tage", es: "Últimos 90 días", ca: "Últims 90 dies" },
  "Later": { de: "Später", es: "Después", ca: "Després" },
  "Length": { de: "Dauer", es: "Duración", ca: "Durada" },
  "Light": { de: "Hell", es: "Claro", ca: "Clar" },
  "Load more contacts": { de: "Weitere Kontakte laden", es: "Cargar más contactos", ca: "Carregar més contactes" },
  "Load more inputs": { de: "Weitere Angaben laden", es: "Cargar más aportaciones", ca: "Carregar més aportacions" },
  "Manage choices": { de: "Optionen verwalten", es: "Gestionar opciones", ca: "Gestionar opcions" },
  "Mango": { de: "Mango", es: "Mango", ca: "Mango" },
  /* The Meetings strip's middle tab (client ruling, 2026-09-09: "tabs for
     meetings: this week, mine, all"). It means THE ONES I WAS IN THE ROOM FOR,
     so it agrees in gender and number with the collection it narrows —
     `Termine` / `Reuniones` / `Reunions`. */
  Mine: { de: "Meine", es: "Mías", ca: "Meves" },
  "No contacts match": { de: "Keine Kontakte passen", es: "No hay contactos que coincidan", ca: "Cap contacte coincideix" },
  "No departments yet.": { de: "Noch keine Abteilungen.", es: "Aún no hay departamentos.", ca: "Encara no hi ha departaments." },
  "No inputs match": { de: "Keine Angaben passen", es: "No hay aportaciones que coincidan", ca: "Cap aportació coincideix" },
  "No modules yet.": { de: "Noch keine Module.", es: "Aún no hay módulos.", ca: "Encara no hi ha mòduls." },
  "No new tickets to sort. Nobody is on triage this week.": { de: "Keine neuen Tickets zu sichten. Diese Woche macht niemand die Triage.", es: "No hay tickets nuevos que clasificar. Esta semana nadie está de triaje.", ca: "No hi ha tiquets nous per classificar. Aquesta setmana ningú fa el triatge." },
  "No new tickets to sort. {name} is on triage this week.": { de: "Keine neuen Tickets zu sichten. {name} macht diese Woche die Triage.", es: "No hay tickets nuevos que clasificar. {name} está de triaje esta semana.", ca: "No hi ha tiquets nous per classificar. {name} fa el triatge aquesta setmana." },
  "No roles yet.": { de: "Noch keine Rollen.", es: "Aún no hay roles.", ca: "Encara no hi ha rols." },
  "No sprints in this wave yet.": { de: "Noch keine Sprints in dieser Wave.", es: "Aún no hay sprints en esta wave.", ca: "Encara no hi ha sprints en aquesta wave." },
  "No tasks match your search.": { de: "Keine To-dos passen zu Ihrer Suche.", es: "Ninguna tarea coincide con tu búsqueda.", ca: "Cap tasca coincideix amb la teva cerca." },
  "No tasks with a deadline yet.": { de: "Noch keine To-dos mit einer Frist.", es: "Aún no hay tareas con fecha límite.", ca: "Encara no hi ha tasques amb data límit." },
  "No time matches": { de: "Keine Zeit passt", es: "No hay tiempo que coincida", ca: "Cap temps coincideix" },
  "No tools yet.": { de: "Noch keine Werkzeuge.", es: "Aún no hay herramientas.", ca: "Encara no hi ha eines." },
  "No waves have both a start and an end in this window yet.": { de: "Noch keine Wave mit Start und Ende in diesem Zeitraum.", es: "Aún ninguna wave tiene inicio y fin en este período.", ca: "Encara cap wave té inici i final en aquest període." },
  "No waves match that in this window.": { de: "Keine Wave passt dazu in diesem Zeitraum.", es: "Ninguna wave coincide con eso en este período.", ca: "Cap wave hi coincideix en aquest període." },
  "No waves match that.": { de: "Keine Wave passt dazu.", es: "Ninguna wave coincide con eso.", ca: "Cap wave hi coincideix." },
  "No waves or sprints have a start date yet.": { de: "Noch keine Wave oder kein Sprint mit einem Startdatum.", es: "Aún ninguna wave o sprint tiene fecha de inicio.", ca: "Encara cap wave o sprint té data d'inici." },
  "Nobody here can sign in yet.": { de: "Niemand kann sich hier noch anmelden.", es: "Nadie aquí puede iniciar sesión todavía.", ca: "Ningú aquí pot accedir encara." },
  "Nobody on our side matches that.": { de: "Niemand von uns passt dazu.", es: "Nadie de nuestro lado coincide con eso.", ca: "Ningú del nostre costat hi coincideix." },
  "Nobody on the client's side matches that.": { de: "Niemand auf Seiten des Kunden passt dazu.", es: "Nadie del lado del cliente coincide con eso.", ca: "Ningú del costat del client hi coincideix." },
  "Nobody on this team can be given work yet.": { de: "Noch niemandem in diesem Team kann Arbeit zugewiesen werden.", es: "Aún no hay nadie en este equipo a quien se le pueda asignar trabajo.", ca: "Encara no hi ha ningú en aquest equip a qui es pugui assignar feina." },
  "Not linked to a company.": { de: "Nicht mit einem Unternehmen verknüpft.", es: "No vinculado a una empresa.", ca: "No vinculat a una empresa." },
  "Not shared": { de: "Nicht freigegeben", es: "No compartido", ca: "No compartit" },
  "Nothing built for {account} yet.": { de: "Für {account} wurde noch nichts gebaut.", es: "Aún no se ha construido nada para {account}.", ca: "Encara no s'ha construït res per a {account}." },
  "Nothing in Meetings this week.": { de: "Diese Woche nichts in Terminen.", es: "Nada en Reuniones esta semana.", ca: "Res a Reunions aquesta setmana." },
  "Nothing in Meetings yet.": { de: "Noch nichts in Terminen.", es: "Aún nada en Reuniones.", ca: "Encara res a Reunions." },
  /* The Mine tab's empty state — it says the RULE the tab uses (attendance),
     because a person who sees an empty Mine beside a full All will otherwise
     assume the tab is broken rather than that they were in no meetings. */
  "Nothing in Meetings you were in.": {
    de: "Nichts in Terminen, bei denen Sie dabei waren.",
    es: "Nada en Reuniones en las que hayas estado.",
    ca: "Res a Reunions on hagis estat.",
  },
  "Nothing in the triage queue matches what you asked for.": { de: "Nichts in der Sichtungswarteschlange passt zu Ihrer Anfrage.", es: "Nada en la cola de clasificación coincide con lo que buscas.", ca: "Res a la cua de classificació coincideix amb el que busques." },
  "Nothing matched that.": { de: "Nichts passt dazu.", es: "Nada coincide con eso.", ca: "Res no hi coincideix." },
  "Nothing matched. Try fewer words, or clear the filters.": { de: "Nichts gefunden. Weniger Wörter versuchen oder die Filter zurücksetzen.", es: "Nada coincide. Prueba con menos palabras o borra los filtros.", ca: "Res no coincideix. Prova amb menys paraules o esborra els filtres." },
  "Nothing waiting.": { de: "Nichts wartet.", es: "Nada en espera.", ca: "Res en espera." },
  "Nothing's on the go right now. Any one of these is a good place to start.": { de: "Gerade ist nichts in Arbeit. Jeder dieser Punkte ist ein guter Anfang.", es: "Ahora mismo no hay nada en marcha. Cualquiera de estos es un buen punto de partida.", ca: "Ara mateix no hi ha res en marxa. Qualsevol d'aquests és un bon punt de partida." },
  "Open the recording": { de: "Aufzeichnung öffnen", es: "Abrir la grabación", ca: "Obrir la gravació" },
  "Paper": { de: "Papier", es: "Papel", ca: "Paper" },
  "Picked": { de: "Ausgewählt", es: "Elegido", ca: "Triat" },
  "Picking one files the ticket straight away. Nothing is sent to the client.": { de: "Die Auswahl legt das Ticket sofort ab. Es wird nichts an den Kunden gesendet.", es: "Elegir uno archiva el ticket de inmediato. No se envía nada al cliente.", ca: "Triar-ne un arxiva el tiquet de seguida. No s'envia res al client." },
  "Plan": { de: "Planen", es: "Planificar", ca: "Planificar" },
  "Put back as it was.": { de: "Wie zuvor zurückgesetzt.", es: "Restaurado como estaba.", ca: "Restaurat tal com estava." },
  "Queue": { de: "Warteschlange", es: "Cola", ca: "Cua" },
  "Raise the first ticket": { de: "Erstes Ticket erstellen", es: "Crea el primer ticket", ca: "Crea el primer tiquet" },
  "Regular": { de: "Normal", es: "Normal", ca: "Normal" },
  "Raised": { de: "Erstellt", es: "Creado", ca: "Creat" },
  "Reading from": { de: "Liest aus", es: "Leyendo de", ca: "Llegint de" },
  "Remove contact": { de: "Kontakt entfernen", es: "Eliminar contacto", ca: "Eliminar contacte" },
  "Remove {person}": { de: "„{person}“ entfernen", es: "Eliminar a {person}", ca: "Eliminar {person}" },
  "Remove {person} from {account}?": { de: "„{person}“ von „{account}“ entfernen?", es: "¿Eliminar a {person} de {account}?", ca: "Vols eliminar {person} de {account}?" },
  "Screen recording": { de: "Bildschirmaufzeichnung", es: "Grabación de pantalla", ca: "Gravació de pantalla" },
  "Search companies": { de: "Unternehmen durchsuchen", es: "Buscar empresas", ca: "Cercar empreses" },
  "Search contacts": { de: "Kontakte durchsuchen", es: "Buscar contactos", ca: "Cercar contactes" },
  "Search inputs…": { de: "Angaben durchsuchen…", es: "Buscar aportaciones…", ca: "Cercar aportacions…" },
  /* ── THE INPUTS SCREEN (Task C, 15 Sep 2026) — seeded rather than left to
   * the generator so TRANSLATION_CEILING does not have to rise for them
   * (R44 — the pin falls and never rises). Terminology follows the
   * established R44-pass choice for the glossary's Input word — "Angabe" /
   * "Aportación" / "Aportació", singular here (the tab strip's own
   * `{count} inputs match` already uses the plural, seeded). "Due" is
   * deliberately shorter than "Deadline" ("Frist"/"Fecha límite"/"Data
   * límit", i18n-catalogue.ts): the client's own I1 column is terse on
   * purpose, so the translation stays terse too. */
  "Input": { de: "Angabe", es: "Aportación", ca: "Aportació" },
  "Due": { de: "Fällig", es: "Vence", ca: "Venç" },
  "Received": { de: "Erhalten", es: "Recibido", ca: "Rebut" },
  "Received on": { de: "Erhalten am", es: "Recibido el", ca: "Rebut el" },
  "Waiting longest": { de: "Am längsten wartend", es: "Más tiempo esperando", ca: "Més temps esperant" },
  "{count} days": { de: "{count} Tage", es: "{count} días", ca: "{count} dies" },
  "Mark received": { de: "Als erhalten markieren", es: "Marcar como recibido", ca: "Marcar com a rebut" },
  "Marked received.": { de: "Als erhalten markiert.", es: "Marcado como recibido.", ca: "Marcat com a rebut." },
  "Couldn't mark that received.": { de: "Das konnte nicht als erhalten markiert werden.", es: "No se pudo marcar eso como recibido.", ca: "No s'ha pogut marcar això com a rebut." },
  "Search logins": { de: "Zugänge durchsuchen", es: "Buscar accesos", ca: "Cercar accessos" },
  "Search logins…": { de: "Zugänge durchsuchen…", es: "Buscar accesos…", ca: "Cercar accessos…" },
  "Search meetings": { de: "Termine durchsuchen", es: "Buscar reuniones", ca: "Cercar reunions" },
  "Search modules": { de: "Module durchsuchen", es: "Buscar módulos", ca: "Cercar mòduls" },
  "Search people on this": { de: "Beteiligte durchsuchen", es: "Buscar personas implicadas", ca: "Cercar persones implicades" },
  "Search people on this…": { de: "Beteiligte durchsuchen…", es: "Buscar personas implicadas…", ca: "Cercar persones implicades…" },
  "Search sprints in this wave": { de: "Sprints in dieser Wave durchsuchen", es: "Buscar sprints en esta wave", ca: "Cercar sprints en aquesta wave" },
  "Search sprints in this wave…": { de: "Sprints in dieser Wave durchsuchen…", es: "Buscar sprints en esta wave…", ca: "Cercar sprints en aquesta wave…" },
  "Search stories…": { de: "Aufgaben durchsuchen…", es: "Buscar historias…", ca: "Cercar històries…" },
  "Search tasks…": { de: "To-dos durchsuchen…", es: "Buscar tareas…", ca: "Cercar tasques…" },
  "Search the triage queue…": { de: "Sichtungswarteschlange durchsuchen…", es: "Buscar en la cola de clasificación…", ca: "Cercar a la cua de classificació…" },
  "Search tickets": { de: "Tickets durchsuchen", es: "Buscar tickets", ca: "Cercar tiquets" },
  "Search time…": { de: "Zeit durchsuchen…", es: "Buscar tiempo…", ca: "Cercar temps…" },
  "Search tools…": { de: "Werkzeuge durchsuchen…", es: "Buscar herramientas…", ca: "Cercar eines…" },
  "Search what you've sent": { de: "Gesendetes durchsuchen", es: "Buscar lo que has enviado", ca: "Cercar el que has enviat" },
  "Search your tickets": { de: "Ihre Tickets durchsuchen", es: "Buscar tus tickets", ca: "Cercar els teus tiquets" },
  "Skip": { de: "Überspringen", es: "Omitir", ca: "Ometre" },
  "Something someone has asked us for. This is where the work usually starts.": { de: "Etwas, worum uns jemand gebeten hat. Hier beginnt die Arbeit normalerweise.", es: "Algo que alguien nos ha pedido. Aquí es donde suele empezar el trabajo.", ca: "Una cosa que algú ens ha demanat. Aquí és on sol començar la feina." },
  "Start date": { de: "Startdatum", es: "Fecha de inicio", ca: "Data d'inici" },
  "Start here": { de: "Hier starten", es: "Empieza aquí", ca: "Comença aquí" },
  "Still waiting": { de: "Wartet noch", es: "Aún en espera", ca: "Encara en espera" },
  "Stop using this source?": { de: "Diese Quelle nicht mehr verwenden?", es: "¿Dejar de usar esta fuente?", ca: "Vols deixar d'utilitzar aquesta font?" },
  "Store": { de: "Zurückstellen", es: "Aparcar", ca: "Aparcar" },
  "System": { de: "System", es: "Sistema", ca: "Sistema" },
  "Take {label} off this story?": { de: "„{label}“ von dieser Aufgabe entfernen?", es: "¿Quitar «{label}» de esta historia?", ca: "Vols treure «{label}» d'aquesta història?" },
  "Take {label} off this ticket?": { de: "„{label}“ von diesem Ticket entfernen?", es: "¿Quitar «{label}» de este ticket?", ca: "Vols treure «{label}» d'aquest tiquet?" },
  "Tell us who you are, and we'll take you into your team.": { de: "Sagen Sie uns, wer Sie sind, und wir bringen Sie zu Ihrem Team.", es: "Dinos quién eres y te llevaremos a tu equipo.", ca: "Digues-nos qui ets i et portarem al teu equip." },
  "That file is over {limit}, please pick a smaller one.": { de: "Diese Datei ist größer als {limit}, bitte wählen Sie eine kleinere.", es: "Ese archivo supera {limit}, elige uno más pequeño.", ca: "Aquest fitxer supera {limit}, tria'n un de més petit." },
  "That file is too big. The limit is {limit}.": { de: "Diese Datei ist zu groß. Das Limit liegt bei {limit}.", es: "Ese archivo es demasiado grande. El límite es {limit}.", ca: "Aquest fitxer és massa gran. El límit és {limit}." },
  "That's the first {n}. Search or filter to find what you're after.": { de: "Das sind die ersten {n}. Suchen oder filtern Sie, um zu finden, wonach Sie suchen.", es: "Estos son los primeros {n}. Busca o filtra para encontrar lo que buscas.", ca: "Aquests són els primers {n}. Cerca o filtra per trobar el que busques." },
  "That's the queue cleared.": { de: "Die Warteschlange ist geleert.", es: "La cola está despejada.", ca: "La cua està buida." },
  "The assistant stops reading it right away. Nothing is deleted, and the sweep won't put it back — you can turn it on again here any time.": { de: "Der Assistent liest sie ab sofort nicht mehr. Es wird nichts gelöscht, und der automatische Durchlauf bringt sie nicht zurück — Sie können sie hier jederzeit wieder aktivieren.", es: "El asistente deja de leerla de inmediato. No se elimina nada, y el barrido automático no la volverá a añadir — puedes reactivarla aquí cuando quieras.", ca: "L'assistent deixa de llegir-la immediatament. No s'elimina res, i l'escombratge automàtic no la tornarà a afegir — la pots reactivar aquí quan vulguis." },
  "The wave is sold first; the sprints inside it are planned afterwards.": { de: "Die Wave wird zuerst verkauft; die Sprints darin werden anschließend geplant.", es: "La wave se vende primero; los sprints dentro de ella se planifican después.", ca: "La wave es ven primer; els sprints dins d'ella es planifiquen després." },
  "There's no way to bring it back from here — attach it again if you need it.": { de: "Von hier aus gibt es keine Möglichkeit, sie zurückzuholen — hängen Sie sie bei Bedarf erneut an.", es: "No hay forma de recuperarlo desde aquí — adjúntalo de nuevo si lo necesitas.", ca: "No hi ha manera de recuperar-ho des d'aquí — adjunta-ho de nou si ho necessites." },
  "There's nothing here you can import into yet. You can import once you're allowed to create Accounts, Roles or Choices.": { de: "Hier gibt es noch nichts, wohin Sie importieren können. Sie können importieren, sobald Sie Kunden, Rollen oder Optionen erstellen dürfen.", es: "Aquí todavía no hay nada en lo que puedas importar. Podrás importar en cuanto puedas crear Cuentas, Roles u Opciones.", ca: "Aquí encara no hi ha res on puguis importar. Podràs importar quan puguis crear Comptes, Rols o Opcions." },
  "They stay in your accounts, with everything they're attached to. You're only saying they're no longer a contact here.": { de: "Sie bleiben in Ihren Kunden, mit allem, woran sie hängen. Sie sagen nur, dass sie hier kein Kontakt mehr sind.", es: "Se quedan en tus cuentas, con todo a lo que están vinculados. Solo estás diciendo que aquí ya no son un contacto.", ca: "Es queden als teus comptes, amb tot allò a què estan vinculats. Només estàs dient que aquí ja no són un contacte." },
  "They won't be able to sign in any more. Everything they're attached to, their records, their history, stays exactly where it is, and you can switch it back on later.": { de: "Sie können sich nicht mehr anmelden. Alles, woran sie hängen, ihre Einträge, ihr Verlauf, bleibt genau dort, wo es ist, und Sie können es später wieder aktivieren.", es: "Ya no podrán iniciar sesión. Todo a lo que están vinculados, sus registros, su historial, se queda exactamente donde está, y puedes reactivarlo más tarde.", ca: "Ja no podran iniciar sessió. Tot allò a què estan vinculats, els seus registres, el seu historial, es queda exactament on és, i ho pots reactivar més tard." },
  "This is everything the assistant is allowed to read. Add a note or a file, and it can start answering from it.": { de: "Das ist alles, was der Assistent lesen darf. Fügen Sie eine Notiz oder eine Datei hinzu, und er kann darauf basierend antworten.", es: "Esto es todo lo que el asistente puede leer. Añade una nota o un archivo, y podrá empezar a responder a partir de ahí.", ca: "Això és tot el que l'assistent pot llegir. Afegeix una nota o un fitxer, i podrà començar a respondre a partir d'aquí." },
  "This is how the work was described when {version} was cut on {date}.": { de: "So wurde die Arbeit beschrieben, als {version} am {date} erstellt wurde.", es: "Así se describió el trabajo cuando se generó {version} el {date}.", ca: "Així es va descriure la feina quan es va generar {version} el {date}." },
  "This is how the work was described when {version} was cut.": { de: "So wurde die Arbeit beschrieben, als {version} erstellt wurde.", es: "Así se describió el trabajo cuando se generó {version}.", ca: "Així es va descriure la feina quan es va generar {version}." },
  "Timeline": { de: "Zeitleiste", es: "Cronología", ca: "Cronologia" },
  "Triage queue": { de: "Sichtungswarteschlange", es: "Cola de clasificación", ca: "Cua de classificació" },
  "Triaged.": { de: "Gesichtet.", es: "Clasificado.", ca: "Classificat." },
  "Try fewer words, or clear the search to see everything.": { de: "Weniger Wörter versuchen, oder die Suche löschen, um wieder alles zu sehen.", es: "Prueba con menos palabras, o borra la búsqueda para ver todo.", ca: "Prova amb menys paraules, o esborra la cerca per veure-ho tot." },
  "Undo": { de: "Rückgängig machen", es: "Deshacer", ca: "Desfer" },
  "Undo the last one": { de: "Die letzte rückgängig machen", es: "Deshacer la última", ca: "Desfer l'última" },
  "Unnamed account": { de: "Unbenannter Kunde", es: "Cuenta sin nombre", ca: "Compte sense nom" },
  "Up to {limit}.": { de: "Bis zu {limit}.", es: "Hasta {limit}.", ca: "Fins a {limit}." },
  "View": { de: "Ansicht", es: "Vista", ca: "Vista" },
  "Visible to the client": { de: "Für den Kunden sichtbar", es: "Visible para el cliente", ca: "Visible per al client" },
  "Warm colour behind the whole app. Easy to find your place.": { de: "Warme Farbe hinter der ganzen App. Man findet sich leicht zurecht.", es: "Color cálido detrás de toda la app. Fácil de ubicarte.", ca: "Color càlid darrere de tota l'app. Fàcil per ubicar-te." },
  "Warm, and easy to find.": { de: "Warm und leicht zu finden.", es: "Cálido y fácil de encontrar.", ca: "Càlid i fàcil de trobar." },
  "Waves timeline": { de: "Waves-Zeitleiste", es: "Cronología de waves", ca: "Cronologia de waves" },
  "We couldn't check what's waiting on you.": { de: "Wir konnten nicht prüfen, was auf Sie wartet.", es: "No pudimos comprobar qué está pendiente de ti.", ca: "No hem pogut comprovar què està pendent teu." },
  "We couldn't load that ticket.": { de: "Das Ticket konnte nicht geladen werden.", es: "No se pudo cargar ese ticket.", ca: "No s'ha pogut carregar aquest tiquet." },
  "We couldn't load this record's activity. Try again in a moment.": { de: "Der Verlauf dieses Eintrags konnte nicht geladen werden. Versuchen Sie es in einem Moment erneut.", es: "No se pudo cargar la actividad de este registro. Inténtalo de nuevo en un momento.", ca: "No s'ha pogut carregar l'activitat d'aquest registre. Torna-ho a provar d'aquí a un moment." },
  "We couldn't load what this has been worth.": { de: "Wir konnten nicht laden, was das wert war.", es: "No pudimos cargar lo que esto ha valido.", ca: "No hem pogut carregar el que això ha valgut." },
  "We couldn't load what we handed over.": { de: "Wir konnten nicht laden, was wir geliefert haben.", es: "No pudimos cargar lo que hemos entregado.", ca: "No hem pogut carregar el que hem lliurat." },
  "We couldn't load what you bought.": { de: "Wir konnten nicht laden, was Sie gekauft haben.", es: "No pudimos cargar lo que has comprado.", ca: "No hem pogut carregar el que has comprat." },
  "We couldn't load what you've sent us.": { de: "Wir konnten nicht laden, was Sie uns gesendet haben.", es: "No pudimos cargar lo que nos has enviado.", ca: "No hem pogut carregar el que ens has enviat." },
  "We couldn't load your details.": { de: "Ihre Daten konnten nicht geladen werden.", es: "No se pudieron cargar tus datos.", ca: "No s'han pogut carregar les teves dades." },
  "We couldn't load your tickets.": { de: "Ihre Tickets konnten nicht geladen werden.", es: "No se pudieron cargar tus tickets.", ca: "No s'han pogut carregar els teus tiquets." },
  "We couldn't run that search.": { de: "Wir konnten diese Suche nicht ausführen.", es: "No pudimos ejecutar esa búsqueda.", ca: "No hem pogut executar aquesta cerca." },
  "Welcome": { de: "Willkommen", es: "Bienvenido", ca: "Benvingut" },
  "What they attached": { de: "Was sie angehängt haben", es: "Lo que han adjuntado", ca: "El que han adjuntat" },
  "Whatever gets added shows up here.": { de: "Was auch immer hinzugefügt wird, erscheint hier.", es: "Lo que se añada aparecerá aquí.", ca: "El que s'afegeixi apareixerà aquí." },
  "Whatever you add shows up here. The first one takes a minute.": { de: "Was Sie auch hinzufügen, erscheint hier. Der erste Eintrag dauert eine Minute.", es: "Lo que añadas aparecerá aquí. El primero lleva un minuto.", ca: "El que afegeixis apareixerà aquí. El primer porta un minut." },
  "Which type is this?": { de: "Um welchen Typ handelt es sich?", es: "¿Qué tipo es?", ca: "Quin tipus és?" },
  "Who is picking this up?": { de: "Wer übernimmt das?", es: "¿Quién se encarga de esto?", ca: "Qui se n'encarrega?" },
  "Who logged it": { de: "Wer es erfasst hat", es: "Quién lo registró", ca: "Qui ho ha registrat" },
  "Who reviews it": { de: "Wer es prüft", es: "Quién lo revisa", ca: "Qui ho revisa" },
  "Why a step takes longer, {reason}": { de: "Warum ein Schritt länger dauert: {reason}", es: "Por qué un paso tarda más: {reason}", ca: "Per què un pas triga més: {reason}" },
  "Withdraw this input": { de: "Diese Angabe zurückziehen", es: "Retirar esta aportación", ca: "Retirar aquesta aportació" },
  "Wrapped": { de: "Abgeschlossen", es: "Finalizado", ca: "Finalitzat" },
  "Your team": { de: "Ihr Team", es: "Tu equipo", ca: "El teu equip" },
  "Your team has no ticket types set up yet.": { de: "Ihr Team hat noch keine Tickettypen eingerichtet.", es: "Tu equipo aún no tiene tipos de ticket configurados.", ca: "El teu equip encara no té tipus de tiquet configurats." },
  "next": { de: "weiter", es: "siguiente", ca: "següent" },
  "raised {date}": { de: "erstellt am {date}", es: "creado el {date}", ca: "creat el {date}" },
  "{count} contacts match": { de: "{count} Kontakte passen", es: "{count} contactos coinciden", ca: "{count} contactes coincideixen" },
  "{count} entries match": { de: "{count} Einträge passen", es: "{count} entradas coinciden", ca: "{count} entrades coincideixen" },
  "{count} given to somebody": { de: "{count} vergeben", es: "{count} asignados a alguien", ca: "{count} assignats a algú" },
  "{count} inputs match": { de: "{count} Angaben passen", es: "{count} aportaciones coinciden", ca: "{count} aportacions coincideixen" },
  "{count} of your tickets match.": { de: "{count} Ihrer Tickets passen.", es: "{count} de tus tickets coinciden.", ca: "{count} dels teus tiquets coincideixen." },
  "{count} sorted. Nothing else is waiting to be read.": { de: "{count} sortiert. Es wartet nichts mehr zum Lesen.", es: "{count} clasificados. No queda nada más pendiente de leer.", ca: "{count} classificats. No queda res més pendent de llegir." },
  "{count} {type}": { de: "{count} {type}", es: "{count} {type}", ca: "{count} {type}" },
  "{name} is on triage this week, so the queue is theirs.": { de: "{name} macht diese Woche die Triage, die Warteschlange gehört also dieser Person.", es: "{name} está de triaje esta semana, así que la cola es suya.", ca: "{name} fa el triatge aquesta setmana, així que la cua és seva." },
  "{position} of {total}": { de: "{position} von {total}", es: "{position} de {total}", ca: "{position} de {total}" },
  /* ── CLIENT BECAME ACCOUNT (her ruling, 2026-09-09) ───────────────────────
   * "Hey, you got it wrong. The filter client is the company, so it's the
   * account. Let's do something: rename client to account everywhere we said
   * client. This was a mistake."
   *
   * WHAT THE WORD NOW MEANS, so nobody renames it back. The RECORD — the
   * company or person the work is for, `accounts.id`, the thing a facet, a
   * column, a picker or a possessive ("this account's roles") names — is
   * ACCOUNT, and the glossary always said so. The screens said Client for the
   * same record, which is the mistake she is correcting: one thing had two
   * names and the filter row was where she met it.
   *
   * WHAT KEPT THE WORD "CLIENT", and why it is not an oversight. A CLIENT is
   * the RELATIONSHIP and the PERSON in it — someone with a portal login who
   * raises a ticket, replies, is emailed, sends an input back, or may never
   * read the agency's own notes ("no client login can reach it"). R34's own
   * registry note refuses to ban the word for exactly this reason. Renaming
   * those to "account" would put a company where a person is doing something,
   * which is a wrong sentence rather than a consistent one.
   *
   * THE THREE LANGUAGES, settled here rather than per string. The word for the
   * RECORD is Kunde/Kunden · cuenta/cuentas · compte/comptes — the vocabulary
   * block at the top of this file already fixed it on `Account`/`Accounts`,
   * and every renamed sentence below is brought onto it. German loses
   * "Mandant" outright: it was a third word for the record on three strings,
   * against Kunde on twenty. Spanish and Catalan move off cliente/client for
   * the record only; a sentence about the client PERSON keeps them, the same
   * split the English keeps.
   *
   * These entries are here rather than left to the generator because they are
   * a rename, not new copy: the English key moved, so the machine's answer for
   * the old key no longer applies to anything, and R44's ceiling is 0. */
  "Account context": { de: "Kundenkontext", es: "Contexto de la cuenta", ca: "Context del compte" },
  "An account": { de: "Ein Kunde", es: "Una cuenta", ca: "Un compte" },
  "Pick the account": { de: "Kunde auswählen", es: "Elige la cuenta", ca: "Tria el compte" },
  "Which account": { de: "Welcher Kunde", es: "Qué cuenta", ca: "Quin compte" },
  "Ours, no account": { de: "Unseres, kein Kunde", es: "El nuestro, sin cuenta", ca: "Nostre, sense compte" },
  "Ours, not an account's": { de: "Unseres, nicht das eines Kunden", es: "El nuestro, no de una cuenta", ca: "Nostre, no d'un compte" },
  "Questions about that account are answered from what is in here. Leave it as ours if the": { de: "Fragen zu diesem Kunden werden aus dem beantwortet, was hier steht. Lassen Sie es als unseres, wenn", es: "Las preguntas sobre esa cuenta se responden con lo que hay aquí. Déjalo como nuestro si el", ca: "Les preguntes sobre aquest compte es responen amb el que hi ha aquí. Deixa-ho com a nostre si el" },

  /* ── SETTINGS › TEAM, 2026-09-09, UPDATED 14 Sep 2026 ─────────────────────
   * The members gallery and the roles matrix, and the words the permission
   * legend needs. `Read` · `Create` · `Update` · `Delete` are the four rights
   * as a READER meets them (the standard CRUD four, and the standard word for
   * each — client, 14 Sep 2026: "rename edit to update, this way we have the
   * full CRUD concept"; `Edit` was the word here until that ruling). The four
   * MARKS on the grid stay R · C · U · D in every language regardless of which
   * pair of these four words happens to collide on a first letter in any one
   * translation — see web/components/team/roles-matrix.tsx's capability list
   * for which pair that is this build (it has already moved once, from
   * Spanish/Catalan Editar·Eliminar to German Lesen·Löschen). So these are the
   * words the legend maps those four fixed marks onto.
   * `Granted` / `Not granted` are capitalised on purpose: this app already says
   * a lowercase `granted` about a staff CERTIFICATE, seeded as "ausgestellt" /
   * "expedido" — issued, not permitted. */
  "Read": { de: "Lesen", es: "Leer", ca: "Llegir" },
  "Create": { de: "Erstellen", es: "Crear", ca: "Crear" },
  "Update": { de: "Aktualisieren", es: "Actualizar", ca: "Actualitzar" },
  "Granted": { de: "Erteilt", es: "Concedido", ca: "Concedit" },
  "Not granted": { de: "Nicht erteilt", es: "No concedido", ca: "No concedit" },
  "Roles and what each one may do": { de: "Rollen und was jede darf", es: "Roles y lo que puede hacer cada uno", ca: "Rols i què pot fer cadascun" },
  "Changes are saved when you press Save.": { de: "Änderungen werden gespeichert, wenn Sie auf Speichern klicken.", es: "Los cambios se guardan cuando pulsas Guardar.", ca: "Els canvis es desen quan prems Desa." },
  "Couldn't load the roles.": { de: "Die Rollen konnten nicht geladen werden.", es: "No se han podido cargar los roles.", ca: "No s'han pogut carregar els rols." },
  "A role is a set of rights you can give somebody. Create one to start.": { de: "Eine Rolle ist ein Satz von Rechten, den Sie jemandem geben können. Erstellen Sie eine, um zu beginnen.", es: "Un rol es un conjunto de permisos que puedes dar a alguien. Crea uno para empezar.", ca: "Un rol és un conjunt de permisos que pots donar a algú. Crea'n un per començar." },
  "Role created.": { de: "Rolle erstellt.", es: "Rol creado.", ca: "Rol creat." },
  "No members yet.": { de: "Noch keine Mitglieder.", es: "Todavía no hay miembros.", ca: "Encara no hi ha membres." },
  "No members match what you're looking for.": { de: "Keine Mitglieder passen zu Ihrer Suche.", es: "Ningún miembro coincide con lo que buscas.", ca: "Cap membre coincideix amb el que busques." },
  "Invite someone": { de: "Jemanden einladen", es: "Invitar a alguien", ca: "Convida algú" },
  "Invite sent.": { de: "Einladung gesendet.", es: "Invitación enviada.", ca: "Invitació enviada." },
  "Invites waiting to be accepted": { de: "Einladungen, die noch angenommen werden müssen", es: "Invitaciones pendientes de aceptar", ca: "Invitacions pendents d'acceptar" },
  "No invites are waiting.": { de: "Es sind keine Einladungen offen.", es: "No hay invitaciones pendientes.", ca: "No hi ha invitacions pendents." },
  "Edit name and logo": { de: "Name und Logo bearbeiten", es: "Editar nombre y logotipo", ca: "Edita el nom i el logotip" },
  "{count} person": { de: "{count} Person", es: "{count} persona", ca: "{count} persona" },
  "{count} people": { de: "{count} Personen", es: "{count} personas", ca: "{count} persones" },
  "Deactivated": { de: "Deaktiviert", es: "Desactivados", ca: "Desactivats" },
  "Locked by policy": { de: "Durch Richtlinie gesperrt", es: "Bloqueado por política", ca: "Bloquejat per política" },
  "nothing": { de: "nichts", es: "nada", ca: "res" },
  /* THE ROLES TOOLBAR, 2026-09-14 — "Deactivated" moved from a quiet label at
   * the foot of the grid into a toolbar button, the same shape Members'
   * "Invites" already is, opening an in-place disclosure. Seeded in all
   * three so TRANSLATION_CEILING does not move (R44 — the pin falls and
   * never rises), the same discipline the search-empty pair below keeps.
   * "Deactivated roles" and "No deactivated roles." build off the same
   * `Roles`/`Deactivated` vocabulary already seeded above; "No modules
   * match your search." reuses the exact German and the exact shape of
   * Spanish/Catalan `No tasks match your search.` and `No modules match
   * what you're looking for.` already carry, one module noun swapped for
   * another. */
  "Deactivated roles": { de: "Deaktivierte Rollen", es: "Roles desactivados", ca: "Rols desactivats" },
  "No deactivated roles.": { de: "Keine deaktivierten Rollen.", es: "No hay roles desactivados.", ca: "No hi ha rols desactivats." },
  "No modules match your search.": { de: "Keine Module passen zu Ihrer Suche.", es: "Ningún módulo coincide con tu búsqueda.", ca: "Cap mòdul coincideix amb la teva cerca." },
  /* The legend's THIRD register, new with kit v1.2.75 and drawn only once the
   * grid actually withholds something (it does: 15 of the 88 boxes in a role's
   * band, R36). It teaches the em dash that stands where a switch would be, and
   * it names the same state at the end of those cells' spoken sentence.
   *
   * "Not offered" is the kit's own word for it and is kept in English so the
   * screen and the prop agree for whoever reads both. The three translations
   * are NOT literal: "nicht angeboten" is what a shop does with a product, and
   * the thing being said here is that the decision does not exist for this
   * module at all — which is "nicht verfügbar" / "no disponible" in the same
   * plain register the seed's header sets. */
  "Not offered": { de: "Nicht verfügbar", es: "No disponible", ca: "No disponible" },

  /* ── SETTINGS › TEAM › THE ROLE PANEL, 2026-09-09 ────────────────────────
   * The slide-in a role opens in: "when iclick in role, overview in slide in."
   * Three strings, and the two counted ones are the whole reason the panel is
   * not a second copy of the matrix — they say how MUCH of the app a role
   * touches, which the grid never states anywhere.
   *
   * "areas" is deliberate. The code's word is `module` and the kit's word for
   * the axis is `collection`; neither is a word a manager reading this panel
   * would use, and "permissions" is banned outright (R34 · GLOSSARY_SYNONYMS —
   * the Roles screen once headed this same matrix "Permissions" while two other
   * screens called it an access right). "Areas" competes with no glossary term.
   *
   * WHOLE SENTENCES WITH HOLES IN THEM, never a number glued to a translated
   * noun (R28) — and the two holes are named rather than positional, so German
   * and Catalan can put the count where their own grammar wants it. */
  "No description yet.": { de: "Noch keine Beschreibung.", es: "Todavía no hay descripción.", ca: "Encara no hi ha descripció." },
  "Can read {count} of {total} modules": { de: "Kann {count} von {total} Modulen lesen", es: "Puede leer {count} de {total} módulos", ca: "Pot llegir {count} de {total} mòduls" },
  // RENAMED FROM "Can edit …" 14 Sep 2026, the day the grid's Edit column and
  // the underlying right both became Update (client: "rename edit to
  // update"). See role-panel.tsx.
  "Can update {count} of {total} modules": { de: "Kann {count} von {total} Modulen aktualisieren", es: "Puede actualizar {count} de {total} módulos", ca: "Pot actualitzar {count} de {total} mòduls" },

  /* ── SETTINGS › ONE MODULE'S OWN PAGE, 2026-09-09 ─────────────────────────
   * The Tickets pilot of the client's ruling that settings be grouped by
   * MODULE as well as by kind ("a lot of them are specific to the module").
   * Six strings: the page's own title and sentence, and one pair per
   * vocabulary section. They live in `MODULE_SETTINGS`
   * (web/components/screens/module-settings-screen.tsx), a copy TABLE read
   * back through `t` on the way to the screen — the same shape as every other
   * table pinned in TRANSLATED_WHERE_READ, and pinned there for the same
   * reason: the words sit beside the URL segment and the `selectable_data`
   * group names, which are names of DATA and are never translated.
   *
   * "Ticket" stays "Ticket" in all three, from the vocabulary block at the top
   * of this file; a stage is a Phase / etapa / etapa, as everywhere else in
   * this app's mouth. Seeded in all three rather than left to the generator so
   * TRANSLATION_CEILING stays at 0/0/0 (R44 — the pin falls and never rises). */
  /* THREE ENTRIES LEFT THIS BLOCK ON 2026-09-10, with the English they
   * translated. The page SUBTITLE went on the client's *"in ticket settings
   * (or any other module) no subtitle"*, and the whole Ticket statuses
   * SECTION went on her *"remove ticket status, this cannot be adjusted from
   * the app"* — she is right, nothing in either front door has ever read a
   * `Ticket status` row for a stage's word. A translation for a sentence the
   * app no longer says is the rot R28's own orphan clause names: nothing
   * breaks today, and it becomes a record of what the app USED to say while
   * being carried on every build. */
  "Ticket types": { de: "Ticket-Typen", es: "Tipos de ticket", ca: "Tipus de ticket" },

  /* ── THE OTHER SIX MODULES' SETTINGS PAGES (client, 2026-09-10) ───────────
   * *"implement this module settings across app: the goal right now is that you
   * identify the choice components where they belong to a module and create the
   * settings there in the module and in settings the module. End goal: kill the
   * big tab 'choice options'."* The Tickets pilot above, repeated for Tasks,
   * Stories, Sprints, Apps, Accounts and the Brand library — seventeen strings,
   * a title and one section pair each, in the same `MODULE_SETTINGS` table and
   * read back through `t` on the way to the screen.
   *
   * EVERY NOUN BELOW IS ALREADY DECIDED SOMEWHERE ELSE IN THIS FILE, and that
   * is the whole reason these are seeded rather than generated: a story is an
   * `Aufgabe` / `historia` / `història`, a task is a `To-do` / `tarea` /
   * `tasca`, a stage is a `Phase` / `etapa` / `etapa`, a deliverable is an
   * `Ergebnis` / `entregable` / `lliurable`, an account is a `Kunde` / `cuenta`
   * / `compte`, and the brand library is the `Markensammlung`. A generator
   * starting from the English would have picked a second word for at least
   * three of those, and a settings page is exactly where a reader compares the
   * word to the nav label beside it.
   *
   * Seeded in all three so TRANSLATION_CEILING does not move (R44 — the pin
   * falls and never rises). */
  "Story types": { de: "Aufgaben-Typen", es: "Tipos de historia", ca: "Tipus d'història" },
  "Sprint type": { de: "Sprintart", es: "Tipo de sprint", ca: "Tipus de sprint" },
  "Sprint types": { de: "Sprint-Typen", es: "Tipos de sprint", ca: "Tipus de sprint" },
  "Stages and deliverable kinds": { de: "Phasen und Ergebnisarten", es: "Etapas y tipos de entregable", ca: "Etapes i tipus de lliurable" },
  "Industries and countries": { de: "Branchen und Länder", es: "Sectores y países", ca: "Sectors i països" },
  "Asset categories": { de: "Asset-Kategorien", es: "Categorías de activos", ca: "Categories de recursos" },

  /* ── The Modules tab's one sentence (client, 2026-09-09) ──────────────────
   * The index on Settings › Modules — *"a tab that says 'Module' or 'Business
   * Logic' … to find the module once"*. `Modules` itself is already in the
   * vocabulary block at the top of this file; this is the line under the tab
   * that explains why a list of the modules with settings is SHORT — it is the
   * whole of what stops a one-row index reading as a broken one, so it is
   * seeded in all three rather than left to the generator, and it says the same
   * three things in each: what is in the list, that a row and that module's own
   * gear are one page, and that a module with nothing to set is simply absent.
   *
   * "Zahnrad" / "engranaje" / "engranatge" is the gear as an OBJECT on screen,
   * which is what she called it; none of the three languages wants the English
   * word here. Seeded in all three so TRANSLATION_CEILING stays at 0/0/0
   * (R44 — the pin falls and never rises). */
  /* ── AND ITS FILTERED ZERO (client, 11 Sep 2026) ───────────────────────────
   * *"to modules in settings, also add toolbar / no add buton / sort by -
   * name"*. The toolbar's search can narrow that wall to nothing, and this is
   * the sentence the wall says when it has — R62's FILTERED register, never the
   * resting one: a reader with no module settings at all never gets here (the
   * panel returns its refusal instead), so "nothing matched" is the only zero
   * this collection can show. Worded off `No members match what you're looking
   * for.` one tab to the left, word for word with the noun swapped, because the
   * two walls are the same shape and a reader who searches both should not be
   * told the same fact two ways. `Search modules…` needs no line here — the
   * apps module panel already says it and it is already answered.
   * Seeded in all three so TRANSLATION_CEILING does not move (R44 — the pin
   * falls and never rises). */
  "No modules match what you're looking for.": { de: "Keine Module passen zu Ihrer Suche.", es: "Ningún módulo coincide con lo que buscas.", ca: "Cap mòdul coincideix amb el que busques." },

  /* ── EVERY AUTOMATION IN THE BASE, ON ITS MODULE'S PAGE (client, 2026-09-11) ─
   * *"include absolutely all of those in settings by module. I want no
   * automation without visibility."* / *"so far i want visibility and on+off."*
   * Ninety-seven strings: the seven new page titles, one section pair shared by
   * every module's Automations block, a name and a sentence for each of the
   * thirty-three automations, a written reason for each of the twenty-one that
   * cannot be switched off, and the three the screen itself says.
   *
   * THE REASONS ARE THE LONGEST SENTENCES IN THIS FILE AND THEY ARE THE POINT.
   * R70 requires a `switchable: false` to carry one and requires it to be SHOWN,
   * because "you may see this and may not change it, because the sign-in code is
   * how everybody signs in" is what her ruling asks for and an inert, silent row
   * is not. A reason that ships in English to somebody reading in German is the
   * same failure one language along, which is why they are seeded here rather
   * than left to the generator — and why the registry calls the field `helpText`,
   * the one property name `scripts/lib/i18n-source.mjs` reads as copy.
   *
   * EVERY NOUN IS ALREADY DECIDED AT THE TOP OF THIS FILE: a ticket is a Ticket,
   * a story an `Aufgabe` / `historia` / `història`, a task a `To-do` / `tarea` /
   * `tasca`, a work log a `Zeiteintrag` / `registro de tiempo` / `registre de
   * temps`, a stage a `Phase` / `etapa` / `etapa`, an account a `Kunde` /
   * `cuenta` / `compte`, a client a `Mandant` / `cliente` / `client`, and portal
   * access a `Portalzugang` / `acceso al portal` / `accés al portal` — never a
   * "Portal login", which GLOSSARY_SYNONYMS bans by name. Seeded in all three so
   * TRANSLATION_CEILING does not move (R44 — the pin falls and never rises). */
  "Automations": { de: "Automatisierungen", es: "Automatizaciones", ca: "Automatitzacions" },
  "Housekeeping": { de: "Wartung", es: "Mantenimiento", ca: "Manteniment" },
  "Switched on.": { de: "Eingeschaltet.", es: "Activado.", ca: "Activat." },
  "Switched off.": { de: "Ausgeschaltet.", es: "Desactivado.", ca: "Desactivat." },
  "Couldn't change that. Try again.": { de: "Das ließ sich nicht ändern. Bitte erneut versuchen.", es: "No se pudo cambiar. Inténtalo de nuevo.", ca: "No s'ha pogut canviar. Torna-ho a provar." },
  "Reply and mention emails": { de: "E-Mails bei Antwort und Erwähnung", es: "Correos de respuesta y mención", ca: "Correus de resposta i menció" },
  "When somebody answers a ticket or names a member in it, we email them.": { de: "Wenn jemand ein Ticket beantwortet oder darin ein Mitglied nennt, schreiben wir ihm eine E-Mail.", es: "Cuando alguien responde a un ticket o menciona a un miembro en él, le enviamos un correo.", ca: "Quan algú respon un ticket o hi menciona un membre, li enviem un correu." },
  "Resolution email": { de: "E-Mail zur Lösung", es: "Correo de resolución", ca: "Correu de resolució" },
  "When a ticket is resolved, the client who raised it is emailed the answer.": { de: "Wenn ein Ticket gelöst ist, erhält der Mandant, der es eröffnet hat, die Antwort per E-Mail.", es: "Cuando se resuelve un ticket, el cliente que lo abrió recibe la respuesta por correo.", ca: "Quan es resol un ticket, el client que el va obrir rep la resposta per correu." },
  "Morning triage digest": { de: "Morgendliche Übersicht der Eingänge", es: "Resumen matinal de entrada", ca: "Resum matinal d'entrada" },
  "Every morning, whoever is on triage is emailed what is waiting.": { de: "Jeden Morgen erhält die Person mit Eingangsdienst per E-Mail, was wartet.", es: "Cada mañana, quien está de guardia recibe por correo lo que está esperando.", ca: "Cada matí, qui fa el torn d'entrada rep per correu el que està esperant." },
  "Move a ticket to scheduled": { de: "Ticket auf „eingeplant“ setzen", es: "Pasar un ticket a programado", ca: "Passar un ticket a programat" },
  "A new ticket moves to scheduled once its story sits in a sprint.": { de: "Ein neues Ticket wechselt auf „eingeplant“, sobald seine Aufgabe in einem Sprint liegt.", es: "Un ticket nuevo pasa a programado en cuanto su historia está en un sprint.", ca: "Un ticket nou passa a programat quan la seva història és en un sprint." },
  "Not yet. Nothing tells anybody that a ticket has stopped moving on its own, so switching this off would leave tickets sitting in the queue looking exactly like the ones the software is still handling. It needs the queue to say so first.": { de: "Noch nicht. Niemand erfährt, dass ein Ticket sich nicht mehr von selbst bewegt. Abgeschaltet blieben Tickets in der Warteschlange liegen und sähen genauso aus wie die, um die sich die Software noch kümmert. Die Warteschlange muss das erst anzeigen.", es: "Todavía no. Nada avisa de que un ticket ha dejado de moverse solo, así que al desactivarlo los tickets se quedarían en la cola con el mismo aspecto que los que el software sigue atendiendo. Primero la cola tiene que decirlo.", ca: "Encara no. Res no avisa que un ticket ha deixat de moure's sol, de manera que en desactivar-ho els tickets es quedarien a la cua amb el mateix aspecte que els que el programari encara atén. Primer la cua ho ha de dir." },
  "Move a ticket to in progress": { de: "Ticket auf „in Arbeit“ setzen", es: "Pasar un ticket a en curso", ca: "Passar un ticket a en curs" },
  "A ticket moves to in progress the moment somebody starts a timer on it.": { de: "Ein Ticket wechselt auf „in Arbeit“, sobald jemand die Zeit darauf startet.", es: "Un ticket pasa a en curso en cuanto alguien inicia un cronómetro sobre él.", ca: "Un ticket passa a en curs quan algú hi inicia un cronòmetre." },
  "The same answer as the move to scheduled above, for the same reason.": { de: "Dieselbe Antwort wie beim Wechsel auf „eingeplant“ oben, aus demselben Grund.", es: "La misma respuesta que el paso a programado de arriba, por el mismo motivo.", ca: "La mateixa resposta que el pas a programat de dalt, pel mateix motiu." },
  "Move a ticket to ready": { de: "Ticket auf „fertig“ setzen", es: "Pasar un ticket a listo", ca: "Passar un ticket a llest" },
  "A ticket moves to ready when the last story on it closes.": { de: "Ein Ticket wechselt auf „fertig“, wenn die letzte Aufgabe dazu abgeschlossen ist.", es: "Un ticket pasa a listo cuando se cierra la última historia que cuelga de él.", ca: "Un ticket passa a llest quan es tanca l'última història que en penja." },
  "The same answer as the two moves above, for the same reason.": { de: "Dieselbe Antwort wie bei den beiden Wechseln oben, aus demselben Grund.", es: "La misma respuesta que los dos pasos de arriba, por el mismo motivo.", ca: "La mateixa resposta que els dos passos de dalt, pel mateix motiu." },
  "Draft the resolution": { de: "Lösung vorformulieren", es: "Redactar el borrador de la resolución", ca: "Redactar l'esborrany de la resolució" },
  "As stories close, what was done on each is gathered into a draft answer.": { de: "Wenn Aufgaben abgeschlossen werden, wird das Erledigte zu einem Antwortentwurf zusammengetragen.", es: "A medida que se cierran las historias, lo hecho en cada una se reúne en un borrador de respuesta.", ca: "A mesura que es tanquen les històries, el que s'hi ha fet es reuneix en un esborrany de resposta." },
  "It is written by the same statement that moves the ticket to ready, so it cannot be switched off on its own. Nothing is sent: a person reads the draft, rewrites it, and decides.": { de: "Es wird von derselben Anweisung geschrieben, die das Ticket auf „fertig“ setzt, und lässt sich daher nicht einzeln abschalten. Versendet wird nichts: Ein Mensch liest den Entwurf, schreibt ihn um und entscheidet.", es: "Lo escribe la misma instrucción que pasa el ticket a listo, así que no puede desactivarse por separado. No se envía nada: una persona lee el borrador, lo reescribe y decide.", ca: "L'escriu la mateixa instrucció que passa el ticket a llest, de manera que no es pot desactivar per separat. No s'envia res: una persona llegeix l'esborrany, el reescriu i decideix." },
  "Stage history": { de: "Phasenverlauf", es: "Historial de etapas", ca: "Historial d'etapes" },
  "Every move a ticket makes is written down, with who moved it and when.": { de: "Jeder Wechsel eines Tickets wird festgehalten, mit wem und wann.", es: "Cada movimiento de un ticket queda anotado, con quién lo movió y cuándo.", ca: "Cada moviment d'un ticket queda anotat, amb qui l'ha mogut i quan." },
  "The stage trail on a ticket is drawn from these rows and from nothing else. A gap in a record's own history cannot be filled in afterwards, so this is not a preference.": { de: "Die Phasenspur eines Tickets wird allein aus diesen Zeilen gezeichnet. Eine Lücke im Verlauf eines Datensatzes lässt sich nachträglich nicht schließen, also ist das keine Einstellungssache.", es: "El rastro de etapas de un ticket se dibuja solo a partir de estas filas. Un hueco en el historial de un registro no puede rellenarse después, así que esto no es una preferencia.", ca: "El rastre d'etapes d'un ticket es dibuixa només a partir d'aquestes files. Un buit a l'historial d'un registre no es pot omplir després, així que això no és una preferència." },
  "Lock the client out of editing": { de: "Bearbeitung für den Mandanten sperren", es: "Bloquear la edición al cliente", ca: "Blocar l'edició al client" },
  "Once we have touched a ticket, the client can add to it but not rewrite it.": { de: "Sobald wir ein Ticket angefasst haben, kann der Mandant etwas ergänzen, es aber nicht umschreiben.", es: "Una vez que hemos tocado un ticket, el cliente puede añadir cosas pero no reescribirlo.", ca: "Un cop hem tocat un ticket, el client hi pot afegir coses però no reescriure'l." },
  "This is a rule about who may write, not about what the software does for you, and it is enforced at the door. Changing it is a permission decision and belongs on the roles matrix.": { de: "Das ist eine Regel darüber, wer schreiben darf, nicht darüber, was die Software für Sie tut, und sie gilt schon am Zugang. Sie zu ändern ist eine Frage der Zugriffsrechte und gehört in die Rollenmatrix.", es: "Es una regla sobre quién puede escribir, no sobre lo que el software hace por ti, y se aplica en la puerta. Cambiarla es una decisión de acceso y pertenece a la matriz de roles.", ca: "És una regla sobre qui pot escriure, no sobre el que el programari fa per tu, i s'aplica a la porta. Canviar-la és una decisió d'accés i pertany a la matriu de rols." },
  "Ageing into the triage queue": { de: "Aufrücken in die Eingangs-Warteschlange", es: "Paso a la cola de entrada por antigüedad", ca: "Pas a la cua d'entrada per antiguitat" },
  "A ticket nobody has read joins the triage queue after three working days.": { de: "Ein Ticket, das niemand gelesen hat, rückt nach drei Arbeitstagen in die Eingangs-Warteschlange.", es: "Un ticket que nadie ha leído entra en la cola de entrada a los tres días laborables.", ca: "Un ticket que ningú no ha llegit entra a la cua d'entrada als tres dies feiners." },
  "The three days are written in the code. There is no column holding them and no door that writes one, so there is nothing here a switch could reach yet.": { de: "Die drei Tage stehen im Code. Es gibt keine Spalte dafür und keinen Zugang, der eine schriebe, also gibt es hier noch nichts, das ein Schalter erreichen könnte.", es: "Los tres días están escritos en el código. No hay ninguna columna que los guarde ni ninguna puerta que la escriba, así que todavía no hay nada aquí que un interruptor pueda alcanzar.", ca: "Els tres dies són escrits al codi. No hi ha cap columna que els guardi ni cap porta que l'escrigui, així que encara no hi ha res aquí que un interruptor pugui abastar." },
  "Who logged no time last week": { de: "Wer letzte Woche keine Zeit erfasst hat", es: "Quién no registró tiempo la semana pasada", ca: "Qui no va registrar temps la setmana passada" },
  "On Mondays, the morning digest names anybody who logged nothing.": { de: "Montags nennt die Morgenübersicht alle, die nichts erfasst haben.", es: "Los lunes, el resumen matinal nombra a quien no registró nada.", ca: "Els dilluns, el resum matinal anomena qui no va registrar res." },
  "Stop my other timers": { de: "Meine anderen Zeitmessungen stoppen", es: "Parar mis otros cronómetros", ca: "Aturar els meus altres cronòmetres" },
  "Starting a timer stops the ones you already had running.": { de: "Eine neue Zeitmessung stoppt die, die bereits laufen.", es: "Iniciar un cronómetro para los que ya tenías en marcha.", ca: "Iniciar un cronòmetre atura els que ja tenies en marxa." },
  "Each person decides this for themselves — it is stored against your own account and not the team's. Today the only way to set it is to ask the assistant, which is a gap rather than a design.": { de: "Das entscheidet jede Person für sich — es hängt an Ihrem eigenen Konto, nicht am Team. Heute lässt es sich nur über den Assistenten einstellen, und das ist eine Lücke, keine Absicht.", es: "Cada persona lo decide por sí misma: se guarda en tu propia cuenta y no en la del equipo. Hoy la única forma de configurarlo es pedírselo al asistente, y eso es una carencia, no un diseño.", ca: "Cada persona ho decideix per si mateixa: es desa al teu propi compte i no al de l'equip. Avui l'única manera de configurar-ho és demanar-ho a l'assistent, i això és una mancança, no un disseny." },
  "Flag a runaway timer": { de: "Weiterlaufende Zeitmessung melden", es: "Avisar de un cronómetro desbocado", ca: "Avisar d'un cronòmetre desbocat" },
  "A timer still running after eight hours is flagged for you to settle.": { de: "Eine Zeitmessung, die nach acht Stunden noch läuft, wird Ihnen zur Klärung gemeldet.", es: "Un cronómetro que sigue en marcha tras ocho horas se te señala para que lo resuelvas.", ca: "Un cronòmetre que continua en marxa després de vuit hores se't assenyala perquè el resolguis." },
  "Nothing happens on its own here — the timer is not stopped and no time is written. It is a question the app asks you, and you answer it three ways.": { de: "Hier geschieht nichts von selbst — die Messung wird nicht gestoppt und keine Zeit geschrieben. Es ist eine Frage, die die App Ihnen stellt, und Sie beantworten sie auf drei Arten.", es: "Aquí no ocurre nada solo: el cronómetro no se para y no se escribe ningún tiempo. Es una pregunta que la aplicación te hace y que respondes de tres maneras.", ca: "Aquí no passa res sol: el cronòmetre no s'atura i no s'escriu cap temps. És una pregunta que l'aplicació et fa i que respons de tres maneres." },
  "Capture meeting transcripts": { de: "Terminmitschriften abholen", es: "Recoger transcripciones de reuniones", ca: "Recollir transcripcions de reunions" },
  "Every quarter of an hour we collect transcripts from connected accounts.": { de: "Alle Viertelstunde holen wir Mitschriften aus verbundenen Konten.", es: "Cada cuarto de hora recogemos transcripciones de las cuentas conectadas.", ca: "Cada quart d'hora recollim transcripcions dels comptes connectats." },
  "Billable time from a meeting": { de: "Abrechenbare Zeit aus einem Termin", es: "Tiempo facturable de una reunión", ca: "Temps facturable d'una reunió" },
  "A captured meeting writes one billable work log for each member who attended.": { de: "Ein abgeholter Termin schreibt je einen abrechenbaren Zeiteintrag für jedes teilnehmende Mitglied.", es: "Una reunión recogida escribe un registro de tiempo facturable por cada miembro que asistió.", ca: "Una reunió recollida escriu un registre de temps facturable per a cada membre que hi va assistir." },
  "It is the second half of the capture above and is written by the same statement. Switching it off alone would record the meeting and lose the hours it took, which is a half-finished record rather than a preference.": { de: "Es ist die zweite Hälfte der Abholung oben und wird von derselben Anweisung geschrieben. Einzeln abgeschaltet wäre der Termin festgehalten und die dafür aufgewendeten Stunden verloren — ein halb fertiger Datensatz, keine Einstellungssache.", es: "Es la segunda mitad de la recogida de arriba y la escribe la misma instrucción. Desactivarla por separado dejaría la reunión registrada y perdería las horas que costó, lo que es un registro a medias y no una preferencia.", ca: "És la segona meitat de la recollida de dalt i l'escriu la mateixa instrucció. Desactivar-la per separat deixaria la reunió registrada i perdria les hores que va costar, cosa que és un registre a mitges i no una preferència." },
  "Keep the knowledge base in step": { de: "Wissensdatenbank aktuell halten", es: "Mantener al día la base de conocimiento", ca: "Mantenir al dia la base de coneixement" },
  "Every quarter of an hour, the team's own records are re-read into it.": { de: "Alle Viertelstunde werden die eigenen Datensätze des Teams neu eingelesen.", es: "Cada cuarto de hora se vuelven a leer en ella los registros del propio equipo.", ca: "Cada quart d'hora s'hi tornen a llegir els registres del mateix equip." },
  "Read connected Google accounts": { de: "Verbundene Google-Konten lesen", es: "Leer las cuentas de Google conectadas", ca: "Llegir els comptes de Google connectats" },
  "Material each member has shared with us is collected while nobody is working.": { de: "Material, das ein Mitglied mit uns geteilt hat, wird eingesammelt, während niemand arbeitet.", es: "El material que cada miembro ha compartido con nosotros se recoge mientras nadie trabaja.", ca: "El material que cada membre ha compartit amb nosaltres es recull mentre ningú no treballa." },
  "Retire material that has gone": { de: "Verschwundenes Material zurückziehen", es: "Retirar el material que ha desaparecido", ca: "Retirar el material que ha desaparegut" },
  "A source we can no longer find in Google stops being searchable.": { de: "Eine Quelle, die wir in Google nicht mehr finden, ist nicht länger durchsuchbar.", es: "Una fuente que ya no encontramos en Google deja de poder buscarse.", ca: "Una font que ja no trobem a Google deixa de poder cercar-se." },
  "Retire an archived record's source": { de: "Quelle eines archivierten Datensatzes zurückziehen", es: "Retirar la fuente de un registro archivado", ca: "Retirar la font d'un registre arxivat" },
  "Archive a record and what the assistant knew about it stops being searchable.": { de: "Wird ein Datensatz archiviert, ist das Wissen des Assistenten darüber nicht länger durchsuchbar.", es: "Al archivar un registro, lo que el asistente sabía de él deja de poder buscarse.", ca: "En arxivar un registre, el que l'assistent en sabia deixa de poder cercar-se." },
  "It is one clause of the sweep's own statement above. A record you have archived that the assistant still quotes is the fault, not the feature.": { de: "Es ist ein Teil derselben Anweisung des Durchlaufs oben. Ein archivierter Datensatz, den der Assistent weiter zitiert, ist der Fehler, nicht die Funktion.", es: "Es una parte de la misma instrucción del barrido de arriba. Un registro que has archivado y que el asistente sigue citando es el fallo, no la función.", ca: "És una part de la mateixa instrucció del escombrat de dalt. Un registre que has arxivat i que l'assistent continua citant és l'error, no la funció." },
  "Take one source away": { de: "Eine einzelne Quelle entziehen", es: "Quitar una sola fuente", ca: "Treure una sola font" },
  "Any single source can be taken away from the assistant and given back.": { de: "Jede einzelne Quelle kann dem Assistenten entzogen und wieder gegeben werden.", es: "Cualquier fuente concreta puede quitarse al asistente y devolvérsele.", ca: "Qualsevol font concreta es pot treure a l'assistent i tornar-li." },
  "This one is already a switch, and it is a better one: it sits on each source's own screen, where you can see what you are taking away. A second switch here would be a second answer to one question.": { de: "Das ist bereits ein Schalter, und zwar ein besserer: Er sitzt auf der eigenen Seite jeder Quelle, wo Sie sehen, was Sie entziehen. Ein zweiter Schalter hier wäre eine zweite Antwort auf eine Frage.", es: "Esto ya es un interruptor, y mejor: está en la pantalla de cada fuente, donde ves lo que estás quitando. Un segundo interruptor aquí sería una segunda respuesta a una misma pregunta.", ca: "Això ja és un interruptor, i millor: és a la pantalla de cada font, on veus què estàs traient. Un segon interruptor aquí seria una segona resposta a una mateixa pregunta." },
  "We need your input": { de: "Wir brauchen Ihre Rückmeldung", es: "Necesitamos tu respuesta", ca: "Necessitem la teva resposta" },
  "Raising a to-do emails the client contacts on that account.": { de: "Ein neues To-do schickt den Mandantenkontakten dieses Kunden eine E-Mail.", es: "Crear una tarea pendiente envía un correo a los contactos de cliente de esa cuenta.", ca: "Crear una tasca pendent envia un correu als contactes de client d'aquest compte." },
  "Portal welcome email": { de: "Willkommens-E-Mail zum Portal", es: "Correo de bienvenida al portal", ca: "Correu de benvinguda al portal" },
  "A contact given portal access can be welcomed to it by email.": { de: "Ein Kontakt mit neuem Portalzugang kann per E-Mail begrüßt werden.", es: "A un contacto al que se da acceso al portal se le puede dar la bienvenida por correo.", ca: "A un contacte a qui es dona accés al portal se li pot donar la benvinguda per correu." },
  "It is already decided one grant at a time: whoever hands out the access ticks the box or leaves it. A switch above that would quietly overrule somebody who had just ticked it.": { de: "Das wird bereits bei jeder einzelnen Vergabe entschieden: Wer den Zugang erteilt, setzt das Häkchen oder lässt es. Ein Schalter darüber würde jemanden stillschweigend übergehen, der es gerade gesetzt hat.", es: "Ya se decide en cada concesión: quien da el acceso marca la casilla o no. Un interruptor por encima anularía en silencio a quien acaba de marcarla.", ca: "Ja es decideix en cada concessió: qui dona l'accés marca la casella o no. Un interruptor per damunt anul·laria en silenci qui acaba de marcar-la." },
  "Role changed email": { de: "E-Mail bei Rollenwechsel", es: "Correo de cambio de rol", ca: "Correu de canvi de rol" },
  "A member whose role changes is told what they can do now.": { de: "Ein Mitglied, dessen Rolle sich ändert, erfährt, was es jetzt tun kann.", es: "A un miembro cuyo rol cambia se le dice lo que puede hacer ahora.", ca: "A un membre a qui canvia el rol se li diu què pot fer ara." },
  "Removed from the team email": { de: "E-Mail bei Entfernung aus dem Team", es: "Correo de salida del equipo", ca: "Correu de sortida de l'equip" },
  "A member who is removed is told, and told who to ask about it.": { de: "Ein entferntes Mitglied wird benachrichtigt und erfährt, wen es fragen kann.", es: "A un miembro al que se retira se le avisa y se le dice a quién preguntar.", ca: "A un membre que es retira se l'avisa i se li diu a qui preguntar." },
  "Invitation withdrawn email": { de: "E-Mail bei zurückgezogener Einladung", es: "Correo de invitación retirada", ca: "Correu d'invitació retirada" },
  "Withdraw an invitation and the person who had it is told.": { de: "Wird eine Einladung zurückgezogen, erfährt die eingeladene Person es.", es: "Si se retira una invitación, se avisa a la persona que la tenía.", ca: "Si es retira una invitació, s'avisa la persona que la tenia." },
  "Invitation email": { de: "Einladungs-E-Mail", es: "Correo de invitación", ca: "Correu d'invitació" },
  "An invitation is sent to the address it was written for.": { de: "Eine Einladung geht an die Adresse, für die sie geschrieben wurde.", es: "Una invitación se envía a la dirección para la que se escribió.", ca: "Una invitació s'envia a l'adreça per a la qual es va escriure." },
  "The only way into the team is the link in this message. An invitation nobody is told about is one nobody can accept.": { de: "Der einzige Weg ins Team ist der Link in dieser Nachricht. Eine Einladung, von der niemand erfährt, kann niemand annehmen.", es: "La única entrada al equipo es el enlace de este mensaje. Una invitación de la que nadie se entera no la puede aceptar nadie.", ca: "L'única entrada a l'equip és l'enllaç d'aquest missatge. Una invitació de la qual ningú no s'assabenta no la pot acceptar ningú." },
  "Sign-in code": { de: "Anmeldecode", es: "Código de acceso", ca: "Codi d'accés" },
  "Signing in sends a six-digit code to the address you signed in with.": { de: "Beim Anmelden geht ein sechsstelliger Code an die Adresse, mit der Sie sich anmelden.", es: "Al iniciar sesión se envía un código de seis dígitos a la dirección con la que entras.", ca: "En iniciar la sessió s'envia un codi de sis xifres a l'adreça amb què entres." },
  "It is how everybody signs in, so switching it off would lock the whole team out. It is also the one message that may never carry a button, because a sign-in email with a link in it is the shape of a fraudulent one.": { de: "So meldet sich jeder an; abgeschaltet käme das ganze Team nicht mehr hinein. Es ist außerdem die eine Nachricht, die nie eine Schaltfläche tragen darf, denn eine Anmelde-E-Mail mit Link hat die Form einer betrügerischen.", es: "Es como entra todo el mundo, así que desactivarlo dejaría fuera a todo el equipo. Es además el único mensaje que nunca puede llevar un botón, porque un correo de acceso con enlace tiene la forma de uno fraudulento.", ca: "És com entra tothom, així que desactivar-ho deixaria fora tot l'equip. És, a més, l'únic missatge que mai no pot portar un botó, perquè un correu d'accés amb enllaç té la forma d'un de fraudulent." },
  "Email change code": { de: "Code zur Adressänderung", es: "Código de cambio de correo", ca: "Codi de canvi de correu" },
  "Changing your address sends a code to the new one, to prove it is yours.": { de: "Beim Ändern Ihrer Adresse geht ein Code an die neue, um zu belegen, dass sie Ihnen gehört.", es: "Al cambiar tu dirección se envía un código a la nueva, para demostrar que es tuya.", ca: "En canviar la teva adreça s'envia un codi a la nova, per demostrar que és teva." },
  "The code is the proof. Without it there is nothing to check the new address against.": { de: "Der Code ist der Nachweis. Ohne ihn gibt es nichts, woran sich die neue Adresse prüfen ließe.", es: "El código es la prueba. Sin él no hay nada con lo que comprobar la nueva dirección.", ca: "El codi és la prova. Sense ell no hi ha res amb què comprovar la nova adreça." },
  "Your address was changed": { de: "Ihre Adresse wurde geändert", es: "Tu dirección ha cambiado", ca: "La teva adreça ha canviat" },
  "The old address is told, so a change nobody meant is noticed.": { de: "Die alte Adresse wird benachrichtigt, damit eine ungewollte Änderung auffällt.", es: "Se avisa a la dirección antigua, para que un cambio no deseado se note.", ca: "S'avisa l'adreça antiga, perquè un canvi no desitjat es noti." },
  "It goes to the OLD address precisely because the person reading it may not be the one who made the change. A team cannot switch off somebody else's warning.": { de: "Sie geht genau deshalb an die ALTE Adresse, weil die lesende Person nicht diejenige sein muss, die die Änderung vorgenommen hat. Ein Team kann die Warnung einer anderen Person nicht abschalten.", es: "Va precisamente a la dirección ANTIGUA porque quien la lee puede no ser quien hizo el cambio. Un equipo no puede desactivar el aviso de otra persona.", ca: "Va precisament a l'adreça ANTIGA perquè qui la llegeix pot no ser qui va fer el canvi. Un equip no pot desactivar l'avís d'una altra persona." },
  "Nightly clear-out": { de: "Nächtliches Aufräumen", es: "Limpieza nocturna", ca: "Neteja nocturna" },
  "Spent sign-in codes and expired sessions are deleted each night.": { de: "Verbrauchte Anmeldecodes und abgelaufene Sitzungen werden jede Nacht gelöscht.", es: "Cada noche se borran los códigos de acceso usados y las sesiones caducadas.", ca: "Cada nit s'esborren els codis d'accés usats i les sessions caducades." },
  "It is what keeps the shared database from growing for ever, and it belongs to the whole installation rather than to this team. It is shown here so that it is not invisible.": { de: "Es hält die gemeinsame Datenbank davon ab, endlos zu wachsen, und gehört zur gesamten Installation und nicht zu diesem Team. Es steht hier, damit es nicht unsichtbar ist.", es: "Es lo que impide que la base de datos compartida crezca sin fin, y pertenece a toda la instalación y no a este equipo. Se muestra aquí para que no sea invisible.", ca: "És el que impedeix que la base de dades compartida creixi sense fi, i pertany a tota la instal·lació i no a aquest equip. Es mostra aquí perquè no sigui invisible." },
  "A database is filling up": { de: "Eine Datenbank füllt sich", es: "Una base de datos se está llenando", ca: "Una base de dades s'està omplint" },
  "A database that passes four fifths full is reported the same night.": { de: "Eine Datenbank, die vier Fünftel voll ist, wird noch in derselben Nacht gemeldet.", es: "Una base de datos que supera los cuatro quintos de capacidad se comunica esa misma noche.", ca: "Una base de dades que supera els quatre cinquens de capacitat es comunica aquella mateixa nit." },
  "The same answer as the nightly clear-out: it watches the whole installation, not this team. A team that could switch it off would be a team nobody is watching.": { de: "Dieselbe Antwort wie beim nächtlichen Aufräumen: Es beobachtet die gesamte Installation, nicht dieses Team. Ein Team, das es abschalten könnte, wäre ein Team, das niemand beobachtet.", es: "La misma respuesta que la limpieza nocturna: vigila toda la instalación, no este equipo. Un equipo que pudiera desactivarlo sería un equipo al que nadie vigila.", ca: "La mateixa resposta que la neteja nocturna: vigila tota la instal·lació, no aquest equip. Un equip que ho pogués desactivar seria un equip que ningú no vigila." },
  "Nightly fault report": { de: "Nächtlicher Fehlerbericht", es: "Informe nocturno de fallos", ca: "Informe nocturn d'errors" },
  "New and worsening faults are gathered every night.": { de: "Neue und sich verschlechternde Fehler werden jede Nacht zusammengetragen.", es: "Cada noche se reúnen los fallos nuevos y los que empeoran.", ca: "Cada nit es reuneixen els errors nous i els que empitjoren." },
  "The gathering cannot be switched off — it is what the fault record is made of. The email already is: it is addressed to nobody on purpose, and the faults are read here instead.": { de: "Das Zusammentragen lässt sich nicht abschalten — daraus besteht die Fehlerakte. Die E-Mail ist es bereits: Sie ist absichtlich an niemanden adressiert, und die Fehler werden stattdessen hier gelesen.", es: "La recopilación no puede desactivarse: es de lo que está hecho el registro de fallos. El correo ya lo está: va dirigido a nadie a propósito, y los fallos se leen aquí en su lugar.", ca: "La recopilació no es pot desactivar: és d'això que està fet el registre d'errors. El correu ja ho està: va adreçat a ningú a propòsit, i els errors es llegeixen aquí en comptes d'això." },
  "Watch the schedules": { de: "Die Zeitpläne überwachen", es: "Vigilar las tareas programadas", ca: "Vigilar les tasques programades" },
  "Each unattended job checks that the others are still running.": { de: "Jeder unbeaufsichtigte Auftrag prüft, ob die anderen noch laufen.", es: "Cada tarea desatendida comprueba que las demás siguen funcionando.", ca: "Cada tasca desatesa comprova que les altres continuen funcionant." },
  "It is the thing that notices when everything above has stopped. Switching it off would make a silent failure look exactly like a quiet night.": { de: "Es ist das, was bemerkt, wenn alles darüber stehen geblieben ist. Abgeschaltet sähe ein stiller Ausfall genauso aus wie eine ruhige Nacht.", es: "Es lo que se da cuenta cuando todo lo anterior se ha parado. Al desactivarlo, un fallo silencioso se vería igual que una noche tranquila.", ca: "És el que s'adona quan tot el que hi ha a sobre s'ha aturat. En desactivar-ho, una fallada silenciosa es veuria igual que una nit tranquil·la." },

  /* ── The Automations toolbar, 14 Sep 2026 (search, sort by name, filter by
     status) — and the Settings › Automations tab's own module filter beside
     it, same round. Reworked the same day into a `RecordTable` (the client's
     ruling: "the list component exactly the same as we have in tickets"),
     which is why the empty-state sentence below now matches the Choices
     table's own phrasing rather than the bare "No automations." this
     replaced. */
  "Search automations…": { de: "Automatisierungen durchsuchen…", es: "Buscar automatizaciones…", ca: "Cercar automatitzacions…" },
  "No automations match what you're looking for.": {
    de: "Keine Automatisierungen passen zu Ihrer Suche.",
    es: "Ninguna automatización coincide con lo que buscas.",
    ca: "Cap automatització coincideix amb el que busques.",
  },

  /* ── The choices module (new/create button + form), 14 Sep 2026 — moved from
     catalogue to seed because these two strings were hand-written directly in
     the catalogue by another lane on 14 Sep 2026 and must live here instead. */
  "New choice": { de: "Neue Option", es: "Nueva opción", ca: "Nova opció" },
  "Choose a module": { de: "Modul wählen", es: "Elige un módulo", ca: "Tria un mòdul" },
  "Choose a group": { de: "Gruppe wählen", es: "Elige un grupo", ca: "Tria un grup" },
  "Choose which module this belongs to, then add the value.": { de: "Wähle, zu welchem Modul das gehört, und füge dann den Wert hinzu.", es: "Elige a qué módulo pertenece esto y luego añade el valor.", ca: "Tria a quin mòdul pertany això i després afegeix el valor." },

  /* ── The account manager field (accounts detail), 14 Sep 2026. */
  "Account manager": { de: "Kundenmanager", es: "Gerente de Cuenta", ca: "Responsable de Compte" },

  /* ── Member detail screen (contact card for staff/team member), moved from
     catalogue to seed because these were hand-written directly in the catalogue. */
  "Full name": { de: "Vollständiger Name", es: "Nombre completo", ca: "Nom complet" },
  "Birthday": { de: "Geburtstag", es: "Cumpleaños", ca: "Aniversari" },
  "Position": { de: "Position", es: "Puesto", ca: "Càrrec" },
  "Phone number": { de: "Telefonnummer", es: "Número de teléfono", ca: "Número de telèfon" },
  "Send email": { de: "E-Mail senden", es: "Enviar correo", ca: "Enviar correu" },
  "Call": { de: "Anrufen", es: "Llamar", ca: "Trucar" },

  /* ── The system-wide Choices tab (Settings), 14 Sep 2026 — a table over
     every choice value this reader's own visible modules own. */
  "Search choices…": { de: "Optionen suchen…", es: "Buscar opciones…", ca: "Cerca opcions…" },
  "No choices match what you're looking for.": { de: "Keine Optionen passen zu Ihrer Suche.", es: "Ninguna opción coincide con lo que buscas.", ca: "Cap opció coincideix amb el que busques." },
  "Couldn't load the choices.": { de: "Optionen konnten nicht geladen werden.", es: "No se pudieron cargar las opciones.", ca: "No s'han pogut carregar les opcions." },

  /* ── THE DETAILS COLUMN, 16 Sep 2026 evening — the client's ruling on
     `settings-choices-panel.tsx`'s own header, "THE DETAILS COLUMN": an
     in-between column showing what a choice's own type carries beyond its
     word (a sprint type's icon + duration, an app stage's dot). */
  "Details": { de: "Details", es: "Detalles", ca: "Detalls" },
  "{days} days": { de: "{days} Tage", es: "{days} días", ca: "{days} dies" },

  /* ── THE MEETING-TYPES ADAPTER (Task C, 15 Sep 2026) — new strings
     `MeetingTypesPanel`/`MeetingTypeFormDialog` say (web/components/team/
     internal-screens.tsx), hand-seeded rather than left for the generator.
     "Meeting type(s)"/"New meeting type" are already seeded above (the
     meetings-screen.tsx lane's own entries, this adapter reuses them
     verbatim). */
  "What a meeting is about, and the department it belongs to.": { de: "Worum es in einem Meeting geht, und zu welcher Abteilung es gehört.", es: "De qué trata la reunión, y a qué departamento pertenece.", ca: "De què tracta la reunió, i a quin departament pertany." },
  "Couldn't add that meeting type.": { de: "Der Termintyp konnte nicht hinzugefügt werden.", es: "No se pudo añadir ese tipo de reunión.", ca: "No s'ha pogut afegir aquest tipus de reunió." },
  "e.g. Kickoff": { de: "z. B. Kickoff", es: "p. ej. Kickoff", ca: "p. ex. Kickoff" },
  "e.g. Production": { de: "z. B. Produktion", es: "p. ej. Producción", ca: "p. ex. Producció" },
  "Couldn't load the meeting types.": { de: "Die Termintypen konnten nicht geladen werden.", es: "No se pudieron cargar los tipos de reunión.", ca: "No s'han pogut carregar els tipus de reunió." },
  "Deactivate \"{name}\"?": { de: "„{name}“ deaktivieren?", es: "¿Desactivar «{name}»?", ca: "Desactivar «{name}»?" },
  "It drops out of the meeting form's picker. Meetings already using it keep it, and you can turn it back on any time.": { de: "Er verschwindet aus der Auswahl im Meeting-Formular. Meetings, die ihn bereits nutzen, behalten ihn, und Sie können ihn jederzeit wieder aktivieren.", es: "Desaparece del selector del formulario de reunión. Las reuniones que ya lo usan lo conservan, y puedes volver a activarlo cuando quieras.", ca: "Desapareix del selector del formulari de reunió. Les reunions que ja el fan servir el conserven, i el pots tornar a activar quan vulguis." },
  "Deactivated \"{name}\".": { de: "„{name}“ deaktiviert.", es: "«{name}» desactivado.", ca: "«{name}» desactivat." },
  "Couldn't update that meeting type.": { de: "Der Termintyp konnte nicht aktualisiert werden.", es: "No se pudo actualizar ese tipo de reunión.", ca: "No s'ha pogut actualitzar aquest tipus de reunió." },
  "Activated \"{name}\".": { de: "„{name}“ aktiviert.", es: "«{name}» activado.", ca: "«{name}» activat." },
  "Search meeting types…": { de: "Termintypen suchen…", es: "Buscar tipos de reunión…", ca: "Cerca tipus de reunió…" },
  "No meeting types yet.": { de: "Noch keine Termintypen.", es: "Aún no hay tipos de reunión.", ca: "Encara no hi ha tipus de reunió." },
  "Added \"{name}\".": { de: "„{name}“ hinzugefügt.", es: "«{name}» añadido.", ca: "«{name}» afegit." },

  /* ── ROW ACTIONS ON `SettingsChoicesPanel`, 15 Sep 2026 — the rename/protect/
     deactivate door back behind a control (Task B's own fix to R "doors-have-
     controls"; see that file's header, "EDITING AN EXISTING VALUE"). Same
     strings `selectable-screen.tsx` always said, hand-seeded now because that
     file (and its untranslated debt) is retired. */
  "Couldn't rename that value.": { de: "Der Wert konnte nicht umbenannt werden.", es: "No se pudo renombrar ese valor.", ca: "No s'ha pogut reanomenar aquest valor." },
  "Protected.": { de: "Geschützt.", es: "Protegido.", ca: "Protegit." },
  "No longer protected.": { de: "Nicht mehr geschützt.", es: "Ya no está protegido.", ca: "Ja no està protegit." },
  "Stop protecting it": { de: "Schutz aufheben", es: "Dejar de proteger", ca: "Deixar de protegir" },
  "Protect it": { de: "Schützen", es: "Proteger", ca: "Protegir" },
  "Deactivate \"{value}\"?": { de: "„{value}“ deaktivieren?", es: "¿Desactivar «{value}»?", ca: "Desactivar «{value}»?" },
  "It drops out of the pickers everywhere it's offered. Anything already using it keeps it, and you can turn it back on any time.": { de: "Er verschwindet aus allen Auswahllisten, in denen er angeboten wird. Alles, was ihn bereits nutzt, behält ihn, und Sie können ihn jederzeit wieder aktivieren.", es: "Desaparece de todos los selectores donde se ofrece. Lo que ya lo usa lo conserva, y puedes volver a activarlo cuando quieras.", ca: "Desapareix de tots els selectors on s'ofereix. El que ja el fa servir el conserva, i el pots tornar a activar quan vulguis." },
  "Couldn't update that value.": { de: "Der Wert konnte nicht aktualisiert werden.", es: "No se pudo actualizar ese valor.", ca: "No s'ha pogut actualitzar aquest valor." },
  "Deactivated \"{value}\".": { de: "„{value}“ deaktiviert.", es: "«{value}» desactivado.", ca: "«{value}» desactivat." },
  "Activated \"{value}\".": { de: "„{value}“ aktiviert.", es: "«{value}» activado.", ca: "«{value}» activat." },

  /* ── R44 TRANSLATION-CEILING PAYDOWN, 15 Sep 2026 — the 45 strings the
     ceiling check found with no seed entry for de/es/ca (a full lane round's
     worth of new knowledge-base, task-view and meeting-type copy, landed
     faster than it was translated). Hand-translated here, never in the
     generated catalogue — the file's own header says why. Vocabulary kept
     consistent with what is already seeded above: Account → Kunde/cuenta/
     compte, source → Quelle/fuente/font, passage → Abschnitt/pasaje/fragment.
     "Padelbase, Asekurans" is a placeholder of two proper nouns — company
     names, which do not translate, so the same value is the correct answer
     in every language, same as the German seed's own treatment of "Sprint"
     and "Ticket" above. */
  "\"{name}\" looks like it belongs to an account you already have on file.": { de: "„{name}“ sieht aus, als gehöre es zu einem Kunden, den Sie schon erfasst haben.", es: "«{name}» parece pertenecer a una cuenta que ya tienes registrada.", ca: "«{name}» sembla pertànyer a un compte que ja tens registrat." },
  "1 app": { de: "1 App", es: "1 app", ca: "1 app" },
  "Almost done…": { de: "Gleich fertig…", es: "Casi listo…", ca: "Gairebé llest…" },
  "Edit filing": { de: "Ablage bearbeiten", es: "Editar archivado", ca: "Editar arxivat" },
  "File this under {account}?": { de: "Unter „{account}“ ablegen?", es: "¿Archivar esto bajo «{account}»?", ca: "Vols arxivar això sota «{account}»?" },
  "Found in search — never quoted in an answer.": { de: "Wird bei der Suche gefunden — aber nie in einer Antwort zitiert.", es: "Se encuentra en la búsqueda — pero nunca se cita en una respuesta.", ca: "Es troba en la cerca — però mai es cita en una resposta." },
  "I looked at 1 piece of material.": { de: "Ich habe mir 1 Stück Material angesehen.", es: "He revisado 1 fragmento de material.", ca: "He revisat 1 fragment de material." },
  "I looked at {count} pieces of material.": { de: "Ich habe mir {count} Stück Material angesehen.", es: "He revisado {count} fragmentos de material.", ca: "He revisat {count} fragments de material." },
  "KB is kept in full and every word of it is searchable. Open the original below to read the rest.": { de: "KB werden vollständig aufbewahrt, und jedes Wort davon ist durchsuchbar. Öffnen Sie unten das Original, um den Rest zu lesen.", es: "KB se guardan completos, y cada palabra es buscable. Abre el original de abajo para leer el resto.", ca: "KB es guarden sencers, i cada paraula és cercable. Obre l'original de sota per llegir la resta." },
  "Making sense of what it says…": { de: "Der Inhalt wird ausgewertet…", es: "Entendiendo lo que dice…", ca: "Entenent què diu…" },
  "May narrow a search on its own": { de: "Darf eine Suche von sich aus eingrenzen", es: "Puede acotar una búsqueda por sí sola", ca: "Pot acotar una cerca per si sola" },
  "May this name narrow a knowledge base search on its own?": { de: "Darf dieser Name eine Wissensdatenbank-Suche von sich aus eingrenzen?", es: "¿Puede este nombre acotar por sí solo una búsqueda en la base de conocimiento?", ca: "Pot aquest nom acotar per si sol una cerca a la base de coneixement?" },
  "Must never narrow a search on its own": { de: "Darf eine Suche nie von sich aus eingrenzen", es: "Nunca debe acotar una búsqueda por sí sola", ca: "Mai ha d'acotar una cerca per si sola" },
  "New meeting type": { de: "Neuer Termintyp", es: "Nuevo tipo de reunión", ca: "Nou tipus de reunió" },
  "Not filed under an app": { de: "Keiner App zugeordnet", es: "No archivado bajo ninguna app", ca: "No arxivat sota cap app" },
  "Not indexed yet": { de: "Noch nicht indexiert", es: "Aún no indexado", ca: "Encara no indexat" },
  "Not reviewed": { de: "Nicht geprüft", es: "Sin revisar", ca: "Sense revisar" },
  "Not this one": { de: "Das ist es nicht", es: "No es esto", ca: "No és això" },
  "Nothing on our own list.": { de: "Nichts auf unserer eigenen Liste.", es: "Nada en nuestra propia lista.", ca: "Res a la nostra pròpia llista." },
  "Other spellings the knowledge base should also recognise": { de: "Weitere Schreibweisen, die die Wissensdatenbank auch erkennen soll", es: "Otras formas de escribirlo que la base de conocimiento también debería reconocer", ca: "Altres maneres d'escriure-ho que la base de coneixement també hauria de reconèixer" },
  "Padelbase, Asekurans": { de: "Padelbase, Asekurans", es: "Padelbase, Asekurans", ca: "Padelbase, Asekurans" },
  "Reached us through one person": { de: "Über eine Person zu uns gelangt", es: "Nos llegó a través de una persona", ca: "Ens va arribar a través d'una persona" },
  "Reached us through {count} people": { de: "Über {count} Personen zu uns gelangt", es: "Nos llegó a través de {count} personas", ca: "Ens va arribar a través de {count} persones" },
  "Read 1 word of {kind} from {provider}.": { de: "1 Wort gelesen — {kind} von {provider}.", es: "Leída 1 palabra de {kind} en {provider}.", ca: "Llegida 1 paraula de {kind} a {provider}." },
  "Read {words} words of {kind} from {provider}.": { de: "{words} Wörter gelesen — {kind} von {provider}.", es: "Leídas {words} palabras de {kind} en {provider}.", ca: "Llegides {words} paraules de {kind} a {provider}." },
  "Reading the link…": { de: "Link wird gelesen…", es: "Leyendo el enlace…", ca: "Llegint l'enllaç…" },
  "Renamed.": { de: "Umbenannt.", es: "Renombrado.", ca: "Reanomenat." },
  "Rough notes, not the answer.": { de: "Grobe Notizen, nicht die Antwort.", es: "Notas preliminares, no la respuesta.", ca: "Notes preliminars, no la resposta." },
  "Saved, but we didn't read anything from the link — the assistant won't know what this video says yet.": { de: "Gespeichert, aber wir haben nichts vom Link gelesen — der Assistent weiß noch nicht, was in diesem Video gesagt wird.", es: "Guardado, pero no hemos leído nada del enlace — el asistente aún no sabrá qué dice este vídeo.", ca: "Desat, però no hem llegit res de l'enllaç — l'assistent encara no sabrà què diu aquest vídeo." },
  "Apps by stage": { de: "Apps nach Phase", es: "Apps por etapa", ca: "Apps per etapa" },
  "Tasks by priority": { de: "To-dos nach Priorität", es: "Tareas por prioridad", ca: "Tasques per prioritat" },
  "That is the end of what this screen shows, not the end of the material —": { de: "Das ist das Ende dessen, was dieser Bildschirm zeigt, nicht das Ende des Materials —", es: "Eso es el final de lo que muestra esta pantalla, no el final del material —", ca: "Això és el final del que mostra aquesta pantalla, no el final del material —" },
  "Then I re-read the strongest passages before answering.": { de: "Dann habe ich die stärksten Abschnitte noch einmal gelesen, bevor ich geantwortet habe.", es: "Después releí los pasajes más relevantes antes de responder.", ca: "Després vaig rellegir els fragments més rellevants abans de respondre." },
  "These words were read out of the file, so they are corrected by adding the file again rather than typed over here. You can still rename it, change where it is filed and who can use it.": { de: "Dieser Text wurde aus der Datei ausgelesen und wird daher korrigiert, indem Sie die Datei erneut hinzufügen, statt ihn hier zu überschreiben. Sie können sie weiterhin umbenennen, ihre Ablage ändern und festlegen, wer sie nutzen darf.", es: "Este texto se leyó del archivo, así que se corrige añadiendo el archivo de nuevo, no escribiéndolo aquí encima. Aún puedes renombrarlo, cambiar dónde está archivado y quién puede usarlo.", ca: "Aquest text es va llegir del fitxer, així que es corregeix afegint el fitxer de nou, no escrivint-hi a sobre aquí. Encara el pots reanomenar, canviar on està arxivat i qui el pot fer servir." },
  "This is taking longer than it should.": { de: "Das dauert länger, als es sollte.", es: "Esto está tardando más de lo que debería.", ca: "Això està trigant més del que hauria." },
  "Working it out": { de: "Denkt nach", es: "Pensando", ca: "Pensant" },
  "Yes, file it under {account}": { de: "Ja, unter „{account}“ ablegen", es: "Sí, archivar bajo «{account}»", ca: "Sí, arxivar sota «{account}»" },
  "captions": { de: "Untertitel", es: "subtítulos", ca: "subtítols" },
  "description": { de: "Beschreibung", es: "descripción", ca: "descripció" },
  "transcript": { de: "Transkript", es: "transcripción", ca: "transcripció" },
  "{count} accounts": { de: "{count} Kunden", es: "{count} cuentas", ca: "{count} comptes" },
  "{count} apps": { de: "{count} Apps", es: "{count} apps", ca: "{count} apps" },
  "{count} pieces": { de: "{count} Stück", es: "{count} fragmentos", ca: "{count} fragments" },
  "{title} (not in use)": { de: "{title} (nicht in Gebrauch)", es: "{title} (sin usar)", ca: "{title} (sense ús)" },

  /* ── R44 TRANSLATION-CEILING PAYDOWN, 15 Sep 2026, SAME DAY, LATER — the
     seven strings the ceiling check found with no seed entry for de/es/ca:
     Tasks' own "Closed on"/"Week" (this pass's items 5 and 7 —
     web/components/work/tasks-screen.tsx) plus the week lane's own
     `RecordWeek` navigation words (web/components/records/record-week.tsx).
     Hand-translated here, never in the generated catalogue — the file's own
     header says why. */
  "Closed on": { de: "Abgeschlossen am", es: "Cerrado el", ca: "Tancat el" },
  "Week": { de: "Woche", es: "Semana", ca: "Setmana" },
  "Weekend": { de: "Wochenende", es: "Fin de semana", ca: "Cap de setmana" },
  "Next day": { de: "Nächster Tag", es: "Día siguiente", ca: "Dia següent" },
  "Next week": { de: "Nächste Woche", es: "Semana siguiente", ca: "Setmana següent" },
  "Previous day": { de: "Vorheriger Tag", es: "Día anterior", ca: "Dia anterior" },
  "Previous week": { de: "Vorherige Woche", es: "Semana anterior", ca: "Setmana anterior" },



  /* ── 16 Sep 2026, the per-token call log on Settings → Access tokens
     (db/core 0031, web/components/team/access-tokens.tsx's `TokenCallLog`).
     Seven strings, hand-translated here rather than left for the ceiling to
     ratchet up (CLAUDE.md: "TRANSLATION_CEILING is 0/0/0"). */
  "Calls": { de: "Aufrufe", es: "Llamadas", ca: "Trucades" },
  "See this token's calls": {
    de: "Aufrufe dieses Tokens ansehen",
    es: "Ver las llamadas de este token",
    ca: "Veure les trucades d'aquest testimoni",
  },
  "Couldn't load this token's calls.": {
    de: "Die Aufrufe dieses Tokens konnten nicht geladen werden.",
    es: "No se pudieron cargar las llamadas de este token.",
    ca: "No s'han pogut carregar les trucades d'aquest testimoni.",
  },
  "No calls yet.": { de: "Noch keine Aufrufe.", es: "Aún no hay llamadas.", ca: "Encara no hi ha trucades." },
  // "Tool" already has a seed entry above (the client-tool sense, kept as the
  // English loanword) — this screen's column header reuses that same string
  // and inherits it rather than adding a second, conflicting entry.
  "Result": { de: "Ergebnis", es: "Resultado", ca: "Resultat" },
  "Ok": { de: "Ok", es: "Ok", ca: "Ok" },
  "Refused": { de: "Verweigert", es: "Rechazada", ca: "Rebutjada" },
}
