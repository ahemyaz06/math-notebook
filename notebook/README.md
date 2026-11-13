# Math Notebook user guide

Math Notebook is a document editor for maths that works like Word and reads well with NVDA
and MathCAT. You write notes and homework, type equations as plain text, explore graphs by
sound, draw your own graphs, open course PDFs and LaTeX files, and hand in Word or PDF files.

This is a beta: it is updated often and some parts are not finished yet. The section "What does
not work yet, and what is not tested" says which. Help > About shows your version,
and Help > Check for updates asks GitHub whether a newer one is out.

In the app, Help > User guide opens this guide in a window of its own. Each part starts with a
heading, so H goes from part to part and the Contents list links to each one. Alt+Tab goes back
to your document, and Escape closes the guide.

## Start here: your first ten minutes

You do not need to learn everything at once. These six steps cover most of a normal day.

1. Open Math Notebook from the Start menu (or run Math Notebook.exe in the portable folder).
   The cursor is in an empty document. NVDA stays in focus mode, as in Word.
2. Type a line of maths as plain text, for example y = x^2 - 4, and press Ctrl+Shift+E.
   It becomes a real equation that MathCAT can read.
3. Press Ctrl+G on that equation. Graph mode opens. Press Space to hear the curve, J and K to
   step along it, I to hear a description, and Escape to go back to your document. Ctrl+Enter
   there opens a menu of everything else, so you do not have to remember the keys.
4. Press Shift+Enter. The equation is copied onto a new line, ready to change: this is how you
   work a problem one step at a time. After changing it, press F9 to check that the new line is
   still the same maths as the one above.
5. Press Ctrl+S to save. To hand it in, press Ctrl+Shift+W for a Word file.
6. When you are ready to learn the graph sounds, open Help > Sound guide and lessons. The
   lessons take one idea at a time.

If you forget a key: F1 lists every key in the app. In a dialog, F1 explains that dialog. In
graph mode, F1 or the question mark lists the graph keys. Every command is also in the menus
(press Alt), with its key written beside it.

## The keys you will use most

- Ctrl+Shift+E: make the line (or the selection) an equation.
- Right arrow into an equation: step through it one symbol at a time and change it.
- Shift+Enter: copy the equation above onto a new line.
- F9: check this line against the line above.
- Ctrl+Shift+R: read the current line with its equations spelled out.
- Ctrl+G: open the equation's graph in graph mode.
- Ctrl+Shift+G: make an empty graph to draw on.
- Ctrl+Shift+I: import a PDF.
- Ctrl+S: save. Ctrl+Shift+W: export as Word.
- Ctrl+Z and Ctrl+Y: undo and redo anything, equations included.
- F1: every key.

## The menus and the toolbar

Press Alt for the seven menus: File, Edit, Insert, Format, Math, Tools and Help. Related
commands are grouped in submenus: File > Export, Edit > Go to, Insert > Table, Math > Graph and
Tools > Teacher. Settings is in the Help menu (Ctrl+comma).

A small toolbar sits above the document: paragraph style, bold, italic, underline, bullets,
numbering, Equation, Graph, Draw and Check line. It is a single Tab stop; the arrow keys move
along it, and F6 goes between the toolbar and the document.


## Writing

The keys are Word's, so most of what you know from Word works here.

- Bold, italic, underline: Ctrl+B, Ctrl+I, Ctrl+U. The status line says "Bold on" or "off".
- Headings: Ctrl+Alt+1, 2 and 3 for levels 1 to 3. Ctrl+Alt+0 goes back to normal text.
- Lists: Ctrl+Shift+L for bullets, Ctrl+Shift+7 for numbers. Tab and Shift+Tab move an item in
  and out a level. Enter on an empty item ends the list.
- Tables: Insert > Table asks for columns, rows and a header row. Tab and Shift+Tab move between
  cells, and Tab in the last cell adds a row. The same menu adds and deletes rows and columns.
- Page break: Ctrl+Enter.
- Find and replace: Ctrl+F finds (Enter goes to the match), F3 and Shift+F3 find again, Ctrl+H
  replaces one or all. Tools > Word count counts words.
- Pasting: text from a web page keeps its headings, lists, tables, bold and italic, and its
  maths (MathML) becomes real equations. Ctrl+Shift+V pastes plain text only.
- Printing: Ctrl+P.

### Undo, saving and recovering work

- Ctrl+Z undoes and Ctrl+Y (or Ctrl+Shift+Z) redoes every kind of change: typing, equations,
  lines copied down, tables, Replace and spelling fixes. Typing counts as one step until you move
  the cursor or use a command. Up to 200 steps are kept for the open document.
- Ctrl+S saves a notebook file (.mathnb).
- If the app or the computer crashes, your unsaved work is kept as a draft, even for a document
  you never saved. The next time you start, choose a draft to recover, or later use File >
  Recover unsaved work. It opens as an unsaved copy; press Ctrl+S to choose where to keep it.

### Spelling

- F7 goes through the misspelled words from the cursor on, as in Word. Each word is read with its
  line. Choose a suggestion with the arrow keys and press Enter, or press Tab to reach Change all,
  Ignore once, Ignore all, Add to dictionary and Change to (your own word). A doubled word ("the
  the") can be deleted.
- Alt+F7 jumps to the next misspelled word and reads its suggestions, without opening the box.
- The Applications key on a misspelled word lists corrections.
- It is the Windows spell checker, so Add to dictionary also teaches Word and Edge. Equations,
  graph descriptions and maths names such as sin, ln and arcsin are not checked.

### Moving around without browse mode

The document is one edit field, as in Word, so you can stay in focus mode the whole time.
(NVDA+Space still switches to browse mode whenever you want it.)

- Ctrl+PageDown and Ctrl+PageUp: next and previous heading.
- Ctrl+Shift+H: a list of all the headings.
- F8 and Shift+F8: next and previous review note (notes left by PDF import).
- Ctrl+F: find text.
- Ctrl+Shift+R: read the current line with equations spelled out.

## Maths

### Making an equation

- Type maths as plain text, such as (x^2 - 4)/(x - 2) or sqrt(x+1), then press Ctrl+Shift+E.
  The line (or just your selection) becomes a real equation.
- Alt+= opens a box to type a new equation in.
- LaTeX works too: type it, or switch to it with Ctrl+L while editing an equation.

### Reading and changing an equation

- When the cursor comes to an equation, the notebook says it as plain text, for example
  "Equation: x = log(3^x)". This is because in focus mode NVDA reads only the start of an
  equation. MathCAT reads the whole equation in browse mode (NVDA+Space).
- Right arrow into an equation (or Left arrow into it from after it) shows it as plain text, so
  the arrow keys move one symbol at a time and you can type to change it. When the cursor leaves,
  it becomes an equation again, exactly as before if you changed nothing. If what you typed is
  not maths, it stays as text and the notebook says why.
- Ctrl+E (or Enter just before an equation on its own line) edits it in a box as plain text.
- Ctrl+T turns an equation back into plain text, Ctrl+L into LaTeX text. Ctrl+Shift+E makes
  either one an equation again.
- Letters in equations reach NVDA as plain letters, so it says "x", not "x normalized". They
  still look italic on screen.
- Both of the first two behaviours can be turned off in Help > Settings > Writing.

### Working a problem line by line

- Enter after an equation always starts a new line.
- Shift+Enter (or F11) copies the nearest equation above down: onto this line if it is empty,
  otherwise onto a new line below. Change it to make your next step.

### Checking a step with F9

Press F9 on an equation to hear whether it is still the same maths as the equation above it.
It works the two lines out at the same fixed numbers (inside the interval, if the line has one).
It uses rules, not AI, and it never tells you the answer. Some examples:

- Under (x+1)^2, the line x^2 + 1 gives: "Not the same as the line above. At x = 1.7 the line
  above is 7.29 and this line is 3.89".
- Under x^2 = 2x, the line x = 2 gives: "the line above has x = 0, which is missing here".
  Several answers can be listed: x = 2, x = -2.
- Inequalities must be true for the same numbers.
- f'(x) = ..., y' = ... and dy/dx = ... are compared with the slope of the function above.
  d/dx (...) = ... is compared with the slope of what is in its brackets.
- Limits and integrals are worked out with numbers, for example `lim_(x->2) ... = 4` and
  `int_0^1 x^2 dx = 1/3`. An integral with no limits is checked by taking the slope of your answer.
- It also notices when one line has a value where the other has none, such as (x^2 - 4)/(x - 2)
  and x + 2 at x = 2.

A line of text that starts with = is compared with the equation above it. Words or a heading end
a piece of work, so a new problem is not compared with the last one. When it cannot tell (sums,
or a limit that settles too slowly) it says "Could not check" instead of guessing. Matching at
every number it tries is strong evidence, but not a proof.

### Comments

Anything after # or // is a comment, as in programming, and never becomes maths. Type
y = x^2 # the parabola and press Ctrl+Shift+E: y = x^2 becomes the equation and "# the parabola"
stays as words beside it. This also works in the equation box and the graph box. In LaTeX text,
% starts a comment too (write `\%` for a percent sign).

Comments are never copied down or graphed. They are shown in grey italics, and the screen reader
hears the word "comment" before them. In browse mode, a comment after an equation that has its own
line is read on the next line.

### Intervals

Write where an equation applies right after it, the way your class writes it:

- y = sin x, [0, 2pi]
- y = sin x on [0, 2pi)
- y = tan x, x in (-pi/2, pi/2)
- y = x^2, [0, inf)
- y = x^2 for 0 < x < 1, or y = x^2 {0 < x < 1}

A square bracket keeps that end; a round bracket leaves it out. Or put the cursor on an equation
and press Ctrl+Shift+D (Math > Interval for the equation), then type [0, 2pi], (0, pi], 0 to 2pi or
0 < x <= pi. An empty box takes the interval away. The equation then shows x ∈ [0, 2π], and its
graph is drawn only on that interval.

### Converting between plain text, LaTeX and MathML

Ctrl+Shift+M opens the converter. It changes plain text, LaTeX and MathML into each other, in any
direction, and updates as you type. A preview below can be read with MathCAT. Enter copies the
result, and "Insert as equation" puts it in the document. All conversions are done by rules, not
AI. The Word equations were checked against Microsoft's own converter in Word on 119 equations.

## Graphs

### Making a graph

- From an equation: press Ctrl+G on it (plain text, LaTeX, or a piecewise function written with
  \begin{cases}). A graph line is put under the equation and graph mode opens.
- From several equations: Insert > Graph from equations (or Graph on the toolbar). Type one
  function per line, as plain text or LaTeX, or paste pgfplots code from a .tex file.
- To draw your own: Ctrl+Shift+G (Insert > Graph to draw on, or Draw on the toolbar) makes an empty
  graph from minus 5 to 5 and opens it ready to draw on. See "Drawing a graph" below.

The window is chosen for you: it covers every hole and jump, and the height fits the curve. A
function with an interval is drawn only there, with a solid dot at an end it keeps and an open
dot at an end it leaves out, and the window fits the interval.

The graph line in the document describes the graph in the course's words: where it crosses the
axes, its peaks and valleys, holes, vertical asymptotes, and for piecewise functions each piece
and what happens where they meet (a jump, or a hole with the point somewhere else). Math > Graph >
Copy graph as LaTeX gives pgfplots code that draws the same graph in a .tex file.

### Listening to a graph: the graph mode keys

Enter on a graph line (or Ctrl+G) opens graph mode. Escape goes back to the same place in your
document. Most of these keys are also in Math > Graph.

You do not have to remember them: Ctrl+Enter (or M, or the Applications key) opens a menu of
everything you can do where you are. Each item says its own key, so you learn the keys as you go.
Arrow keys move in the menu, Enter chooses, Escape closes it, and a letter shown in brackets also
works inside the menu. While drawing is on, M is the drawing menu and Ctrl+Enter is still this one.

Moving along the curve:

- J and K: step back and forward along the curve. The point is read when you stop.
- Space: play the curve from where you are. Space again stops and reads the point.
- Period and comma: next and previous point of interest (zeros, peaks, valleys, corners, dots,
  and where it crosses another function).
- Home and End: the two ends of the curve.
- F: change the step size (0.1, 0.25, 0.5 or 1).
- D: turn the slope sound on or off (see "What the sounds mean" below).

Asking questions:

- V: read the point you are on.
- I: describe the whole graph.
- S: the slope here, for example "slope 2, rising", "flat" or "vertical". At a corner you hear
  both sides; at a jump, "the curve jumps here". On a graph from a page with no formula, the slope
  is an estimate ("about").
- L: the limits from the left and the right and the value here, then what that means: continuous,
  a hole, a jump, a vertical asymptote, or the curve is only on one side.
- N: play the lowest note, zero and the highest note of this graph, with the numbers they stand
  for. (While drawing is on, N starts a new piece instead.)

Tangent and secant lines:

- T: add the tangent line to the curve where you are. You hear its equation, for example "Tangent
  line at x = 1, where y is 1: y = 2x minus 1". Where there is no single tangent (a corner, a jump,
  the end of the curve, a vertical tangent) it says why and adds nothing. (While drawing is on, T
  changes an equation's numbers instead; use the menu.)
- In the menu, "Add a secant line through this point and another one" asks for the other x. You
  hear its equation and its slope, which is the average rate of change between the two points.
- A line is a function on the graph like the others: it is drawn in the picture, Tab goes to it, and
  it has its own sound. Stepping along the curve, the place where the tangent touches, and the two
  places the secant crosses, are points of interest. Several lines can be on the graph at once.
- Backspace (or Delete) takes back the last line or curve you added, and says which. The menu can
  also remove all the lines. They are not saved in the document: they are gone when you leave graph
  mode.

More than one function:

- Tab and Shift+Tab: next and previous function. Each function has its own sound, and its note
  plays where you are, so you hear at once whether it is higher or lower than the one you left.
- Minus: the difference between this function and the one you came from, as a curve of its own:
  above zero where this one is higher, zero where they cross. Minus again takes it away.

Moving freely:

- Arrow keys: move anywhere on the graph. When you land on a curve its tone plays and the point is
  said as "on" that function. C puts you back on the function.

Numbers are rounded to the nearest half when spoken (a height of 4.19 is "4", a zero at 1.73 is
"1.5"). The document's own text stays exact. Help > Settings > Graph sound > Numbers you hear can
give one decimal or the exact value.

### What the sounds mean

You do not need to memorise this: Help > Sound guide and lessons teaches it with eleven short
lessons, one idea each, and has a quiz.

- Higher on the graph is a higher note. The lowest note is always the bottom of the graph and the
  highest note its top, whatever the numbers are, so a curve that climbs to 200 is as easy to hear
  as one that climbs to 2.
- Each step slides into its note along the curve: a steep step is a long slide, a flat step has
  none. Nothing slides across a jump.
- Below zero the sound is rounder. At zero a quiet octave rings with the note.
- Left and right are heard in stereo: the left of the graph in your left ear.
- While playing with Space, a soft bass line plays the same note an octave lower, so the steps
  feel joined up.
- Dots and corners: a small bump for a solid dot, a breath of wind for an open dot (a hole), and a
  slide through a sharp corner (down then up at a valley, up then down at a peak). A chime marks the
  origin. At a jump both dots are heard, each at its own height.
- Two functions crossing: two soft taps.
- The slope sound (D): after each step's note comes a second, softer note for the slope. High means
  rising, the middle note means flat, low means falling. At a peak or a valley it passes the middle
  note. The step's note fades first, so you never hear the two together.

Help > Settings > Graph sound has ten sounds to choose from and everything else about the sound.
Its "How heights become notes" choice can bring back the original sounds (notes counted in units
that start again every 10, one sound for every function).

### Drawing a graph

Ctrl+D in graph mode turns drawing on and off, on any graph (also Math > Graph > Draw on the graph).
Ctrl+Shift+G in the document makes an empty graph with drawing already on.

Two keys do most of the work:

- Arrow keys move the cursor, and Enter puts a point there. Each new point is joined to the last
  one, and you hear what you made: "Point at 1, 2. Line from 0, 0: slope 2, rising", and "Peak at
  1, 2" when the next point makes one.
- M (or the Applications key, or Enter on a point you already put) opens a menu of everything you
  can do at that place. Each item says its own key, so you can learn the keys from the menu as you
  go. Arrow keys move in the menu, Enter chooses, Escape closes it.

The other keys, for when you know them:

- Period and comma: next and previous point you put down.
- On a point: G moves it with the arrow keys while the graph follows (Enter puts it down, Escape
  puts it back). R makes the curve smooth there, or a sharp corner again. O makes it an open or a
  solid dot. Delete removes it.
- Away from a point: R chooses whether new points are joined by straight lines or smooth curves.
- N starts a new piece, not joined to the rest. Starting it at the same x where another piece ends,
  at a different height, makes a jump; one of the two dots is open. The menu can connect pieces.
- E adds an equation (it is checked first; one that cannot be graphed is refused with the reason).
  T plays with its numbers: Left and Right choose a number, Up and Down change it, and the curve's
  note moves with it. Escape when done.
- An arrow key at the edge says so; pressed again it makes the graph one unit bigger. W sets the
  size with numbers.
- Backspace takes back the last thing you did, whatever it was, and says what: "Undone: the point
  at 1, 2 is taken away". Press it again for the thing before. Delete away from a point does the
  same (on a point, Delete deletes that point). Ctrl+Z is the same undo, and Ctrl+Y does it again.
- All the graph mode keys still work while drawing: Space plays what you drew, I describes it, S
  and L give the slope and limits.

A drawing always stays a function of x. A second point straight above or below another, a piece
over a stretch that is already drawn, a vertical line, or a point moved past its neighbour is
refused, and you hear why. Smooth parts only rise or only fall between two points, so every peak
and valley is exactly at a point you put down. A corner, a smooth point and a corner make a true
parabola. The menu tells you the formula of the line or curve under the cursor (y = 2x + 1).

Several functions on one graph: in the menu, "Start a new function to draw" adds g(x) next to f(x),
then h(x). Each is its own function, so they may cross. Tab goes between them, and Enter draws on
the one you last went to (what is said then starts with its name, "g(x): Point at 2, 1").

The menu can also make the graph's line in the document show the equations instead of the
description: each drawn part's formula and where it applies (y = 2x from x = 0 to 1). The same
item switches back. The file keeps your points, and Copy graph as LaTeX gives the drawing as
pgfplots coordinates.

On screen: a square for a corner or an end, a circle for a smooth point, a hollow circle for an
open dot, dashed lines for what Enter would draw, and lines from the cursor to both axes.

### Derivatives as curves

With drawing on (Ctrl+D), apostrophe (or the menu) adds the derivative of the selected function as
a curve of its own and selects it, so Space plays it and J and K step along it. Press apostrophe on it again for
the second derivative; a third time takes both away. The derivative follows its function when you
move a point or change a number.

- For a drawing it is exact. A straight line gives a flat stretch at its slope. A sharp corner has
  no slope, so the derivative jumps there, with an open dot on each side. A smooth point gives one
  value.
- For an equation it is measured from the curve (the same way S measures the slope). It has no
  formula, and its numbers are right to about four decimals. Where the function has a corner, a
  jump, a hole or an asymptote, the derivative has no value.
- A derivative often goes outside the graph: under y = x squared, shown from minus 2.5 to 30, the
  derivative runs from minus 10 to 10. Such a curve has a scale of its own that reaches as far as it
  does, so it is as clear to hear as the function. Tab then says "on its own scale", its notes are
  not higher or lower than the other functions' in the same way, and N plays its lowest and highest
  note. The same holds for a difference made with minus.

## Opening course files

### LaTeX files (.tex)

If your teacher gives you the LaTeX source (the file the PDF was made from), use it: it holds the
exact maths, so nothing has to be guessed. File > Import LaTeX (.tex) turns it into a notebook:

- Sections become headings, and inline and display maths become equations (each row of an align
  on its own line).
- Lists, tables, bold and italic are kept, and the file's own \newcommand definitions are used.
- Graphs drawn with pgfplots (\addplot) and TikZ drawings of functions become graphs you can
  explore by sound, with their open and solid dots, dashed lines (asymptotes) and arrowheads. Two
  labelled functions on the same axes stay two functions. An empty set of axes becomes an empty
  grid to draw on.
- The exam class works: each \question is a heading with its points, parts and choices are lists,
  and solutions are left out unless the file prints answers.
- Other pictures are named, not shown. A mistake in the file (a { never closed) loses only that
  part. Whatever could not be read gets a review note at the end (F8 goes there).


### PDF files

File > Import PDF (Ctrl+Shift+I; Ctrl+I is italic, as in Word). Pages are added at the end of the
document as they are read, and you can keep working meanwhile.

How pages are read is set in Help > Settings > Reading PDFs:

- Automatic (the default): PDFs made with LaTeX, which most course notes and homework are, are
  rebuilt from the letters and symbols in the file, using their positions to tell a fraction from
  an exponent. Graphs drawn by LaTeX are read exactly and can be explored by sound. Pictures keep
  their place ("Picture 1 on page 1: its description is on the way") and, if the AI add-on is
  installed, are described one by one. Pages that are scans, or whose maths is drawn as shapes (as
  in OpenStax textbooks), go to the AI; without it, the page says why it was not read.
- Text from the PDF only: never uses the AI.
- AI reads every page: the AI reads each page and its copy is compared with the PDF's text.

Review notes: where something might be wrong, the line is underlined with a review note. F8 and
Shift+F8 go to the next and previous note and read it. Tools > Remove review note clears it once
you have fixed the line. Blank pages are marked "This page is blank".

Reading by rules can still get an equation wrong, so check important equations against the PDF.
If you switch notebooks during an import, the rest of the pages stay out of the new notebook;
import the PDF again to get them. Changing the setting affects only PDFs imported afterwards.

### Checking PDF equations with Tectonic (optional)

For PDF pages read without AI, the notebook can typeset each equation again and compare it with
the page. It corrects some mistakes (such as a subscript read as an exponent) and leaves the rest
as read. The switch is Help > Settings > Reading PDFs > Check each equation. It is on, but does
nothing until Tectonic is installed, and it makes reading slower (seconds per page).

Tectonic is not included. To use it, install it yourself
([installing Tectonic](https://tectonic-typesetting.github.io/book/latest/installation/), or the
Windows zip from its [releases](https://github.com/tectonic-typesetting/tectonic/releases)). Then
put tectonic.exe on your PATH, or set the environment variable TECTONIC to its full path. The first time
it runs, Tectonic downloads the TeX packages it needs from its own servers (once).

Tried with Tectonic 0.17.0 on 868 equations from one calculus course: 863 matched, 1 was corrected,
and 4 real misreadings were caught but could not be corrected (they stay as read, without a warning).
It only helps with PDFs made by LaTeX.

## Sharing your work

Nobody else needs Math Notebook to read your work.

- Word: File > Export > Word document (Ctrl+Shift+W). Every equation is a real Word equation, so
  Word, NVDA and MathCAT read it as maths. You do not need Word installed to make the file. This is
  the best format to share with other screen reader users.
- PDF: File > Export > PDF makes a tagged PDF with the headings as bookmarks. It also carries your
  notebook inside it as a standard attachment, so when Math Notebook opens that PDF again you get
  your document back exactly, graphs and all. Other PDF readers just show and print it as usual.
- Braille: File > Export > Braille (BRF) makes a braille ready file for an embosser or a braille
  display. It needs [BrailleBlaster](https://www.brailleblaster.org/) (free, from the American
  Printing House), installed separately; open BrailleBlaster once first to accept its licence. For
  Nemeth maths, choose UEB with Nemeth in BrailleBlaster's Translation settings. The way the braille
  is made follows Owen Petronick's Braille Check.
- Print: Ctrl+P.

## Teacher mode

For a TA, tutor or disability services office making a worksheet, or for making your own practice
sheets: Tools > Teacher > Teacher mode. Then, from the same menu:

- Hide this line from students (Ctrl+Shift+F9): hides a whole line, such as a hint or a worked
  solution.
- Hide the selected words (Ctrl+F9): the student copy shows a blank (______) there.
- Insert answer box: write the answer in it; students get the box empty.
- Graph for students (on a graph line): hide the formula, so students hear the curve and find the
  function, and any of the zeros, the y-intercept, peaks and valleys, holes and dots, and asymptotes.
  Hidden points are not announced in graph mode either.
- Preview student copy: shows exactly what students get, read only, with graphs that sound as theirs
  will.
- Save student copy, or export it as Word or PDF. Hidden parts are removed from these files, not just
  hidden. Your own file is the answer key and reopens in teacher mode.

## Settings

Help > Settings (Ctrl+comma) is one window with four tabs. Left and Right arrows change tab, Tab goes
into the tab, and Ctrl+Tab changes tab from anywhere. Save keeps the changes on every tab, Escape
cancels, and Restore defaults puts everything back.

- Reading PDFs: how pages are read (see "PDF files"), how many pages are read at the same time (1 or
  2), and the Tectonic equation check.
- Writing: whether the arrow keys step into equations, whether an equation is said when the cursor
  comes to it (both on), and whether to check for a newer version when the app starts (off).
- Graph sound: the sound (ten, in five pairs: soft, Gentle and Flute; warm, Marimba and Harp; clear,
  Piano and Beep; rich, Cello and Vibraphone; sharp, Guitar and Chiptune). Each one plays as you move
  through the list, and Listen plays a whole example. Then: how heights become notes (Fitted to the
  graph, or Original), sliding notes, the slope sound, stereo (Original, or Wider for left and right
  that are easier to tell apart), the volumes, the bass line, the dot and corner sounds, points of
  interest, tones while moving freely, numbers you hear, the step and the playing speed. The Sound
  guide and lessons button is here too.
- AI add-on: on or off, and its choices (see "The AI add-on" below). If it is not installed, one line
  says so.

Your settings are kept in %LOCALAPPDATA%\MathNotebook\settings.json, or for the portable version in
settings.json in its data folder.

## Installing and updating

### The installed version

Run Math-Notebook-Setup.exe on 64-bit Windows 10 or 11. It installs for you only (no administrator
needed) unless you choose all users. The setup is not code-signed, so Windows may warn first: in
"Windows protected your PC" choose More info, then Run anyway.

Your settings and imported PDFs are kept in %LOCALAPPDATA%\MathNotebook. To update, run the newer
setup: it installs over the old one and keeps your data. To remove it, use Windows' Installed apps;
it asks whether to keep your data.

### The portable version

Extract all of Math-Notebook-portable.zip into a folder you can write to (the Desktop, a USB stick),
then run Math Notebook.exe. Keep the files together. It has no AI add-on. Your settings and imported
PDFs are kept in the data folder beside the exe. To update, close Math Notebook, extract the new zip
into a new folder, and copy your old data folder into it.

### Checking for updates

Help > Check for updates asks GitHub's public "latest release" page whether a newer version is out,
and if so offers its download page. Nothing is downloaded or installed by itself, and nothing about
you or your documents is sent. Help > Settings > Writing can check each time the app starts (off
unless you turn it on). See [what changed in 0.8.0](CHANGELOG.md).


## The AI add-on (optional)

Everything above works without AI. The optional AI add-on does two extra things: it describes
pictures, and it reads PDF pages whose maths is not stored as text (scans, and textbooks that draw
their formulas). It can miss or misread details, so its picture descriptions are marked "may be
wrong", and the equations it copies are compared character by character with the PDF's own text.
Where they differ, the line gets a review note. (Real example: the AI wrote "f and q" where the PDF
had "f and g".)

It runs on your own computer and needs a graphics card with about 8 GB of memory and about 16 GB of
free system memory. Close other programs that use the graphics card before importing a PDF. The
model is loaded only while it is needed: it stops 10 minutes after its last use (never while
reading), and when Math Notebook closes or crashes.

Help > Settings > AI add-on turns it on and off (off, the notebook works exactly as without it),
and chooses whether to describe pictures, estimate numbers from graph pictures, which reading model
to use, and a second model that re-reads AI pages that have review notes.

Which model: on 8 real course pages (29 October 2026), the checker found real copying errors from
Qwen3-VL-8B (3), Qwen3.5-9B (2) and Chandra OCR (2, and one broken page), and none from
Qwen3.6-35B-A3B, which is the default when it is installed.
## What does not work yet, and what is not tested

The app is used every day with NVDA and MathCAT, and automatic tests drive the real app with key
presses and check what it does and says. What is left is below.

Not built yet:

- In drawings: letters as numbers to change (y = a x^2), asymptotes, a formula for an equation's
  derivative, and hiding parts of a drawing in a student copy.
- Hearing two functions at once: they are heard one at a time, on purpose.
- floor, ceiling, round, max and min cannot be graphed. Vertical lines are described but not traced
  (they are not functions of x).
- Font sizes, colours and alignment.

Things to know:

- Intervals: y = 2x, (1, 2) (round brackets straight after a comma) is read as a point, not an
  interval; write "on (1, 2)" or "x in (1, 2)". Only intervals of x, one per equation. Curly braces
  {-2pi, 2pi} are a set of two numbers, not an interval.
- Comments: # and // always start a comment beside an equation; there is no way to write them as maths.
- Numbers: 1e-9 is not read as a number (it could mean 1 times e, minus 9); write 10^(-9).
- Equations from PDFs that plain text cannot say exactly (matrices, unusual symbols) come back exactly
  only if you change nothing while stepping through them.
- PDFs: the labels inside a drawn figure (y, y = f(x), (b, f(b))) can come out as short separate
  equations when the figure is not recognised as a graph. PDFs made with Word, or scanned, are less
  sure than LaTeX ones, and an unusual layout can be read wrongly without a warning.
- .tex files: pgfplots plots from tables, files or parametric coordinates, and TikZ drawings that are
  not graphs of functions, are not read; they are named in a review note.
- Tectonic check: it cannot see a mistake that splits one equation into pieces on separate lines.
- Braille: tried with BrailleBlaster 3.2.5 (UEB, and UEB with Nemeth). A piecewise function is brailled
  one piece to a line, because BrailleBlaster turns a cases block into 8-dot cells an embosser cannot
  make; other maths tables (matrices) can still do this, and the notebook says on which lines. The
  braille has been read back by a program, not yet by a braille reader.
- Spelling: only the language Windows uses for you is checked (US English if there is no spell checker
  for it). Add to dictionary is not run by the tests, because it writes to your real Windows dictionary.
- Access8Math: if NVDA's maths voice is Access8Math, square brackets can be spoken in Chinese. That
  comes from Access8Math's own dictionary; choosing MathCAT as the speech source in Access8Math's
  settings avoids it.
- Tried on one computer only: Windows 11 with NVDA, MathCAT and Access8Math, in US English. Other
  screen readers (JAWS, Narrator) have not been tried.
- Updates: the tests use a stand-in for GitHub, not the real site.
- The older browser page (/ instead of the desktop app) still works but is not developed further.


## Third-party files

web/vendor/temml.mjs, Temml-Latin-Modern.css and Temml.woff2: Temml 0.14.0, MIT licence
(TEMML-LICENSE.txt). latinmodernmath.woff2: Latin Modern Math, GUST font licence. Electron (MIT) is
installed by npm.
