#!/usr/bin/env bash
# Kaydettiğiniz Lovable + Supabase dəyişənlərini bir anda yükləyir.

export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtemRnY3VtdmRucW9kcnlobXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMzk3MDgsImV4cCI6MjA3NTgxNTcwOH0.mVjRpsU_BnPEtL3UeZPkM4jjbslNbishgHwCbcC85MA"
export RASPBERRY_PI_DEVICE_ID="raspi-001"
export RASPBERRY_PI_API_KEY="a7b8c9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5d"
export RASPBERRY_PI_ENDPOINT="https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection"

# Supabase helper istifadə etmədiyiniz üçün bu dəyişənlər söndürülür.
unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_TABLE SUPABASE_STORAGE_BUCKET \
  SUPABASE_STORAGE_PREFIX SUPABASE_PENDING_PATH

# İstəyə görə yeni terminala xatırlatma
if [[ -n "$PROMPT_COMMAND" ]]; then
  PROMPT_COMMAND='echo "[pi-env] Lovable/Supabase mühiti yükləndi"; unset PROMPT_COMMAND'
fi
