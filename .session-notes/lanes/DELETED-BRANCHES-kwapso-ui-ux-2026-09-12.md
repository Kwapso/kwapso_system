# kwapso-ui-ux branches deleted from origin on 2026-09-12

main is now the single line, and v1.2.76 is tagged on it with content
identical to v1.2.75. Every branch below was checked for work main does not
already carry — the AHEAD column is commits not in main at deletion time.
Restore any of them: git push origin <sha>:refs/heads/<name>

BRANCH                                         AHEAD  SHA
feat/article-body-quote-register               1      eb005fd7e4a536733e02cf4e5c23777a8d79af48
feat/calendar-more-click                       1      f0345d0a7a709b9e5b8e3be204142549d4f416e4
feat/dialog-presentation                       1      4f0ef39a80c24bbae44d6f27ff07dcfb50491195
feat/iconoir-icons                             8      5aeb0b41ab950f3a7853e4f9945dcf50a000f21e
feat/iconoir-on-main                           0      6db6daf2a87a0018e35dabca723a32468d2a0b39
feat/permission-matrix-offered-rights          1      fa1e7904e7da39bc3b04144076b16a19c16d4e21
feat/ui-ux                                     0      26f09cb09114fbe413c81d60ab16b2e073c4d29b
fix/agent-chat-attach-eyebrow                  0      aaf530133a35a16f2bf61a700343f96748bf2449
fix/assets-resolve-to-urls                     9      df87091ffce7bb9e6fd5a5be95ce5a6a0a926422
fix/chart-furniture                            1      122efbb1da68723b3d38d9f53367b31d5c936a64
fix/composer-grows                             0      dc532d22f1f22666932cc86f701eccb476f55e82
fix/restore-portal-conversation                0      dc9d67199938f41fa42e56ba62bb415b0a15a49c
fix/select-z-index                             2      80042d8ad58bc031fe76a5a387f6707da4a74d63
patch-v103                                     3      f24a796ebd5ad89ef646dd322c47af5d07d519bc

## What was actually deleted, and what was NOT

DELETED (5) — every one of these was fully contained in main, AHEAD = 0, so the
name was the only thing lost: feat/iconoir-on-main, feat/ui-ux,
fix/agent-chat-attach-eyebrow, fix/composer-grows, fix/restore-portal-conversation.

KEPT (9) — these carry commits main does NOT have, so they are Aurora's unmerged
work, not rubbish:

    feat/iconoir-icons                     8 commits
    fix/assets-resolve-to-urls             9 commits
    patch-v103                             3 commits
    fix/select-z-index                     2 commits
    feat/article-body-quote-register       1 commit
    feat/calendar-more-click               1 commit
    feat/dialog-presentation               1 commit
    feat/permission-matrix-offered-rights  1 commit
    fix/chart-furniture                    1 commit

The owner asked for one branch AND for Aurora's changes to be merged into main.
Those are two different jobs and only the first is safe to do unattended:
merging any of the nine changes what the kit RENDERS, which is a visual change to
both front doors that no test in this repo can judge. They need Aurora to say
which are finished. Deleting them instead would have been the one thing he
explicitly ruled out — undoing work.
