MATH NOTEBOOK 0.8.0 BETA (portable)

A document editor for maths that works like Word and reads well with NVDA and MathCAT.
Nothing to install, and no AI: everything is done by exact rules on this computer.

This is a beta. It is updated often and some parts are not finished yet. The full user guide
(Help > User guide) says which.


START HERE
1. Extract all the files from the zip into a folder you can write to, then open
   "Math Notebook.exe". The cursor is in an empty document.
2. Type y = x^2 - 4 and press Ctrl+Shift+E. It becomes a real equation.
3. Press Ctrl+G on it to hear its graph. Space plays it, J and K step along it, I describes
   it, Escape goes back to the document.
4. Press Shift+Enter to copy the equation down, change it, and press F9 to hear whether the
   new line is still the same maths.
5. Press Ctrl+S to save, or Ctrl+Shift+W to make a Word file to hand in.
6. Help > Sound guide and lessons teaches the graph sounds, one idea at a time.

F1 lists every key. Press Alt for the menus: File, Edit, Insert, Format, Math, Tools, Help.
Settings is in Help (Ctrl+comma). F6 goes between the small toolbar and the document.


WHERE YOUR FILES ARE
The folder can live anywhere (the Desktop, a USB stick). Keep all of it together. Your
settings and the PDFs you import are kept in the "data" folder next to Math Notebook.exe,
so copying the folder copies them too.

To update: Help > Check for updates says whether a newer version is out. Close Math
Notebook, extract the new zip into a new folder, and copy your old "data" folder into it.
Nothing is ever downloaded or installed by itself.


WRITING (THE KEYS ARE WORD'S)
Ctrl+B, Ctrl+I, Ctrl+U      bold, italic, underline
Ctrl+Alt+1, 2, 3, 0         heading levels 1 to 3, normal text
Ctrl+Shift+L, Ctrl+Shift+7  bulleted list, numbered list (Tab and Shift+Tab: in and out a level)
Insert > Table              a table; Tab moves between cells, Tab in the last cell adds a row
Ctrl+Enter                  page break
Ctrl+F, F3, Ctrl+H          find, find again, replace
Ctrl+PageDown, Ctrl+PageUp  next and previous heading; Ctrl+Shift+H lists the headings
Ctrl+Z, Ctrl+Y              undo, redo (any change, equations included)
F7, Alt+F7                  check spelling, go to the next misspelled word
Ctrl+S, Ctrl+P              save, print
Ctrl+Shift+W                export as a Word document (equations are real Word equations)
File > Export > PDF         a tagged PDF


MATHS
Ctrl+Shift+E                make the line (or the selection) a real equation
Alt+=                       type a new equation in a box
Right arrow into equation   step through it one symbol at a time, and change it
Ctrl+E                      edit an equation as plain text (Ctrl+L there switches to LaTeX)
Shift+Enter or F11          copy the equation above down, ready to change
F9                          is this line the same maths as the line above? (rules, not AI,
                            and it never gives the answer)
Ctrl+Shift+D                add or change the equation's interval
Ctrl+Shift+R                read the line with its equations spelled out
Ctrl+T, Ctrl+L              turn an equation back into plain text or LaTeX text
Ctrl+Shift+M                convert between plain text, LaTeX and MathML

Comments: anything after # or // beside an equation stays words, never maths
(y = x^2 # the parabola). Intervals are written the way your class writes them:
y = sin x, [0, 2pi] or y = sin x on (0, pi]. The graph is then only on that interval.

When the cursor comes to an equation it is said as plain text, because in focus mode NVDA
reads only its start. NVDA+Space (browse mode) lets MathCAT read it whole.


GRAPHS BY SOUND
Enter on a graph line, or Ctrl+G on an equation, opens graph mode.
J and K          step along the curve
Space            play it; Space again stops
Period, comma    next and previous point of interest (zeros, peaks, holes, crossings)
S, L             the slope here; the limits from the left and the right
I, V             describe the graph; read the point
N                the lowest and highest note of this graph
Tab              next function (each has its own sound)
D                a soft second note for the slope after each step
Ctrl+Enter, or M a menu of everything you can do here, each item with its key
T                the tangent line where you are (a secant line is in the menu)
Backspace        take back the last thing you did (also while drawing)
F1 or ?          every graph key
Escape           back to the document

Higher on the graph is a higher note; the lowest note is always the bottom of the graph and
the highest its top. Help > Settings > Graph sound chooses from ten sounds.


DRAWING A GRAPH
Ctrl+Shift+G makes an empty graph and opens it ready to draw on (Ctrl+D turns drawing on and
off on any graph). Move with the arrow keys and press Enter to put a point; each point is
joined to the last. M opens a menu of everything else you can do (more functions, equations,
derivatives as curves, smooth curves, open dots), and each item says its own key.


LATEX FILES AND SHARING
File > Import LaTeX (.tex) reads a teacher's LaTeX source exactly, including pgfplots graphs,
which become graphs you explore by sound. To share, export to Word or PDF: anyone can open
them. An exported PDF carries the notebook inside it, so Math Notebook opens it again exactly.


PDFs
File > Import PDF (Ctrl+Shift+I). Course PDFs made with LaTeX are rebuilt from their own
characters: every equation as real maths, and graphs drawn by LaTeX can be explored by sound.
Without AI, two things cannot be read: pictures (their place is marked), and pages that are
scans or whose maths is drawn as shapes (the page says so). The full Math Notebook with its
AI add-on can read those.


TEACHER MODE
Tools > Teacher > Teacher mode lets a TA or tutor hide lines, words, answers and parts of graphs
(even the formula: students hear the curve and find it), preview the student copy, and save
or export it. Hidden parts are taken out of the student's files, not just hidden.


OPTIONAL TOOLS
Install Tectonic separately to compare PDF equations against the page (it downloads TeX
packages the first time it runs). Install BrailleBlaster separately for File > Export >
Braille (BRF). The user guide explains both.


NEEDS
64-bit Windows 10 or 11. You can export Word files without Microsoft Word.
Windows may warn you because the program is not code-signed: choose More info, then Run anyway.
