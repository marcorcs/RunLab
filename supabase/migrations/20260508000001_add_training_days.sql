-- Adiciona preferências de dias de treino ao perfil
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS training_days integer[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS long_run_day integer DEFAULT NULL;
