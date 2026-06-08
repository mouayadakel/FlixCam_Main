import { EmailService } from '@/lib/services/email.service'

type Args = {
  to: string[]
  attempts: number
  delayMs: number
}

function parseArgs(argv: string[]): Args {
  const to: string[] = []
  let attempts = 3
  let delayMs = 2000

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]

    if (token === '--to' && next) {
      to.push(
        ...next
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      )
      i += 1
      continue
    }

    if (token === '--attempts' && next) {
      const parsed = Number(next)
      if (Number.isFinite(parsed) && parsed > 0) attempts = Math.floor(parsed)
      i += 1
      continue
    }

    if (token === '--delay-ms' && next) {
      const parsed = Number(next)
      if (Number.isFinite(parsed) && parsed >= 0) delayMs = Math.floor(parsed)
      i += 1
      continue
    }
  }

  if (to.length === 0) {
    throw new Error('Missing --to. Example: --to "a@gmail.com,b@gmail.com"')
  }

  return { to, attempts, delayMs }
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  const subjectBase = `FlixCam email test – ${new Date().toISOString()}`
  const html = `<p>Test email from FlixCam. Timestamp: ${new Date().toISOString()}</p>`

  for (let attempt = 1; attempt <= args.attempts; attempt += 1) {
    // Send to each recipient (separately) to match EmailService expectations
    for (const recipient of args.to) {
      const subject = `${subjectBase} (attempt ${attempt}/${args.attempts})`
      const result = await EmailService.send({
        to: recipient,
        subject,
        html,
        logToMessageLog: true,
      })

      console.log(
        JSON.stringify(
          {
            attempt,
            to: recipient,
            ok: result.ok,
            error: result.error ?? null,
          },
          null,
          2
        )
      )

      if (!result.ok) {
        process.exitCode = 1
      }
    }

    if (attempt < args.attempts) {
      await sleep(args.delayMs)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

