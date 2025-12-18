-- Exchange Rates Güvenlik Politikaları (EK)
-- Dışardan kur manipülasyonunu önlemek için

-- UPDATE sadece service_role kullanabilir
CREATE POLICY "exchange_rates_service_update" ON exchange_rates
    FOR UPDATE WITH CHECK (auth.role() = 'service_role');

-- DELETE sadece service_role kullanabilir
CREATE POLICY "exchange_rates_service_delete" ON exchange_rates
    FOR DELETE USING (auth.role() = 'service_role');

-- Mevcut politikaları kontrol et
-- SELECT * FROM pg_policies WHERE tablename = 'exchange_rates';
