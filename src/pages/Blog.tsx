import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[] | null;
  published_at: string;
  meta_title: string | null;
  meta_description: string | null;
}

export default function Blog() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, tags, published_at, meta_title, meta_description')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog - Latest Articles & Updates | shahifa Online Shop</title>
        <meta name="description" content="Read the latest articles, buying guides, and product updates from shahifa Online Shop." />
        <meta property="og:title" content="Blog - shahifa Online Shop" />
        <meta property="og:description" content="Latest articles, buying guides, and product updates from shahifa Online Shop." />
        <meta property="og:url" content="https://shahifa.com/blog" />
        <link rel="canonical" href="https://shahifa.com/blog" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "shahifa Online Shop Blog",
          "url": "https://shahifa.com/blog",
          "description": "Latest articles, buying guides, and product updates from shahifa Online Shop.",
          "hasPart": posts.map((p) => ({
            "@type": "BlogPosting",
            "headline": p.title,
            "url": `https://shahifa.com/blog/${p.slug}`,
            "datePublished": p.published_at,
            "image": p.featured_image || undefined,
          })),
        })}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Blog</h1>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-48 w-full mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No blog posts published yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/${countryCode}/blog/${post.slug}`}
                    className="group"
                  >
                    <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                      {post.featured_image && (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="p-6">
                        <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
