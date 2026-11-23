# Math Notebook changes

Earlier versions are described on the [releases page](https://github.com/ahemyaz06/math-notebook/releases).

## 0.8.2.2 (beta)

### Equations said in focus mode as in browse mode

- When the cursor comes to an equation, the notebook says it in the words NVDA uses in browse
  mode, from NVDA's own MathCAT and your NVDA maths settings: "y is equal to, the natural log of
  x". It used to say the typed form, "Equation: y = ln(x)".
- It is said sooner: about a tenth of a second after the cursor arrives, not a quarter.
- Help > Settings > Writing > "How an equation is said" can choose the typed form instead. Where
  NVDA has no MathCAT (and the MathCAT add-on is not installed), the typed form is said.
- An equation stepped through with the arrow keys and left as it was is not said again.
- Going up and down between two equation lines says each one again.

### Questions from a PDF are ordinary text

- Questions from a PDF were read-only, and in focus mode NVDA read one letter or nothing in them.
  They are now ordinary text, read and changed like any other line. The answer box after each
  question stays. Notebooks saved with read-only questions open with ordinary text.

### Fixed

- A function followed by brackets, such as ln(2 + x), 3 sin(x) or cos(2x), was said by MathCAT
  with an extra "times" ("the natural log of, times, open paren 2 plus x"), in browse mode too.
- [-pi/2, pi/2] written with \mbox and \nicefrac showed as its LaTeX text in the document. It
  shows as maths.
- Faster undo, redo and opening of a notebook (each equation is drawn once), and typing no longer
  checks every question on each key.

## 0.8.2 (beta)

### Graphs of other letters

- A function can change any letter, not only x. The letter on its own goes up and the other one
  goes across: A = 1200 - 4y^2 has y across and A up, x = 100 - 4y has y across and x up,
  h(t) = -16t^2 + 64t has t across. Graph mode, the description and the graph's line use those
  letters: "y 2, A 1184", "crosses the y-axis at y = 17.32". It can be written either way round
  (1200 - 4y^2 = A), with an interval in the same letter (t in [0, 4], for 0 < y < 17.32), or in
  pieces.
- y = 100 - 4y is said to be an equation to solve (y is on both sides), with how to graph it
  instead: x = 100 - 4y. Two letters that can both change (A = xy), or functions of different
  letters on one graph, are said plainly too.
- A new graph's window reaches zeros, peaks and valleys up to 100 away when there are only a few:
  y = 100 - 4x shows x from minus 5 to 30, so its zero at 25 is on the graph.

### The size of a graph you already have

- In graph mode W makes the graph twice as wide and Shift+W half as wide. The menu has both, and
  "Type the size of the graph" for exact numbers. A graph of equations fits its height to the
  curves again; the document keeps the new size. A very wide graph gets longer steps (F offers
  them), so it is not hundreds of key presses across.

### A bigger graph, with its question on top

- Graph mode's picture fills the window. Above it are the question the graph belongs to (the
  nearest line with words above the graph) and the graph's equations drawn as maths, and each
  axis has its letter at its end. Q reads the question aloud.

### How the curve bends (B)

- B in graph mode says whether the curve is concave up or down where you are, with the second
  derivative's value, and lists the inflection points on the graph. The second derivative is worked
  out by the rules of calculus, so it is exact: y = x^4 - 4x^3 has inflection points at 0, 0 and
  2, minus 16. Corners and asymptotes where the bending changes are not inflection points; a
  vertical tangent can be (y = cbrt(x) at 0). Also in the graph menu and Math > Graph. It works on
  drawings too, exactly from the drawn parts, so a sketch can be checked: a drawn S whose middle is
  -x^3 + 3x has its inflection point at 0, 0.
- Inflection points are also stops for period and comma, and stepping onto one says it ("the
  origin, 0, 0; inflection point at 0, 0" on y = x^3). They have no sound of their own, and the
  graph's description does not list them (B does).

### The normal line

- Shift+T in graph mode (or the graph menu, or Math > Graph) adds the normal line where you are: at
  a right angle to the tangent, with slope minus 1 over the tangent's. y = x^2 at x = 1 gives
  y = minus 0.5x plus 1.5, which crosses the parabola again at minus 1.5, 2.25 (a point of
  interest). A flat tangent's normal is vertical, so it is said and not added; a vertical
  tangent's normal is flat (y = cbrt(x) at 0 gives y = 0). Backspace takes it back like the other lines.
- E in graph mode writes a tangent, normal or secant line in the document, under the graph, as words
  and an equation: "Normal line to y = x^2 at x = 3: y = -(1/6)x + 19/2".
  Fractions stay fractions (up to 100 below the line); other numbers are written to four decimals
  and said to be rounded.

### Fixed

- A function on an interval far from 0 lost the dot at its far end: y = x on [0, 100] had a solid
  dot at 0 only, and a jump at x = 100 in a function in pieces was not heard as a jump. Both ends
  now have their dots, at any size of number.
- The window of a function on an interval no longer adds half the graph again when it rounds its
  ends: V = x(20 - 2x)^2 on [0, 10] is shown from minus 0.5 to 11 (it was to 15), y = x on
  [90, 100] from 89 to 101 (it was 85 to 150).
- y = sin x on [0, 2pi] said its end dot was at "minus 2.4 times 10 to the minus 16"; it is 0.
- x^2 = y was named "y = x^2 = y"; it is y = x^2.

## 0.8.1 (beta)

### An Import menu

- Import PDF and Import LaTeX moved from the File menu to a menu of their own, Import (Alt+P):
  PDF (still Ctrl+Shift+I), LaTeX (.tex), and Any file it can read, one file box for both whose
  file's ending says how it is read. Each of the first two shows only its own kind of file.

### Save as: every kind of file in one place

- File > Export is gone. Everything is in File > Save as, as in Word: Notebook (Ctrl+Shift+S),
  Word document (Ctrl+Shift+W), PDF, Web page and Braille (BRF). Each opens the same save box,
  whose Save as type list has all five, the one chosen first. The kind is taken from the file's
  ending; a name typed without one gets the chosen kind's.
- Ctrl+S on a notebook never saved opens that box too, so it can be saved straight away as a PDF
  or Word document. A PDF, Word, web page or braille copy says if the notebook itself is not saved
  yet. Saving before closing offers the notebook only.
- Messages say "Saved homework.docx as a Word document" (they said "Exported"). Teacher: "Save
  student copy as Word document" and "as PDF".

### F9, graphs and graph sound work maths out in one place

- F9, graphs, graph mode and the graph sound now use one way of working out values, limits and
  slopes, so they cannot give different answers for the same function. Every answer was compared
  before and after, to the last digit, and it is as fast as before.
- Fixed: F9 said |x| has slope 0 at 0 and |sin x| has slope 0 at pi. A corner has no slope.
  F9 now finds the slope of x^(5/3) and x|x| at 0 (it is 0), and says sin(x)/x has none at 0.
- Fixed: csc, cot, coth and csch at 0, atanh at 1 and sec at pi/2 have no value (F9 said
  infinity, and sec at pi/2 was 1.6 × 10^16).
- Fixed: L in graph mode said 0.000097 for sqrt(x) ln x as x goes to 0 from the right; it is 0.
- Fixed: (cos x − 1 + x²/2)/x⁴ at 0 is 1/24, and (e^x − e^−x − 2x)/x³ is 1/3. They were said to
  swing with no limit. Limits are right to the six digits they are said with ((1 − cos x)/x² was
  0.499999997).
- The graph sound marks holes, jumps and asymptotes with these same limits: (x³ − 1)/(x − 1) has
  its hole at exactly (1, 3), and coth x has its asymptote at 0.
- F9 reads lim_(x->pi/2^-), with the side written after the point.

### Graphs read from a PDF picture

- An estimated equation is read by the notebook's own reader, with the same heights as before.
  A number like 5e-05 in an estimate is written out in full.
- An estimate that is not a function of x (a vertical line or a circle) is left out; before, it
  stopped the whole graph from opening.

### Limits written without brackets, braces typed as in LaTeX, and limits worked out truly

- Fixed: `lim x -> inf 1/x^2` was written \lim_{} x \to \frac{\infty \cdot 1}{x^{2}} (the limit
  took only the x, and infinity was multiplied in). A limit can now be written without brackets
  in every way: `lim x -> inf 1/x^2`, `limx -> inf 1/x^2`, `lim_x -> 2 x^2`, `lim_{x->inf} 1/x^2`,
  `lim x -> 0^+ 1/x`, `lim x -> pi/2 sin x`, `lim x -> 2pi cos x`, pasted `lim x → ∞ 1/x²`, and in
  LaTeX `\lim x \to \infty \frac{1}{x^{2}}`. Each is written with x -> a under the lim.
- Fixed: braces typed as in LaTeX in the plain-text box were drawn as braces: x^{2} was
  x^{\{2\}}, and `y = sqrt{x+1}` could not be read at all (the {x+1} was taken for a condition
  like {x > 0}).
- √ and ∛ pasted in read as square and cube roots.
- F9, limits: four limits were worked out as a wrong number, which could pass a wrong line.
  1/ln x as x grows was 0.054 (it is 0), ln(ln x) was 3.2 (it grows without end), sqrt(x) ln x
  near 0 was 0.0075 (it is 0), and x ln x near 0 was 0.00001. Limits that grow slowly (ln x,
  sqrt x), that creep to 0 or swing to it (1/ln x, x sin(1/x)), or that are too big for the
  computer to hold (e^(1/x) from the right of 0) are now worked out. ln(ln x) grows too slowly
  to see in numbers, so the check says it cannot tell rather than giving a number.
- Tests: every way of writing in test_equation_ways.mjs is now also typed into the plain-text
  box and its LaTeX checked for braces, empty subscripts and names drawn letter by letter (it
  checked values only, so x^{\{2\}} passed). 27 known mistakes were put back into the code one at
  a time to see that the tests catch each one. Four were not caught at first: a power rule
  without the chain rule, small slips such as 2 pi = 6.28 being passed, and two ways of writing a
  limit. Tests were added for them.

### Derivatives, tangent lines and graphs read from a PDF, checked by hand

Every slope, tangent line, first and second derivative of 42 functions was compared with the
derivative worked out by hand, at 3644 places (corners, cusps, holes, asymptotes, functions in
pieces among them). Thirteen graphs were drawn from known functions in the style of the course
notes, typeset to a PDF and imported, and every word and number compared with the functions.

- Derivative curves of an equation are now worked out by the rules of calculus, not measured
  from the curve. Measuring went wrong in places:
  - the second derivative of x^2 + 1000 (which is 2) had a hundred false asymptotes, peaks
    and valleys;
  - x^2 up to 1, then 2x - 1, had no derivative at 1 (it is 2) and no second derivative
    beside it;
  - the derivative of x^(5/3) at 0 was "0.0022" (it is 0), and that of x^(4/3) had no value
    at 0;
  - the derivative of (x^2 - 4)/(x - 2) had a false asymptote at 2.
  S on an equation uses the same rules.
- Fixed: |sin x| had a derivative of 1 at pi (a corner, where it has none).
- Fixed: the derivative of |x| said "jump at x = 0" twice.
- Tangent lines: a tangent line that meets the curve again now says where. The tangent to
  x^3 - 3x at 1 crosses it at -2. The tangent to x^4 - 2x^2 at 1 touches it at -1 too (it was
  said to cross there). A tangent along a straight piece no longer hides the real crossings
  elsewhere. Crossings of two curves are said as "touches" when they meet without changing sides.
- Graphs read from a PDF (read again the next time each PDF is imported):
  - the points along a curve keep four decimals, not two. Slopes beside an asymptote were
    far off: the slope of 1/(x - 2) at 2.3 was about 11.6 for 11.1, and its end was said to
    be "minus 16" for minus 25;
  - a square root starting at a point is now said to go straight up there (it was "slope 1.9");
  - peaks and valleys are at their true top and bottom: 2 sin x peaks "near 1.57", not 1.59;
  - an arrow's end is where the curve ends: sqrt(x + 4) drawn to 5.5 was said to end at
    (5.39, 3.12);
  - straight lines say where they cross the x-axis and the y-axis, curves say where they cross
    the y-axis, and a valley on the x-axis "touches" it rather than crossing;
  - a curve that reaches the edge of the graph with no arrow says so;
  - tan x drawn up to the top of the grid, with its dashed asymptote a little further on, says
    it runs off towards that asymptote;
  - a gentle slope on such a curve is not "flat": e^x at minus 3 has slope about 0.05.
- New tests: hand-worked derivatives, tangents and four-decimal curves in test_curve_points.mjs,
  and the thirteen drawn graphs in Recognition Lab's test_vector_graph.py
  (test-fixtures/drawn-graphs.tex and .pdf).

### Equations, however they are written

Every way of writing an equation (plain text, LaTeX, LaTeX with plain text in it, MathML put in
from another program) was checked against values worked out by hand: 98 pieces of maths in 311
ways of writing. Each is read as typed, read back from its drawing, and where it can be, graphed.

- New: a line can start with =. It carries on from the line above, as in factoring, and can be
  made an equation like any other line (Ctrl+Shift+E, or in the equation box). F9 on it says
  "Equal to the line above" or "Not equal to the line above" with the numbers. It is compared
  with what the line above ends with, whatever that line is. Ctrl+G graphs it as y = that.
- New: LaTeX and plain text can be mixed on one line. \frac{1}{2}x^2 + sqrt(x) used to draw sqrt
  as the four letters s, q, r, t; it is now a square root. The same for pi, sin x, <= and the
  rest, in a typed line, in the equation box's LaTeX mode and in the convert box.
- Fixed: 3*-2 was written 3-2 (so minus 6 became 1). It is 3 times minus 2.
- Fixed: sin x * x was written sin xx, the sine of x times x. It keeps its times sign.
- Fixed: 1.5.2 was read as 1.5 times .2, and 2.x as nothing with a value. Both now say what is
  wrong. A full stop that ends a sentence (x = 2.) is left out; the three dots (1, 2, ..., n) stay.
- Fixed, in LaTeX from a PDF, a .tex file or typed:
  - \sin\frac{x}{2} and \ln\frac{x}{2} were read as (sin x)/2 and (ln x)/2. They are the sine
    and the logarithm of the fraction.
  - \frac{x}{2}^{2} was read as x over 2 squared (x/4). It is the fraction squared.
  - 2\frac{1}{x} was read as 21/x, x^{2}3 as x to the 23, \log_{2}8 could not be read at all.
  - 2\frac{1}{2} was read as 21/2. It is the mixed number two and a half, as MathCAT says it.
  - \frac{d}{dx}\frac{1}{x} could not be checked; \frac{d}{dx}x^{2} was said "d/dxx^2".
  - \rightarrow came out as the word "arrow" (so a limit written with it had no value), and
    \bigl( \bigr) as the letters l and r.
  - (x^{2})^{\prime} is the derivative; 1\,000 is one thousand; \textstyle, \cfrac and
    backslash-space are read.
- Fixed: 3 + -2 put in from MathML came back as 3 plus-or-minus 2.
- Fixed: a name the notebook has no value for (\hat{x}, \vec{v}, \bar{x}) was worked out letter
  by letter (h times a times t times x) by the F9 check and the graphs. It is still read aloud
  by name, and the check and the graphs now say they cannot work it out.
- The F9 check now works out: an integral written without brackets (int_0^1 2x + 1 dx reaches
  to its dx), int dx/x, a limit of an integral with a sign (int_-1^1), a sum or a product with
  an end (sum_(n=1)^4 n^2 is 30), max and min, and Word's own d in an integral's dx.
- Fixed: with the cursor at the very start of an equation being stepped through, a typed letter
  went into the sentence before the equation, not into it.
- New test of all of this (test_equation_ways.mjs).

### Graphs read from a PDF

- Fixed: text next to a graph went missing. The box around a graph is wider than the graph, and
  every word inside it was taken as the graph's. "Consider the graph of the function f below."
  came out as "Consider the", and a line under a graph ("9. Use the graph of f shown below to
  determine:") was gone. A sentence is now always the page's text, and the graph stands after the
  line above it, not before it.
- Fixed: on a graph whose numbers are printed beside the grid lines (below and to the left of
  them), every height was read about a third of a unit too low. Numbers now go to the grid line
  or tick they are printed at.
- Fixed: a word from a sentence ("e", "f") was taken as the curve's name; "y = f(x)" printed at
  the end of the curve now names it. The range is the grid's ("x from −5 to 5"), not the axis
  arrows' ("−5.46 to 5.46").
- A long description starts short in the document: its first sentence. F4 on the graph's line
  shows or hides the rest, and Shift+F4 does it for every graph (Math > Graph). Word, braille
  and web page exports always have the whole description.
- Numbers in these descriptions are rounded: to the nearest half when the number is within 0.06
  of it, otherwise to one decimal. A valley read as (1.01, 0.03) is at (1, 0); a crossing at
  2.71 is 2.7. F2 goes between rounded numbers and the numbers as read (two decimals); the
  choice is kept, and is also in Help > Settings > Writing.
- A PDF imported before is read again the next time it is imported, so its graphs and the text
  around them are corrected.

### Questions from a PDF are read-only

- A question (its Problem or Example line, its text and its graphs) cannot be changed by
  typing, Delete, Backspace, cut or paste; its answer box after it can. Up and Down still stop
  at each paragraph of a question, so it can be read. A line the checker flagged stays
  editable, since the fix may be in it.
- A key pressed inside a question says "That is a question. Write your answer in the answer box
  after it." Saved and opened again, questions are still read-only.

### Graphs read from a PDF: slopes, tangents, limits, holes, jumps and asymptotes

Checked against five graphs from the course pages and against curves with known formulas,
kept the way the reader keeps them (points rounded to 0.01).

- Fixed: the slope of a curve read from a PDF was taken from the three nearest points, whose
  rounding decided it. On the cubic of Section 2.8 (page 6) the slope at x = 2 was "4" (it is
  2.5), a smooth curve was "a corner" at some of its points, and a tangent line "crossed" the
  curve several times beside the point it touches. The slope now comes from a curve fitted through
  the points around x. On that cubic the largest error is now 0.06 (it was 3.4). These slopes and
  tangent lines are said as "about", to one decimal.
- A sharp corner in such a curve (|x| printed as a curve) is found where the two sides' own
  curves meet, and nothing is fitted across it. A corner whose two slopes differ by less than
  about 0.5 cannot be told from rounding in a PDF's points and is read as a smooth place.
- Fixed: pieces of one function drawn apart (at a jump or an asymptote) were three separate
  "blue curve" functions. Curves of one colour that follow each other along x are one function.
- Fixed: a dot drawn at the end of a piece was not that end (the line stops at the dot's edge),
  so at x = 2 on the graph of Section 2.5 "there is no point" and "no curve on either side". Now:
  from the left minus 2, from the right 1, the value is minus 2, a jump.
- Fixed: an open dot on a curve was not a hole. Now the limit is the curve's height there and
  "there is no point"; with a solid dot away from the curve at that x, "the limit and the value
  differ". Dots are said as what they are: "hole at", "jump at x =", "the value at x = 1 is 1,
  away from the curve".
- Fixed: a curve that runs off the top or bottom of the graph beside a dashed vertical line has
  a vertical asymptote there: L says "goes down to minus infinity" or "goes up to infinity" (it
  said "no curve on either side"), and the asymptote is a point of interest.
- Fixed: an arrow's tip just short of the edge of the graph (x = 4.99 where the grid ends at 5)
  left "no point" at x = 5. The end of the curve is at the edge. Where a curve stops with an
  arrow, or runs off the graph, L says so.
- Fixed: two points with the same x at the end of a curve (an arrow's tip) made "the curve jumps
  here" at its start.
- Fixed: under a graph that was read, the page could say "A drawing is here that the notebook
  could not read": the graph's own curve, where it runs on past its box. (A PDF imported before
  is read again.)

### Numbers you hear in graph mode

- Fixed: every number was rounded to the nearest half, also for a function with a formula.
  y = x² at x = 0.5 was "y 0.5" (it is 0.25), a zero at 1.73 was "1.5", the limit of
  (2^x − 1)/x at 0 was "0.5" (it is 0.69), and a tangent line's heights were all "1". A function
  with a formula, or one drawn here, is now said to two decimals whatever the setting. The
  setting (Help > Settings > Graph sound > Numbers you hear) is for curves read from a page: the
  nearest half only when the number is within 0.06 of it, otherwise one decimal.
- A slope has two decimals: 0.25 is not "0.3", and a slope of 0.0002 is not "flat". A slope of
  6000 is said as 6000, not as "nearly vertical".

### Limits

- Fixed: "could not estimate" where the limit exists but the formula loses digits close to the
  point: (1 − cos x)/x² at 0 is 0.5, x·sin(1/x) at 0 is 0.
- Fixed: e^(1/x) at 0 from the right was "no limit, the curve is only on the left": the heights
  there are too large for the computer to hold. It goes up to infinity.
- A curve that keeps swinging (sin(1/x) at 0) is said to have no limit, with the heights it
  swings between, instead of "could not estimate".
- A side with no curve is "no curve", not "no limit".

### Tangent lines and slopes

- Fixed: a tangent line was moved a millionth off its point by rounding, so the curve "crossed"
  it twice right beside the point where it touches (y = sin x at x = 1.5).
- Tab keeps the cursor at the same x: from a curve to its tangent at x = 0.25 it stays on the
  point where they touch (it moved to 0.5, the nearest step).
- A secant line through two points on different sides of a jump or an asymptote says that the
  curve is broken between them.
- Fixed: at many x that are not round (y = x² at x = −4.9963), the slope "could not be measured
  reliably" and no tangent was added. The slope is now measured with steps that do not lose it
  in rounding.
- Fixed: a corner whose two slopes are close (slope 2, then 2.1) got a tangent line. For an
  equation or a drawing, sides that differ even a little are a corner.
- A cusp (y = x^(2/3) at 0) is said as a cusp, not as a corner.
- A tangent line is said to two decimals, like the height: "y = 1.67", not "y = 1.66667".

### Derivative curves

- Fixed: the derivative of x|x| at 0 was "0.00001" (it is 0), and its second derivative there was
  "0, continuous": it does not exist (minus 2 from the left, 2 from the right), which is now a
  jump with two open dots.
- Fixed: the derivative of x^(1/3) at 0 was "a hole, the curve approaches 155". It goes up to
  infinity.
- A valley or peak of a derivative curve "at 0.00004" is at 0. A derivative curve is named in
  full where another curve crosses it ("crosses derivative of y = x^2", not "derivative of y").
- e^(-x^2) has its horizontal asymptote y = 0 in the description (it was left out).

## 0.8.0 (beta)

### Graph sound: one scale for each graph, one voice at a time

The fitted notes, the slide and the slope sound were heard and found clear on 11 November 2026.
Help > Settings > Graph sound > "How heights become notes" switches back to the original sounds,
which are unchanged.

- Fitted to the graph (the new default): the lowest note is the bottom of the graph and the
  highest note its top, three octaves apart, however big or small the numbers are. The same rise
  is the same musical step everywhere. Before, notes counted in units and started again every 10:
  y = x squared from 100 to 196 went down, up, up, down, and y = 10x played one note from 80 to
  140. Heights under a quarter were all one note; now nothing is rounded.
- No leap at zero. Below zero the same scale carries on with a rounder sound; at zero a quiet
  octave rings with the note.
- Each step slides into its note along the curve from the last step, then rests: a steep step is
  a long slide, a flat one has none, and nothing slides across a jump or an asymptote. "Sliding
  notes" in Settings turns the slide off.
- The bass line while playing is the note itself an octave lower, so there is one line to follow,
  not two.
- Each function on a graph has its own sound: the first has the sound chosen in Settings, the
  next ones marimba, cello, harp and so on. Tab plays the new function's note where you are,
  so higher or lower than the one you left is heard at once.
- Where two functions cross is a point of interest, with two soft taps; period and comma stop
  there ("crosses g(x) at 2, 4"). Not on a student copy that hides anything.
- Minus: the difference between the selected function and the one Tab came from, as a curve of
  its own to trace: above zero where the first is higher, zero where they cross. Minus again
  takes it away. It is not saved in the document.
- N: the lowest note, zero and the highest note of the graph, with what they stand for.
- The slope sound (D) has its own scale: flat is the middle note and it never starts again, so
  slope 12 is not mistaken for slope 2. The height's note steps back before it, so the two are
  heard one after the other.
- The sound guide has the new sounds (the scale, a sound for each function, crossing another
  function); "Past 10" is only there with the original design.
- Leaving graph mode no longer reads a position that was still waiting to be said.
- Ten sounds to choose from instead of twenty-one, in five pairs: soft (Gentle, Flute), warm
  (Marimba, Harp), clear (Piano, Beep), rich (Cello, Vibraphone), sharp (Guitar, Chiptune). A
  sound chosen earlier that is no longer listed keeps playing until another is chosen.
- Lessons in Help > Sound guide and lessons: eleven short ones, one idea each, from "higher and
  lower" to "which graph is it". Each plays a sound, asks a question, says what the answer was,
  and can be done again with a new sound. The guide opens on them and carries on where you left.
- The guide's quiz has crossings; above and below zero moved to the lessons, where the same note
  is heard in both colours.

Found and fixed by going through the slope and derivative sounds note by note:

- A derivative curve that goes outside the graph was squeezed into the last few notes. Under
  y = x squared (shown from minus 2.5 to 30) the derivative from minus 10 to minus 2.5 moved a
  fifth of a semitone a step; under y = sin(5x) the derivative was two notes. Such a curve, and a
  difference made with minus, now has a scale of its own that reaches as far as the curve. Tab says
  "on its own scale" and N plays its lowest and highest note. The functions the graph was made for
  keep the graph's scale, so adding a derivative does not change how they sound.
- The slope of a derivative curve (S, and the slope sound) is now measured in a way that suits its
  rounded values. Before, the slope of a second derivative was always "could not estimate".
- The first step after opening a graph or changing function slides too, from where the cursor is.
- Home, End and other long ways: the slide has more points, so it still follows a wavy curve, and a
  point of interest flown over (the origin's chime) is no longer sounded as if it were there.
- The slope note is never in the same sound as the function's own note, and a vertical tangent has
  a slope note (the top or bottom of the slope scale).
- The slide of a difference curve stops at a jump in either of its two functions.
- Opening a graph no longer says the lowest and highest note; N does, when asked.
- New test `test_graph_sound.mjs`: the real graph mode with a stand-in for the audio that writes
  down every pitch, checked against values worked out by hand.

### Graph mode: a menu, and tangent and secant lines

- Ctrl+Enter in graph mode (or M, or the Applications key) opens a menu of everything graph mode
  can do where you are: play, points of interest, slope, limits, describe, next function, the
  difference, the scale, the slope sound, the step, the ends of the curve, drawing. Each item says
  its own key, and a letter shown in brackets also works inside the menu. While drawing, M stays the
  drawing menu, and each of the two menus leads to the other. Opening a graph says "Control Enter
  opens a menu of everything". It is also in Math > Graph.
- T adds the tangent line to the curve where you are and says its equation ("y = 2x minus 1").
  At a corner, a jump, the end of a curve or a vertical tangent it says why there is none.
- The menu adds a secant line through the point you are on and another x that it asks for, and says
  its equation and its slope, the average rate of change between the two points.
- One press adds one line. A key held down a moment used to add two identical tangent lines; now
  T, minus, D, Backspace, Delete and apostrophe act once however long they are held, and asking for
  a line that is already there says "Already on the graph" and adds nothing.
- A line is drawn in the picture and is a function like the others (Tab, its own sound). Where a
  tangent touches its curve and where a secant crosses it are points of interest. The lines follow
  their function if it is changed, are removed from the menu, and are not saved in the document.

### Backspace and Delete take back the last thing

- While drawing, Backspace takes back the last thing you did, whatever it was (a point, a move, a
  smooth corner, an equation, a derivative, the graph's size), and pressing it again takes back the
  one before. Delete does the same away from a point; on a point it still deletes that point.
- Undo now says what it did: "Undone: the point at 1, 2.5 is at 1, 2 again", "the point at 1, 2 is
  taken away", "the equation is taken away". Before, it said only "Undone". Ctrl+Z and Ctrl+Y work
  as before.
- In graph mode without drawing, Backspace or Delete takes back the last tangent line, secant line
  or difference curve you added, newest first.
- Both menus have "Take back the last thing you did".

### Help > User guide in its own window

- Help > User guide opens the guide in a window of its own, with real headings (H in browse mode
  goes from part to part), a Contents list and working links. Before, it opened the README file
  as plain Markdown text. Escape closes it; Alt+Tab goes back to the document.

### Drawing on a graph

- Ctrl+Shift+G makes an empty graph (minus 5 to 5) and opens it ready to draw on; Ctrl+D in graph
  mode turns drawing on and off on any graph. Enter puts a point, joined to the last one; M opens
  a menu of everything else, each command with its own key named. Points can be moved (G), made
  smooth or sharp (R), open or solid (O), deleted; pieces started (N) and connected; the graph
  made bigger at its edge.
- A drawing is an exact function of x: lines and smooth curves through the points, with every
  peak and valley at a point you put down. What would stop it being a function (two heights at
  one x, a vertical line) is refused with the reason.
- Several functions on one graph: the menu starts g(x) next to f(x), then h(x) and so on. Each is
  a function on its own, so they may cross. Tab goes between the functions, and Enter draws on
  the drawn function you last went to.
- Derivatives as curves: apostrophe (or the menu) adds the derivative of the selected function,
  pressed again the second derivative, a third time takes them away. It follows the function as
  you move a point or change a number. For a drawing it is exact (a line gives a flat stretch at
  its slope, a sharp corner gives a jump with two open dots, because there is no slope there).
  For an equation it is measured from the curve, as the slope at a point is; it has no formula.
- Equations in the graph: E adds one (checked first), T changes its numbers with the arrow keys.
- The menu can make the graph's line in the document give the equations instead of the
  description: each drawn part's formula with where it applies.
- Insert > Graph from equations no longer has Ctrl+Shift+G; it is in the Insert menu and on the
  toolbar (Graph). The new toolbar button is Draw.
- Tested: `test_draw.mjs` (the maths, by hand-worked values) and `test_draw_ui.mjs` (the real
  desktop app with real key presses). Two functions, or a function and its derivative, are heard
  one at a time, each in its own sound.
- Limits: hide options of a student copy do not apply to a drawing; no asymptotes in a drawing;
  equation numbers are changed as digits only, not letters; an equation's derivative is not
  given as a formula, and its numbers are right to about four decimals.

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
