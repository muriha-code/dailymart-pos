export type ReturnType = 'RETURN_TO_SUPPLIER' | 'DISPOSAL_DAMAGED';

export type ReturnReason =
  | 'EXPIRED'
  | 'PACKAGING_DAMAGED'
  | 'FACTORY_DEFECT'
  | 'NEAR_EXPIRY'
  | 'OTHER';

export type ReturnActionStatus = 'PENDING_PICKUP' | 'COMPLETED' | 'DISPOSED';

export interface StockReturnRecord {
  id: string; // RTN-YYYYMMDD-XXXX or Doc ID
  returnCode: string;
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  quantity: number;
  type: ReturnType;
  reason: ReturnReason | string;
  supplierName?: string;
  actionStatus: ReturnActionStatus | string;
  notes?: string;
  evidenceImages?: string[];
  reportedBy: string;
  reporterId: string;
  createdAt: string | Date;
}

export interface CreateReturnPayload {
  productId: string;
  quantity: number;
  type: ReturnType;
  reason: ReturnReason | string;
  supplierName?: string;
  notes?: string;
  evidenceImages?: string[];
  reportedBy?: string;
  reporterId?: string;
}

export interface StockReturnQueryParams {
  search?: string;
  type?: ReturnType | 'ALL';
  reason?: ReturnReason | 'ALL';
  date?: string; // YYYY-MM-DD
}

export interface StockReturnResponse {
  success: boolean;
  message?: string;
  data?: StockReturnRecord | StockReturnRecord[];
}
