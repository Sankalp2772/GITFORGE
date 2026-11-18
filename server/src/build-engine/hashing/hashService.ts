import crypto from 'crypto';

export class HashService {
  /**
   * Calculate SHA-256 hash of a Buffer or string
   */
  public static calculateSha256(content: Buffer | string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Calculate deterministic cache key for a build action
   */
  public static calculateActionCacheKey(params: {
    command: string;
    args: string[];
    inputHashes: Record<string, string>;
    dependencyOutputHashes: Record<string, string>;
    compilerVersion?: string;
    envVars?: Record<string, string>;
  }): string {
    const sortedInputs = Object.keys(params.inputHashes)
      .sort()
      .map((k) => `${k}:${params.inputHashes[k]}`)
      .join('|');

    const sortedDepOutputs = Object.keys(params.dependencyOutputHashes)
      .sort()
      .map((k) => `${k}:${params.dependencyOutputHashes[k]}`)
      .join('|');

    const sortedEnv = params.envVars
      ? Object.keys(params.envVars)
          .sort()
          .map((k) => `${k}=${params.envVars![k]}`)
          .join('|')
      : '';

    const payload = [
      params.command,
      params.args.join(' '),
      params.compilerVersion || 'unknown',
      sortedInputs,
      sortedDepOutputs,
      sortedEnv,
    ].join('###');

    return this.calculateSha256(payload);
  }
}
