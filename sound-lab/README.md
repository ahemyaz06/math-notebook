# Sound Lab

A small page for trying graph sounds on their own: type a function, then step along it and
hear it. It is where Math Notebook's graph sounds were invented and tuned, and the notebook
uses its sound engine.

If you only want to use the sounds, you do not need Sound Lab: Math Notebook has them all, and
Help > Sound guide and lessons in the notebook teaches them.

## Start

Double-click `Start Sound Lab.cmd` (needs Node.js). It opens http://127.0.0.1:4180/ in your
browser. Tab to the Stereo Sound Pad, then press **S** for settings and **?** for the keys.

## Sound Lab plays the original sound design

Math Notebook now uses the fitted design by default, and Sound Lab still plays the original one.
The difference:

- **Fitted (the notebook's default):** the lowest note is the bottom of the graph and the highest
  its top, whatever the numbers are. Each step slides into its note along the curve, and each
  function on a graph has its own sound.
- **Original (Sound Lab, and the notebook's Settings > Graph sound > How heights become notes >
  Original):** notes count in units. Below zero is a warm low note, zero a middle note, above zero
  a clear bell. Above 10 units the pitch starts again from low, with a small tick at the change.

## What you hear in both

- **The bass line:** while playing (Space), a soft low line follows the curve, so the steps feel
  connected.
- **Points of interest:** a chime at the origin, a tick where the curve crosses an axis, a swell at
  peaks and valleys, a low knock where there is no curve (an asymptote).
- **Dots:** a small bump for a solid dot and a breath of wind for an open dot (a hole). The notebook
  also has a slide through a sharp corner (down then up for a valley, up then down for a peak);
  Sound Lab does not look for corners.

Sound Lab finds points of interest by sampling the curve, so it can miss details on a narrow or
unusual graph.

## Files

- `public/sound-engine.js`: the sounds (Web Audio). The notebook uses this file.
- `public/voices.js`: the voices for the step notes. Sound Lab lists all of them; the notebook
  offers ten.
- `public/graph-math.js`: reading a function and finding its zeros, peaks, holes and asymptotes.
  The notebook uses this file too.
- `public/app.js`, `index.html`, `styles.css`: Sound Lab's own page.
- `server.mjs`: a small local server for the page (only on this computer).
- `SOUND-LAB-REPORT.md`: how the sound design came about and why.
