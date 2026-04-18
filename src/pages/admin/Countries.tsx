import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Flag } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Countries = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: '',
    is_active: true
  });
  const [selectionEnabled, setSelectionEnabled] = useState<boolean>(true);
  const [settingsRowId, setSettingsRowId] = useState<string | null>(null);
  const [savingSetting, setSavingSetting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCountries();
    fetchSelectionSetting();
  }, []);

  const fetchSelectionSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('id, country_selection_enabled')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettingsRowId(data.id);
        setSelectionEnabled((data as any).country_selection_enabled ?? true);
      }
    } catch (err) {
      console.error('Error fetching selection setting:', err);
    }
  };

  const handleToggleSelection = async (checked: boolean) => {
    setSavingSetting(true);
    try {
      // Re-fetch the current settings row id to ensure we target an existing row
      const { data: existing } = await supabase
        .from('store_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      let updated: { id: string }[] | null = null;
      if (existing?.id) {
        const { error: updateError, data } = await supabase
          .from('store_settings')
          .update({ country_selection_enabled: checked })
          .eq('id', existing.id)
          .select('id');
        if (updateError) throw updateError;
        updated = data;
        setSettingsRowId(existing.id);
      }

      // If no row exists, insert one
      if (!updated || updated.length === 0) {
        const { error: insertError, data: inserted } = await supabase
          .from('store_settings')
          .insert({ country_selection_enabled: checked } as any)
          .select('id')
          .single();
        if (insertError) throw insertError;
        if (inserted?.id) setSettingsRowId(inserted.id);
      }

      setSelectionEnabled(checked);
      toast({
        title: 'Setting updated',
        description: checked
          ? 'Visitors will be asked to choose their country.'
          : 'Country will be auto-detected via IP/geolocation.',
      });
    } catch (err: any) {
      console.error('Error updating selection setting:', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to update country selection setting',
        variant: 'destructive',
      });
    } finally {
      setSavingSetting(false);
    }
  };

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');

      if (error) throw error;
      setCountries(data || []);
    } catch (error: any) {
      console.error('Error fetching countries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch countries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || !formData.currency) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingCountry) {
        // Update existing country
        const { error } = await supabase
          .from('countries')
          .update({
            name: formData.name,
            code: formData.code.toUpperCase(),
            currency: formData.currency.toUpperCase(),
            is_active: formData.is_active
          })
          .eq('id', editingCountry.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Country updated successfully"
        });
      } else {
        // Create new country
        const { error } = await supabase
          .from('countries')
          .insert({
            name: formData.name,
            code: formData.code.toUpperCase(),
            currency: formData.currency.toUpperCase(),
            is_active: formData.is_active
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Country added successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingCountry(null);
      setFormData({ name: '', code: '', currency: '', is_active: true });
      fetchCountries();
    } catch (error: any) {
      console.error('Error saving country:', error);
      toast({
        title: "Error",
        description: "Failed to save country",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
      code: country.code,
      currency: country.currency,
      is_active: country.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this country?')) return;

    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Country deleted successfully"
      });
      
      fetchCountries();
    } catch (error: any) {
      console.error('Error deleting country:', error);
      toast({
        title: "Error",
        description: "Failed to delete country",
        variant: "destructive"
      });
    }
  };

  const toggleCountryStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('countries')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Country ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
      
      fetchCountries();
    } catch (error: any) {
      console.error('Error updating country status:', error);
      toast({
        title: "Error",
        description: "Failed to update country status",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Flag className="h-8 w-8" />
                Countries Management
              </h1>
              <p className="text-muted-foreground">
                Manage countries, currencies, and regional settings
              </p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCountry(null);
                  setFormData({ name: '', code: '', currency: '', is_active: true });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCountry ? 'Edit Country' : 'Add New Country'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Country Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., United States"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="code">Country Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., US"
                      maxLength={3}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">Currency Code *</Label>
                    <Input
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                      placeholder="e.g., USD"
                      maxLength={3}
                      required
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCountry ? 'Update' : 'Add'} Country
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Country Selection Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <Label htmlFor="selection_enabled" className="text-base font-medium">
                    Ask visitors to choose their country
                  </Label>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    {selectionEnabled
                      ? 'Enabled: Visitors will see a country selection modal on their first visit.'
                      : "Disabled: The store will automatically detect the visitor's country using IP/geolocation."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="selection_enabled"
                    checked={selectionEnabled}
                    disabled={savingSetting}
                    onCheckedChange={handleToggleSelection}
                  />
                  <span className="text-sm font-medium">
                    {selectionEnabled ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Countries List</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No countries configured. Add your first country to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      countries.map((country) => (
                        <TableRow key={country.id}>
                          <TableCell className="font-medium">{country.name}</TableCell>
                          <TableCell className="font-mono">{country.code}</TableCell>
                          <TableCell className="font-mono">{country.currency}</TableCell>
                          <TableCell>
                            <Badge variant={country.is_active ? "default" : "secondary"}>
                              {country.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(country.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleCountryStatus(country.id, country.is_active)}
                              >
                                {country.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(country)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(country.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Country Management Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Countries are used throughout your store for various features:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Regional pricing and currency display</li>
                <li>Shipping calculations and restrictions</li>
                <li>Tax calculations based on location</li>
                <li>Product availability by region</li>
                <li>Payment gateway restrictions</li>
                <li>Geolocation and IP range mapping</li>
              </ul>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-950/50 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Deactivating a country will hide it from customer-facing features 
                  but preserve existing data. Use standard ISO country codes (2-3 letters) and currency codes (3 letters).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Countries;