-- =============================================
-- P2P Timeout Cron Job Setup
-- =============================================
-- Bu script Supabase SQL Editor'de çalıştırılmalı
-- pg_cron extension ile her dakika p2p-timeout function'ı çağrılır
-- =============================================

-- 1. pg_cron extension'ı etkinleştir (zaten aktif olabilir)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. pg_net extension'ı etkinleştir (HTTP request için)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Mevcut cron job'ı sil (varsa)
SELECT cron.unschedule('p2p-timeout-job');

-- 4. Her dakika çalışacak cron job oluştur
SELECT cron.schedule(
    'p2p-timeout-job',           -- Job adı
    '* * * * *',                 -- Her dakika
    $$
    SELECT net.http_post(
        url:='https://bzbzcnyipynpkzaqauxd.supabase.co/functions/v1/p2p-timeout',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YnpjbnlpcHlucGt6YXFhdXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxMzU2MDQsImV4cCI6MjA0ODcxMTYwNH0.U73JnGaP2Bxvs_EOd9HLWdkqJFRWtv5NMqFXKlnxFBo"}'::jsonb,
        body:='{}'::jsonb
    ) AS request_id;
    $$
);

-- 5. Cron job'ları listele
SELECT * FROM cron.job;

-- =============================================
-- NOT: Bu script çalıştırıldıktan sonra
-- p2p-timeout function'ı her dakika çağrılacak
-- ve 20 dk'dan eski MATCHED/PAID order'lar EXPIRED yapılacak
-- =============================================
