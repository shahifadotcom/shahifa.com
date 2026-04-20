
ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_platform_account_id_key UNIQUE (platform, account_id);
