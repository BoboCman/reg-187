/**
 * usePDFProcessor Hook
 *
 * React hook for managing the Zero-Knowledge PDF processing pipeline.
 * Handles Web Worker lifecycle, progress tracking, and state management.
 *
 * @example
 * const { processFile, progress, redactionLog, isProcessing, error } = usePDFProcessor();
 *
 * const handleUpload = async (file: File) => {
 *   const result = await processFile(file);
 *   // result.cleanText is ready for API submission
 * };
 *
 * @fileoverview Zero-Knowledge Document Pipeline - React Integration
 * @version 1.0.0
 * @license Proprietary - Financial Planner AI, LLC
 * Copied from ip-ai-pro-2026 (same owner). Keep the two in sync.
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { WorkerResponse, ProcessingOptions, RedactionResult, PDFMetadata } from "@/workers/pdfWorker"

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessingProgress {
  percent: number
  currentPage: number
  totalPages: number
  stage: "idle" | "loading" | "extracting" | "redacting" | "complete" | "error"
}

export interface ProcessingResult {
  cleanText: string
  redactionLog: RedactionResult[]
  metadata: PDFMetadata
  processingTimeMs: number
  /** Worker warnings (e.g. name_leak_detected). Callers must surface or act on them. */
  warnings: Array<{ type?: string; [k: string]: unknown }>
}

export interface UsePDFProcessorReturn {
  // Actions
  processFile: (file: File, options?: ProcessingOptions) => Promise<ProcessingResult>
  reset: () => void

  // State
  progress: ProcessingProgress
  redactionLog: RedactionResult[]
  metadata: PDFMetadata | null
  isProcessing: boolean
  error: string | null
  processingTimeMs: number | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_PROGRESS: ProcessingProgress = {
  percent: 0,
  currentPage: 0,
  totalPages: 0,
  stage: "idle",
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit for client-side processing
const SUPPORTED_TYPES = ["application/pdf"]

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function usePDFProcessor(): UsePDFProcessorReturn {
  // State
  const [progress, setProgress] = useState<ProcessingProgress>(INITIAL_PROGRESS)
  const [redactionLog, setRedactionLog] = useState<RedactionResult[]>([])
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null)

  // Refs
  const workerRef = useRef<Worker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Derived state
  const isProcessing = progress.stage === "loading" || progress.stage === "extracting" || progress.stage === "redacting"

  // ============================================================================
  // WORKER LIFECYCLE
  // ============================================================================

  const createWorker = useCallback(() => {
    // Terminate existing worker if any
    if (workerRef.current) {
      workerRef.current.terminate()
    }

    // Create new worker
    const worker = new Worker(new URL("@/workers/pdfWorker.ts", import.meta.url), { type: "module" })

    workerRef.current = worker
    return worker
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // ============================================================================
  // RESET
  // ============================================================================

  const reset = useCallback(() => {
    setProgress(INITIAL_PROGRESS)
    setRedactionLog([])
    setMetadata(null)
    setError(null)
    setProcessingTimeMs(null)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // ============================================================================
  // MAIN PROCESSING FUNCTION
  // ============================================================================

  const processFile = useCallback(
    async (file: File, options: ProcessingOptions = {}): Promise<ProcessingResult> => {
      // Reset state
      reset()

      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Validate file
      if (!SUPPORTED_TYPES.includes(file.type)) {
        const errorMsg = `Unsupported file type: ${file.type}. Only PDF files are accepted.`
        setError(errorMsg)
        setProgress({ ...INITIAL_PROGRESS, stage: "error" })
        throw new Error(errorMsg)
      }

      if (file.size > MAX_FILE_SIZE) {
        const errorMsg = `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`
        setError(errorMsg)
        setProgress({ ...INITIAL_PROGRESS, stage: "error" })
        throw new Error(errorMsg)
      }

      // Update progress
      setProgress({
        percent: 0,
        currentPage: 0,
        totalPages: 0,
        stage: "loading",
      })

      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()

        // Check for abort
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("Processing was cancelled")
        }

        // Create worker
        const worker = createWorker()

        // Process in worker
        return new Promise<ProcessingResult>((resolve, reject) => {
          // Handle abort
          const abortHandler = () => {
            worker.terminate()
            reject(new Error("Processing was cancelled"))
          }

          abortControllerRef.current?.signal.addEventListener("abort", abortHandler)

          // Handle worker messages
          worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { type, payload } = event.data

            switch (type) {
              case "PROGRESS":
                setProgress({
                  percent: payload.progress || 0,
                  currentPage: payload.currentPage || 0,
                  totalPages: payload.totalPages || 0,
                  stage: "extracting",
                })
                break

              case "COMPLETE":
                // Update state
                setProgress({
                  percent: 100,
                  currentPage: payload.extractedText
                    ? payload.extractedText.match(/--- Page \d+ ---/g)?.length || 0
                    : 0,
                  totalPages: payload.metadata?.pageCount || 0,
                  stage: "complete",
                })
                setRedactionLog(payload.redactionLog || [])
                setMetadata(payload.metadata || null)
                setProcessingTimeMs(payload.processingTimeMs || null)

                // Clean up
                abortControllerRef.current?.signal.removeEventListener("abort", abortHandler)

                // Resolve
                resolve({
                  cleanText: payload.extractedText || "",
                  redactionLog: payload.redactionLog || [],
                  metadata: payload.metadata || { pageCount: 0 },
                  processingTimeMs: payload.processingTimeMs || 0,
                  warnings: (payload.warnings as ProcessingResult["warnings"]) || [],
                })
                break

              case "ERROR":
                const errorMsg = payload.error || "Unknown error during PDF processing"
                setError(errorMsg)
                setProgress({ ...INITIAL_PROGRESS, stage: "error" })

                // Clean up
                abortControllerRef.current?.signal.removeEventListener("abort", abortHandler)

                reject(new Error(errorMsg))
                break
            }
          }

          // Handle worker errors
          worker.onerror = (event) => {
            const errorMsg = event.message || "Worker error occurred"
            setError(errorMsg)
            setProgress({ ...INITIAL_PROGRESS, stage: "error" })

            abortControllerRef.current?.signal.removeEventListener("abort", abortHandler)
            reject(new Error(errorMsg))
          }

          // Send file to worker
          worker.postMessage({
            type: "PROCESS_PDF",
            payload: {
              pdfData: arrayBuffer,
              options: {
                enableRedaction: options.enableRedaction ?? true,
                extractMetadata: options.extractMetadata ?? true,
                namesToRedact: options.namesToRedact || [],
              },
            },
          })
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to process PDF"
        setError(errorMsg)
        setProgress({ ...INITIAL_PROGRESS, stage: "error" })
        throw err
      }
    },
    [createWorker, reset],
  )

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    processFile,
    reset,
    progress,
    redactionLog,
    metadata,
    isProcessing,
    error,
    processingTimeMs,
  }
}

// ============================================================================
// UTILITY FUNCTIONS (exported for use in components)
// ============================================================================

/**
 * Format redaction log for display
 */
export function formatRedactionSummary(log: RedactionResult[]): string {
  if (log.length === 0) return "No PII detected"

  const total = log.reduce((sum, item) => sum + item.count, 0)
  const types = log.map((item) => `${item.count} ${item.pattern}`).join(", ")

  return `Redacted ${total} item(s): ${types}`
}

/**
 * Get redaction counts by category
 */
export function getRedactionCounts(log: RedactionResult[]): Record<string, number> {
  return log.reduce(
    (acc, item) => {
      acc[item.type] = item.count
      return acc
    },
    {} as Record<string, number>,
  )
}

/**
 * Check if processing found any sensitive data
 */
export function hasSensitiveData(log: RedactionResult[]): boolean {
  const sensitiveTypes = ["ssn", "dob", "address", "phone", "email"]
  return log.some((item) => sensitiveTypes.includes(item.type))
}

export default usePDFProcessor
