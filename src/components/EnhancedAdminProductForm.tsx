import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CountryService } from '@/services/countryService';
import { ProductImageUpload } from '@/components/ProductImageUpload';
import { Sparkles, Loader2, Upload } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: () => void;
  product?: any; // For editing existing products
}

export const EnhancedAdminProductForm = ({ isOpen, onClose, categories, onSuccess, product }: ProductFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [paymentGateways, setPaymentGateways] = useState<any[]>([]);
  const [binanceEnabled, setBinanceEnabled] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    description: '',
    slug: '',
    
    // Pricing
    price: '',
    original_price: '',
    cost_price: '',
    shipping_cost: '',
    tax_rate: '',
    
    // Media
    images: [''],
    
    // Classification
    category_id: '',
    country_id: '',
    vendor_id: '',
    auto_order_enabled: false,
    allowed_payment_gateways: [] as string[],
    cash_on_delivery_enabled: false,
    virtual_trial_enabled: false,
    is_digital: false,
    print_on_demand: false,
    product_type: 'physical',
    download_url: '',
    brand: '',
    tags: '',
    
    // Inventory
    stock_quantity: '',
    sku: '',
    weight: '',
    ads_cost: '',
    delivery_charge: '',
    return_cost: '',
    packaging_cost: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    
    // SEO
    meta_title: '',
    meta_description: '',
    social_preview_image: ''
  });

  // Load countries, vendors, and payment gateways when component mounts
  useEffect(() => {
    const loadData = async () => {
      const countriesList = await CountryService.getAllCountries();
      setCountries(countriesList);
      
      // Load vendors
      const { data: vendorData, error } = await supabase
        .from('vendors')
        .select('id, name, is_active')
        .eq('is_active', true);
      
      if (!error && vendorData) {
        setVendors(vendorData);
      }

      // Load payment gateways
      const { data: gatewayData, error: gatewayError } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true);
      
      if (!gatewayError && gatewayData) {
        setPaymentGateways(gatewayData);
      }

      // Check if Binance Pay is configured
      const { data: binanceData, error: binanceError } = await supabase
        .from('binance_config')
        .select('is_active')
        .single();
      
      if (!binanceError && binanceData) {
        setBinanceEnabled(binanceData.is_active);
      }
    };
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Ensure the selected country (even if inactive) is present in the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const currentId = formData.country_id as string;
    if (
      currentId &&
      currentId !== 'all-countries' &&
      countries.length > 0 &&
      !countries.find((c: any) => c.id === currentId)
    ) {
      // Fetch the specific country by id (without filtering by is_active)
      supabase
        .from('countries')
        .select('*')
        .eq('id', currentId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setCountries((prev: any[]) => [...prev, data]);
        });
    }
  }, [isOpen, formData.country_id, countries]);

  // Load product data for editing (fetch fresh to ensure persisted fields like country_id)
  useEffect(() => {
    const init = async () => {
      if (isOpen && product) {
        // Fetch from products table (not products_catalog view) to include
        // admin-only cost fields: ads_cost, delivery_charge, return_cost,
        // packaging_cost, cost_price, vendor_id, etc.
        const { data: fresh, error: freshError } = await supabase
          .from('products')
          .select('*')
          .eq('id', product.id)
          .single();

        const p = !freshError && fresh ? fresh : product;

        setFormData({
          name: p.name || '',
          description: p.description || '',
          slug: p.slug || '',
          price: p.price?.toString() || '',
          original_price: p.original_price?.toString() || '',
          cost_price: p.cost_price?.toString() || '',
          shipping_cost: p.shipping_cost?.toString() || '',
          tax_rate: p.tax_rate?.toString() || '',
          images: p.images && p.images.length > 0 ? p.images : [''],
          category_id: p.category_id || '',
          country_id: p.country_id || 'all-countries',
          vendor_id: p.vendor_id || 'none',
          auto_order_enabled: p.auto_order_enabled || false,
          allowed_payment_gateways: p.allowed_payment_gateways || [],
          cash_on_delivery_enabled: p.cash_on_delivery_enabled || false,
          virtual_trial_enabled: p.virtual_trial_enabled || false,
          is_digital: p.is_digital || false,
          print_on_demand: p.print_on_demand || false,
          product_type: p.product_type || 'physical',
          download_url: p.download_url || '',
          brand: p.brand || '',
          tags: p.tags ? p.tags.join(', ') : '',
          stock_quantity: p.stock_quantity?.toString() || '',
          sku: p.sku || '',
          weight: p.weight?.toString() || '',
          ads_cost: p.ads_cost?.toString() || '',
          delivery_charge: p.delivery_charge?.toString() || '',
          return_cost: p.return_cost?.toString() || '',
          packaging_cost: p.packaging_cost?.toString() || '',
          dimensions: {
            length: p.dimensions?.length?.toString() || '',
            width: p.dimensions?.width?.toString() || '',
            height: p.dimensions?.height?.toString() || ''
          },
          meta_title: p.meta_title || '',
          meta_description: p.meta_description || '',
          social_preview_image: p.social_preview_image || ''
        });
      } else if (isOpen && !product) {
        // Reset form for new product
        setFormData({
          name: '', description: '', slug: '', price: '', original_price: '', cost_price: '', 
          shipping_cost: '', tax_rate: '', images: [''], category_id: '', country_id: 'all-countries', 
          vendor_id: 'none', auto_order_enabled: false,
          allowed_payment_gateways: [] as string[], cash_on_delivery_enabled: false,
          virtual_trial_enabled: false, is_digital: false, print_on_demand: false, product_type: 'physical', download_url: '',
          brand: '', tags: '', stock_quantity: '', sku: '', weight: '',
          ads_cost: '', delivery_charge: '', return_cost: '', packaging_cost: '',
          dimensions: { length: '', width: '', height: '' },
          meta_title: '', meta_description: '', social_preview_image: ''
        });
      }
    };

    init();
  }, [isOpen, product]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, formData.slug]);

  // Auto-generate meta title from name
  useEffect(() => {
    if (formData.name && !formData.meta_title) {
      setFormData(prev => ({ 
        ...prev, 
        meta_title: formData.name.substring(0, 60) 
      }));
    }
  }, [formData.name, formData.meta_title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.description || !formData.price || !formData.sku) {
        throw new Error('Please fill in all required fields');
      }

      // Validate slug uniqueness (only for new products or if slug changed)
      if (!product || product.slug !== formData.slug) {
        const { data: existingProduct } = await supabase
          .from('products_catalog')
          .select('id')
          .eq('slug', formData.slug)
          .single();

        if (existingProduct && existingProduct.id !== product?.id) {
          throw new Error('Product slug already exists. Please choose a different name or slug.');
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        slug: formData.slug,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : 0,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : 0,
        images: formData.images.filter(img => img.trim() !== ''),
        category_id: formData.category_id || null,
        country_id: formData.country_id && formData.country_id !== 'all-countries' ? formData.country_id : null,
        brand: formData.brand || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        sku: formData.sku,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        weight: formData.weight ? parseFloat(formData.weight) : null,
        ads_cost: formData.ads_cost ? parseFloat(formData.ads_cost) : 0,
        delivery_charge: formData.delivery_charge ? parseFloat(formData.delivery_charge) : 0,
        return_cost: formData.return_cost ? parseFloat(formData.return_cost) : 0,
        packaging_cost: formData.packaging_cost ? parseFloat(formData.packaging_cost) : 0,
        allowed_payment_gateways: formData.allowed_payment_gateways,
        cash_on_delivery_enabled: formData.cash_on_delivery_enabled,
        virtual_trial_enabled: formData.virtual_trial_enabled,
        is_digital: formData.is_digital,
        download_url: formData.download_url || null,
        vendor_id: formData.vendor_id && formData.vendor_id !== 'none' ? formData.vendor_id : null,
        auto_order_enabled: formData.auto_order_enabled,
        dimensions: {
          length: formData.dimensions.length ? parseFloat(formData.dimensions.length) : null,
          width: formData.dimensions.width ? parseFloat(formData.dimensions.width) : null,
          height: formData.dimensions.height ? parseFloat(formData.dimensions.height) : null
        },
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        social_preview_image: formData.social_preview_image || null,
        in_stock: parseInt(formData.stock_quantity) > 0,
        rating: 0,
        review_count: 0
      };

      let error;
      if (product) {
        // Update existing product
        ({ error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id));
      } else {
        // Create new product
        ({ error } = await supabase
          .from('products')
          .insert([productData]));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: product ? "Product updated successfully" : "Product added successfully with SEO optimization"
      });

      onClose();
      onSuccess();
      
      // Reset form
      setFormData({
        name: '', description: '', slug: '', price: '', original_price: '', cost_price: '', 
        shipping_cost: '', tax_rate: '', images: [''], category_id: '', country_id: 'all-countries', 
        vendor_id: 'none', auto_order_enabled: false,
        allowed_payment_gateways: [] as string[], cash_on_delivery_enabled: false,
        virtual_trial_enabled: false, is_digital: false, print_on_demand: false, product_type: 'physical', download_url: '',
        brand: '', tags: '', stock_quantity: '', sku: '', weight: '',
        ads_cost: '', delivery_charge: '', return_cost: '', packaging_cost: '',
        dimensions: { length: '', width: '', height: '' },
        meta_title: '', meta_description: '', social_preview_image: ''
      });
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async (type: string) => {
    if (!formData.name) {
      toast({ title: 'Please enter a product name first', variant: 'destructive' });
      return;
    }

    setAiLoading(true);
    try {
      const categoryName = categories.find(c => c.id === formData.category_id)?.name;
      
      const { data, error } = await supabase.functions.invoke('generate-product-seo', {
        body: {
          productName: formData.name,
          description: formData.description,
          category: categoryName,
          type
        }
      });

      if (error) throw error;

      if (type === 'all') {
        setFormData(prev => ({
          ...prev,
          name: data.result.title || prev.name,
          description: data.result.description || prev.description,
          meta_title: data.result.metaTitle || prev.meta_title,
          meta_description: data.result.metaDescription || prev.meta_description,
          tags: data.result.tags ? data.result.tags.join(', ') : prev.tags,
        }));
        toast({ title: 'All content generated successfully!' });
      } else if (type === 'tags') {
        setFormData(prev => ({ ...prev, tags: data.result.join(', ') }));
        toast({ title: 'Tags generated successfully!' });
      } else {
        setFormData(prev => ({ ...prev, [type]: data.result }));
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} generated successfully!` });
      }
    } catch (error: any) {
      toast({ title: 'Error generating content', description: error.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            {/* Basic Information */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Essential product details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter product name"
                        required
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => handleGenerateAI('title')}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="product-url-slug"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be used in the product URL. Auto-generated from name.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Enter detailed product description"
                          rows={4}
                          required
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => handleGenerateAI('description')}
                        disabled={aiLoading}
                      >
                        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          try {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `desc-${Date.now()}.${fileExt}`;
                            
                            const { error: uploadError } = await supabase.storage
                              .from('product-images')
                              .upload(fileName, file);

                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage
                              .from('product-images')
                              .getPublicUrl(fileName);

                            // Insert image markdown at cursor position
                            const imageMarkdown = `\n![Image](${publicUrl})\n`;
                            setFormData({ ...formData, description: formData.description + imageMarkdown });
                            toast({ title: 'Image uploaded!', description: 'Image added to description' });
                          } catch (error: any) {
                            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                          }
                        }}
                        className="hidden"
                        id="description-image-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('description-image-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Add Image
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Upload images to include in the description
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => handleGenerateAI('all')}
                      disabled={aiLoading}
                      className="w-full"
                    >
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Generate All with AI
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Enter brand name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Target Country</Label>
                    <Select value={formData.country_id} onValueChange={(value) => setFormData({ ...formData, country_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-countries">All Countries</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country.id} value={country.id}>
                            {country.name} ({country.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vendor">Vendor (Optional - For Auto Order)</Label>
                    <Select value={formData.vendor_id} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor for auto ordering" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Manual Order (No Auto Order)</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.vendor_id && formData.vendor_id !== 'none' && (
                      <div className="mt-2 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="auto_order_enabled"
                          checked={formData.auto_order_enabled}
                          onChange={(e) => setFormData({ ...formData, auto_order_enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="auto_order_enabled" className="text-sm">
                          Enable automatic order placement for this product
                        </Label>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="payment-gateways">Allowed Payment Gateways</Label>
                    <div className="space-y-2 mt-2">
                      {paymentGateways.map((gateway) => (
                        <div key={gateway.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`gateway-${gateway.id}`}
                            checked={formData.allowed_payment_gateways.includes(gateway.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  allowed_payment_gateways: [...formData.allowed_payment_gateways, gateway.name]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  allowed_payment_gateways: formData.allowed_payment_gateways.filter(g => g !== gateway.name)
                                });
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`gateway-${gateway.id}`} className="text-sm">
                            {gateway.display_name}
                          </Label>
                        </div>
                      ))}
                      {binanceEnabled && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="gateway-binance"
                            checked={formData.allowed_payment_gateways.includes('binance_pay')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  allowed_payment_gateways: [...formData.allowed_payment_gateways, 'binance_pay']
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  allowed_payment_gateways: formData.allowed_payment_gateways.filter(g => g !== 'binance_pay')
                                });
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="gateway-binance" className="text-sm">
                            Binance Pay
                          </Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="cash_on_delivery_enabled"
                          checked={formData.cash_on_delivery_enabled}
                          onChange={(e) => setFormData({ ...formData, cash_on_delivery_enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="cash_on_delivery_enabled" className="text-sm">
                          Enable Cash on Delivery (100 BDT advance required)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="virtual_trial_enabled"
                          checked={formData.virtual_trial_enabled}
                          onChange={(e) => setFormData({ ...formData, virtual_trial_enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="virtual_trial_enabled" className="text-sm">
                          Enable Virtual Try-On (AI-powered clothing trial)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_digital"
                          checked={formData.is_digital}
                          onChange={(e) => {
                            const isDigital = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              is_digital: isDigital,
                              product_type: isDigital ? 'digital' : formData.print_on_demand ? 'print_on_demand' : 'physical',
                              print_on_demand: isDigital ? false : formData.print_on_demand
                            });
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="is_digital" className="text-sm font-medium">
                          Digital Product (No physical shipping)
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-3">
                        <input
                          type="checkbox"
                          id="print_on_demand"
                          checked={formData.print_on_demand}
                          onChange={(e) => {
                            const isPOD = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              print_on_demand: isPOD,
                              product_type: isPOD ? 'print_on_demand' : formData.is_digital ? 'digital' : 'physical',
                              is_digital: isPOD ? false : formData.is_digital
                            });
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="print_on_demand" className="text-sm font-medium">
                          Print on Demand (Printed & shipped on order)
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Digital products are instant delivery. Print on Demand products are manufactured after order.
                    </p>
                    
                    {formData.is_digital && (
                      <div className="mt-4">
                        <Label htmlFor="download_url">Download URL (Optional - For Digital Downloads)</Label>
                        <Input
                          id="download_url"
                          value={formData.download_url}
                          onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                          placeholder="https://your-cdn.com/downloads/file.zip"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          For downloadable products like eBooks, software, etc. Leave empty for subscription services.
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Select which payment methods are available for this product. If none selected, all gateways will be available.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing */}
            <TabsContent value="pricing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Costs</CardTitle>
                  <CardDescription>Set pricing and cost information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Sale Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="original_price">Original Price</Label>
                      <Input
                        id="original_price"
                        type="number"
                        step="0.01"
                        value={formData.original_price}
                        onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost_price">Cost Price</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your cost to acquire/produce this product
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="shipping_cost">Shipping Cost</Label>
                      <Input
                        id="shipping_cost"
                        type="number"
                        step="0.01"
                        value={formData.shipping_cost}
                        onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media */}
            <TabsContent value="media" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                  <CardDescription>Upload or add product images</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductImageUpload
                    images={formData.images.filter(img => img.trim() !== '')}
                    onImagesChange={(images) => setFormData({ ...formData, images })}
                    maxImages={5}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory & Shipping</CardTitle>
                  <CardDescription>Stock and physical properties</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sku">SKU *</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Enter SKU"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ads_cost">Ads Cost (per unit)</Label>
                      <Input
                        id="ads_cost"
                        type="number"
                        step="0.01"
                        value={formData.ads_cost}
                        onChange={(e) => setFormData({ ...formData, ads_cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery_charge">Delivery Charge (per unit)</Label>
                      <Input
                        id="delivery_charge"
                        type="number"
                        step="0.01"
                        value={formData.delivery_charge}
                        onChange={(e) => setFormData({ ...formData, delivery_charge: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="return_cost">Return Cost (per unit)</Label>
                      <Input
                        id="return_cost"
                        type="number"
                        step="0.01"
                        value={formData.return_cost}
                        onChange={(e) => setFormData({ ...formData, return_cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="packaging_cost">Packaging Cost (per unit)</Label>
                      <Input
                        id="packaging_cost"
                        type="number"
                        step="0.01"
                        value={formData.packaging_cost}
                        onChange={(e) => setFormData({ ...formData, packaging_cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Dimensions (cm)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.dimensions.length}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          dimensions: { ...formData.dimensions, length: e.target.value }
                        })}
                        placeholder="Length"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.dimensions.width}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          dimensions: { ...formData.dimensions, width: e.target.value }
                        })}
                        placeholder="Width"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.dimensions.height}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          dimensions: { ...formData.dimensions, height: e.target.value }
                        })}
                        placeholder="Height"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO */}
            <TabsContent value="seo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Optimization</CardTitle>
                  <CardDescription>Optimize for search engines and social media</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="meta_title">Meta Title</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                      placeholder="SEO title (60 characters max)"
                      maxLength={60}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.meta_title.length}/60 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      placeholder="SEO description (160 characters max)"
                      maxLength={160}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.meta_description.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="social_preview_image">Social Media Preview Image</Label>
                    <Input
                      id="social_preview_image"
                      value={formData.social_preview_image}
                      onChange={(e) => setFormData({ ...formData, social_preview_image: e.target.value })}
                      placeholder="URL for social media sharing (1200x630 recommended)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used when product is shared on social media platforms
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding Product...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};