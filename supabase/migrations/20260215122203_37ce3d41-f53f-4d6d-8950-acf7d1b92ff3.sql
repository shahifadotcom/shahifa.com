
-- Must drop and recreate since column positions changed
DROP VIEW IF EXISTS public.products_catalog;

CREATE VIEW public.products_catalog
WITH (security_invoker=on) AS
SELECT 
    id,
    name,
    description,
    price,
    original_price,
    images,
    category_id,
    subcategory_id,
    country_id,
    sku,
    stock_quantity,
    in_stock,
    is_digital,
    product_type,
    print_on_demand,
    download_url,
    virtual_trial_enabled,
    auto_order_enabled,
    rating,
    review_count,
    tags,
    brand,
    weight,
    dimensions,
    slug,
    meta_title,
    meta_description,
    social_preview_image,
    shipping_cost,
    tax_rate,
    cash_on_delivery_enabled,
    allowed_payment_gateways,
    created_at,
    updated_at
FROM products;

-- Grant SELECT on the updated view
GRANT SELECT ON public.products_catalog TO anon, authenticated;
