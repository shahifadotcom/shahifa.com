DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Public can view non-sensitive product data" ON public.products;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can join own order channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'realtime:public:order-updates:' || auth.uid()::text
);

CREATE POLICY "Authenticated users can send own order channel presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'realtime:public:order-updates:' || auth.uid()::text
);

CREATE POLICY "Authenticated users can join own chat channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'realtime:public:chat-messages:' || auth.uid()::text
);

CREATE POLICY "Authenticated users can send own chat channel presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'realtime:public:chat-messages:' || auth.uid()::text
);

CREATE POLICY "Admins can join admin order channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'realtime:public:admin-order-updates'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can send admin order channel presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'realtime:public:admin-order-updates'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can join admin call channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'realtime:public:admin-call-logs'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can send admin call channel presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'realtime:public:admin-call-logs'
  AND public.has_role(auth.uid(), 'admin')
);