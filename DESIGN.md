# Design plan: Hide It

**Subject.** A pocket tool for learning Bible verses by heart, for Daniel and his two sons. Its job is one daily habit: open it, see what is due, practise for two minutes.

**Direction: the rubricated page.** Old printed Bibles and prayer books mark the start of a passage with a red initial and red headings (rubrics). That is the one bold move: the verse is set large in a book serif with a red drop initial, and as you progress the words fade out of the page, leaving only their first letters in red, then gaps. The page literally empties as the verse moves into your memory.

- **Palette.** Paper is a cool off-white stone (#F3F1EC is avoided; we use #EEF0EE, a grey-green linen), ink is near-black green (#1B2420), rubric red (#A3231B) for initials, references and the one primary button. No gradients.
- **Type.** One family: the system book serif stack (Iowan Old Style, Palatino, Georgia). No web fonts, so no external requests. Verses at 1.5rem to 2.25rem, line-height 1.6, measure under 34em. Labels in sentence case, never all caps.
- **Layout.** Mobile-first single column. On wide screens a two-column page: the verse list as a narrow margin column (like marginal references), the practice page in the main column. No identical card grid: the list is a ruled index, like a concordance.
- **Child mode.** Bigger type, friendlier stage names ("Read it", "First letters", "Fill the gaps", "Say it from memory"), and a stamp-like "Well done" after each grade.
- **Motion.** One: hidden words fade to their initial letter when the stage changes. Respects reduced motion.
