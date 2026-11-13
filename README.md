# Math Notebook

A Windows notebook for doing maths with a screen reader. It works like Word and is made for
NVDA and MathCAT. You can:

- write notes and homework, typing equations as plain text, such as `(x^2 - 4)/(x - 2)`;
- check each step of your work against the line above (it never gives the answer);
- explore graphs by sound, and draw your own graphs with the keyboard;
- open course PDFs and LaTeX files as real, readable maths;
- hand in your work as Word, PDF or braille.

Everything runs on your own computer, without AI unless you add it. It is a beta made by one
student, built first for one calculus course, so read [What has been tested](#what-has-been-tested)
before relying on it. The [changelog](notebook/CHANGELOG.md) lists what is new in 0.8.0.

## Download

Get it from the [Releases page](https://github.com/ahemyaz06/math-notebook/releases), for 64-bit
Windows 10 or 11. There are two versions; both read course PDFs made with LaTeX without any AI.

- **Math-Notebook-Setup.exe** installs it, with a Start menu shortcut and an uninstaller. It
  installs for you only (no administrator needed) unless you choose all users. A newer setup
  installs over the old one and keeps your settings.
- **Math-Notebook-portable.zip** needs no install. Extract it anywhere, even a USB stick, and run
  `Math Notebook.exe`. Your settings stay in a `data` folder beside it.

The app is not code-signed, so Windows may warn you:

- "Windows protected your PC": choose **More info**, then **Run anyway**.
- "The publisher could not be verified": choose **Run**.

`SHA256SUMS.txt` in each release lets you check that the files are the ones published.

Updates are never installed by themselves. Help > Check for updates tells you when a newer version
is out and opens its download page; Help > Settings > Writing can check at every start.

## Your first ten minutes

1. Open Math Notebook. The cursor is in an empty document, and NVDA stays in focus mode, as in Word.
2. Type `y = x^2 - 4` and press **Ctrl+Shift+E**. It becomes a real equation.
3. Press **Ctrl+G** on it. Graph mode opens: **Space** plays the curve, **J** and **K** step along
   it, **I** describes it, **Escape** goes back.
4. Press **Shift+Enter** to copy the equation down, change it, and press **F9**: you hear whether
   the new line is still the same maths.
5. Press **Ctrl+S** to save, or **Ctrl+Shift+W** for a Word file to hand in.
6. Open **Help > Sound guide and lessons** to learn the graph sounds, one idea at a time.

**F1** lists every key. Every command is also in the menus (press **Alt**). The full guide is in
the app under Help > User guide, and here: [notebook/README.md](notebook/README.md).

## Optional extras

None of these are needed. Each is installed separately.

### The AI add-on (not in the portable version)

It describes pictures and reads pages whose maths is not stored as text (scans, and textbooks that
draw their formulas). It can misread details, so what it writes is checked against the PDF's own
text where possible. It needs a graphics card with about 8 GB of memory, and the model is loaded
only while it is needed.

When running from source (below), the first command gets the runner and the Qwen3-VL-8B model. The
second is optional and adds Qwen3.5-9B (about 6.6 GB):

```
.\recognition-lab\.venv\Scripts\python.exe recognition-lab\download_vlm.py
.\recognition-lab\.venv\Scripts\python.exe recognition-lab\download_qwen35_9b.py
```

Then choose the model in Help > Settings > AI add-on.

### Checking PDF equations with Tectonic

For PDF pages read without AI, the notebook can use [Tectonic](https://tectonic-typesetting.github.io/)
to typeset each equation again and compare it with the page, which catches and corrects some
misreadings. Install Tectonic
([installation](https://tectonic-typesetting.github.io/book/latest/installation/), or the Windows
zip from its [releases page](https://github.com/tectonic-typesetting/tectonic/releases)), then put
`tectonic.exe` on your PATH or set the environment variable `TECTONIC` to its full path. The switch
is Help > Settings > Reading PDFs > Check each equation.
[More in the guide](notebook/README.md#checking-pdf-equations-with-tectonic-optional).

### Braille

File > Export > Braille (BRF) makes a braille ready file with
[BrailleBlaster](https://www.brailleblaster.org/) (free, from the American Printing House). Every
equation goes to it as MathML. For Nemeth maths, choose UEB with Nemeth in BrailleBlaster's
Translation settings. The approach follows Owen Petronick's Braille Check.

## What has been tested

- **Automatic tests** drive the real app with key presses and check what it does and says. They
  also check the maths conversions, graphs, Word equations, PDF reading, and the portable and
  installed copies. They cannot hear a screen reader.
- **Used every day with NVDA and MathCAT** by the author, a blind student, for real coursework.
- **Only one computer**: Windows 11 with NVDA, MathCAT and Access8Math, in US English. JAWS,
  Narrator, other languages, macOS and Linux have not been tried.
- **Course material**: the PDF reader was built and checked on one calculus course's LaTeX PDFs and a
  few textbooks. PDFs made other ways (Word, scans) are less sure, and an unusual layout can be read
  wrongly without a warning.
- **Tectonic check**: tried with Tectonic 0.17.0 on 868 equations from one course (863 matched,
  1 corrected, 4 misreadings caught but not corrected). It does not help with PDFs made by Word or
  scanned.
- **Braille**: tried with BrailleBlaster 3.2.5. It has been read back by a program, not yet by a
  braille reader.

The full list is in the guide, under
[What does not work yet, and what is not tested](notebook/README.md#what-does-not-work-yet-and-what-is-not-tested).

## Privacy

- Nothing about you or your documents leaves your computer.
- The app goes online only to check for a newer version, when you choose Help > Check for updates
  or at each start if you turned that on. It asks GitHub's public "latest release" address once.
- If you install Tectonic, Tectonic itself downloads the TeX packages it needs the first time it
  runs. Your equations are typeset on your computer.
- The app listens only on this computer (127.0.0.1) and refuses requests from websites. Imported
  documents and pasted text are filtered before they reach the editor.
- Spelling uses Windows' own spell checker; Add to dictionary adds the word to your Windows
  dictionary, which Word and Edge use too.
- Settings and imported PDFs are kept in `%LOCALAPPDATA%\MathNotebook` (installed, or running from
  source), or in the `data` folder beside the portable copy's exe.

## What is in this repository

- [`notebook/`](notebook/README.md): **Math Notebook**, the app itself.
- [`sound-lab/`](sound-lab/README.md): **Sound Lab**, the graph sounds on their own, for trying and
  tuning them. The notebook uses its sound engine.
- [`recognition-lab/`](recognition-lab/README.txt): **Recognition Lab**, which reads graphs from
  pictures and PDF pages. The notebook uses its PDF reading.

The notebook needs the other two folders, so keep them together.

## Running from source (Windows)

1. Install [Node.js](https://nodejs.org/) (22.12 or newer) and [Python 3.12](https://www.python.org/).
2. Open a terminal in this folder and run:

   ```
   npm ci
   py -3.12 -m venv recognition-lab\.venv
   .\recognition-lab\.venv\Scripts\python.exe -m pip install -r recognition-lab\requirements.txt
   ```

3. Start the notebook with `notebook\Start Math Notebook.cmd`. Sound Lab is
   `sound-lab\Start Sound Lab.cmd` (needs only Node.js), and Recognition Lab is
   `recognition-lab\Start Recognition Lab.cmd`.

To build both Windows packages, install [Inno Setup 7](https://jrsoftware.org/isinfo.php) and run
`.\recognition-lab\.venv\Scripts\python.exe notebook\build_release.py`. The installer, portable zip
and checksums go into `dist`.

Your own file locations (model files, a PDF folder) can go in `local-paths.json` in this folder;
git leaves that file out.

## Licence

MIT, see [LICENSE](LICENSE). Third-party parts are listed in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
