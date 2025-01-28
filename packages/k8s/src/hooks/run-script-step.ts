/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs'
import * as core from '@actions/core'
import { RunScriptStepArgs } from 'hooklib'
import { cpFromPod, cpToPod, execPodStep } from '../k8s'
import { usePodCpVolume, writeEntryPointScript } from '../k8s/utils'
import { JOB_CONTAINER_NAME } from './constants'

export async function runScriptStep(
  args: RunScriptStepArgs,
  state,
  responseFile
): Promise<void> {
  const { entryPoint, entryPointArgs, environmentVariables } = args
  const { containerPath, runnerPath } = writeEntryPointScript(
    args.workingDirectory,
    entryPoint,
    entryPointArgs,
    args.prependPath,
    environmentVariables
  )

  if (usePodCpVolume()) {
    core.debug('Copying the script to the work volume on the workflow pod')
    await cpToPod(state.jobPod, JOB_CONTAINER_NAME, '/home/runner/_work/_temp/.', '/__w/_temp')
  }

  args.entryPoint = 'sh'
  args.entryPointArgs = ['-e', containerPath]
  try {
    await execPodStep(
      [args.entryPoint, ...args.entryPointArgs],
      state.jobPod,
      JOB_CONTAINER_NAME
    )
  } catch (err) {
    core.debug(`execPodStep failed: ${JSON.stringify(err)}`)
    const message = (err as any)?.response?.body?.message || err
    throw new Error(`failed to run script step: ${message}`)
  } finally {
    fs.rmSync(runnerPath)

    core.debug('Copying output files back to the runner')
    await cpFromPod(state.jobPod, JOB_CONTAINER_NAME, '/__w/_temp/_runner_file_commands/.', '/home/runner/_work/_temp/_runner_file_commands')
  }
}
