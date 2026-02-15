import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Sitemap() {
  const [sitemapXML, setSitemapXML] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSitemap();
  }, []);

  const generateSitemap = async () => {
    try {
      // Get SEO settings
      const { data: seoSettings } = await supabase
        .from('seo_settings')
        .select('*')
        .single();

      const baseUrl = seoSettings?.canonical_url || window.location.origin;

      // Get all active products
      const { data: products } = await supabase
        .from('products_catalog')
        .select('slug, updated_at')
        .eq('in_stock', true);

      // Get all categories
      const { data: categories } = await supabase
        .from('categories')
        .select('slug, updated_at');

      // Get all active countries for routing
      const { data: countries } = await supabase
        .from('countries')
        .select('code')
        .eq('is_active', true);

      const countryRoutes = countries?.map(c => c.code.toLowerCase()) || [];

      // Generate sitemap XML
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Country-specific home pages -->
  ${countryRoutes.map(code => `
  <url>
    <loc>${baseUrl}/${code}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`).join('')}
  
  <!-- Categories -->
  ${categories?.map(category => `
  <url>
    <loc>${baseUrl}/categories/${category.slug}</loc>
    <lastmod>${category.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('') || ''}
  
  <!-- Products - with country variants -->
  ${products?.map(product => 
    countryRoutes.map(code => `
  <url>
    <loc>${baseUrl}/${code}/products/${product.slug}</loc>
    <lastmod>${product.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')
  ).join('') || ''}
  
  <!-- Static pages -->
  <url>
    <loc>${baseUrl}/auth</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/orders</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  
</urlset>`;

      setSitemapXML(sitemap);
      setLoading(false);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      setSitemapXML('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set content type for sitemap
    if (!loading && sitemapXML) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Type';
      meta.content = 'application/xml; charset=utf-8';
      document.head.appendChild(meta);
      
      return () => {
        document.head.removeChild(meta);
      };
    }
  }, [loading, sitemapXML]);

  if (loading) {
    return <div>Loading sitemap...</div>;
  }

  return (
    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
      {sitemapXML}
    </pre>
  );
}
