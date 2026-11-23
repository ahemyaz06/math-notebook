"""Equations said the way NVDA says them in browse mode: with NVDA's own MathCAT.

NVDA (2025.1 and later) carries MathCAT, the program that turns MathML into speech
("f of x is equal to, 3 sine of x"). Its Python module is built on Python's stable interface,
so this Python can load it straight from NVDA's folder: nothing is copied or downloaded. The
MathCAT add-on's copy is used when NVDA has none of its own. The words follow the maths
settings in NVDA's own nvda.ini (language, speech style, verbosity), so focus mode in the
notebook says an equation in the same words as browse mode.

Without NVDA or MathCAT, `available()` is False and the notebook says equations in their typed
form, as before. Tests get the typed form too (MATH_NOTEBOOK_TEST=1), so they do not depend on
what is installed; MATH_NOTEBOOK_TEST_MATHCAT=1 lets a test use MathCAT on purpose.
"""
import importlib.util
import os
import queue
import sys
import threading
from pathlib import Path

# MathCAT keeps its rules and settings per thread, and the server answers each request on a
# thread of its own, so every MathCAT call runs on this one worker thread.
_jobs = queue.Queue()
_worker = None
_worker_lock = threading.Lock()
_module = None
_tried = False
_cache = {}
_CACHE_LIMIT = 5000


def _candidates():
    """(module file, rules folder) pairs: NVDA's own first, then the MathCAT add-on."""
    out = []
    folders = []
    if sys.platform == 'win32':
        try:
            import winreg
            for root, key in ((winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\NVDA'),
                              (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\NVDA')):
                try:
                    with winreg.OpenKey(root, key) as k:
                        folders.append(Path(winreg.QueryValueEx(k, 'InstallDir')[0]))
                except OSError:
                    pass
        except ImportError:
            pass
    for env in ('ProgramFiles', 'ProgramFiles(x86)'):
        if os.environ.get(env):
            folders.append(Path(os.environ[env]) / 'NVDA')
    for folder in folders:
        out.append((folder / 'libmathcat_py.pyd', folder / 'include' / 'nvda-mathcat' / 'assets' / 'Rules'))
    if os.environ.get('APPDATA'):
        addon = Path(os.environ['APPDATA']) / 'nvda' / 'addons' / 'MathCAT' / 'globalPlugins' / 'MathCAT'
        bits = 'x64' if sys.maxsize > 2 ** 32 else 'x86'
        out.append((addon / f'libmathcat_py_{bits}.pyd', addon / 'Rules'))
    return out


def _nvda_preferences():
    """The [math] [[speech]] settings in the user's nvda.ini, as MathCAT preference names."""
    prefs = {'Language': 'en', 'SpeechStyle': 'SimpleSpeak', 'Verbosity': 'Medium', 'Impairment': 'Blindness'}
    if not os.environ.get('APPDATA'):
        return prefs
    try:
        lines = (Path(os.environ['APPDATA']) / 'nvda' / 'nvda.ini').read_text(encoding='utf-8', errors='replace').splitlines()
    except OSError:
        return prefs
    section = []
    language_styles = {}
    for raw in lines:
        line = raw.strip()
        if line.startswith('['):
            depth = len(line) - len(line.lstrip('['))
            section = section[:depth - 1] + [line.strip('[]')]
            continue
        if '=' not in line or not section or section[0] != 'math':
            continue
        key, value = (part.strip() for part in line.split('=', 1))
        if section[1:] == ['speech']:
            name = {'language': 'Language', 'verbosity': 'Verbosity', 'impairment': 'Impairment'}.get(key)
            if name and value:
                prefs[name] = value
        elif len(section) == 3 and section[1] == 'speech' and key == 'speechStyle' and value:
            language_styles[section[2]] = value
    language = prefs['Language'].split('-')[0]
    if language in language_styles:
        prefs['SpeechStyle'] = language_styles[language]
    if prefs['Language'].lower() in ('auto', 'windows', ''):
        prefs['Language'] = 'en'
    return prefs


def _load():
    global _module, _tried
    if _tried:
        return _module
    _tried = True
    if os.environ.get('MATH_NOTEBOOK_TEST') == '1' and os.environ.get('MATH_NOTEBOOK_TEST_MATHCAT') != '1':
        return None
    for library, rules in _candidates():
        if not library.is_file() or not rules.is_dir():
            continue
        try:
            if hasattr(os, 'add_dll_directory'):
                os.add_dll_directory(str(library.parent))
            spec = importlib.util.spec_from_file_location('libmathcat_py', library)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.SetRulesDir(str(rules))
            module.SetPreference('TTS', 'None')  # words only, no speech-engine markup
            for name, value in _nvda_preferences().items():
                try:
                    module.SetPreference(name, value)
                except Exception:  # a value this MathCAT does not know: keep its default
                    pass
            module.SetMathML('<math><mi>x</mi></math>')
            module.GetSpokenText()
            _module = module
            return module
        except Exception:
            continue
    return None


def _work():
    while True:
        job, args, call = _jobs.get()
        try:
            call['value'] = job(*args)
        except BaseException as exc:  # handed back to the caller
            call['error'] = exc
        call['done'].set()


def _run(job, *args):
    """Runs job on the MathCAT thread and returns what it returns."""
    global _worker
    with _worker_lock:
        if _worker is None:
            _worker = threading.Thread(target=_work, name='MathCAT', daemon=True)
            _worker.start()
    call = {'done': threading.Event()}
    _jobs.put((job, args, call))
    call['done'].wait()
    if 'error' in call:
        raise call['error']
    return call['value']


def available():
    return _run(_load) is not None


def _speak(mathml_list):
    module = _load()
    if module is None:
        raise OSError('MathCAT (from NVDA) is not on this computer.')
    out = []
    for mathml in mathml_list:
        if mathml in _cache:
            out.append(_cache[mathml])
            continue
        try:
            module.SetMathML(mathml)
            words = ' '.join(module.GetSpokenText().split()) or None
        except Exception:
            words = None
        if len(_cache) >= _CACHE_LIMIT:
            _cache.clear()
        _cache[mathml] = words
        out.append(words)
    return out


def speak(mathml_list):
    """Words for each MathML string (None where MathCAT could not say it). Raises OSError
    when MathCAT is not on this computer."""
    return _run(_speak, list(mathml_list))
