import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SPREAD = 0.10; // 0.10 TRY spread (her iki yön için)

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with service role key
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch USDT/TRY rate from CoinGecko
        console.log('[UpdateExchangeRate] Fetching rate from CoinGecko...')

        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=try',
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NUSD-Wallet/1.0'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`)
        }

        const data = await response.json()
        const rate = data?.tether?.try

        if (!rate || typeof rate !== 'number') {
            throw new Error('Invalid rate data from CoinGecko')
        }

        console.log(`[UpdateExchangeRate] Market rate: ${rate} TRY`)

        // Calculate buy and sell rates with spread
        const buyRate = rate + SPREAD;   // Kullanıcı USDT alırken (+0.10 TRY daha fazla öder)
        const sellRate = rate - SPREAD;  // Kullanıcı USDT satarken (-0.10 TRY daha az alır)

        console.log(`[UpdateExchangeRate] Buy rate: ${buyRate} TRY (market + ${SPREAD})`)
        console.log(`[UpdateExchangeRate] Sell rate: ${sellRate} TRY (market - ${SPREAD})`)

        // Insert new rate into database
        const { data: insertedRate, error: insertError } = await supabase
            .from('exchange_rates')
            .insert({
                pair: 'USDT/TRY',
                rate: rate,
                buy_rate: buyRate,
                sell_rate: sellRate,
                spread: SPREAD,
                source: 'coingecko',
                fetched_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            console.error('[UpdateExchangeRate] Insert error:', insertError)
            throw insertError
        }

        console.log('[UpdateExchangeRate] Rate saved successfully')

        // Cleanup old rates (keep only last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        await supabase
            .from('exchange_rates')
            .delete()
            .lt('fetched_at', twentyFourHoursAgo)

        return new Response(
            JSON.stringify({
                success: true,
                rate: rate,
                buy_rate: buyRate,
                sell_rate: sellRate,
                spread: SPREAD,
                fetched_at: new Date().toISOString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('[UpdateExchangeRate] Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
