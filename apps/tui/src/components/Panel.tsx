import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';

interface PanelProps {
  title?: string;
  focused?: boolean;
  theme: Theme;
  flexGrow?: number;
  flexBasis?: number | string;
  width?: number | string;
  height?: number | string;
  children?: React.ReactNode;
}

/** Bordered box with title row and focus ring — the TUI's core container. */
export function Panel({ title, focused = false, theme: c, flexGrow, flexBasis, width, height, children }: PanelProps) {
  // P7.1 chrome-render investigation (evidence/phase-7/perf/P7.1-RECHECK2-VERDICT.md):
  // deliberately NOT wrapped in React.memo, unlike TitleBar/TabBar/StatusLine.
  // Every caller (BoardView included) passes a freshly-created `children` JSX
  // tree on every render — React.memo's shallow prop comparison would never
  // find `children` referentially equal across renders, so memoizing here
  // would be a no-op that looks like an optimization but never skips a
  // re-render. Measured (via temporary render-probe instrumentation, since
  // removed) and confirmed not to matter regardless: the scroll
  // bottleneck is in node_modules/ink's own input-parsing and render-throttle
  // internals (32ms onRender throttle; single parseKeypress() call per raw
  // stdin data event, which drops an entire coalesced multi-key chunk rather
  // than processing it byte-by-byte), not in React render cost here.
  // NOTE: the title renders in-flow as the first row. An earlier design used
  // position="absolute" + marginTop={-1} to inset the title into the border,
  // but overflow="hidden" on the border box clips it — titles never rendered.
  // F-11: a driven end-to-end audit captured byte-identical before/after PNGs
  // for a single `enter` press that toggles which BoardView panel is
  // `focused`. Colour alone (borderColor + title bold) genuinely does change
  // (verified in a real PTY: the ANSI SGR sequences around the title differ —
  // #38BDF8 vs #16283E in the default ice theme, confirmed not to collide at
  // any of the three color tiers in util/truecolor.ts), so the reported
  // byte-identical capture was an instrument/rendering-pipeline artifact, not
  // proof color never changes. But relying on color ALONE is fragile — screen
  // readers, monochrome terminals, and any capture path that quantizes or
  // discards color would show nothing changing at all. Switch the border
  // GLYPH SET too (cli-boxes 'bold': ┏━┓┃┛ vs 'single': ┌─┐│┘) so focus is
  // visibly obvious from shape alone, independent of color rendering.
  return (
    <Box
      flexDirection="column"
      borderStyle={focused ? 'bold' : 'single'}
      borderColor={focused ? c.borderFocus : c.border}
      flexGrow={flexGrow}
      flexBasis={flexBasis}
      width={width}
      height={height}
      overflow="hidden"
    >
      {title ? (
        <Box paddingX={1}>
          <Text color={focused ? c.borderFocus : c.dim} bold={focused}>
            {title}
          </Text>
        </Box>
      ) : null}
      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {children}
      </Box>
    </Box>
  );
}
