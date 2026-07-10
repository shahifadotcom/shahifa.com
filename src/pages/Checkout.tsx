import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { OTPVerificationModal } from '@/components/OTPVerificationModal';
import { PaymentSelector } from '@/components/payment/PaymentSelector';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { SuggestedProducts } from '@/components/SuggestedProducts';
import { z } from 'zod';
import { usePageHead } from '@/hooks/usePageHead';

interface CheckoutFormData {
  country: string;
  fullName: string;
  fullAddress: string;
  whatsappNumber: string;
}

const Checkout = () => {
  usePageHead({
    title: 'Checkout — review your order | shahifa Online Shop',
    description: 'Securely complete your order at shahifa Online Shop with cash on delivery and trusted online payment options.',
    path: '/checkout',
    noindex: true,
  });
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedCountry, currency, allCountries } = useCountryDetection();
  
  const [formData, setFormData] = useState<CheckoutFormData>({
    country: selectedCountry?.name || 'Bangladesh',
    fullName: user?.user_metadata?.full_name || '',
    fullAddress: '',
    whatsappNumber: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [selectedPaymentIsCOD, setSelectedPaymentIsCOD] = useState(false);

  // Auto-update country and phone when selectedCountry changes
  useEffect(() => {
    if (selectedCountry) {
      setFormData(prev => ({
        ...prev,
        country: selectedCountry.name,
        whatsappNumber: '' // Reset phone number when country changes
      }));
    }
  }, [selectedCountry]);

  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const { applied: coupon, apply: applyCoupon, discountFor, error: couponError, clear: clearCoupon } = useCoupons();
  const [couponCode, setCouponCode] = useState('');
  const couponDiscount = discountFor(subtotal);
  const total = Math.max(0, subtotal - couponDiscount);

  const handleOTPVerified = async (phoneNumber: string, otpCode: string) => {
    setShowOTPModal(false);
    setIsProcessing(true);

    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    try {
      // Verify OTP via Edge Function to bypass RLS and ensure consistent behavior across domains
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phoneNumber: normalizedPhone, otpCode }
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Invalid or expired OTP');
      }

      // Update profile with phone number for customer tracking (if logged in)
      if (user) {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, phone_number: normalizedPhone, email: user.email }, { onConflict: 'id' });
      }

      setShowPaymentSection(true);
      toast({ title: 'Phone Verified!', description: 'Please complete payment to place your order.' });
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired OTP. Please try again.',
        variant: 'destructive',
      });
      setShowOTPModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCODSelected = () => {
    setSelectedPaymentIsCOD(true);
  };

  const handlePaymentSubmitted = async (orderId: string) => {
    // Payment verified and order created, complete the checkout
    clearCart();
    
    // Save orderId to localStorage for order-success page
    localStorage.setItem('lastOrderId', orderId);
    
    // Navigate to order-success without orderId in URL
    navigate('/order-success');
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Country flag mapping
  const countryFlags: { [key: string]: string } = {
    BD: '🇧🇩',
    US: '🇺🇸',
    GB: '🇬🇧',
    IN: '🇮🇳',
    PK: '🇵🇰',
    AU: '🇦🇺',
    CA: '🇨🇦',
    AE: '🇦🇪',
    SA: '🇸🇦',
    MY: '🇲🇾',
    SG: '🇸🇬',
  };

  const checkoutSchema = z.object({
    country: z.string().min(1, "Country is required"),
    fullName: z.string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters")
      .regex(/^[a-zA-Z\s]+$/, "Full name can only contain letters and spaces"),
    fullAddress: z.string()
      .trim()
      .min(10, "Please provide a complete address")
      .max(500, "Address must be less than 500 characters"),
    whatsappNumber: z.string()
      .min(10, "Invalid phone number")
      .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive"
      });
      return;
    }

    // Validate form data
    const validationResult = checkoutSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const errorMessages = Object.values(errors).flat();
      toast({
        title: "Validation Error",
        description: errorMessages[0] || "Please check your input",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setShowOTPModal(true);

    try {
      // Normalize phone number: remove all spaces, dashes, parentheses
      const normalizedPhone = formData.whatsappNumber.replace(/[\s\-\(\)]/g, '');
      
      const { error } = await supabase.functions.invoke('send-otp', {
        body: { phoneNumber: normalizedPhone }
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: "Please check your WhatsApp for the verification code."
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">Add some products to your cart to proceed with checkout.</p>
            <Button onClick={() => navigate('/')}>Continue Shopping</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">
            {showPaymentSection ? 'Complete Payment' : 'Checkout'}
          </h1>
          {selectedCountry && (
            <p className="text-muted-foreground">
              Shopping from {selectedCountry.name} • Currency: {currency}
            </p>
          )}
        </div>

        {showPaymentSection ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Phone Verified Successfully
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Your phone number has been verified. Please complete the payment to place your order.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Order Total:</span>
                    <span className="font-bold text-lg">{total.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PaymentSelector
              orderAmount={total}
              productIds={cart.items.map(item => item.productId)}
              countryId={allCountries.find(c => c.name === formData.country)?.id || selectedCountry?.id || ''}
              onPaymentSubmitted={handlePaymentSubmitted}
              onCODSelected={handleCODSelected}
              customerData={formData}
              cartItems={cart.items}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                    <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border">
                        {allCountries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {countryFlags[country.code] || '🌍'}
                              </span>
                              {country.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullAddress">Full Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="fullAddress"
                      value={formData.fullAddress}
                      onChange={(e) => handleInputChange('fullAddress', e.target.value)}
                      required
                      placeholder="Enter your complete address"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="whatsappNumber">WhatsApp Number <span className="text-red-500">*</span></Label>
                    <div className="mt-1">
                      <PhoneInput
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry={(selectedCountry?.code || 'BD') as any}
                        value={formData.whatsappNumber}
                        onChange={(value) => handleInputChange('whatsappNumber', value || '')}
                        className="[&_.PhoneInputInput]:flex [&_.PhoneInputInput]:h-10 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:rounded-md [&_.PhoneInputInput]:border [&_.PhoneInputInput]:border-input [&_.PhoneInputInput]:bg-background [&_.PhoneInputInput]:px-3 [&_.PhoneInputInput]:py-2 [&_.PhoneInputInput]:text-sm"
                        placeholder="Enter WhatsApp number"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={`${item.productId}-${item.variant?.id || 'default'}`} className="flex gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground">{item.variant.value}</p>
                        )}
                        <p className="text-sm">Qty: {item.quantity}</p>
                      </div>
                        <div className="text-sm font-medium">
                          {(item.price * item.quantity).toFixed(2)} {currency}
                        </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{subtotal.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Delivery Charge</span>
                    <span>FREE</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{total.toFixed(2)} {currency}</span>
                  </div>
                  {selectedPaymentIsCOD && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        ℹ️ For COD orders: Pay 100 {currency} as confirmation fee (non-refundable if products not received)
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isProcessing}
                  onClick={handleSubmit}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <span>{`Place Order - ${total.toFixed(2)} ${currency}`}</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Suggested Products Section */}
        {!showPaymentSection && (
          <div className="mt-8">
            <SuggestedProducts 
              currentProductIds={cart.items.map(item => item.productId)}
              limit={8}
            />
          </div>
        )}

        <OTPVerificationModal
          isOpen={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          phoneNumber={formData.whatsappNumber.replace(/[\s\-\(\)]/g, '')}
          onVerificationSuccess={handleOTPVerified}
          orderData={{
            ...formData,
            items: cart.items,
            subtotal,
            total,
            email: user?.email || ''
          }}
        />
      </div>
    </div>
  );
};

export default Checkout;
