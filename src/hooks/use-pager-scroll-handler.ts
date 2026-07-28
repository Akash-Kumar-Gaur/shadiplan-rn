import { useEvent, useHandler } from "react-native-reanimated";

type PageScrollHandlers = {
  onPageScroll: (
    event: { position: number; offset: number },
    context: Record<string, unknown>,
  ) => void;
};

/**
 * Reanimated worklet handler for PagerView `onPageScroll`.
 * @see https://github.com/callstack/react-native-pager-view/blob/master/example/src/ReanimatedOnPageScrollExample.tsx
 */
export function usePagerScrollHandler(
  handlers: PageScrollHandlers,
  dependencies?: unknown[],
) {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies);

  return useEvent(
    (event) => {
      "worklet";
      const { onPageScroll } = handlers;
      if (onPageScroll && event.eventName.endsWith("onPageScroll")) {
        onPageScroll(
          event as unknown as { position: number; offset: number },
          context,
        );
      }
    },
    ["onPageScroll"],
    doDependenciesDiffer,
  );
}
