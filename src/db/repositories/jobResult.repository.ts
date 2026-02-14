import { query, queryOne } from '../connection.js';
import type { JobResult, Cookie } from '../../types/index.js';

interface JobResultRow {
  id: string;
  job_id: string;
  account_id: string; // Updated from organization_id
  status_code: number | null;
  status_text: string | null;
  headers: Record<string, string> | null;
  cookies: Cookie[] | null;
  content_type: string | null;
  content_length: string | null;
  content_encoding: string | null;
  final_url: string | null;
  redirect_count: number;
  content_storage_type: string;
  content_inline: string | null;
  content_minio_bucket: string | null;
  content_minio_key: string | null;
  content_hash: string | null;
  content_compressed: boolean;
  extracted_title: string | null;
  extracted_text: string | null;
  extracted_links: string[] | null;
  extracted_images: string[] | null;
  extracted_data: Record<string, unknown> | null;
  screenshot_minio_bucket: string | null;
  screenshot_minio_key: string | null;
  screenshot_width: number | null;
  screenshot_height: number | null;
  screenshot_format: string | null;
  pdf_minio_bucket: string | null;
  pdf_minio_key: string | null;
  pdf_page_count: number | null;
  dns_time_ms: number | null;
  connect_time_ms: number | null;
  tls_time_ms: number | null;
  ttfb_ms: number | null;
  download_time_ms: number | null;
  render_time_ms: number | null;
  total_time_ms: number | null;
  detection_score: string | null;
  protection_detected: string | null;
  captcha_encountered: boolean;
  captcha_type: string | null;
  captcha_solved: boolean;
  captcha_solve_time_ms: number | null;
  proxy_ip: string | null;
  proxy_country: string | null;
  proxy_provider: string | null;
  created_at: Date;
  expires_at: Date | null;
}

function rowToJobResult(row: JobResultRow): JobResult {
  return {
    id: row.id,
    jobId: row.job_id,
    accountId: row.account_id, // Updated from organizationId
    statusCode: row.status_code ?? undefined,
    statusText: row.status_text ?? undefined,
    headers: row.headers ?? undefined,
    cookies: row.cookies ?? undefined,
    contentType: row.content_type ?? undefined,
    contentLength: row.content_length ? parseInt(row.content_length, 10) : undefined,
    contentEncoding: row.content_encoding ?? undefined,
    finalUrl: row.final_url ?? undefined,
    redirectCount: row.redirect_count,
    contentStorageType: row.content_storage_type as 'inline' | 'minio' | 'none',
    contentInline: row.content_inline ?? undefined,
    contentMinioBucket: row.content_minio_bucket ?? undefined,
    contentMinioKey: row.content_minio_key ?? undefined,
    contentHash: row.content_hash ?? undefined,
    contentCompressed: row.content_compressed,
    extractedTitle: row.extracted_title ?? undefined,
    extractedText: row.extracted_text ?? undefined,
    extractedLinks: row.extracted_links ?? undefined,
    extractedImages: row.extracted_images ?? undefined,
    extractedData: row.extracted_data ?? undefined,
    screenshotMinioBucket: row.screenshot_minio_bucket ?? undefined,
    screenshotMinioKey: row.screenshot_minio_key ?? undefined,
    screenshotWidth: row.screenshot_width ?? undefined,
    screenshotHeight: row.screenshot_height ?? undefined,
    screenshotFormat: row.screenshot_format ?? undefined,
    pdfMinioBucket: row.pdf_minio_bucket ?? undefined,
    pdfMinioKey: row.pdf_minio_key ?? undefined,
    pdfPageCount: row.pdf_page_count ?? undefined,
    dnsTimeMs: row.dns_time_ms ?? undefined,
    connectTimeMs: row.connect_time_ms ?? undefined,
    tlsTimeMs: row.tls_time_ms ?? undefined,
    ttfbMs: row.ttfb_ms ?? undefined,
    downloadTimeMs: row.download_time_ms ?? undefined,
    renderTimeMs: row.render_time_ms ?? undefined,
    totalTimeMs: row.total_time_ms ?? undefined,
    detectionScore: row.detection_score ? parseFloat(row.detection_score) : undefined,
    protectionDetected: row.protection_detected ?? undefined,
    captchaEncountered: row.captcha_encountered,
    captchaType: row.captcha_type ?? undefined,
    captchaSolved: row.captcha_solved,
    captchaSolveTimeMs: row.captcha_solve_time_ms ?? undefined,
    proxyIp: row.proxy_ip ?? undefined,
    proxyCountry: row.proxy_country ?? undefined,
    proxyProvider: row.proxy_provider ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
  };
}

export const jobResultRepository = {
  async findById(id: string): Promise<JobResult | null> {
    const row = await queryOne<JobResultRow>(
      'SELECT * FROM job_results WHERE id = $1',
      [id]
    );
    return row ? rowToJobResult(row) : null;
  },

  async findByJobId(jobId: string): Promise<JobResult | null> {
    const row = await queryOne<JobResultRow>(
      'SELECT * FROM job_results WHERE job_id = $1',
      [jobId]
    );
    return row ? rowToJobResult(row) : null;
  },

  async create(data: {
    jobId: string;
    accountId: string; // Updated from organizationId
    statusCode?: number;
    statusText?: string;
    headers?: Record<string, string>;
    cookies?: Cookie[];
    contentType?: string;
    contentLength?: number;
    contentEncoding?: string;
    finalUrl?: string;
    redirectCount?: number;
    contentStorageType: 'inline' | 'minio' | 'none';
    contentInline?: string;
    contentMinioBucket?: string;
    contentMinioKey?: string;
    contentHash?: string;
    contentCompressed?: boolean;
    extractedTitle?: string;
    extractedText?: string;
    extractedLinks?: string[];
    extractedImages?: string[];
    extractedData?: Record<string, unknown>;
    screenshotMinioBucket?: string;
    screenshotMinioKey?: string;
    screenshotWidth?: number;
    screenshotHeight?: number;
    screenshotFormat?: string;
    totalTimeMs?: number;
    protectionDetected?: string;
    captchaEncountered?: boolean;
    captchaType?: string;
    captchaSolved?: boolean;
    proxyIp?: string;
    proxyCountry?: string;
    proxyProvider?: string;
  }): Promise<JobResult> {
    const row = await queryOne<JobResultRow>(
      `INSERT INTO job_results (
        job_id, account_id, status_code, status_text, headers, cookies,
        content_type, content_length, content_encoding, final_url, redirect_count,
        content_storage_type, content_inline, content_minio_bucket, content_minio_key,
        content_hash, content_compressed, extracted_title, extracted_text, extracted_links,
        extracted_images, extracted_data, screenshot_minio_bucket, screenshot_minio_key,
        screenshot_width, screenshot_height, screenshot_format, total_time_ms,
        protection_detected, captcha_encountered, captcha_type, captcha_solved,
        proxy_ip, proxy_country, proxy_provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
      RETURNING *`,
      [
        data.jobId,
        data.accountId, // Updated from organizationId
        data.statusCode ?? null,
        data.statusText ?? null,
        data.headers ? JSON.stringify(data.headers) : null,
        data.cookies ? JSON.stringify(data.cookies) : null,
        data.contentType ?? null,
        data.contentLength ?? null,
        data.contentEncoding ?? null,
        data.finalUrl ?? null,
        data.redirectCount ?? 0,
        data.contentStorageType,
        data.contentInline ?? null,
        data.contentMinioBucket ?? null,
        data.contentMinioKey ?? null,
        data.contentHash ?? null,
        data.contentCompressed ?? false,
        data.extractedTitle ?? null,
        data.extractedText ?? null,
        data.extractedLinks ? JSON.stringify(data.extractedLinks) : null,
        data.extractedImages ? JSON.stringify(data.extractedImages) : null,
        data.extractedData ? JSON.stringify(data.extractedData) : null,
        data.screenshotMinioBucket ?? null,
        data.screenshotMinioKey ?? null,
        data.screenshotWidth ?? null,
        data.screenshotHeight ?? null,
        data.screenshotFormat ?? null,
        data.totalTimeMs ?? null,
        data.protectionDetected ?? null,
        data.captchaEncountered ?? false,
        data.captchaType ?? null,
        data.captchaSolved ?? false,
        data.proxyIp ?? null,
        data.proxyCountry ?? null,
        data.proxyProvider ?? null,
      ]
    );

    if (!row) {
      throw new Error('Failed to create job result');
    }

    return rowToJobResult(row);
  },

  async deleteByJobId(jobId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM job_results WHERE job_id = $1',
      [jobId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteExpired(): Promise<number> {
    const result = await query(
      'DELETE FROM job_results WHERE expires_at < NOW()'
    );
    return result.rowCount ?? 0;
  },
};
