// src/types.ts
import { z } from 'zod';

// --- Temel Veri Modelleri ---

// Not Şeması: Verinin yapısını ve kurallarını (validation) tanımlar.
export const NoteSchema = z.object({
  id: z.string().uuid({ message: 'Geçersiz UUID formatı' }),
  title: z.string().min(1, { message: 'Başlık boş olamaz' }),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Şemadan TypeScript tipini otomatik türetiyoruz.
export type Note = z.infer<typeof NoteSchema>;

// --- Operasyon Günlüğü (CRDT / Event Sourcing) ---

export const OperationTypeSchema = z.enum(['INSERT', 'UPDATE', 'DELETE']);
export type OperationType = z.infer<typeof OperationTypeSchema>;

export const OperationSchema = z.object({
  id: z.string().uuid(),
  noteId: z.string().uuid(),
  type: OperationTypeSchema,
  // Partial: Güncellemelerde tüm alanları göndermek zorunda değiliz.
  payload: NoteSchema.partial(),
  timestamp: z.number(),
  status: z.enum(['PENDING', 'SYNCED']),
});

export type Operation = z.infer<typeof OperationSchema>;

// --- Worker İletişim Protokolü ---

// Worker'a gelen mesajları doğrulayan şema.
// Discriminated Union: 'type' alanına göre hangi şemanın geçerli olduğunu anlar.
export const WorkerActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INIT_DB') }),
  z.object({ type: z.literal('WRITE_OPS'), payload: z.array(OperationSchema) }),
  z.object({ type: z.literal('READ_ALL') }),
]);

export type WorkerAction = z.infer<typeof WorkerActionSchema>;

// Worker'dan dönen cevapları doğrulayan şema.
export const WorkerResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('DB_READY'), status: z.boolean() }),
  z.object({ type: z.literal('WRITE_COMPLETE'), count: z.number() }),
  z.object({ type: z.literal('DATA_LOADED'), payload: z.array(NoteSchema) }),
  z.object({ type: z.literal('ERROR'), error: z.string() }),
]);

export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;
