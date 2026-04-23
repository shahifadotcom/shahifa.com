CREATE POLICY "Admins can join product stock channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'realtime:public:product-stock-changes'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can send product stock presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'realtime:public:product-stock-changes'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can join category change channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'realtime:public:products-page-category-changes'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can send category change presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'realtime:public:products-page-category-changes'
  AND public.has_role(auth.uid(), 'admin')
);