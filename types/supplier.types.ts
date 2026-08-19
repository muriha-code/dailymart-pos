export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SupplierResponse {
  success: boolean;
  message?: string;
  data?: Supplier[];
}
