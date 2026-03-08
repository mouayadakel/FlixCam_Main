/**
 * FLIXCAM brand theme – single source of truth for colors, assets, and UI tokens.
 * Used by Tailwind (via inline refs), site config, and PDF generators.
 */

import themeJson from './theme.json'

export interface ThemeColors {
  primary: string
  backgroundDark: string
  backgroundLight: string
  textOnDark: string
  textOnLight: string
  accent: string
}

export interface ThemeAssets {
  logoMain: string
  logoInverted: string
}

export interface ThemeUiStyle {
  borderRadius: string
  buttonStyle: string
  headerHeight: string
  fontFamily: string
}

export interface ThemeInvoiceSettings {
  primaryAccent: string
  showTagline: boolean
  layout: string
}

export interface Theme {
  brandName: string
  industry: string
  colors: ThemeColors
  assets: ThemeAssets
  uiStyle: ThemeUiStyle
  invoiceSettings: ThemeInvoiceSettings
}

export const theme: Theme = themeJson as Theme

export const brandColors = theme.colors
export const brandAssets = theme.assets
export const brandUiStyle = theme.uiStyle
export const invoiceTheme = theme.invoiceSettings
