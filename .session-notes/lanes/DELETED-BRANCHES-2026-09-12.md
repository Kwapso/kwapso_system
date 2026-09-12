# Branches deleted from origin on 2026-09-12

Every one of these was FULLY MERGED into main when it was deleted — the
content is in main's history, only the name is gone. Restore any of them
with: git push origin <sha>:refs/heads/<name>

Excluded deliberately: main, and every branch a lane had checked out at
the time (they were mid-build).

BRANCH                                               SHA
docs/fence-wall-warning                              35c820b7feba576d66e9aa1c5d9d6b8eca80d629
docs/kb-schema-doc                                   c17e13c6b37407f01bbdaa4f1b0542065a678843
docs/kb-team-visible-two-copies                      c9667edad7ee05a926d49bc85c37c96c56ecfae5
docs/mock-note-third-instance                        cdbd0c7dd9fe1dc0df8a924aaf5e9de017eb1b69
docs/search-fts5-correction                          092f4df4fa52f353be1f63dd49cd854c2162c8d1
feat/kb-declared-safe-name                           16ccfe63130e7da4720fec9da0241da2475eb020
feat/kb-five-year-sync                               c73a669ade879210d27730be02d4f0d2822c9a0b
feat/kb-ingest-filing                                786a9b6eb546ad4ab7b66df0a658621179fd9356
feat/kb-piece-grain                                  87d2b0495f84466f53c42da7267fa8b19ce07800
feat/kb-steps                                        a9ac6933ecd6d57560dd0fb174521a2b69645a99
feat/ui-ux                                           400a35278399d871cced8ec05b69f3fb435ea990
fix/kb-cards                                         c4790e5a83aecf335f15cd8291f9c74666ee4fe2
fix/kb-exam                                          f24656c220d1acab8da0234dc5139e4f339a3662
fix/kb-filing                                        95e49e5e8f722453f08c763e802776ada99e89c1
fix/kb-followup                                      24b1ee102a6198c94a28bbd1db25b9987f144367
fix/kb-gate                                          0153918b8844f14df5660e35e1f1f347bb8bbdcc
fix/kb-grain                                         cdb90cd1acf3c0465b08eb286def9836b8d860d9
fix/kb-hijack-a3-retry-on-empty                      43bc2471a24311ec32a2b6a62e284487322e97cc
fix/kb-identity-write                                095fb0514d3ba834f0a3b0672f2df7c426f885ec
fix/kb-index-errors                                  62bdcf00db2a2b2c28ae047781311005448ddf88
fix/kb-lexical-branch-limit                          1fd0d5a8a8b6e671f826df67f3059653773e5a54
fix/kb-loop                                          404a1cc7a8a5848a081984c29e1328979f8c5c63
fix/kb-model                                         66e015c3b09218c9d67ce7107d20c91f79afb3b3
fix/kb-name-misspelling                              182c0ebabaee93762beb2d27e9fb72489d12ae97
fix/kb-readers                                       4abffe390cf451e5c1c00d93c4cd3f1dbbd452e7
fix/wipe-order                                       2d205b38034ed30e6df1c733bc415e559fc2b0f4
investigate/c-hijack-single-token-collapse           eb9ce4fa076f7ee820e99c2b64e1ca46140e8e37
investigate/kb-english-german                        bfc5d0a436902c5985346d50d2e53c97960d722b
test/app-fence-clause                                976e4143354ed49e3e0be704adde5dda858ab032

## Second pass, same day — everything except main and the lanes still building

The owner's instruction: "I just want one branch that has the latest version
of everything, so it's clean." He is right that main carries the whole history.
These are NOT all merged — several hold real unmerged work (the to-95 review
branches, three rescue/stash-* branches recovered from near-loss, some spikes).
That is exactly why every sha is written down: deleting the label is reversible,
and this file is the means. git push origin <sha>:refs/heads/<name>

BRANCH                                               AHEAD  SHA
audit/design-swap-map                                2      915396cadbdf048bed16b0c4929f25e863764a8e
docs/alt-names-seed-note                             1      41ac3840d4cf63c0383fca977f32aee57caee22f
docs/heading-size-answered                           1      ff5ea3ab34e3185f63b9ddc4e68510dfe884481c
docs/heading-size-settled                            1      2da94f506bc629f0a643b6fc563623b7ef957caf
docs/kb-shared-with-design-brief                     1      6f9d60c9f680748310e1c00e924d03a12024a451
docs/lane-briefs-and-portal-sweep                    1      075c2fa72f9edbd7272beab2b15307891de4303e
docs/third-ruling-teams-stay                         1      658bc7e997868846f65605defb7a29776a825f72
feat/kb-screens                                      1      b92241cc252cb8088b5130144b2ab8a74f113211
feat/screen-builder                                  1      682d2fd1fbd0b80e23d49b455ce398cd3c7b81df
fix/activity-log-to-95                               2      8168a69764aa13abdbdb6a6781dd368d31a94ecb
fix/builder-chrome                                   1      f3b6809be3d74e69426dfee939e5f71843f944f1
fix/docs-to-95                                       1      ee87119ce54c4bf33d3bf550bf933cac7df18d5d
fix/first-run-to-95                                  1      94b2a0b8255fc1c0c5b2994388234d9e305f9191
fix/kb-exact-and-count                               1      6b934c20535b36a2bfa77f73e36fea054ce0086e
fix/kb-screens-wording                               2      1555738ddfbff65ab603f0a4b6f641066d19f40e
fix/knowledge-base-control                           3      da95db60a99a9efa72ff3764bca8423b506be577
fix/knowledge-rebuild                                1      1b88ed5e9edc3cf01fcb4d15c838706ca3d9c272
fix/money-taint-outbound                             2      9da69cfec1112648e7eb7db562b27e72c951af8f
fix/portal-toolbar                                   1      fd6272aef5c595a25b9e1ea79bded7c550468b95
fix/realtime-health-binding-name                     1      8a53d29311b9720e62c2b79ac77a79442bec32c1
fix/realtime-identity-headers                        1      de858261f2a3d23686a9c790fb09919b5a4aa7c1
fix/record-toggle-names                              1      b4bb5fa6b1310c23d8c2c9d12ddbc194e7147638
fix/security-to-95                                   1      d80f4bfd7d1843d63214d943862415e5ba7e7cdd
fix/speed-to-95                                      2      0d303ad728f7c51e9dc3afb453e9e75d1f4a62c1
fix/spend-errors-to-95                               2      2cc2f2beb5d966258aab55d96ab80b900686412b
fix/structure-to-95                                  3      92628f96f4c2ef21612c612f972d9593237ffa83
fix/tidiness-to-95                                   3      8a87dbb096b89c73847400c1df60eff686ead03d
merge/speed-resolved                                 3      f6661d10b91877fffa5df4648bde04d65421e26a
merge/structure-resolved                             4      68b40e28871841900e4b021711a0202dc785ffa0
merge/tidiness-resolved                              4      8e12a54c0ea950dd13f68d75e1a2ca9c83f4f499
rescue/stash-0-20260907                              3      b284f28618ab63a70dcbc54d26ad60f1e014b63f
rescue/stash-1-20260819                              3      b61a43b6e66ed1e9c9eb3a3c8848b09f18ab15c1
rescue/stash-2-20260818                              3      e9d41e27bf8c280c56a7d551ff4b8f0e423be72f
spike/service-binding-streams                        1      40d569338b20cbab6452d24375bc30a98cae9650

## Third pass — lane branches retired as their work landed

BRANCH                                   AHEAD  SHA
review-ax9-false-answer                  0 (in main) origin/review-ax9-false-answer
already deleted
fix/gmail-sharing-display                0 (in main) origin/fix/gmail-sharing-display
already deleted
fix/kb-tracker-b-upload-dup              0 (in main) origin/fix/kb-tracker-b-upload-dup
already deleted
test/a3-retry-fence-proof                0 (in main) origin/test/a3-retry-fence-proof
already deleted
fix/kb-reader-cite-or-drop               0 (in main) origin/fix/kb-reader-cite-or-drop
already deleted
feat/kb-names-contacts-colleagues        0 (in main) origin/feat/kb-names-contacts-colleagues
already deleted
fix/kb-exam-keys                         0 (in main) origin/fix/kb-exam-keys
already deleted
fix/kb-hijack-b-deny                     0 (in main) 02cf65a52109294ae56ca51e44aed76615e56e8f

fix/kb-index is the one exception and deserves its sentence: it showed 2 commits
ahead of main, but BOTH of its features — the tenth Vectorize label and the FTS5
BM25 lexical arm — are in main already, reached by a later branch. What the diff
still offered was an OLDER variant of code main has since moved past. Retired on
that basis rather than on the ahead-count, which would have said keep it.
fix/kb-index                             2      803d27eabd1a618675af78b9f89fc9ac7e06e3cd
