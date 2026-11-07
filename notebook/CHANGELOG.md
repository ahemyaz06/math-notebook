# Math Notebook changes

Earlier versions are described on the [releases page](https://github.com/ahemyaz06/math-notebook/releases).

## 0.7.6 (beta)

Changes since 0.7.5. The Windows setup and portable zip both use the local PDF reader.
Tectonic for optional PDF equation checking and BrailleBlaster for BRF export are separate installs.

### Fixes to PDF import and graph descriptions

- Pages and picture descriptions from an earlier import stay out of the new document when
  you open or start another notebook.
- If the same equation appears twice, the PDF check corrects only the occurrence it matched.
  Enabling the check or installing Tectonic also lets it check pages that were read without it.
- Very small nonzero values and tall but finite peaks are less likely to be called zeros or
  vertical asymptotes in graph descriptions.

### Reading PDFs: far fewer misreadings

The PDF reader (reader version 10, was 3 in 0.7.5) was checked in three new ways: against the
LaTeX sources of 13 lecture notes, by sending every equation read from them through plain text
and back, and by typesetting thousands of made-up calculus equations, reading them back, and
comparing. On made-up displayed equations it now reads 98 to 99 in 100 as the same maths (it
was about 80 in 100 at the start of this work); on made-up sentences with maths in them, 150
of 150. Imported PDFs are read again with the new reader the next time they are opened.

Fixed, among others:

- Roots: the index of a cube root (the 3 of a cube root) was dropped or read as a 3 after the
  root, also over tall fractions; an exponent above a fraction is no longer taken for a root's
  index.
- Tall brackets, sums, integrals and roots are now placed where they are drawn (their boxes in
  the PDF are not), so a bracket in a denominator stays in the denominator, an exponent after a
  tall bracket stays its exponent, and the limits of a displayed sum or integral stay with it.
- A displayed integral was read as the letter Z, a tall bar as || or ||||, a tall brace as (.
- Fractions inside fractions: a numerator or denominator no longer reaches past another bar.
- Piecewise functions: the rows no longer leak into each other.
- A formula in a sentence that is broken across two lines is one formula again (it was read
  as two).
- A wide displayed equation that starts at the margin is a display, not part of a paragraph.
- (x^(1/2))^3 at the start of a line was taken for a list label "(x)".
- "units of y / units of x" read the y as a subscript.
- A footnote in small print no longer changes how the rest of the page is read; a prime is
  always part of what is before it; headings with maths in them are headings; tables with a
  rule only under their header keep their rows.
- A drawing the reader cannot read is said as a drawing with its labels, never read as
  one-letter equations.
- \cdots, \nicefrac and a sentence's closing bracket after the maths are read correctly.

### Optional: checking each equation against the page (Tectonic)

With [Tectonic](https://tectonic-typesetting.github.io/) installed separately, the notebook
can draw the equations it reads without AI and compare them with the PDF page. It can correct
some misreadings. Tested with Tectonic
0.17.0 but **not bundled**. Settings > Reading PDFs, "Check each equation" (on by default; it
does nothing without Tectonic). See "Checking equations with Tectonic" in the main README.

### LaTeX files

- A graph inside a numbered item stays under that item; the list goes on after it with the
  next number (it was moved to after the whole list, in the notebook, Word and braille).
- The lecture notes' own layout: large centred titles are headings, boxed definitions with
  display maths are read whole, \vskip and \vfill end a paragraph, one-symbol macros such as
  \? are expanded, footnotes are kept.
- A backslash at the end of a line no longer stops the import; one mistake loses only its own
  part, with a note. Boxes around environments, % inside \url and \verb, two labelled TikZ
  functions, pgfplots dots, dashed lines and arrowheads, and the exam class (questions as
  headings with their points, parts and choices as lists, solutions left out) are read.
- \mbox and \nicefrac show, and spoken equations leave out colours and \mbox words.

### Editing equations

- An equation that plain text cannot hold (a piecewise function from a PDF) opens as LaTeX
  for editing, saying why; switching it to plain text is refused with the reason.
- Plain text understands an answer blank (______) and half-open intervals ((-1, 1], [0, 2pi)).
- Up and Down onto an equation with a comment reach the equation and say it.
- A bracket closed with the wrong kind says so ("The { is closed with ). Close it with }").

### Graphs

- A curve with a small turning point is shown whole: 3x^2 + 2x was cut to y from -0.5 to 2,
  although it climbs to 85, and sounded odd.
- In graph mode, I (describe) says its points to two decimals (a zero at -0.67 was said as
  -0.5 with "nearest half" rounding); moving along the curve still rounds as chosen in Settings.
- Descriptions written into the document have at most two decimals.
- Interval ends are no longer called vertical asymptotes; horizontal asymptotes, "touches"
  versus "crosses", and endless oscillation are said; clearer messages for floor, x = 2 and
  (1, 2).
- Student copy: an equation that shows a hidden graph's formula is left blank there too.

### Braille

- File > Export as braille (BRF), with [BrailleBlaster](https://www.brailleblaster.org/)
  installed: every equation goes to it as MathML (UEB, or UEB with Nemeth); piecewise
  functions are written one piece to a line; numbered lists keep their numbers (1., a., i.).
  The approach follows Owen Petronick's Braille Check. The braille has not been checked by a
  braille reader.

### Other

- Links open only for https addresses.
- Ligatures in PDFs without a Unicode table (fi, ff, fl) are read.
