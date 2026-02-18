import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, CreditCard, Shield, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentMethod {
  id: string;
  payment_method_name: string;
  card_last_four: string;
  card_brand: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      // Only fetch non-sensitive display fields — never fetch encrypted_card_data
      const { data, error } = await supabase
        .from('saved_payment_methods')
        .select('id, payment_method_name, card_last_four, card_brand, expiry_month, expiry_year, is_default, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment methods.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentMethod = async (methodData: any) => {
    try {
      // SECURITY: Only store card reference metadata — never store full card numbers or CVV
      const paymentMethodData = {
        payment_method_name: methodData.payment_method_name,
        // Store a placeholder — actual card processing must use a payment gateway tokenization
        encrypted_card_data: '[tokenized-via-payment-gateway]',
        card_last_four: methodData.cardLastFour,
        card_brand: methodData.card_brand,
        expiry_month: parseInt(methodData.expiryMonth),
        expiry_year: parseInt(methodData.expiryYear),
        is_default: methodData.is_default,
        is_active: true
      };

      if (editingMethod) {
        const { error } = await supabase
          .from('saved_payment_methods')
          .update(paymentMethodData)
          .eq('id', editingMethod.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment method updated successfully."
        });
      } else {
        const { error } = await supabase
          .from('saved_payment_methods')
          .insert(paymentMethodData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment method reference added successfully."
        });
      }

      fetchPaymentMethods();
      setShowForm(false);
      setEditingMethod(null);
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      toast({
        title: "Error",
        description: "Failed to save payment method.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method deleted successfully."
      });

      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method.",
        variant: "destructive"
      });
    }
  };

  const setAsDefault = async (methodId: string) => {
    try {
      await supabase
        .from('saved_payment_methods')
        .update({ is_default: false })
        .neq('id', methodId);

      const { error } = await supabase
        .from('saved_payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default payment method updated."
      });

      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Error",
        description: "Failed to update default payment method.",
        variant: "destructive"
      });
    }
  };

  const PaymentMethodForm = ({ method, onSave, onClose }: any) => {
    const [formData, setFormData] = useState({
      payment_method_name: method?.payment_method_name || '',
      cardLastFour: method?.card_last_four || '',
      expiryMonth: method?.expiry_month?.toString() || '',
      expiryYear: method?.expiry_year?.toString() || '',
      card_brand: method?.card_brand || 'visa',
      is_default: method?.is_default || false
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      // Validate last four digits only
      if (!/^\d{4}$/.test(formData.cardLastFour)) {
        toast({
          title: "Error",
          description: "Please enter the last 4 digits of the card.",
          variant: "destructive"
        });
        return;
      }

      if (!formData.expiryMonth || !formData.expiryYear) {
        toast({
          title: "Error",
          description: "Please select an expiry date.",
          variant: "destructive"
        });
        return;
      }

      onSave(formData);
    };

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {method ? 'Edit Payment Method' : 'Add Payment Method Reference'}
            </DialogTitle>
            <DialogDescription>
              Store a reference to your payment method. Full card data should be managed through your payment gateway.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              For security, only the last 4 digits are stored. Full card numbers and CVV are never saved in the database.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="payment_method_name">Payment Method Name</Label>
              <Input
                id="payment_method_name"
                value={formData.payment_method_name}
                onChange={(e) => setFormData({ ...formData, payment_method_name: e.target.value.substring(0, 100) })}
                placeholder="e.g., Business Visa Card"
                required
              />
            </div>

            <div>
              <Label htmlFor="cardLastFour">Last 4 Digits</Label>
              <Input
                id="cardLastFour"
                value={formData.cardLastFour}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                  setFormData({ ...formData, cardLastFour: value });
                }}
                placeholder="4242"
                maxLength={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Only the last 4 digits for identification purposes</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Select value={formData.expiryMonth} onValueChange={(value) => setFormData({ ...formData, expiryMonth: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Select value={formData.expiryYear} onValueChange={(value) => setFormData({ ...formData, expiryYear: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="card_brand">Card Brand</Label>
              <Select value={formData.card_brand} onValueChange={(value) => setFormData({ ...formData, card_brand: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="amex">American Express</SelectItem>
                  <SelectItem value="discover">Discover</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <Label htmlFor="is_default">Set as default payment method</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {method ? 'Update' : 'Add'} Payment Method
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Payment Methods</h1>
            <p className="text-muted-foreground">Manage saved payment method references for dropshipping automation</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>

        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> This section stores only card reference metadata (last 4 digits, brand, expiry). 
            Full card processing must be handled through a PCI-compliant payment gateway such as Stripe.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {paymentMethods.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No payment methods saved. Add a payment method reference to enable automatic order processing.</p>
              </CardContent>
            </Card>
          ) : (
            paymentMethods.map((method) => (
              <Card key={method.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6" />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {method.payment_method_name}
                          {method.is_default && (
                            <Badge variant="default">Default</Badge>
                          )}
                          <Badge variant={method.is_active ? "outline" : "secondary"}>
                            {method.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </CardTitle>
                        <p className="text-muted-foreground">
                          {method.card_brand.toUpperCase()} •••• {method.card_last_four}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!method.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAsDefault(method.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMethod(method);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePaymentMethod(method.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Expires</p>
                      <p className="text-muted-foreground">
                        {method.expiry_month.toString().padStart(2, '0')}/{method.expiry_year}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Card Brand</p>
                      <p className="text-muted-foreground capitalize">{method.card_brand}</p>
                    </div>
                    <div>
                      <p className="font-medium">Added</p>
                      <p className="text-muted-foreground">
                        {new Date(method.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {showForm && (
          <PaymentMethodForm
            method={editingMethod}
            onSave={handleSavePaymentMethod}
            onClose={() => {
              setShowForm(false);
              setEditingMethod(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default PaymentMethods;
