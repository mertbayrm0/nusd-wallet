export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'payment_sent' | 'payment_received' | 'crypto_withdraw' | 'crypto_deposit';
  amount: number;
  currency: string;
  date: string;
  status: 'completed' | 'pending' | 'failed' | 'waiting_confirmation';
  title: string;
  counterparty?: string;
  owner?: string;
  fee?: number;
  method?: 'instant' | 'standard' | 'p2p' | 'crypto';
}

export interface UserState {
  balance: number;
  email: string;
  name: string;
  role?: string;
  isActive?: boolean;
  createdAt?: number;
  trxAddress?: string;
  account_type?: 'personal' | 'business';
  business_name?: string;
  business_department_id?: string;
  nusd_code?: string;
  id?: string;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'open' | 'locked' | 'pending_approval' | 'completed';
  lockedBy?: string;
  createdAt: number;
  hasReceipt?: boolean;
  paymentTime?: number;
}

export interface SystemState {
  totalRevenue: number;
  totalUsers: number;
  totalVolume: number;
}
