
export enum CertStatus {
  VALID = 'VALID',
  INVALID = 'INVALID'
}

export enum PacketStage {
  IDLE = 'IDLE',
  CLIENT = 'CLIENT',
  NETWORK_INTERCEPT = 'NETWORK_INTERCEPT',
  NETWORK_PASSTHROUGH = 'NETWORK_PASSTHROUGH',
  SERVER = 'SERVER'
}

export interface Packet {
  id: string;
  originalContent: string;
  displayContent: string;
  isEncrypted: boolean;
  stage: PacketStage;
}
