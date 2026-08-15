export interface Category {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  category_name?: string;
  description: string | null;
  image_url: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_orders?: number;
  total_spent?: number;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  client_id: number | null;
  client_name?: string;
  client_first_name?: string;
  client_last_name?: string;
  status: "pending" | "completed" | "cancelled";
  payment_method: string | null;
  payment_status: "unpaid" | "partial" | "paid";
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  ordered_at: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  items_count?: number;
}

export interface DashboardStats {
  total_products: number;
  low_stock_items: number;
  monthly_orders: number;
  monthly_revenue: number;
  monthly_profit: number;
  total_clients: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  profit: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  revenue: number;
  profit: number;
  margin: number;
  quantity_sold: number;
}

export interface AnalyticsSummary {
  total_revenue: number;
  total_profit: number;
  total_labor_costs: number;
  net_profit: number;
  average_order_value: number;
  total_orders: number;
  orders_by_status: { status: string; count: number }[];
}

export interface Employee {
  id: number;
  name: string;
  role: string | null;
  pay_type: "hourly" | "salary" | "contractor";
  pay_rate: number;
  hours_per_week: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_paid?: number;
  cost_count?: number;
}

export interface EmployeeCost {
  id: number;
  employee_id: number;
  employee_name?: string;
  amount: number;
  paid_on: string;
  notes: string | null;
  created_at: string;
}
