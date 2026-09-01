import type { TestingAnalysis } from "../types";

const FRAMEWORK_SIGNALS: Array<{ name: string; depNames: string[]; configFiles: RegExp[] }> = [
  { name: "Jest", depNames: ["jest"], configFiles: [/jest\.config\.(js|ts|mjs|cjs|json)$/] },
  { name: "Vitest", depNames: ["vitest"], configFiles: [/vitest\.config\.(js|ts|mjs|cjs)$/] },
  { name: "Mocha", depNames: ["mocha"], configFiles: [/\.mocharc/] },
  { name: "Cypress", depNames: ["cypress"], configFiles: [/cypress\.config\.(js|ts)$/, /^cypress\//] },
  { name: "Playwright", depNames: ["@playwright/test", "playwright"], configFiles: [/playwright\.config\.(js|ts)$/] },
  { name: "Pytest", depNames: [], configFiles: [/pytest\.ini$/, /^conftest\.py$/] },
  { name: "JUnit", depNames: [], configFiles: [/pom\.xml$/] }
];

const TEST_FILE_PATTERN = /(\.test\.|\.spec\.)|(^|\/)(tests?|__tests__)\//i;
const CI_CONFIG_PATTERN = /^\.github\/workflows\/.+\.ya?ml$/i;

/**
 * Detects testing infrastructure from a repository's file tree and declared
 * dependencies. GitPulse never executes any repository code, so it can only
 * report what is *detected* (frameworks present, test files found) — never
 * whether tests actually pass, since that would require execution.
 */
export function analyzeTesting(
  treePaths: string[] | null,
  declaredDeps: Set<string>
): TestingAnalysis {
  if (!treePaths) {
    return {
      detectedFrameworks: [],
      testFileCount: 0,
      testDirectories: [],
      hasCiConfig: false,
      coverageAvailable: false,
      coveragePercentage: null,
      dataAvailable: false,
      unavailableReason: "Repository file listing unavailable."
    };
  }

  const detectedFrameworks = new Set<string>();
  for (const signal of FRAMEWORK_SIGNALS) {
    const depMatch = signal.depNames.some((d) => declaredDeps.has(d));
    const fileMatch = treePaths.some((p) => signal.configFiles.some((re) => re.test(p)));
    if (depMatch || fileMatch) detectedFrameworks.add(signal.name);
  }

  const testFiles = treePaths.filter((p) => TEST_FILE_PATTERN.test(p));
  const testDirectories = Array.from(
    new Set(
      testFiles
        .map((p) => {
          const match = /^(.*?\/(?:tests?|__tests__)\/)/i.exec(p);
          return match ? match[1]! : null;
        })
        .filter((v): v is string => v !== null)
    )
  );

  const hasCiConfig = treePaths.some((p) => CI_CONFIG_PATTERN.test(p));

  return {
    detectedFrameworks: Array.from(detectedFrameworks),
    testFileCount: testFiles.length,
    testDirectories,
    hasCiConfig,
    coverageAvailable: false,
    coveragePercentage: null,
    dataAvailable: true,
    unavailableReason: null
  };
}
