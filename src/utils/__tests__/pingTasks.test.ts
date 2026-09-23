import { describe, expect, it } from "vitest";
import {
  normalizeHomepageMultiPingTaskIds,
  invertHomepagePingTaskBindings,
  hasHomepagePingTaskBinding,
  normalizeHomepagePingTaskBindings,
  resolveHomepagePingSelections,
  resolveHomepagePingTaskIdsByClient,
  resolvePingTaskName,
} from "@/utils/pingTasks";

describe("per-node ping task names", () => {
  it("renames only the configured node and task", () => {
    const names = { landing: { 3: "阿里云 HK" } };
    expect(resolvePingTaskName("landing", 3, "浙江移动", names)).toBe("阿里云 HK");
    expect(resolvePingTaskName("landing", 1, "浙江电信", names)).toBe("浙江电信");
    expect(resolvePingTaskName("other", 3, "浙江移动", names)).toBe("浙江移动");
    expect(resolvePingTaskName("other", 3, "浙江移动")).toBe("浙江移动");
  });
});

describe("homepage ping task bindings", () => {
  it("accepts only positive decimal safe integers", () => {
    expect(
      normalizeHomepagePingTaskBindings({
        "1e3": ["exponent"],
        "1.5": ["fraction"],
        "0x10": ["hex"],
        "9007199254740992": ["unsafe"],
        "42": ["valid"],
      }),
    ).toEqual({ "42": ["valid"] });
  });

  it("merges IDs that normalize to the same decimal integer", () => {
    expect(
      normalizeHomepagePingTaskBindings({
        "01": ["node-a", "node-b"],
        "1": ["node-b", "node-c"],
      }),
    ).toEqual({ "1": ["node-b", "node-c", "node-a"] });
  });

  it("inverts normalized bindings and gives the lowest task ID precedence", () => {
    expect(
      invertHomepagePingTaskBindings({
        "02": ["node-a"],
        "1": ["node-a", "node-b"],
      }),
    ).toEqual(
      new Map([
        ["node-a", 1],
        ["node-b", 1],
      ]),
    );
  });

  it("reuses the inverted binding index for a stable bindings object", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(invertHomepagePingTaskBindings(bindings)).toBe(
      invertHomepagePingTaskBindings(bindings),
    );
  });

  it("reports a binding before overview data has loaded", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(hasHomepagePingTaskBinding("node-a", bindings)).toBe(true);
    expect(hasHomepagePingTaskBinding("node-c", bindings)).toBe(false);
  });

  it("normalizes the global three-task selection in display order", () => {
    expect(normalizeHomepageMultiPingTaskIds(["3", 1, 3, 2, 4])).toEqual([3, 1, 2]);
  });

  it("uses the same three global tasks for every node and otherwise keeps single bindings", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(
      resolveHomepagePingTaskIdsByClient(["node-a", "node-b"], bindings, [3, 1, 2]),
    ).toEqual(
      new Map([
        ["node-a", [3, 1, 2]],
        ["node-b", [3, 1, 2]],
      ]),
    );
    expect(resolveHomepagePingTaskIdsByClient(["node-a", "node-b"], bindings)).toEqual(
      new Map([
        ["node-a", [8]],
        ["node-b", [9]],
      ]),
    );
  });

  it("requests either global multi-ping tasks or per-node single bindings, never both", () => {
    const multiSelections = resolveHomepagePingSelections(
      ["node-a", "node-b"],
      { "8": ["node-a"], "9": ["node-b"] },
      [3, 1, 2],
    );

    expect(multiSelections.singleTaskIdsByClient).toEqual(new Map());
    expect(multiSelections.multiTaskIdsByClient).toEqual(
      new Map([
        ["node-a", [3, 1, 2]],
        ["node-b", [3, 1, 2]],
      ]),
    );
    expect(multiSelections.requestedTaskIdsByClient).toBe(
      multiSelections.multiTaskIdsByClient,
    );

    const singleSelections = resolveHomepagePingSelections(
      ["node-a", "node-b"],
      { "8": ["node-a"], "9": ["node-b"] },
    );
    expect(singleSelections.singleTaskIdsByClient).toEqual(
      new Map([
        ["node-a", [8]],
        ["node-b", [9]],
      ]),
    );
    expect(singleSelections.multiTaskIdsByClient).toEqual(new Map());
    expect(singleSelections.requestedTaskIdsByClient).toBe(
      singleSelections.singleTaskIdsByClient,
    );
  });
});
