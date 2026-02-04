/**
 * @file auth-helpers.ts
 * @description Authentication helper functions for Supabase
 * @module lib/auth
 */

import { supabase } from '@/lib/supabase/client'
import * as bcrypt from 'bcryptjs'

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('Sign in error:', error)
      throw new Error(error.message || 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.')
    }
    
    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('حدث خطأ غير متوقع أثناء تسجيل الدخول')
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
      throw new Error(error.message || 'فشل تسجيل الخروج')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('حدث خطأ غير متوقع أثناء تسجيل الخروج')
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Get user error:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Unexpected error getting user:', error)
    return null
  }
}

/**
 * Get user role from user_roles table
 */
export async function getUserRole(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role:roles(*)')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('Get user role error:', error)
      // Return default role if not found
      return { name: 'client' }
    }

    const role = data && typeof data === 'object' && 'role' in data ? (data as { role?: { name: string } }).role : undefined
    return role ?? { name: 'client' }
  } catch (error) {
    console.error('Unexpected error getting user role:', error)
    return { name: 'client' }
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
