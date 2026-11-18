import { BuildManifest, BuildTargetConfig } from '../types';

export class ManifestParser {
  /**
   * Validate and parse build.manifest.json schema
   */
  public static parseAndValidate(manifestContent: string): {
    manifest: BuildManifest;
    errors: string[];
  } {
    const errors: string[] = [];
    let parsed: any;

    try {
      parsed = JSON.parse(manifestContent);
    } catch (e: any) {
      return { manifest: { version: 1, targets: [] }, errors: [`Invalid JSON: ${e.message}`] };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { manifest: { version: 1, targets: [] }, errors: ['Manifest must be a JSON object'] };
    }

    if (!Array.isArray(parsed.targets)) {
      return { manifest: { version: 1, targets: [] }, errors: ['Manifest must contain a "targets" array'] };
    }

    const targets: BuildTargetConfig[] = [];
    const targetNames = new Set<string>();

    for (const t of parsed.targets) {
      if (!t.name || typeof t.name !== 'string') {
        errors.push('Target missing valid "name"');
        continue;
      }

      if (targetNames.has(t.name)) {
        errors.push(`Duplicate target name "${t.name}" detected`);
        continue;
      }
      targetNames.add(t.name);

      if (!t.command || typeof t.command !== 'string') {
        errors.push(`Target "${t.name}" missing valid "command"`);
      }

      // Security check: reject dangerous shell operators in command & args
      const forbiddenOperators = ['|', ';', '&', '&&', '||', '`', '$(', '<', '>', 'rm -rf', 'del /f'];
      for (const op of forbiddenOperators) {
        if (t.command.includes(op)) {
          errors.push(`Target "${t.name}" contains forbidden operator "${op}" in command`);
        }
        if (Array.isArray(t.args)) {
          for (const arg of t.args) {
            if (typeof arg === 'string' && arg.includes(op)) {
              errors.push(`Target "${t.name}" contains forbidden operator "${op}" in arguments`);
            }
          }
        }
      }

      targets.push({
        name: t.name,
        type: t.type || 'object',
        inputs: Array.isArray(t.inputs) ? t.inputs : [],
        outputs: Array.isArray(t.outputs) ? t.outputs : [],
        command: t.command,
        args: Array.isArray(t.args) ? t.args : [],
        dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
        environment: typeof t.environment === 'object' ? t.environment : undefined,
      });
    }

    // Validate that all declared dependencies exist
    for (const t of targets) {
      for (const dep of t.dependencies) {
        if (!targetNames.has(dep)) {
          errors.push(`Target "${t.name}" references missing dependency "${dep}"`);
        }
      }
    }

    return {
      manifest: {
        version: parsed.version || 1,
        runTarget: parsed.runTarget,
        targets,
      },
      errors,
    };
  }
}
