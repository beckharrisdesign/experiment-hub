# Intent — SVG to Stitch

**Type:** tool (personal utility; explicitly not scored as a business)

## Problem

Getting vector artwork onto an embroidery machine means either paying for
digitizing software (Wilcom, Hatch, Embrilliance) or fighting clunky free
tools (Ink/Stitch install friction) just to do the simplest possible thing:
run a stitch along some SVG outlines and save a file the machine reads.

## Intent

A zero-install, zero-upload converter living on the hub: drop an SVG, set a
physical size and stitch length, see the actual needle path, download DST/EXP.
Good enough for outline work — text paths, line art, single-run motifs.

## Non-goals

- Competing with real digitizers (fills, satin, underlay, densities).
- Writing Wilcom EMB — proprietary, no public spec; DST/EXP are the honest
  interchange formats and Wilcom itself imports them.
- Any server-side processing. The converter is pure TypeScript; keeping it in
  the browser is simpler, private, and free to host.

## Success looks like

A DST produced here loads in a stitch viewer (and a real machine) with the
right size, colors in the right sew order, and no wild jumps — for the kind
of line art actually used on the laser/craft side of the shop.
