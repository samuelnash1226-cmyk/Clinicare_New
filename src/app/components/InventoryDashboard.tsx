import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  addInventoryItem,
  updateInventoryItem,
  getInventoryStats,
  InventoryItem,
} from '../lib/firestore-setup';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import {
  Plus,
  Search,
  Package,
  Pill,
  AlertTriangle,
  Calendar,
  Edit2,
  Trash2,
  Loader2,
  X,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryDashboardProps {
  userEmail: string;
}

export function InventoryDashboard({ userEmail }: InventoryDashboardProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'medicine' | 'equipment'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stats, setStats] = useState({
    totalMedicines: 0,
    totalEquipment: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
  });

  const [formData, setFormData] = useState({
    name: '',
    category: 'medicine' as 'medicine' | 'equipment',
    stockQuantity: 0,
    expirationDate: '',
  });

  useEffect(() => {
    loadInventory();
    loadStats();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, categoryFilter]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const inventoryRef = collection(db, 'inventory');
      const snapshot = await getDocs(inventoryRef);
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as InventoryItem[];
      setItems(inventoryData);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getInventoryStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleAddItem = async () => {
    try {
      const itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        category: formData.category,
        stockQuantity: formData.stockQuantity,
        unit: formData.category === 'medicine' ? 'tablets' : 'pcs', // Default units
        minStockLevel: 10, // Default value for backward compatibility
        status: 'in_stock',
        createdBy: userEmail,
      };

      if (formData.category === 'medicine' && formData.expirationDate) {
        itemData.expirationDate = new Date(formData.expirationDate);
      }

      await addInventoryItem(itemData);
      toast.success('Item added successfully!');
      setShowAddModal(false);
      resetForm();
      loadInventory();
      loadStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem?.id) return;

    try {
      const updates: Partial<InventoryItem> = {
        name: formData.name,
        category: formData.category,
        stockQuantity: formData.stockQuantity,
      };

      if (formData.category === 'medicine' && formData.expirationDate) {
        updates.expirationDate = new Date(formData.expirationDate);
      }

      await updateInventoryItem(editingItem.id, updates);
      toast.success('Item updated successfully!');
      setEditingItem(null);
      resetForm();
      loadInventory();
      loadStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      toast.success('Item deleted successfully!');
      loadInventory();
      loadStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    
    // Safely handle expiration date
    let expirationDateString = '';
    if (item.expirationDate) {
      try {
        const expDate = item.expirationDate as any;
        const dateObj = expDate.toDate ? expDate.toDate() : new Date(expDate);
        if (dateObj && !isNaN(dateObj.getTime())) {
          expirationDateString = dateObj.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error parsing expiration date:', error);
      }
    }
    
    setFormData({
      name: item.name,
      category: item.category,
      stockQuantity: item.stockQuantity,
      expirationDate: expirationDateString,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'medicine',
      stockQuantity: 0,
      expirationDate: '',
    });
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'bg-red-500 text-white', badgeColor: 'bg-red-100 text-red-700 border-red-200' };
    if (quantity <= 10) return { status: 'Critical Low', color: 'bg-red-600', badgeColor: 'bg-red-100 text-red-700 border-red-200' };
    if (quantity <= 25) return { status: 'Low Stock', color: 'bg-amber-500', badgeColor: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (quantity <= 50) return { status: 'Moderate', color: 'bg-blue-500', badgeColor: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { status: 'Well Stocked', color: 'bg-ndkc-green', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const getStockColor = (quantity: number) => {
    return getStockStatus(quantity).color;
  };

  const isExpiringSoon = (expirationDate: any) => {
    if (!expirationDate) return false;
    try {
      const expDate = expirationDate.toDate ? expirationDate.toDate() : new Date(expirationDate);
      if (isNaN(expDate.getTime())) return false;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expDate <= thirtyDaysFromNow;
    } catch (error) {
      return false;
    }
  };

  const formatExpirationDate = (expirationDate: any) => {
    if (!expirationDate) return 'N/A';
    try {
      const expDate = expirationDate.toDate ? expirationDate.toDate() : new Date(expirationDate);
      if (isNaN(expDate.getTime())) return 'Invalid Date';
      return expDate.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Inventory Management</h1>
          <p className="text-slate-600 mt-1">
            Manage medicines and medical equipment
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-ndkc-green to-emerald-600 shadow-lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Medicines</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalMedicines}</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-2xl">
              <Pill className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Low Stock Alerts</p>
              <p className="text-3xl font-bold text-amber-600">{stats.lowStockCount}</p>
            </div>
            <div className="p-4 bg-amber-100 rounded-2xl">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-red-100 bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Expiring Soon</p>
              <p className="text-3xl font-bold text-red-600">{stats.expiringSoonCount}</p>
            </div>
            <div className="p-4 bg-red-100 rounded-2xl">
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Equipment</p>
              <p className="text-3xl font-bold text-ndkc-green">{stats.totalEquipment}</p>
            </div>
            <div className="p-4 bg-emerald-100 rounded-2xl">
              <Package className="h-8 w-8 text-ndkc-green" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 border-slate-200 bg-white shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('all')}
            className={categoryFilter === 'all' ? 'bg-ndkc-green' : ''}
          >
            All Items
          </Button>
          <Button
            variant={categoryFilter === 'medicine' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('medicine')}
            className={categoryFilter === 'medicine' ? 'bg-blue-600' : ''}
          >
            <Pill className="mr-2 h-4 w-4" />
            Medicines
          </Button>
          <Button
            variant={categoryFilter === 'equipment' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('equipment')}
            className={categoryFilter === 'equipment' ? 'bg-purple-600' : ''}
          >
            <Package className="mr-2 h-4 w-4" />
            Equipment
          </Button>
        </div>
      </div>

      {/* Items Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Item Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Stock Quantity</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Expiration</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-ndkc-green" />
                    <p className="text-slate-600 mt-2">Loading inventory...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-slate-300" />
                    <p className="text-slate-600 mt-2">No items found</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            item.category === 'medicine' ? 'bg-blue-100' : 'bg-purple-100'
                          }`}
                        >
                          {item.category === 'medicine' ? (
                            <Pill className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Package className="h-4 w-4 text-purple-600" />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-2xl font-bold ${
                              item.stockQuantity === 0
                                ? 'text-red-600'
                                : item.stockQuantity <= 10
                                ? 'text-red-600'
                                : item.stockQuantity <= 25
                                ? 'text-amber-600'
                                : item.stockQuantity <= 50
                                ? 'text-blue-600'
                                : 'text-ndkc-green'
                            }`}
                          >
                            {item.stockQuantity}
                          </span>
                          <span className="text-sm text-slate-500">{item.unit}</span>
                        </div>
                        <Badge variant="outline" className={getStockStatus(item.stockQuantity).badgeColor}>
                          {getStockStatus(item.stockQuantity).status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.expirationDate ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isExpiringSoon(item.expirationDate)
                                ? 'text-red-600 font-medium'
                                : 'text-slate-600'
                            }
                          >
                            {formatExpirationDate(item.expirationDate)}
                          </span>
                          {isExpiringSoon(item.expirationDate) && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(item)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id!, item.name)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingItem) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-lg p-6">
                <h2 className="text-slate-900">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="rounded-xl hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Paracetamol 500mg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: 'medicine' | 'equipment') =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medicine">Medicine</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    value={formData.stockQuantity === 0 ? '' : formData.stockQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })
                    }
                    placeholder="Enter quantity"
                    className="h-12"
                  />
                </div>

                {formData.category === 'medicine' && (
                  <div className="space-y-2">
                    <Label htmlFor="expirationDate">Expiration Date</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expirationDate: e.target.value })
                      }
                      className="h-12"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingItem ? handleUpdateItem : handleAddItem}
                    disabled={!formData.name || formData.stockQuantity < 0}
                    className="flex-1 h-12 bg-gradient-to-r from-ndkc-green to-emerald-600"
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}