// TronGrid API Service
// Gerçek blockchain bakiyeleri için

const TRONGRID_API_KEY = 'f8f57351-2bcf-428c-92d0-7d8652807847';
const TRONGRID_BASE_URL = 'https://api.trongrid.io';

// USDT TRC20 Contract Address
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

interface WalletBalance {
    trx: number;
    usdt: number;
}

// TRX bakiyesini al (sun olarak döner, /1e6 yapılmalı)
export const getTRXBalance = async (address: string): Promise<number> => {
    try {
        const response = await fetch(`${TRONGRID_BASE_URL}/v1/accounts/${address}`, {
            headers: {
                'TRON-PRO-API-KEY': TRONGRID_API_KEY
            }
        });
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            return (data.data[0].balance || 0) / 1e6; // sun -> TRX
        }
        return 0;
    } catch (error) {
        console.error('TRX balance error:', error);
        return 0;
    }
};

// USDT TRC20 bakiyesini al
export const getUSDTBalance = async (address: string): Promise<number> => {
    try {
        const response = await fetch(
            `${TRONGRID_BASE_URL}/v1/accounts/${address}/tokens?token_id=${USDT_CONTRACT}`,
            {
                headers: {
                    'TRON-PRO-API-KEY': TRONGRID_API_KEY
                }
            }
        );
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            // USDT has 6 decimals
            return (parseFloat(data.data[0].balance) || 0) / 1e6;
        }
        return 0;
    } catch (error) {
        console.error('USDT balance error:', error);
        return 0;
    }
};

// Hem TRX hem USDT bakiyesini al
export const getWalletBalance = async (address: string): Promise<WalletBalance> => {
    const [trx, usdt] = await Promise.all([
        getTRXBalance(address),
        getUSDTBalance(address)
    ]);
    return { trx, usdt };
};

// Son işlemleri al
export const getWalletTransactions = async (address: string, limit = 20) => {
    try {
        const response = await fetch(
            `${TRONGRID_BASE_URL}/v1/accounts/${address}/transactions/trc20?limit=${limit}&contract_address=${USDT_CONTRACT}`,
            {
                headers: {
                    'TRON-PRO-API-KEY': TRONGRID_API_KEY
                }
            }
        );
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Transactions error:', error);
        return [];
    }
};
