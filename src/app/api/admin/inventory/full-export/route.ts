import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const MASTER_FILE = 'Flixcam_invetory.xlsx'
const STOCK_FILE = 'Flix Stock invintory  (4).xlsx'
const OUTPUT_FILE = 'Flixcam_invetory.all-equipment.full-data.xlsx'

async function assertAdminPermission() {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const allowed = await hasPermission(session.user.id, PERMISSIONS.IMPORT_READ)
  if (!allowed) {
    return { error: NextResponse.json({ error: 'Forbidden - import.read required' }, { status: 403 }) }
  }

  return { error: null }
}

async function runMergeScript(cwd: string) {
  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(
      'node',
      [
        'scripts/merge-new-stock-into-flixcam.cjs',
        '--master',
        `./${MASTER_FILE}`,
        '--stock',
        `./${STOCK_FILE}`,
        '--out',
        `./${OUTPUT_FILE}`,
      ],
      { cwd, env: process.env }
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (error) => {
      reject(error)
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Merge script failed with exit code ${code}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

export async function POST() {
  const { error } = await assertAdminPermission()
  if (error) return error

  const cwd = process.cwd()
  const masterPath = path.join(cwd, MASTER_FILE)
  const stockPath = path.join(cwd, STOCK_FILE)
  const outputPath = path.join(cwd, OUTPUT_FILE)

  try {
    await fs.access(masterPath)
    await fs.access(stockPath)
  } catch {
    return NextResponse.json(
      {
        error: `Required files are missing. Expected ${MASTER_FILE} and ${STOCK_FILE} in project root.`,
      },
      { status: 400 }
    )
  }

  try {
    const { stdout } = await runMergeScript(cwd)
    const stats = await fs.stat(outputPath)

    return NextResponse.json({
      success: true,
      fileName: OUTPUT_FILE,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      downloadUrl: '/api/admin/inventory/full-export',
      log: stdout.split('\n').slice(-6).filter(Boolean),
    })
  } catch (err: any) {
    console.error('Failed generating full inventory export:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed generating full inventory export' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { error } = await assertAdminPermission()
  if (error) return error

  const outputPath = path.join(process.cwd(), OUTPUT_FILE)

  try {
    const fileBuffer = await fs.readFile(outputPath)
    const stats = await fs.stat(outputPath)
    const fileName = OUTPUT_FILE
    const shouldDownload = request.nextUrl.searchParams.get('download') === '1'

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': String(stats.size),
        'Cache-Control': 'no-store',
        'Content-Disposition': shouldDownload
          ? `attachment; filename="${fileName}"`
          : `inline; filename="${fileName}"`,
      },
    })
  } catch {
    return NextResponse.json(
      {
        error:
          'Full inventory export file does not exist yet. Generate it first using POST /api/admin/inventory/full-export.',
      },
      { status: 404 }
    )
  }
}
