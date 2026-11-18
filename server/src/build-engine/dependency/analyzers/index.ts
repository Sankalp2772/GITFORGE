import path from 'path';
import { DependencyType, SupportedLanguage } from '../../types';

export interface ExtractedDependency {
  rawSpecifier: string;
  type: DependencyType;
  resolvedPath?: string;
  isResolved: boolean;
}

export interface ILanguageDependencyAnalyzer {
  canHandle(language: SupportedLanguage, filePath: string): boolean;
  analyze(filePath: string, content: string, allFiles: string[]): ExtractedDependency[];
}

/**
 * C & C++ Analyzer: Extracts #include "..." (local) and #include <...> (system/library)
 */
export class CppDependencyAnalyzer implements ILanguageDependencyAnalyzer {
  canHandle(language: SupportedLanguage): boolean {
    return language === 'c' || language === 'cpp';
  }

  analyze(filePath: string, content: string, allFiles: string[]): ExtractedDependency[] {
    const results: ExtractedDependency[] = [];
    const dir = path.dirname(filePath);

    // Match #include "..." or #include <...>
    const includeRegex = /#\s*include\s*([<"])([^>"]+)[>"]/g;
    let match;

    while ((match = includeRegex.exec(content)) !== null) {
      const isQuote = match[1] === '"';
      const specifier = match[2].trim();

      let resolved: string | undefined;

      if (isQuote) {
        // First try relative to file
        const directCandidate = path.normalize(path.join(dir, specifier)).replace(/\\/g, '/');
        if (allFiles.includes(directCandidate)) {
          resolved = directCandidate;
        } else {
          // Check common include roots like 'src/' or project root
          const matchInAll = allFiles.find(
            (f) => f.endsWith(`/${specifier}`) || f === specifier || f.endsWith(specifier)
          );
          if (matchInAll) {
            resolved = matchInAll;
          }
        }
      }

      results.push({
        rawSpecifier: specifier,
        type: isQuote ? 'HEADER' : 'INCLUDE',
        resolvedPath: resolved,
        isResolved: !!resolved,
      });
    }

    return results;
  }
}

/**
 * JS/TS/React Analyzer: Extracts import/export statements and require()
 */
export class JsTsDependencyAnalyzer implements ILanguageDependencyAnalyzer {
  canHandle(language: SupportedLanguage): boolean {
    return ['javascript', 'typescript', 'react'].includes(language);
  }

  analyze(filePath: string, content: string, allFiles: string[]): ExtractedDependency[] {
    const results: ExtractedDependency[] = [];
    const dir = path.dirname(filePath);

    // import ... from '...' or export ... from '...'
    const esmRegex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
    // require('...')
    const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    const findMatch = (regex: RegExp, type: DependencyType) => {
      let m;
      while ((m = regex.exec(content)) !== null) {
        const specifier = m[1].trim();
        let resolved: string | undefined;

        if (specifier.startsWith('.')) {
          const direct = path.normalize(path.join(dir, specifier)).replace(/\\/g, '/');
          const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '/index.tsx'];

          for (const ext of extensions) {
            const candidate = `${direct}${ext}`;
            if (allFiles.includes(candidate)) {
              resolved = candidate;
              break;
            }
          }
        }

        results.push({
          rawSpecifier: specifier,
          type,
          resolvedPath: resolved,
          isResolved: !!resolved,
        });
      }
    };

    findMatch(esmRegex, 'IMPORT');
    findMatch(cjsRegex, 'MODULE');

    return results;
  }
}

/**
 * Python Analyzer: Extracts 'import foo' and 'from foo import bar'
 */
export class PythonDependencyAnalyzer implements ILanguageDependencyAnalyzer {
  canHandle(language: SupportedLanguage): boolean {
    return language === 'python';
  }

  analyze(filePath: string, content: string, allFiles: string[]): ExtractedDependency[] {
    const results: ExtractedDependency[] = [];
    const dir = path.dirname(filePath);

    const fromRegex = /^\s*from\s+([a-zA-Z0-9_.]+)\s+import/gm;
    const importRegex = /^\s*import\s+([a-zA-Z0-9_., ]+)/gm;

    let m;
    while ((m = fromRegex.exec(content)) !== null) {
      const module = m[1].replace(/\./g, '/');
      const direct = path.normalize(path.join(dir, `${module}.py`)).replace(/\\/g, '/');
      const rootCandidate = `${module}.py`;

      let resolved: string | undefined;
      if (allFiles.includes(direct)) resolved = direct;
      else if (allFiles.includes(rootCandidate)) resolved = rootCandidate;

      results.push({
        rawSpecifier: m[1],
        type: 'IMPORT',
        resolvedPath: resolved,
        isResolved: !!resolved,
      });
    }

    while ((m = importRegex.exec(content)) !== null) {
      const modules = m[1].split(',').map((s) => s.trim());
      for (const mod of modules) {
        const module = mod.split(' ')[0].replace(/\./g, '/');
        const direct = path.normalize(path.join(dir, `${module}.py`)).replace(/\\/g, '/');
        const rootCandidate = `${module}.py`;

        let resolved: string | undefined;
        if (allFiles.includes(direct)) resolved = direct;
        else if (allFiles.includes(rootCandidate)) resolved = rootCandidate;

        results.push({
          rawSpecifier: mod,
          type: 'IMPORT',
          resolvedPath: resolved,
          isResolved: !!resolved,
        });
      }
    }

    return results;
  }
}

/**
 * Composite Analyzer Registry
 */
export class DependencyAnalyzerRegistry {
  private static analyzers: ILanguageDependencyAnalyzer[] = [
    new CppDependencyAnalyzer(),
    new JsTsDependencyAnalyzer(),
    new PythonDependencyAnalyzer(),
  ];

  public static analyzeFile(
    filePath: string,
    language: SupportedLanguage,
    content: string,
    allFiles: string[]
  ): ExtractedDependency[] {
    for (const analyzer of this.analyzers) {
      if (analyzer.canHandle(language, filePath)) {
        return analyzer.analyze(filePath, content, allFiles);
      }
    }
    return [];
  }
}
