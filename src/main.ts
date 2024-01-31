import { createCommentOnPR, isPullRequest } from './utils/github.utils';
import { CopyleftPolicyCheck } from './policies/copyleft-policy-check';
import { generateJobSummary, generateSummary } from './services/report.service';
import * as core from '@actions/core';
import * as inputs from './app.input';
import * as outputs from './app.output';

import { scanService, uploadResults } from './services/scan.service';
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug(`SCANOSS Scan Action started...`);

    // create policies
    core.debug(`Creating policies`);
    const policies = [new CopyleftPolicyCheck()];
    policies.forEach(async policy => policy.start());

    // run scan
    const { scan, stdout } = await scanService.scan();
    await uploadResults();

    // run policies
    policies.forEach(async policy => await policy.run(scan));

    if (isPullRequest()) {
      // create reports
      const report = generateSummary(scan);
      createCommentOnPR(report);
    }

    await generateJobSummary(scan);
    // set outputs for other workflow steps to use
    core.setOutput(outputs.RESULT_FILEPATH, inputs.OUTPUT_FILEPATH);
    core.setOutput(outputs.STDOUT_SCAN_COMMAND, stdout);
  } catch (error) {
    // fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
