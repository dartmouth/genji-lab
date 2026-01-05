// In a utils file
import { TextTarget, ObjectTarget } from "@documentView/types";
import { parseURI } from "@documentView/utils";

export const flattenTargets = (
  targets: (TextTarget | ObjectTarget | (TextTarget | ObjectTarget)[])[]
): (TextTarget | ObjectTarget)[] => {
  return targets.flatMap((t) => (Array.isArray(t) ? t : [t]));
};

export const getTextTargets = (
  targets: (TextTarget | ObjectTarget | (TextTarget | ObjectTarget)[])[]
): TextTarget[] => {
  return flattenTargets(targets).filter(
    (t): t is TextTarget => "selector" in t
  );
};

export const findTargetForParagraph = (
  targets: TextTarget[],
  paragraphId: string
): TextTarget | undefined => {
  let target = targets.find((t) => t.source === paragraphId);

  if (!target) {
    const numericId = parseURI(paragraphId);
    target = targets.find(
      (t) =>
        t.source === `DocumentElements/${numericId}` ||
        t.source === `/DocumentElements/${numericId}`
    );
  }

  return target;
};
