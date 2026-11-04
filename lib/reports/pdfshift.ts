// Copied from ip-ai-pro-2026 (same owner). Keep the two in sync.
export async function convertWithExternalAPI(
  html: string,
  escapedFirmName = "Financial Advisory Firm",
  escapedDisclaimer = "",
  options: { fullBleed?: boolean; delay?: number } = {},
): Promise<Buffer> {
  const apiKey = process.env.PDF_API_KEY
  if (!apiKey) throw new Error("PDF service unavailable")
  const fullBleed = options.fullBleed ?? false
  const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Processor-Version": "142",
    },
    body: JSON.stringify({
      source: html,
      sandbox: false,
      format: "Letter",
      ...(options.delay != null && { delay: options.delay }),
      margin: fullBleed
        ? { top: "0", right: "0", bottom: "0", left: "0" }
        : { top: "0.5in", right: "0.5in", bottom: "0.8in", left: "0.5in" },
      css: "@page { size: letter; }",
      ...(!fullBleed && {
        footer: {
          source: `<table style="width: 100%; font-size: 6pt; font-family: Arial, sans-serif; border-top: 1px solid #e2e8f0; padding-top: 5px;"><tr><td style="width: 33%; text-align: left; color: #718096; padding-left: 6px;">${escapedFirmName}</td><td style="width: 34%; text-align: center; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em;">${escapedDisclaimer}</td><td style="width: 33%; text-align: right; color: #4a5568; padding-right: 6px;">Page {{page}} of {{total}}</td></tr></table>`,
          height: "0.6in",
        },
      }),
    }),
    signal: AbortSignal.timeout(45000),
  })
  if (!response.ok) throw new Error(`PDFShift API error: ${response.status} - ${await response.text().catch(() => "Unknown API error")}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.subarray(0, 4).toString() !== "%PDF") throw new Error("Generated content is not a valid PDF")
  return buffer
}
