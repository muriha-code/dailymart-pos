export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export type RequestUrgency = 'URGENT' | 'NORMAL' | 'LOW';

export interface RestockRequestRecord {
  id?: string;
  requestCode: string; // e.g. REQ-20260819-0001
  productId: string;
  productName: string;
  sku: string;
  categoryName?: string;
  currentStock: number;
  requestedQty: number;
  unit: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  reasonNotes?: string;
  rejectionReason?: string;
  requestedBy: string;
  requestedById?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CreateRestockRequestPayload {
  productId: string;
  requestedQty: number;
  urgency: RequestUrgency;
  reasonNotes?: string;
  requestedBy?: string;
  requestedById?: string;
}

export interface RestockRequestSummary {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
}

export interface GetRestockRequestsParams {
  search?: string;
  status?: string;
  urgency?: string;
}
