import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrackTaskEventInput } from './types';
import { trackTaskEvent } from '../repositories/taskEventsRepo';

const QUEUE_KEY = 'momentum-pending-task-events';
const MAX_QUEUE = 500;

async function readQueue(): Promise<TrackTaskEventInput[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrackTaskEventInput[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(events: TrackTaskEventInput[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
}

/** Queue an event for later sync when the user signs in. */
export async function enqueuePendingEvent(input: TrackTaskEventInput): Promise<number> {
  const queue = await readQueue();
  queue.push({
    ...input,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  });
  await writeQueue(queue);
  return queue.length;
}

export async function getPendingEventCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

export async function getPendingEvents(): Promise<TrackTaskEventInput[]> {
  return readQueue();
}

export async function flushPendingEvents(): Promise<{ synced: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: TrackTaskEventInput[] = [];

  for (const event of queue) {
    const { error } = await trackTaskEvent(event);
    if (error) {
      failed += 1;
      remaining.push(event);
    } else {
      synced += 1;
    }
  }

  await writeQueue(remaining);
  return { synced, failed };
}
