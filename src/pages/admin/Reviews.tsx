import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Star, Check, X, Plus, Image as ImageIcon } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  status: string;
  review_images: string[];
  created_at: string;
  products?: {
    name: string;
  };
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Custom review form
  const [customReview, setCustomReview] = useState({
    productId: '',
    userName: '',
    rating: 5,
    comment: '',
    images: [] as string[]
  });
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchReviews();
    fetchProducts();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          products(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products_catalog')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('product_reviews')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;
      
      toast.success('Review approved');
      fetchReviews();
    } catch (error) {
      console.error('Error approving review:', error);
      toast.error('Failed to approve review');
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('product_reviews')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;
      
      toast.success('Review rejected');
      fetchReviews();
    } catch (error) {
      console.error('Error rejecting review:', error);
      toast.error('Failed to reject review');
    }
  };

  const handleAddCustomReview = async () => {
    if (!customReview.productId || !customReview.userName || !customReview.comment) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: customReview.productId,
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          user_name: customReview.userName,
          rating: customReview.rating,
          comment: customReview.comment,
          review_images: customReview.images,
          status: 'approved', // Custom reviews are pre-approved
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Custom review added');
      setShowAddForm(false);
      setCustomReview({
        productId: '',
        userName: '',
        rating: 5,
        comment: '',
        images: []
      });
      fetchReviews();
    } catch (error) {
      console.error('Error adding custom review:', error);
      toast.error('Failed to add custom review');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `review-${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('review-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image');
      }
    }

    setCustomReview(prev => ({
      ...prev,
      images: [...prev.images, ...uploadedUrls]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center">Loading reviews...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Product Reviews</h1>
            <p className="text-muted-foreground">Manage and moderate customer reviews</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Review
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add Custom Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={customReview.productId}
                  onValueChange={(value) => setCustomReview({ ...customReview, productId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={customReview.userName}
                  onChange={(e) => setCustomReview({ ...customReview, userName: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCustomReview({ ...customReview, rating: star })}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= customReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comment</Label>
                <Textarea
                  value={customReview.comment}
                  onChange={(e) => setCustomReview({ ...customReview, comment: e.target.value })}
                  placeholder="Enter review comment"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Review Images (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                {customReview.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {customReview.images.map((url, idx) => (
                      <img key={idx} src={url} alt={`Review ${idx + 1}`} className="w-16 h-16 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddCustomReview}>Add Review</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {reviews.map(review => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {review.products?.name || 'Unknown Product'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      By {review.user_name || 'Anonymous'} • {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(review.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-sm">{review.comment}</p>

                {review.review_images && review.review_images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {review.review_images.map((url, idx) => (
                      <img key={idx} src={url} alt={`Review image ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                    ))}
                  </div>
                )}

                {review.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(review.id)}
                      className="gap-1"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(review.id)}
                      className="gap-1"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {reviews.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No reviews yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Reviews;