import React from 'react';
import { MODEL_METADATA } from '../config/modelMetadata';
import { GenerationQueueTask } from '../types';

interface GenerationStatusBannerProps {
  tasks: GenerationQueueTask[];
  activeTask: GenerationQueueTask | null;
  onCancelTask: (taskId: string) => Promise<boolean>;
  onRetryTask: (taskId: string) => Promise<boolean>;
  onReturnToStory: () => void;
}

const BANNER_MAX_WIDTH = 520;

const formatTaskLabel = (task: GenerationQueueTask) => {
  const modelInfo = MODEL_METADATA[task.model];
  return `${modelInfo.name} • ${task.intent === 'initial' ? 'Opening scene' : 'Next chapter'}`;
};

const GenerationStatusBanner: React.FC<GenerationStatusBannerProps> = ({
  tasks,
  activeTask,
  onCancelTask,
  onRetryTask,
  onReturnToStory,
}) => {
  const queuedTasks = tasks.filter((task) => task.status === 'queued');
  const failedTasks = tasks.filter((task) => task.status === 'failed');
  const hasBannerContent = activeTask || queuedTasks.length > 0 || failedTasks.length > 0;

  if (!hasBannerContent) {
    return null;
  }

  const queuedLabel =
    queuedTasks.length > 0
      ? `${queuedTasks.length} queued`
      : activeTask
        ? 'Running'
        : failedTasks.length > 0
          ? 'Attention required'
          : '';

  return (
    <div className="fixed bottom-5 inset-x-0 flex justify-center pointer-events-none z-30">
      <div
        className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 shadow-2xl rounded-2xl px-5 py-4 w-full"
        style={{ maxWidth: BANNER_MAX_WIDTH }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Scene generation in progress</span>
                {queuedLabel && (
                  <span className="text-xs font-medium text-sky-300 px-2 py-0.5 rounded-full bg-sky-500/15">
                    {queuedLabel}
                  </span>
                )}
              </div>
              {activeTask && (
                <p className="text-xs text-slate-400 mt-1">
                  {formatTaskLabel(activeTask)}
                </p>
              )}
              {!activeTask && queuedTasks.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Waiting to start: {formatTaskLabel(queuedTasks[0])}
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {activeTask && (
                <button
                  type="button"
                  onClick={() => void onCancelTask(activeTask.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-600 text-slate-200 hover:border-red-400 hover:text-red-300 transition-colors"
                >
                  Cancel
                </button>
              )}
              {queuedTasks.length > 0 && !activeTask && (
                <button
                  type="button"
                  onClick={() => void onCancelTask(queuedTasks[0].id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-600 text-slate-200 hover:border-red-400 hover:text-red-300 transition-colors"
                >
                  Remove Next
                </button>
              )}
              <button
                type="button"
                onClick={onReturnToStory}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors"
              >
                Return to story
              </button>
            </div>
          </div>

          {failedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-amber-300 font-medium">Needs attention</div>
              <ul className="space-y-1">
                {failedTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-2 text-xs text-slate-300 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2"
                  >
                    <span className="truncate">
                      {formatTaskLabel(task)}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => void onRetryTask(task.id)}
                        className="px-2 py-1 rounded-md bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 transition-colors"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => void onCancelTask(task.id)}
                        className="px-2 py-1 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationStatusBanner;

