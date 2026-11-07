Recognition Lab 0.7.0

Using the app

Run Start Recognition Lab.cmd. Choose PDF or Image, choose a file, and Read.
For PDFs, the page count and selected range are checked before models load.
Long documents run automatically in batches; choosing a PDF larger than the
current size limit gives an error before inspection begins.

Settings contains PDF upload limit (default 20 MB, adjustable 1-100 MB) and
pages per batch (default 100, adjustable 1-100). Settings persist across app
restarts. They cannot change while a PDF is processing. Image uploads retain
their separate 10 MB limit. Options contains the optional PDF page range,
inspection method, and local AI checkbox. Use PDF page numbers, which may
differ from the printed page numbers.

The graph list spans the whole selected document and includes PDF page numbers.
Previous and Next cross page boundaries. The first useful completed result
opens automatically once, unless you have already made a selection. Automatic
opening does not move keyboard focus. Explicit Read/Previous/Next does.
Whole-page review means no separate graph was located, not a confirmed graph.

Cancel saves completed pages. Resume continues at the first unfinished page;
an interrupted page is reread so that partial graph IDs are not duplicated.
Recent PDFs lets you reopen saved imports after restarting the app. Save
descriptions downloads a readable HTML document with page/graph headings.
Source text, technical JSON, uncertainty and exploration help stay in closed
details. Actual NVDA speech remains untested.

Local storage

PDF sources and results now remain in %LOCALAPPDATA%\RecognitionLab\documents.
Preferences are in %LOCALAPPDATA%\RecognitionLab\settings.json. They survive
normal shutdown; there is no automatic three-import eviction. Existing 0.5
temporary imports are not migrated. You can choose a different library with
the RECOGNITION_LAB_DATA_DIR environment variable before starting the app.
Saved imports are ordinary local files and use disk space; this version has no
in-app library deletion control. Keep your original source PDFs separately.

One app instance owns a saved library at a time. Launching the app again reuses
its running local window. Worker locks prevent concurrent resume of an import.
Uploaded PDF content and extracted text are data, never application commands.

Processing limits

Up to 2,000 pages per document. A selected range can span the whole document.
Each batch contains at most the configured page count and 150 candidate
regions. Dense pages can cause additional batches, so preflight batch counts
are planned counts. At most 12 candidates are returned per page. A batch has
a 15-minute processing limit; completed pages remain available for resume.
Only one PDF/image/AI processing operation runs at a time.

Quality uses the existing local FP32 Heron-101 layout model plus native PDF
geometry and raster inspection. Basic skips the layout model. Models stay
loaded between page batches while parser handles reopen to release caches.
The existing graph reader and optional local Qwen model are reused. PDF AI
defaults on when installed and can be disabled in Options. Uploads do not
download models. No new model weights were imported.

Accuracy and remaining limitations

Finishing a document does not verify its mathematics. Candidates may include
empty grids, diagrams, incomplete panels, or whole-page review fallbacks.
Numerical coordinates/equations are estimates. Complex discontinuities,
open/filled markers, small labels and raster figures can still be misread.
Source text can have broken PDF font encodings. Nearby text is not a verified
question association. AI prose remains unverified, and can omit or invent
qualitative details even when its JSON response is valid.

The optional AI supports several local Qwen models. Recognition Lab screens
possible graphs before asking the model to describe them. Quality mode can
also use the layout model to help rule out tables.

Validation

The changelog records which tests were run for each version. An earlier timing
reported for Qwen3.5-9B may have used the older model. Earlier PDF benchmark
reports also undercounted successful graph readings and paths. These results
do not establish accuracy across course PDFs. Actual NVDA speech is untested.

Setup and image reading

There are no new dependencies or model downloads over 0.5.0. Image reading
remains available when optional PDF/layout dependencies are missing. Install
PDF support using requirements.txt; Quality additionally requires the layout
model and requirements-layout.txt. Models load from local files only.

Fresh setup from this folder with Python 3.12:
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python.exe -m pip install -r requirements-layout.txt
.venv\Scripts\python.exe download_layout.py

Image numerical exploration is available only when both scales calibrate.
J/Left and K/Right move along the selected curve; brackets change fragments;
Home/End go to fragment ends; F changes step; I describes; P cycles points;
N cycles notes; Tab leaves the explorer. Closed Explorer keys repeats this help.
With NVDA, focus mode may be needed. App contains Stop recognizer. Closing a
browser tab alone does not stop the process.

CHANGELOG.md records release history. PDF-DESIGN.md describes the pipeline.
RESEARCH-REPORT.txt is historical 0.3 research. Every future version upgrade
must update this README and CHANGELOG.md with actual validation and limitations.
