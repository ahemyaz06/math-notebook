# Math Notebook changes

Earlier versions are described on the [releases page](https://github.com/ahemyaz06/math-notebook/releases).

## 0.7.9 (beta)

### Checking a line of work

- F9 (Math > Check this line against the line above) says whether an equation is still the
  same maths as the equation above it, and if not, a number where they differ. Expressions and
  `y = ...` lines are compared by value; equations to solve by their solutions (a lost or an
  added solution is named); inequalities by which numbers make them true; `f'(x) = ...` and
  `dy/dx = ...` by the measured slope of the function above; limits and definite integrals by
  working them out; an integral with no limits by the slope of its answer.
- The numbers are a fixed list, not random, so the answer is the same every time. With an
  interval on the line they are taken inside it. Only numbers where both lines have a value
  count, and a value that one line has and the other lacks is said.
- It is rules, not AI, and never gives the answer. What it cannot tell it says ("Could not
  check"); it does not guess. Tested on about 140 written steps, 60 of them true statements
  chosen to be hard: none was called wrong, two could not be checked.

### Menus, toolbar and Settings

- Seven menus instead of eleven: File, Edit, Insert, Format, Math, Tools, Help. Tables are in
  Insert > Table, graphs in Math > Graph, spelling, word count and Teacher in Tools, the
  exports in File > Export, and headings and review notes in Edit > Go to. Every key is the
  same as before.
- Settings is one window with four tabs (Reading PDFs, Writing, Graph sound, AI add-on), in
  Help > Settings (Ctrl+comma). Left and Right change tab; Ctrl+Tab does from anywhere.
- The toolbar is smaller: paragraph style, bold, italic, underline, lists, Equation, Graph and
  Check line.
- Nothing is said when the app starts; the keyboard shortcuts page is still F1.
- The new menus, the Settings tabs and the line check were tried with NVDA.

### Speed and file size

- Importing a PDF parses each page once instead of several times, draws a page's picture only
  when something needs it, and the editor asks only for the pages it does not have yet.
- Equations are saved as their LaTeX only, in notebooks, recovery drafts and undo steps; the
  drawn form is made again on opening. Older notebooks open as before, and 0.7.8 opens new ones.
- The part that finds pictures and graphs on a PDF page no longer needs OpenCV. Its few image
  steps are done with NumPy and give the same results (compared on thousands of test images),
  so the download is smaller.

### Fixed

- `x = +-2` was written with a dot after the plus-or-minus sign. It is now a plain sign in
  front of the 2, also before a root or a letter.

## 0.7.8 (beta)

Changes since 0.7.6. Version 0.7.7 was never published; its changes are listed here.

### Saving and crash recovery

- While you work, unsaved changes are kept as a draft on this computer, untitled documents
  too. After a crash, the next start offers the draft; File > Recover unsaved work opens the
  list later. A recovered document opens unsaved, at the place you were, and Ctrl+S asks where
  to save it.
- Saving writes the new file completely before it replaces the old one, so a failed save
  leaves the previous file as it was.

### Undo

- Ctrl+Z undoes and Ctrl+Y (or Ctrl+Shift+Z) redoes every change in the document. Before,
  undo knew only typing: after an equation was made, a line copied down or a table inserted,
  it did nothing, and redo could put letters back in the wrong place. Typing is one step until
  you move the cursor or use a command; each command is one step. The status line says the
  line you land on. In a dialog's text box, Ctrl+Z undoes only the typing in that box.

### Graph sound

- New choice, Settings > Graph sound > Stereo. Original (the default) sounds as before. Wider
  places points further from the middle, so left and right are easier to tell apart, and larger
  graphs (up to about minus 10 to 10) reach further to each side. The far ear always hears a
  little, and the bass line moves left and right too. Choosing Wider plays a note moving from
  the left edge to the right.
- The Graph sound settings are in a clearer order: the sound and how it is heard (sound, clearer
  pitch, slope sound, stereo, volumes, bass line), then dots and points of interest, then moving
  (numbers you hear, step, speed).
- Graph mode reads your position sooner after each arrow press, and moving no longer redraws
  every curve.

### Writing and PDFs

- Recovery drafts are written once typing pauses, so typing is smoother.
- A bullet drawn as a picture at the start of a PDF line reads as a bullet, not a question mark.
- Greek letters typed as characters (θ, α, Δ) work in typed equations like their names.
- An equation being changed with the arrow keys was white text on a light background in dark
  mode; it now follows the light or dark theme. Comments beside equations do too.
- "y = sin x, x on [0, 2pi]" left a stray "x," in the equation; it no longer does.
- An interval in curly braces, x on {-2pi, 2pi}, is not read as an interval, because braces
  mean a set (just those two numbers). The message now says so and suggests [ ] or ( ).
  Shift+Enter or F11 under such a line says the line is not an equation yet, instead of
  copying an older equation from further up.
- Convert math, opened on an equation, set "It is written in" to LaTeX. Plain text typed over
  it was then passed through unchanged, so the "LaTeX" had no backslashes. It now finds out the
  format again as soon as you type. Closing the box puts the cursor back where it was.

### Fixes after a review of 0.7.6

- Opening an equation and closing it unchanged keeps it exactly as it was. Plain-text editing
  is offered only when plain text can hold the equation exactly; otherwise it opens as LaTeX.
- Typed maths: grouped powers, division between fractions, how far a limit reaches, products
  such as sin 2x, and the inverse trigonometric functions are read correctly.
- Teacher mode: Save and Save As are blocked during the student preview, so the preview copy
  cannot overwrite the teacher's file; Teacher > Save student copy saves it. Hidden graph
  formulas and the comments marked beside them are removed from the student copy in lists too.
- Graph mode: L and S (limits and slope) say when a side is missing, when the estimate is
  uncertain, and when the graph goes to infinity. Jumps are told apart from holes and
  vertical asymptotes more reliably.
- Word, braille and .tex: terms after an integral's dx stay outside the integral in Word;
  characters Word cannot store are left out instead of breaking the file; braille with skipped
  heading or list levels is valid; cube roots and logarithm bases survive pgfplots both ways.
- The optional Tectonic check has a time limit per page, and runs with TeX's unsafe commands
  turned off.
- The optional AI download checks each file's size and checksum, resumes correctly, and
  checks a zip's contents before unpacking it.

### AI add-on

- The AI model stayed loaded after Math Notebook closed or crashed, holding the graphics
  memory (7 GB in one case, for a day). It is now ended together with the program that
  started it, and also stopped 10 minutes after its last use, but never while it is reading.

### Not tested yet

- Undo and redo, crash recovery, the Wider stereo choice and the new messages have been
  checked by the automatic tests only, not heard with NVDA.
- Ending the AI model with the app was checked with the Qwen3.5-9B model on one computer; the
  downloads below do not include the AI add-on.

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
