import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, DollarSign, TrendingUp, AlertTriangle, ShoppingCart, Search } from 'lucide-react';

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number | null;
  ads_cost: number | null;
  delivery_charge: number | null;
  return_cost: number | null;
  packaging_cost: number | null;
}

interface SalesAgg {
  product_id: string;
  units_sold: number;
  revenue: number;
}

type SalesFilter = 'paid' | 'fulfilled' | 'all';

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );

const InventoryDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [sales, setSales] = useState<Record<string, SalesAgg>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMode, setAllMode] = useState(true);
  const [search, setSearch] = useState('');
  const [salesFilter, setSalesFilter] = useState<SalesFilter>('paid');

  const [rawItems, setRawItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: prods, error: pErr } = await supabase
          .from('products')
          .select('id, name, sku, price, cost_price, stock_quantity, ads_cost, delivery_charge, return_cost, packaging_cost')
          .order('name', { ascending: true });
        if (pErr) throw pErr;

        const { data: items, error: iErr } = await supabase
          .from('order_items')
          .select('product_id, quantity, price, orders(status, payment_status)');
        if (iErr) throw iErr;

        setProducts((prods || []) as ProductRow[]);
        setRawItems(items || []);
      } catch (e: any) {
        toast({ title: 'Failed to load inventory', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  // Re-aggregate sales when filter changes
  useEffect(() => {
    const agg: Record<string, SalesAgg> = {};
    rawItems.forEach((it: any) => {
      if (!it.product_id) return;
      const status = it.orders?.status;
      const payStatus = it.orders?.payment_status;
      if (status === 'cancelled' || status === 'refunded') return;
      if (salesFilter === 'paid' && payStatus !== 'paid') return;
      if (salesFilter === 'fulfilled' && !['delivered', 'shipped'].includes(status)) return;
      const cur = agg[it.product_id] || { product_id: it.product_id, units_sold: 0, revenue: 0 };
      const qty = Number(it.quantity) || 0;
      const price = Number(it.price) || 0;
      cur.units_sold += qty;
      cur.revenue += qty * price;
      agg[it.product_id] = cur;
    });
    setSales(agg);
  }, [rawItems, salesFilter]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }, [products, search]);

  const activeProducts = useMemo(
    () => (allMode ? products : products.filter((p) => selected.has(p.id))),
    [products, selected, allMode]
  );

  const totals = useMemo(() => {
    let stockUnits = 0;
    let stockValue = 0;
    let totalCosts = 0;
    let revenue = 0;
    let unitsSold = 0;
    let lowStock = 0;

    activeProducts.forEach((p) => {
      const qty = p.stock_quantity || 0;
      const sold = sales[p.id]?.units_sold || 0;
      const rev = sales[p.id]?.revenue || 0;
      const perUnitCost =
        (p.cost_price || 0) +
        (p.ads_cost || 0) +
        (p.delivery_charge || 0) +
        (p.return_cost || 0) +
        (p.packaging_cost || 0);
      stockUnits += qty;
      stockValue += qty * (p.cost_price || 0);
      totalCosts += sold * perUnitCost;
      revenue += rev;
      unitsSold += sold;
      if (qty <= 5) lowStock += 1;
    });

    const profit = revenue - totalCosts;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { stockUnits, stockValue, totalCosts, revenue, unitsSold, profit, margin, lowStock };
  }, [activeProducts, sales]);

  const toggleProduct = (id: string) => {
    setAllMode(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setAllMode(true);
    setSelected(new Set());
  };

  const clearAll = () => {
    setAllMode(false);
    setSelected(new Set());
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
          <p className="text-muted-foreground">Stock, costs, sales and profit analysis</p>
        </div>

        {/* Filter card */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={allMode ? 'default' : 'outline'} size="sm" onClick={selectAll}>
                All Products
              </Button>
              <Button variant={!allMode ? 'default' : 'outline'} size="sm" onClick={clearAll}>
                Selected Only ({selected.size})
              </Button>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <ScrollArea className="h-48 rounded-md border p-3">
              <div className="space-y-2">
                {filteredProducts.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={allMode || selected.has(p.id)}
                      onCheckedChange={() => toggleProduct(p.id)}
                    />
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.sku}</span>
                  </label>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* KPI cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stock Units</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.stockUnits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Stock value: {fmt(totals.stockValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.unitsSold.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Revenue: {fmt(totals.revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(totals.totalCosts)}</div>
              <p className="text-xs text-muted-foreground">Cost + ads + delivery + return + packaging</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {fmt(totals.profit)}
              </div>
              <p className="text-xs text-muted-foreground">Margin: {totals.margin.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {totals.lowStock > 0 && (
          <Card className="border-destructive/50">
            <CardContent className="flex items-center gap-2 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium">{totals.lowStock} product(s) with low stock (≤5 units)</span>
            </CardContent>
          </Card>
        )}

        {/* Detailed table */}
        <Card>
          <CardHeader>
            <CardTitle>Product Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 px-3 text-right">Stock</th>
                    <th className="py-2 px-3 text-right">Cost</th>
                    <th className="py-2 px-3 text-right">Ads</th>
                    <th className="py-2 px-3 text-right">Delivery</th>
                    <th className="py-2 px-3 text-right">Return</th>
                    <th className="py-2 px-3 text-right">Packaging</th>
                    <th className="py-2 px-3 text-right">Sold</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                    <th className="py-2 pl-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProducts.map((p) => {
                    const sold = sales[p.id]?.units_sold || 0;
                    const rev = sales[p.id]?.revenue || 0;
                    const perUnit =
                      (p.cost_price || 0) +
                      (p.ads_cost || 0) +
                      (p.delivery_charge || 0) +
                      (p.return_cost || 0) +
                      (p.packaging_cost || 0);
                    const profit = rev - sold * perUnit;
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {(p.stock_quantity || 0) <= 5 ? (
                            <Badge variant="destructive">{p.stock_quantity || 0}</Badge>
                          ) : (
                            p.stock_quantity || 0
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">{fmt(p.cost_price || 0)}</td>
                        <td className="py-2 px-3 text-right">{fmt(p.ads_cost || 0)}</td>
                        <td className="py-2 px-3 text-right">{fmt(p.delivery_charge || 0)}</td>
                        <td className="py-2 px-3 text-right">{fmt(p.return_cost || 0)}</td>
                        <td className="py-2 px-3 text-right">{fmt(p.packaging_cost || 0)}</td>
                        <td className="py-2 px-3 text-right">{sold}</td>
                        <td className="py-2 px-3 text-right">{fmt(rev)}</td>
                        <td className={`py-2 pl-3 text-right font-medium ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {fmt(profit)}
                        </td>
                      </tr>
                    );
                  })}
                  {activeProducts.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No products selected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default InventoryDashboard;
