# Manual accessibility check (for Ayad to run)

Automated checks (axe in CI, WCAG 2.0, 2.1 and 2.2 AA rules) catch only part of the problems. Until you have done the steps below, do not claim WCAG conformance anywhere. The site claims only that those automated checks pass.

## Keyboard only (about 10 minutes, no mouse)
1. Home page: press Tab from the top. Every link, the theme buttons and the table links should show a visible ring, in order, with nothing hidden behind another element.
2. Use the theme toggle with Enter or Space. Reload: the choice should stick.
3. Index table: Tab onto the table region, scroll sideways with the arrow keys at a narrow window (about 320 px wide).
4. Experiment Readout: load a demo, get the readout, Tab through every control. Run the simulator with the keyboard only; the result should be announced.
5. PMEX calculator: change every field with the keyboard; use the shock buttons in the ladder.

## Screen reader (VoiceOver: Cmd+F5 on the Mac, about 15 minutes)
1. Home page: headings list (VO+U, Headings) should read in a sensible order. The three hero numbers should be read with their labels.
2. Index table: navigate by row; the name, type, status, year and metric should be read with their column headers.
3. Experiment Readout: after "Get the readout" the verdict should be announced. After "Run simulation" the "Done." sentence should be announced once.
4. Ladder: pressing a shock button should update the sentence under it (status region).
5. Charts: each has a text alternative; check it says something useful. The simulator has a "Show the numbers by look" table.

## Zoom and reflow (5 minutes)
Browser zoom to 400% on the home page and the PMEX calculator. Nothing should need sideways scrolling except inside the tables.

## Known gaps to look at yourself
- Input borders are light grey; the field text and labels pass contrast, but the border alone is under 3:1 against the background.
- Motion: there is almost none. If you add any, keep it under 300 ms and behind `motion-safe:`.
