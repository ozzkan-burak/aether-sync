import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Note = z.infer<typeof NoteSchema>;

export const OperationTypeSchema = z.enum(['INSERT', 'UPDATE', 'DELETE']);

export const OperationSchema = z.object({
  id: z.string().uuid(),
  noteId: z.string().uuid(),
  type: OperationTypeSchema,
  payload: NoteSchema.partial(),
  timestamp: z.number(),
  status: z.enum(['PENDING', 'SYNCED']),
});
export type Operation = z.infer<typeof OperationSchema>;

export const WorkerActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INIT_DB') }),
  z.object({ type: z.literal('WRITE_OPS'), payload: z.array(OperationSchema) }),
  z.object({ type: z.literal('READ_ALL') }),
]);
export type WorkerAction = z.infer<typeof WorkerActionSchema>;

export const WorkerResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('DB_READY'), status: z.boolean() }),
  z.object({ type: z.literal('WRITE_COMPLETE'), count: z.number() }),
  z.object({ type: z.literal('DATA_LOADED'), payload: z.array(z.any()) }),
  z.object({ type: z.literal('ERROR'), error: z.string() }),
]);
export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;
