<div align="center">

<img src="assets/icon.png" alt="RunLab Logo" width="120" height="120" style="border-radius: 24px"/>

# RunLab

**O teu laboratório de corrida pessoal.**  
Planos de treino inteligentes, análise de performance e integração com Strava.

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat&logo=react)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)

</div>

---

## O que é o RunLab?

O RunLab gera planos de treino personalizados para corredores — desde iniciantes a avançados — com base no teu objetivo, nível de experiência e data da prova. Liga ao Strava para importar as tuas corridas automaticamente e acompanha a evolução da tua performance com estatísticas e estimativas de tempo de prova.

---

## Funcionalidades

### Plano de Treino
- Geração automática de plano semanal baseado no teu perfil
- Suporte a objetivos: 5K, 10K, meia-maratona e maratona
- Escolha de data da prova (presets, semanas custom ou calendário)
- Extensão de plano por semanas adicionais
- Marcação de treinos como completos / incompletos

### Integração Strava
- Conexão OAuth segura via Edge Functions (client secret nunca exposto)
- Importação de atividades de corrida com paginação
- Associação automática de corridas Strava a treinos do plano
- Visualização de pace, distância e duração de cada atividade

### Estatísticas & Performance
- Resumo de distância total, corridas e pace médio
- **Estimativas de tempo de prova** usando a Fórmula de Riegel
  - 5K · 10K · Meia Maratona · Maratona
- Baseado nas tuas corridas reais registadas

### Notificações
- Notificações push diárias às 8h para os próximos 7 dias de treino
- Toggle de ativação/desativação no perfil
- Mensagens personalizadas por tipo de treino

### Perfil & Onboarding
- Fluxo de onboarding guiado (objetivo → nível → dias por semana → data da prova)
- Edição de perfil completa
- Tema escuro nativo

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Mobile | React Native 0.81 + Expo SDK 54 |
| Routing | Expo Router v5 (file-based) |
| Estado | Zustand |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Edge Functions | Deno (Supabase) |
| Notificações | expo-notifications |
| Integração | Strava API v3 |
| Linguagem | TypeScript 5.9 strict |
| Build | EAS Build |

---

## Arquitetura

```
runlab/
├── app/
│   ├── (auth)/          # Login, registo, recuperação de password
│   ├── (onboarding)/    # Fluxo de onboarding (goal → race-date)
│   └── (tabs)/          # Tabs principais: Plano, Stats, Perfil
│
├── src/
│   ├── components/      # WorkoutDetailModal, etc.
│   ├── services/        # Supabase client, Strava API, notificações, gerador de planos
│   ├── stores/          # Zustand: authStore, profileStore, planStore, stravaStore
│   └── theme/           # Cores, espaçamentos, tipografia
│
├── supabase/
│   ├── functions/
│   │   ├── strava-exchange/   # OAuth: troca code → tokens (server-side)
│   │   └── strava-token/      # Refresh automático de access token
│   └── migrations/            # RLS policies
│
└── assets/              # Ícones, splash screen, logo
```

---

## Base de Dados (Supabase)

```sql
profiles            -- Perfil do utilizador (nível, objetivo, dias/semana, data da prova)
training_plans      -- Planos de treino gerados (título, objetivo, datas, semanas)
workouts            -- Treinos individuais (tipo, data, distância, pace, completo)
strava_connections  -- Tokens OAuth do Strava por utilizador
```

Todas as tabelas têm **Row Level Security (RLS)** ativo — cada utilizador só acede aos seus próprios dados.

---

## Configuração Local

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Conta [Supabase](https://supabase.com)
- App registada no [Strava Developers](https://developers.strava.com)

### Instalação

```bash
git clone https://github.com/marcorcs/runlab.git
cd runlab
npm install --legacy-peer-deps
```

### Variáveis de Ambiente

Cria um ficheiro `.env` na raiz:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=xxxxxxxxxxxxxxxx   # apenas para Edge Functions
```

### Base de Dados

Corre o SQL de RLS no Supabase Dashboard → SQL Editor:

```bash
supabase/migrations/20260507000001_rls_policies.sql
```

### Edge Functions (Strava OAuth)

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase secrets set STRAVA_CLIENT_ID=<id> STRAVA_CLIENT_SECRET=<secret>
npx supabase functions deploy strava-exchange
npx supabase functions deploy strava-token
```

### Iniciar

```bash
npm start
```

---

## Build de Produção (EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure

# Android (APK interno para testes)
eas build --platform android --profile preview

# Android (AAB para Play Store)
eas build --platform android --profile production
```

---

## Roadmap

- [x] Autenticação (email/password)
- [x] Onboarding guiado
- [x] Geração de plano de treino
- [x] Integração Strava (OAuth seguro via Edge Functions)
- [x] Marcação de treinos com dados do Strava
- [x] Estimativas de prova (Fórmula de Riegel)
- [x] Notificações push
- [x] RLS — segurança por utilizador
- [x] EAS Build
- [ ] Geração de plano com IA real (Claude / GPT)
- [ ] Submissão Play Store & App Store

---

## Licença

MIT © [Marco Soares](https://github.com/marcorcs)
