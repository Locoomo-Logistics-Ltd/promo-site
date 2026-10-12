export type RegistrationStatus = "ACCEPTED" | "NEEDS_REVIEW" | "DUPLICATE_RACE";
export type EmailStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export interface RegistrationRecord {
  id: string;
  createdAt: string;
  status: RegistrationStatus;
  fullName: string;
  email: string;
  emailKey: string;
  phone: string;
  item: string;
  price: number;
  vendorName: string;
  vendorPhone: string;
  vendorSocial: string;
  nomination: string;
  nominationPin: string;
  nominationLat: number | "";
  nominationLng: number | "";
  ipHash: string;
  emailStatus: EmailStatus;
  emailAttempts: number;
  emailSentAt: string;
  emailError: string;
  reviewNote: string;
  stationStatus: "" | "ESTABLISHED";
  stationEstablishedAt: string;
  stationEmailStatus: "" | "PENDING" | "SENT" | "FAILED";
}

export interface StoredRegistration extends RegistrationRecord {
  rowNumber: number;
}

export interface RegistrationStore {
  /** All rows in sheet order (row order is the tie-breaker for concurrent writes). */
  list(): Promise<StoredRegistration[]>;
  append(record: RegistrationRecord): Promise<number>;
  update(rowNumber: number, patch: Partial<RegistrationRecord>): Promise<void>;
}

export interface Mailer {
  sendConfirmation(r: RegistrationRecord): Promise<void>;
  sendStationLive(r: RegistrationRecord): Promise<void>;
  sendAdminLink(to: string, name: string, kind: "invite" | "reset", url: string): Promise<void>;
}
