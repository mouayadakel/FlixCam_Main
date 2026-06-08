import { getConfiguredContactPhone, getConfiguredPhonePlaceholder } from '@/lib/utils/contact-phone'

type MessageValue = string | number | boolean | null | MessageValue[] | { [key: string]: MessageValue }

function replaceTokens(value: MessageValue, tokenMap: Record<string, string>): MessageValue {
  if (typeof value === 'string') {
    return tokenMap[value] ?? value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => replaceTokens(entry, tokenMap))
  }

  if (value && typeof value === 'object') {
    const replaced: Record<string, MessageValue> = {}
    for (const [key, entry] of Object.entries(value)) {
      replaced[key] = replaceTokens(entry, tokenMap)
    }
    return replaced
  }

  return value
}

export function applyRuntimeMessageValues<T extends Record<string, unknown>>(messages: T): T {
  const tokenMap: Record<string, string> = {
    __CONTACT_PHONE__: getConfiguredContactPhone(),
    __PHONE_PLACEHOLDER__: getConfiguredPhonePlaceholder(),
  }

  return replaceTokens(messages as MessageValue, tokenMap) as T
}
