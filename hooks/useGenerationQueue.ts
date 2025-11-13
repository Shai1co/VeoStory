import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { GenerationQueueTask, GenerationTaskStatus, GenerationIntent, VideoModel, ImageModel } from '../types';
import { generateVideo as generateVideoUnified, VideoGenerationResponse } from '../services/videoGenerationService';
import {
  deleteGenerationTask,
  loadGenerationTasks,
  saveGenerationTask,
} from '../utils/db';

interface EnqueueGenerationTaskInput {
  segmentId: number;
  prompt: string;
  model: VideoModel;
  imageData?: string | null;
  imageModel?: ImageModel;
  intent: GenerationIntent;
}

interface UseGenerationQueueOptions {
  onTaskSuccess: (task: GenerationQueueTask, response: VideoGenerationResponse) => Promise<void> | void;
  onTaskError?: (task: GenerationQueueTask, error: Error) => Promise<void> | void;
}

interface UseGenerationQueueResult {
  tasks: GenerationQueueTask[];
  enqueueTask: (input: EnqueueGenerationTaskInput) => Promise<GenerationQueueTask>;
  cancelTask: (taskId: string) => Promise<boolean>;
  retryTask: (taskId: string) => Promise<boolean>;
  activeTask: GenerationQueueTask | null;
  pendingCount: number;
}

const RUNNING_STATUSES: GenerationTaskStatus[] = ['queued', 'running'];
const RECENT_TASK_STATUSES: GenerationTaskStatus[] = ['failed', 'cancelled'];

const NO_IMAGE_DATA = null;

const DEFAULT_INTENT: GenerationIntent = 'continuation';

const createTaskId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
};

const now = () => Date.now();

const ensureIntent = (intent?: GenerationIntent): GenerationIntent => intent ?? DEFAULT_INTENT;

const normalizeImageData = (imageData?: string | null): string | null =>
  typeof imageData === 'string' && imageData.length > 0 ? imageData : NO_IMAGE_DATA;

const hasActiveStatus = (status: GenerationTaskStatus) => RUNNING_STATUSES.includes(status);

const isRetryableStatus = (status: GenerationTaskStatus) => RECENT_TASK_STATUSES.includes(status);

const promoteToRunning = (task: GenerationQueueTask): GenerationQueueTask => ({
  ...task,
  status: 'running',
  startedAt: task.startedAt ?? now(),
});

const completeTask = (task: GenerationQueueTask, status: GenerationTaskStatus, error?: string): GenerationQueueTask => ({
  ...task,
  status,
  completedAt: now(),
  error,
});

const shouldIgnoreResult = (
  taskId: string,
  cancelledIds: MutableRefObject<Set<string>>,
) => cancelledIds.current.has(taskId);

const clearIgnoreFlag = (
  taskId: string,
  cancelledIds: MutableRefObject<Set<string>>,
) => {
  if (cancelledIds.current.has(taskId)) {
    cancelledIds.current.delete(taskId);
  }
};

const useGenerationQueue = (options: UseGenerationQueueOptions): UseGenerationQueueResult => {
  const { onTaskSuccess, onTaskError } = options;
  const [tasks, setTasks] = useState<GenerationQueueTask[]>([]);
  const activeTaskRef = useRef<GenerationQueueTask | null>(null);
  const cancelledTaskIdsRef = useRef<Set<string>>(new Set());

  const persistTask = useCallback(async (task: GenerationQueueTask) => {
    await saveGenerationTask(task);
  }, []);

  const removeTask = useCallback(async (taskId: string) => {
    await deleteGenerationTask(taskId);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const storedTasks = await loadGenerationTasks();
        if (mounted && storedTasks.length > 0) {
          setTasks(storedTasks);
        }
      } catch (error) {
        console.error('Failed to load generation tasks during bootstrap:', error);
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const enqueueTask = useCallback(async (input: EnqueueGenerationTaskInput) => {
    const task: GenerationQueueTask = {
      id: createTaskId(),
      segmentId: input.segmentId,
      prompt: input.prompt,
      model: input.model,
      imageData: normalizeImageData(input.imageData),
      imageModel: input.imageModel,
      intent: ensureIntent(input.intent),
      status: 'queued',
      createdAt: now(),
    };

    setTasks((prev) => [...prev, task]);
    await persistTask(task);
    return task;
  }, [persistTask]);

  const cancelTask = useCallback(async (taskId: string) => {
    const targetTask = tasks.find((task) => task.id === taskId);
    if (!targetTask) {
      return false;
    }

    if (targetTask.status === 'running') {
      cancelledTaskIdsRef.current.add(taskId);
      const cancelled = completeTask(targetTask, 'cancelled');
      setTasks((prev) => prev.map((task) => (task.id === taskId ? cancelled : task)));
      await persistTask(cancelled);
      return true;
    }

    if (targetTask.status === 'queued') {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      await removeTask(taskId);
      return true;
    }

    if (targetTask.status === 'failed' || targetTask.status === 'cancelled') {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      await removeTask(taskId);
      return true;
    }

    return false;
  }, [persistTask, removeTask, tasks]);

  const retryTask = useCallback(async (taskId: string) => {
    const targetTask = tasks.find((task) => task.id === taskId);
    if (!targetTask || !isRetryableStatus(targetTask.status)) {
      return false;
    }

    const retriedTask: GenerationQueueTask = {
      ...targetTask,
      status: 'queued',
      error: undefined,
      startedAt: undefined,
      completedAt: undefined,
      createdAt: now(),
    };

    setTasks((prev) => prev.map((task) => (task.id === taskId ? retriedTask : task)));
    await persistTask(retriedTask);
    return true;
  }, [persistTask, tasks]);

  const processTask = useCallback(async (task: GenerationQueueTask) => {
    try {
      const response = await generateVideoUnified({
        prompt: task.prompt,
        model: task.model,
        imageData: task.imageData ?? undefined,
        imageModel: task.imageModel,
      });

      if (shouldIgnoreResult(task.id, cancelledTaskIdsRef)) {
        clearIgnoreFlag(task.id, cancelledTaskIdsRef);
        setTasks((prev) => prev.filter((queuedTask) => queuedTask.id !== task.id));
        await removeTask(task.id);
        return;
      }

      await onTaskSuccess(task, response);
      setTasks((prev) => prev.filter((queuedTask) => queuedTask.id !== task.id));
      await removeTask(task.id);
    } catch (error) {
      if (shouldIgnoreResult(task.id, cancelledTaskIdsRef)) {
        clearIgnoreFlag(task.id, cancelledTaskIdsRef);
        setTasks((prev) => prev.filter((queuedTask) => queuedTask.id !== task.id));
        await removeTask(task.id);
        return;
      }

      const normalizedError = error instanceof Error ? error : new Error(String(error));
      const failedTask = completeTask(task, 'failed', normalizedError.message);
      setTasks((prev) => prev.map((queuedTask) => (queuedTask.id === task.id ? failedTask : queuedTask)));
      await persistTask(failedTask);
      if (onTaskError) {
        await onTaskError(failedTask, normalizedError);
      }
    } finally {
      activeTaskRef.current = null;
    }
  }, [onTaskError, onTaskSuccess, persistTask, removeTask]);

  useEffect(() => {
    if (activeTaskRef.current) {
      return;
    }

    const runningTask = tasks.find((task) => task.status === 'running');
    if (runningTask) {
      activeTaskRef.current = runningTask;
      void processTask(runningTask);
      return;
    }

    const queuedTask = tasks.find((task) => task.status === 'queued');
    if (!queuedTask) {
      return;
    }

    const promoted = promoteToRunning(queuedTask);
    activeTaskRef.current = promoted;
    setTasks((prev) => prev.map((task) => (task.id === promoted.id ? promoted : task)));
    void persistTask(promoted);
    void processTask(promoted);
  }, [persistTask, processTask, tasks]);

  const activeTask = useMemo(
    () => tasks.find((task) => hasActiveStatus(task.status)) ?? null,
    [tasks],
  );

  const pendingCount = useMemo(
    () => tasks.filter((task) => task.status === 'queued' || task.status === 'running').length,
    [tasks],
  );

  return {
    tasks,
    enqueueTask,
    cancelTask,
    retryTask,
    activeTask,
    pendingCount,
  };
};

export default useGenerationQueue;


