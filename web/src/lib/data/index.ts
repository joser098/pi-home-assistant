import { config, isKioskMode } from '../config';
import type { DataSource } from '../types';
import { MockDataSource } from './mock';
import { SupabaseDataSource } from './supabase';

export const kiosk = isKioskMode();

export const data: DataSource = config.mock
  ? new MockDataSource(kiosk)
  : new SupabaseDataSource(config.supabaseUrl!, config.supabaseAnonKey!);
